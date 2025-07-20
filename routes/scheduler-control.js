const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const paymentScheduler = require("../services/payment-scheduler");

// Get scheduler status (admin only)
router.get("/status", auth.authenticateToken, auth.requireAdmin, (req, res) => {
  try {
    const status = paymentScheduler.getDetailedStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get scheduler status",
      error: error.message,
    });
  }
});

// Manual trigger payment generation (admin only)
router.post(
  "/trigger-manual",
  auth.authenticateToken,
  auth.requireAdmin,
  async (req, res) => {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({
          success: false,
          message: "Month and year are required",
        });
      }

      const result = await paymentScheduler.triggerManualGeneration(
        month,
        year
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to trigger manual generation",
        error: error.message,
      });
    }
  }
);

// Start scheduler (admin only)
router.post("/start", auth.authenticateToken, auth.requireAdmin, (req, res) => {
  try {
    paymentScheduler.start();
    res.json({
      success: true,
      message: "Payment scheduler started",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to start scheduler",
      error: error.message,
    });
  }
});

// Stop scheduler (admin only)
router.post("/stop", auth.authenticateToken, auth.requireAdmin, (req, res) => {
  try {
    paymentScheduler.stop();
    res.json({
      success: true,
      message: "Payment scheduler stopped",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to stop scheduler",
      error: error.message,
    });
  }
});

module.exports = router;
