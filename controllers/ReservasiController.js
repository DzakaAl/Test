const Reservasi = require("../models/Reservasi");

class ReservasiController {
  // Create new reservation
  static async create(req, res) {
    try {
      const reservationData = {
        ...req.body,
        Email: req.user.Email, // Use authenticated user's email
      };

      const result = await Reservasi.create(reservationData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        message: "Reservation created successfully",
        data: {
          reservationId: result.reservationId,
        },
      });
    } catch (error) {
      console.error("Create reservation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get all reservations with payment info (Admin only)
  static async getReservationsWithPayments(req, res) {
    try {
      const { status, kamar, periode } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (kamar) filters.kamar = kamar;
      if (periode) filters.periode = periode;

      const reservations = await Reservasi.getAllWithPayments(filters);

      // Process reservations to update status based on payment status
      const processedReservations = reservations.map((reservation) => {
        // If latest payment status is not 'Diterima', set reservation status to 'Telat/Belum Bayar'
        // and clear the payment period display
        if (reservation.latest_payment_status !== "Diterima") {
          reservation.Status = "Telat/Belum Bayar";
          reservation.last_payment_period = null; // This will show "belum ada pembayaran"
        } else if (
          reservation.latest_payment_status === "Diterima" &&
          reservation.Status !== "Aktif/Lunas"
        ) {
          // If payment is accepted but reservation status is not updated, update it
          reservation.Status = "Aktif/Lunas";
        }

        return reservation;
      });

      res.json({
        success: true,
        data: processedReservations,
      });
    } catch (error) {
      console.error("Get reservations with payments error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update reservation status (Admin only)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, keterangan } = req.body;

      const result = await Reservasi.updateStatus(id, status, keterangan);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: "Reservation status updated successfully",
      });
    } catch (error) {
      console.error("Update reservation status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get user's reservations
  static async getUserReservations(req, res) {
    try {
      const reservations = await Reservasi.getByUser(req.user.Email);

      res.json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      console.error("Get user reservations error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get reservations by user email (for admin or user themselves)
  static async getReservasiByUser(req, res) {
    try {
      const { userID } = req.params;

      // Check if user is admin or accessing their own data
      // Since we use Email as identifier, userID here should be an email
      if (!req.user.isAdmin && req.user.Email !== userID) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own reservations.",
        });
      }

      // Get reservations with payment info and calculated status
      const reservations = await Reservasi.getByUserIdWithPayments(userID);

      res.json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      console.error("Get reservations by user email error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get all reservations (Admin only)
  static async getAll(req, res) {
    try {
      const reservations = await Reservasi.getAll();

      res.json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      console.error("Get all reservations error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update reservation status (Admin only)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ["Menunggu", "Diterima", "Ditolak"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Must be one of: Menunggu, Diterima, Ditolak",
        });
      }

      const result = await Reservasi.updateStatus(id, status);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Update reservation status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = ReservasiController;
