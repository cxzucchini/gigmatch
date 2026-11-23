const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  loginUser,
  getMe,
  submitIdVerification,
  getIdVerificationStatus,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in a few minutes.' },
});

router.post('/register', authLimiter, registerUser);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);
router.post('/verify-id', protect, submitIdVerification);
router.get('/verify-id', protect, getIdVerificationStatus);

module.exports = router;