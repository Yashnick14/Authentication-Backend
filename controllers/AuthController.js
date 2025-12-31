import User from "../models/UserModel.js";
import { sendEmail } from "../utils/Email.js";
import CryptoJS from "crypto-js";

// Registration
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already in use" });

    const user = await User.create({ username, email, password });

    // Generate token
    const token = user.generateToken();
    user.jwtToken = token;
    await user.save();

    res.json({ message: "Registration successful", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    if (user.isLocked()) {
      return res.status(429).json({
        message: "Account locked. Try later.",
        lockUntil: user.lockUntil,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5)
        user.lockUntil = new Date(Date.now() + 5 * 60 * 1000);

      await user.save();

      return res.status(400).json({
        message:
          user.loginAttempts >= 5
            ? "Account locked. Try later."
            : "Invalid email or password",
      });
    }

    // Reset lock + attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    const token = user.generateToken();
    user.jwtToken = token;
    await user.save();

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = otp;
    user.resetTokenExpire = new Date(Date.now() + 3 * 60 * 1000); // 3 mins
    await user.save();

    await sendEmail(
      user.email,
      "Your Password Reset OTP",
      `Your OTP: ${otp}\nExpires in 3 minutes.`
    );

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const SECRET_KEY = process.env.OTP_SECRET_KEY;
    if (!SECRET_KEY)
      return res
        .status(500)
        .json({ message: "Server misconfiguration: OTP secret missing" });

    const { email, otp: encryptedOtp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });

    // Reset attempts if lock has expired
    if (user.otpLockUntil && user.otpLockUntil <= Date.now()) {
      user.otpAttempts = 0;
      user.otpLockUntil = undefined;
      await user.save();
    }

    // Check if OTP is locked
    if (user.otpLockUntil && user.otpLockUntil > Date.now())
      return res
        .status(429)
        .json({ message: "Too many incorrect attempts. Try again later." });

    // Check if OTP expired
    if (user.resetTokenExpire < Date.now())
      return res.status(400).json({ message: "OTP has expired" });

    // Decrypt OTP
    let decryptedOtp;
    try {
      decryptedOtp = CryptoJS.AES.decrypt(encryptedOtp, SECRET_KEY).toString(
        CryptoJS.enc.Utf8
      );
      if (!decryptedOtp) throw new Error("Decryption failed");
    } catch (err) {
      return res.status(400).json({ message: "Invalid OTP format" });
    }

    // Check OTP correctness
    if (user.resetToken !== decryptedOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 3) {
        user.otpLockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();
        return res
          .status(429)
          .json({ message: "Too many incorrect attempts. Try again later." });
      }

      await user.save();
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Successful OTP verification
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;
    await user.save();

    res.json({ message: "OTP verified successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
