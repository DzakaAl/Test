const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validation");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { handleUpload } = require("../middleware/upload");

// Public routes
router.post("/register", validateRegistration, AuthController.register);
router.post("/login", validateLogin, AuthController.login);
router.post("/login-token", AuthController.loginWithToken); // New token-based login

// Protected routes
router.get("/profile", authenticateToken, AuthController.getProfile);
router.put(
  "/profile",
  authenticateToken,
  handleUpload,
  AuthController.updateProfile
);
router.put(
  "/change-password",
  authenticateToken,
  AuthController.changePassword
);

// Admin routes for user management
router.get("/admin/users", authenticateToken, requireAdmin, AuthController.getAllUsers);
router.get("/admin/users-reservations", authenticateToken, requireAdmin, AuthController.getAllUsersWithReservations);
router.get("/admin/payments", authenticateToken, requireAdmin, AuthController.getAllPayments);
router.get("/admin/filter-options", authenticateToken, requireAdmin, AuthController.getFilterOptions);
router.get("/admin/dashboard-stats", authenticateToken, requireAdmin, AuthController.getDashboardStats);
router.put("/admin/reservations/:reservasiId/status", authenticateToken, requireAdmin, AuthController.updateReservationStatus);
router.put("/admin/payments/:paymentId/status", authenticateToken, requireAdmin, AuthController.updatePaymentStatus);

module.exports = router;
