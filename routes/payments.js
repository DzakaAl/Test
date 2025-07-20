const express = require("express");
const PaymentController = require("../controllers/PaymentController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { uploadPaymentProof, upload } = require("../middleware/upload");

const router = express.Router();

// User routes
router.post(
  "/reservation/:reservationId/upload-proof",
  authenticateToken,
  uploadPaymentProof,
  PaymentController.uploadPaymentProof
);

// Update payment proof

// Penghuni: update bukti pembayaran
router.put(
  "/:paymentId/upload-proof",
  authenticateToken,
  upload.single("bukti_pembayaran"),
  PaymentController.updatePaymentProof
);

// Admin: update status pembayaran
router.put(
  "/:paymentId/update-status",
  authenticateToken,
  requireAdmin,
  PaymentController.updatePaymentStatus
);

router.get(
  "/reservation/:reservationId/history",
  authenticateToken,
  PaymentController.getPaymentHistory
);

router.get(
  "/unpaid/:reservationId",
  authenticateToken,
  PaymentController.getUnpaidPaymentByReservation
);

router.get(
  "/my-payments",
  authenticateToken,
  PaymentController.getMyPaymentHistory
);

router.get(
  "/my-monthly-payments",
  authenticateToken,
  PaymentController.getMonthlyPaymentHistory
);

// Legacy payment creation support
router.post(
  "/payments",
  authenticateToken,
  upload.single("buktiPembayaran"),
  PaymentController.createPayment
);

// Admin routes
router.get(
  "/all",
  authenticateToken,
  requireAdmin,
  PaymentController.getAllPayments
);

router.get(
  "/pending",
  authenticateToken,
  requireAdmin,
  PaymentController.getAllPendingPayments
);

// Monthly payment generation routes
router.post(
  "/generate-monthly",
  authenticateToken,
  requireAdmin,
  PaymentController.generateMonthlyPayments
);

router.post(
  "/generate-manual",
  authenticateToken,
  requireAdmin,
  PaymentController.generateManualPayments
);

router.get(
  "/generation-history",
  authenticateToken,
  requireAdmin,
  PaymentController.getGenerationHistory
);

router.post(
  "/:paymentId/verify",
  authenticateToken,
  requireAdmin,
  PaymentController.verifyPayment
);

router.post(
  "/update-statuses",
  authenticateToken,
  requireAdmin,
  PaymentController.updateReservationStatuses
);

router.post(
  "/reservation/:reservationId/checkout",
  authenticateToken,
  requireAdmin,
  PaymentController.markUserCheckout
);

// File serving routes
router.get(
  "/:paymentId/proof",
  authenticateToken,
  PaymentController.getPaymentProof
);

module.exports = router;
