const express = require('express');
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

router.post('/register', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/verify-id', protect, submitIdVerification);
router.get('/verify-id', protect, getIdVerificationStatus);

module.exports = router;