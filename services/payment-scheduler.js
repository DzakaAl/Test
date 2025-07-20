const cron = require("node-cron");
const axios = require("axios");

class PaymentScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  }

  // Inisialisasi scheduler
  init() {
    // Cron job untuk setiap tanggal 1 jam 00:00 WIB
    // Format: menit jam tanggal bulan hari
    // '0 0 1 * *' = setiap tanggal 1, jam 00:00
    this.scheduledTask = cron.schedule(
      "0 0 1 * *",
      async () => {
        await this.generateMonthlyPayments();
      },
      {
        scheduled: false,
        timezone: "Asia/Jakarta", // WIB timezone
      }
    ); // Start the scheduler
    this.start();
  }

  // Start scheduler
  start() {
    if (!this.isRunning) {
      this.scheduledTask.start();
      this.isRunning = true;

      // Calculate next run
      this.calculateNextRun();
    }
  }

  // Stop scheduler
  stop() {
    if (this.isRunning) {
      this.scheduledTask.stop();
      this.isRunning = false;
    }
  }

  // Manual trigger untuk testing
  async triggerNow() {
    return await this.generateMonthlyPayments();
  }

  // Test trigger dengan delay (untuk testing scheduler hari ini)
  async triggerTestIn(minutes = 1) {
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + minutes);

    const testCron = `${testTime.getMinutes()} ${testTime.getHours()} ${testTime.getDate()} ${
      testTime.getMonth() + 1
    } *`;

    this.testTask = cron.schedule(
      testCron,
      async () => {
        await this.generateMonthlyPayments();
        this.testTask.destroy(); // Remove test task after execution
      },
      {
        scheduled: true,
        timezone: "Asia/Jakarta",
      }
    );

    return {
      success: true,
      message: `Test scheduled for ${testTime.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      })}`,
      testTime: testTime,
      cronExpression: testCron,
    };
  }

  // Function untuk generate monthly payments
  async generateMonthlyPayments() {
    try {
      const startTime = new Date();
      this.lastRun = startTime;

      // Call Payment model directly instead of controller
      const Payment = require("../models/Payment");

      // Get current date info
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // Call model method directly
      const result = await Payment.generateMonthlyPaymentsForAllUsers(
        currentMonth,
        currentYear
      );

      if (result.success) {
        // Calculate next run after successful execution
        this.calculateNextRun();

        return {
          success: true,
          message: `Successfully generated ${result.generated} monthly payments`,
          data: {
            total_generated: result.generated,
            total_active_reservations: result.generated, // Approximate
            period: `${currentMonth}/${currentYear}`,
            errors: result.errors || [],
          },
          execution_time: new Date() - startTime,
        };
      } else {
        this.calculateNextRun();

        return {
          success: false,
          message: result.message || "Payment generation failed",
        };
      }
    } catch (error) {
      // Calculate next run even on error
      this.calculateNextRun();

      return {
        success: false,
        message: "Error generating monthly payments",
        error: error.message,
      };
    }
  }

  // Calculate next run time
  calculateNextRun() {
    const now = new Date();
    const nextRun = new Date();

    // For production mode: next run on 1st day of next month at 00:00
    nextRun.setDate(1);
    nextRun.setHours(0, 0, 0, 0);

    // If today is before 1st of current month or exactly 1st but we haven't reached midnight
    if (
      now.getDate() > 1 ||
      (now.getDate() === 1 && now.getHours() >= 0 && now.getMinutes() > 0)
    ) {
      // Move to next month
      nextRun.setMonth(nextRun.getMonth() + 1);
    }

    this.nextRun = nextRun;
  }

  // Force generate untuk bulan tertentu (admin function)
  async triggerManualGeneration(month, year) {
    try {
      const response = await axios.post(
        `${this.serverUrl}/api/payments/generate-manual`,
        {
          force: true,
          month: month,
          year: year,
          triggered_by: "manual_admin",
        }
      );

      return response.data;
    } catch (error) {
      return {
        success: false,
        message: "Error in manual generation",
        error: error.message,
      };
    }
  }

  // Get simple status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      description:
        "Auto-generate pembayaran bulanan (setiap tanggal 1 jam 00:00)",
    };
  }

  // Get detailed status
  getDetailedStatus() {
    const status = this.getStatus();

    return {
      ...status,
      server_url: this.serverUrl,
      timezone: "Asia/Jakarta",
      cron_expression: "0 0 1 * *",
      next_run_formatted: this.nextRun
        ? this.nextRun.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        : null,
      last_run_formatted: this.lastRun
        ? this.lastRun.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        : null,
    };
  }
}

// Export singleton instance
const paymentScheduler = new PaymentScheduler();

// Auto-start scheduler ketika server dimulai (kecuali dalam test mode)
if (process.env.NODE_ENV !== "test") {
  paymentScheduler.init();
}

module.exports = paymentScheduler;
