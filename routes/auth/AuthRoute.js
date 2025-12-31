import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyOtp,
} from "../../controllers/AuthController.js";
import { protect } from "../../middleware/AuthMiddleware.js";

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOtp);

// Example protected route
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
