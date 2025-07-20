const { pool } = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Payment = require("./Payment");

class TmpUser {
  // Create new temporary user with payment proof
  static async create(tmpData, buktiPembayaranPath) {
    const { Nama, Email, Password, No_telp, Alamat, No_Kamar } = tmpData;

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(Password, 10);

      const query = `
        INSERT INTO tmp (
          Nama, No_telp, Alamat, Email, Password, No_Kamar, 
          Bukti_Pembayaran, Role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'penyewa')
      `;

      const [result] = await pool.execute(query, [
        Nama,
        No_telp,
        Alamat,
        Email,
        hashedPassword,
        No_Kamar,
        buktiPembayaranPath,
      ]);

      // Note: Reservation will be created when admin approves the tmp user
      // The tmp table already contains No_Kamar for tracking which room was requested

      return {
        success: true,
        message:
          "Temporary user created successfully. Waiting for admin approval",
        tmpId: result.insertId,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return {
          success: false,
          message: "Email already has a pending reservation",
        };
      }
      throw error;
    }
  }

  // Get all temporary users with their reservation status
  static async getAllWithReservationStatus() {
    try {
      const query = `
        SELECT 
          t.*,
          k.Nama_Kamar,
          k.Letak,
          r.Status as Reservation_Status,
          r.ID_Reservasi,
          r.Tanggal_Reservasi
        FROM tmp t
        JOIN kamar k ON t.No_Kamar = k.No_Kamar
        LEFT JOIN reservasi r ON t.Email = r.Email AND t.No_Kamar = r.No_Kamar
        ORDER BY t.Created_At DESC
      `;

      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get temporary user by ID with reservation status
  static async getByIdWithReservationStatus(id) {
    try {
      const query = `
        SELECT 
          t.*,
          k.Nama_Kamar,
          k.Letak,
          r.Status as Reservation_Status,
          r.ID_Reservasi,
          r.Tanggal_Reservasi
        FROM tmp t
        JOIN kamar k ON t.No_Kamar = k.No_Kamar
        LEFT JOIN reservasi r ON t.Email = r.Email AND t.No_Kamar = r.No_Kamar
        WHERE t.ID_Tmp = ?
      `;

      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Approve tmp user - move to user table and create active reservation
  static async approve(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get tmp user data
      const [tmpRows] = await connection.execute(
        "SELECT * FROM tmp WHERE ID_Tmp = ?",
        [id]
      );

      if (tmpRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          message: "Temporary user not found",
        };
      }

      const tmpUser = tmpRows[0];

      // 1. Create user in users table
      const userQuery = `
        INSERT INTO user (Nama, No_telp, Alamat, Email, Password, Role) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(userQuery, [
        tmpUser.Nama,
        tmpUser.No_telp,
        tmpUser.Alamat,
        tmpUser.Email,
        tmpUser.Password, // Already hashed
        tmpUser.Role,
      ]);

      // 2. Create reservation with 'Aktif/Lunas' status (as paid first month)
      const reservasiQuery = `
        INSERT INTO reservasi (No_Kamar, Email, Tanggal_Reservasi, Status) 
        VALUES (?, ?, NOW(), 'Aktif/Lunas')
      `;

      const [reservasiResult] = await connection.execute(reservasiQuery, [
        tmpUser.No_Kamar,
        tmpUser.Email,
      ]);

      // 3. Create payment record for first month
      const currentDate = new Date();
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const currentYear = currentDate.getFullYear().toString();
      const monthYear = currentYear + "-" + currentMonth;

      const paymentQuery = `
        INSERT INTO pembayaran (
          ID_Reservasi, 
          Tanggal_Bayar, 
          Jumlah, 
          Bukti_Pembayaran, 
          Status
        ) VALUES (?, NOW(), 900000, ?, 'Diterima')
      `;

      await connection.execute(paymentQuery, [
        reservasiResult.insertId,
        tmpUser.Bukti_Pembayaran,
      ]);

      // 4. Generate temporary token (valid for 1 day)
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 1 day from now

      const tokenQuery = `
        INSERT INTO user_tokens (Email, Token, Expires_At) 
        VALUES (?, ?, ?)
      `;

      await connection.execute(tokenQuery, [tmpUser.Email, token, expiresAt]);

      // 5. Update room availability
      await connection.execute(
        "UPDATE kamar SET Ketersediaan = 0 WHERE No_Kamar = ?",
        [tmpUser.No_Kamar]
      );

      // 6. Delete from tmp table
      await connection.execute("DELETE FROM tmp WHERE ID_Tmp = ?", [id]);

      await connection.commit();

      return {
        success: true,
        message: "User approved successfully and moved to active status",
        data: {
          reservationId: reservasiResult.insertId,
          email: tmpUser.Email,
          token: token,
          expiresAt: expiresAt,
          status: "Aktif/Lunas",
        },
      };
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        return {
          success: false,
          message: "User with this email already exists",
        };
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  // Reject tmp user - delete from tmp and update reservation status
  static async reject(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get tmp user data
      const [tmpRows] = await connection.execute(
        "SELECT * FROM tmp WHERE ID_Tmp = ?",
        [id]
      );

      if (tmpRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          message: "Temporary user not found",
        };
      }

      const tmpUser = tmpRows[0];

      // 1. Delete from tmp table (no reservation to update since it was never created)
      await connection.execute("DELETE FROM tmp WHERE ID_Tmp = ?", [id]);

      await connection.commit();

      return {
        success: true,
        message: "User rejected successfully",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get tmp user by email
  static async getByEmail(email) {
    try {
      const query = "SELECT * FROM tmp WHERE Email = ?";
      const [rows] = await pool.execute(query, [email]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Auto update reservation status based on payment dates
  static async updateReservationStatus() {
    const connection = await pool.getConnection();

    try {
      // Get current date
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // Define payment deadline (example: day 5 of each month)
      const PAYMENT_DEADLINE = 5;

      // Get all active reservations
      const [reservations] = await connection.execute(`
        SELECT r.*, u.Email, u.Nama 
        FROM reservasi r 
        JOIN user u ON r.Email = u.Email 
        WHERE r.Status IN ('Aktif/Lunas', 'Telat/Belum Bayar')
      `);

      for (const reservation of reservations) {
        // Check latest payment for this reservation
        const [payments] = await connection.execute(
          `
          SELECT * FROM pembayaran 
          WHERE ID_Reservasi = ? 
          ORDER BY Tanggal_Bayar DESC 
          LIMIT 1
        `,
          [reservation.ID_Reservasi]
        );

        if (payments.length === 0) {
          // No payment found, set status to late
          await connection.execute(
            `
            UPDATE reservasi 
            SET Status = 'Telat/Belum Bayar' 
            WHERE ID_Reservasi = ?
          `,
            [reservation.ID_Reservasi]
          );
          continue;
        }

        const lastPayment = payments[0];
        const lastPaymentDate = new Date(
          lastPayment.Tanggal_Bayar || lastPayment.Created_At
        );
        const lastPaymentMonth = lastPaymentDate.getMonth() + 1;
        const lastPaymentYear = lastPaymentDate.getFullYear();
        const lastPaymentStatus = lastPayment.Status;

        // Check if payment is for current month AND status is 'Diterima'
        const isCurrentMonthPaid =
          lastPaymentYear === currentYear &&
          lastPaymentMonth === currentMonth &&
          lastPaymentStatus === "Diterima";

        // Check if past deadline for current month
        const isPastDeadline = currentDay > PAYMENT_DEADLINE;

        let newStatus = reservation.Status;

        if (isCurrentMonthPaid) {
          // Paid current month and accepted - set to active
          newStatus = "Aktif/Lunas";
        } else if (
          isPastDeadline ||
          (lastPaymentYear === currentYear &&
            lastPaymentMonth === currentMonth &&
            lastPaymentStatus !== "Diterima")
        ) {
          // Past deadline OR current month payment not accepted - set to late
          newStatus = "Telat/Belum Bayar";

          // Create pending payment record for current month if not exists
          const currentMonthStr =
            currentYear + "-" + String(currentMonth).padStart(2, "0");

          const [existingPayment] = await connection.execute(
            `
            SELECT * FROM pembayaran 
            WHERE ID_Reservasi = ? 
            AND YEAR(Created_At) = ? 
            AND MONTH(Created_At) = ?
          `,
            [reservation.ID_Reservasi, currentYear, currentMonth]
          );

          if (existingPayment.length === 0) {
            // Create pending payment record
            await connection.execute(
              `
              INSERT INTO pembayaran (
                ID_Reservasi, 
                Tanggal_Bayar, 
                Jumlah, 
                Bukti_Pembayaran, 
                Status
              ) VALUES (?, NULL, 900000, NULL, 'Belum Bayar')
            `,
              [reservation.ID_Reservasi]
            );
          }
        }

        // Update reservation status if changed
        if (newStatus !== reservation.Status) {
          await connection.execute(
            `
            UPDATE reservasi 
            SET Status = ? 
            WHERE ID_Reservasi = ?
          `,
            [newStatus, reservation.ID_Reservasi]
          );
        }
      }

      await connection.commit();
      return {
        success: true,
        message: "Reservation statuses updated successfully",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Function to mark user as checkout/keluar
  static async markAsCheckout(reservationId, reason = "") {
    try {
      const [result] = await pool.execute(
        `
        UPDATE reservasi 
        SET Status = 'Keluar', Keterangan = ? 
        WHERE ID_Reservasi = ?
      `,
        [reason, reservationId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: "Reservation not found",
        };
      }

      // Update room availability
      const [reservation] = await pool.execute(
        `
        SELECT No_Kamar FROM reservasi WHERE ID_Reservasi = ?
      `,
        [reservationId]
      );

      if (reservation.length > 0) {
        await pool.execute(
          `
          UPDATE kamar SET Ketersediaan = 1 WHERE No_Kamar = ?
        `,
          [reservation[0].No_Kamar]
        );
      }

      return {
        success: true,
        message: "User marked as checkout successfully",
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TmpUser;
