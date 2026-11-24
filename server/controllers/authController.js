const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const createOtp = () => {
  const code = String(crypto.randomInt(100000, 1000000));
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  return {
    code,
    hashedCode,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  };
};

const clearOtpState = (user) => {
  user.otpCode = null;
  user.otpExpires = null;
  user.otpPurpose = null;
  user.otpAttempts = 0;
};

const sendOtpEmail = async ({ to, name, code, purpose }) => {
  const isReset = purpose === 'reset_password';
  const subject = isReset
    ? 'GigMatch Password Reset Code'
    : 'Verify Your GigMatch Email Address';

  const actionText = isReset
    ? 'reset your GigMatch password'
    : 'verify your GigMatch account';

  const text = `Hi ${name || 'there'},\n\nUse this 6-digit code to ${actionText}: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2>GigMatch</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Use the 6-digit code below to ${actionText}:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${code}</p>
      <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
};

const registerUser = async (req, res) => {
  const { name, email, password, role = 'client' } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Password must be between 8 and 72 characters' });
    }
    if (!['client', 'musician'].includes(role)) {
      return res.status(400).json({ message: 'Role must be client or musician' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(503).json({ message: 'Authentication is temporarily unavailable' });
    }

    const { code, hashedCode, expiresAt } = createOtp();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      isEmailVerified: false,
      otpCode: hashedCode,
      otpExpires: expiresAt,
      otpPurpose: 'verify_email',
      otpAttempts: 0,
    });

    try {
      await sendOtpEmail({
        to: user.email,
        name: user.name,
        code,
        purpose: 'verify_email',
      });
    } catch (mailError) {
      console.error('Failed to send verification email:', mailError.message);
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
        requiresEmailVerification: true,
        message: 'Account created, but sending the verification email failed. Tap Resend Code to try again.',
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      requiresEmailVerification: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('Registration failed:', error.message);
    res.status(500).json({ message: 'Unable to create account right now' });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanCode = typeof code === 'string' ? code.trim() : '';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ message: 'Enter a valid email and 6-digit verification code' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(503).json({ message: 'Authentication is temporarily unavailable' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+otpCode');
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (user.isEmailVerified) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
        token: generateToken(user._id),
        message: 'Email is already verified',
      });
    }

    const isExpired = !user.otpExpires || new Date(user.otpExpires).getTime() < Date.now();
    if (user.otpPurpose !== 'verify_email' || !user.otpCode || isExpired) {
      clearOtpState(user);
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      clearOtpState(user);
      await user.save();
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    const hashedInput = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (user.otpCode !== hashedInput) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        clearOtpState(user);
      }
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    user.isEmailVerified = true;
    clearOtpState(user);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      token: generateToken(user._id),
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification failed:', error.message);
    res.status(500).json({ message: 'Unable to verify email right now' });
  }
};

const resendOtp = async (req, res) => {
  const { email, purpose = 'verify_email' } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (!['verify_email', 'reset_password'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid code purpose' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: 'If an account exists, a new code has been sent' });
    }

    if (purpose === 'verify_email' && user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const { code, hashedCode, expiresAt } = createOtp();
    user.otpCode = hashedCode;
    user.otpExpires = expiresAt;
    user.otpPurpose = purpose;
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      code,
      purpose,
    });

    res.json({ message: 'A new 6-digit code has been sent to your email' });
  } catch (error) {
    console.error('Resend OTP failed:', error.message);
    res.status(500).json({ message: 'Unable to send code right now' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset code has been sent' });
    }

    const { code, hashedCode, expiresAt } = createOtp();
    user.otpCode = hashedCode;
    user.otpExpires = expiresAt;
    user.otpPurpose = 'reset_password';
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      code,
      purpose: 'reset_password',
    });

    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Forgot password failed:', error.message);
    res.status(500).json({ message: 'Unable to process password reset request right now' });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanCode = typeof code === 'string' ? code.trim() : '';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ message: 'Enter a valid email and 6-digit reset code' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({ message: 'New password must be between 8 and 72 characters' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+otpCode');
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const isExpired = !user.otpExpires || new Date(user.otpExpires).getTime() < Date.now();
    if (user.otpPurpose !== 'reset_password' || !user.otpCode || isExpired) {
      clearOtpState(user);
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      clearOtpState(user);
      await user.save();
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new reset code.' });
    }

    const hashedInput = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (user.otpCode !== hashedInput) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        clearOtpState(user);
      }
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    user.password = newPassword;
    user.isEmailVerified = true;
    clearOtpState(user);
    await user.save();

    res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    console.error('Reset password failed:', error.message);
    res.status(500).json({ message: 'Unable to reset password right now' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Enter a valid email and password' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(503).json({ message: 'Authentication is temporarily unavailable' });
    }
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isEmailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address before signing in',
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    const verificationStatus = user.idVerification?.submittedAt
      ? user.idVerification.status || 'pending'
      : 'unverified';

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified !== false,
      verificationStatus,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ message: 'Unable to sign in right now' });
  }
};

const getMe = async (req, res) => {
  const verificationStatus = req.user.idVerification?.submittedAt
    ? req.user.idVerification.status || 'pending'
    : 'unverified';

  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isEmailVerified: req.user.isEmailVerified !== false,
    verificationStatus,
  });
};

// Submit ID for verification (required after account creation, for clients and musicians)
const ID_DOCUMENT_TYPES = [
  'Passport',
  "Driver's License",
  'National ID (PhilID)',
  'UMID',
  "Voter's ID",
  'PRC ID',
];

const MAX_ID_DATA_URI_LENGTH = 4_200_000;

const isValidIdDocument = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  const dataUriMatch = trimmed.match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i
  );
  if (dataUriMatch) {
    return trimmed.length <= MAX_ID_DATA_URI_LENGTH;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const submitIdVerification = async (req, res) => {
  const { idDocumentType, idDocumentUrl } = req.body;

  try {
    if (!ID_DOCUMENT_TYPES.includes(idDocumentType)) {
      return res.status(400).json({ message: 'Choose a valid ID type' });
    }
    if (!isValidIdDocument(idDocumentUrl)) {
      return res.status(400).json({ message: 'Upload a valid photo of your ID' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.idVerification = {
      status: 'pending',
      idDocumentType,
      idDocumentUrl: idDocumentUrl.trim(),
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: '',
    };

    await user.save();

    res.json({
      message: 'ID submitted for verification',
      verification: user.idVerification,
    });
  } catch (error) {
    console.error('ID verification submission failed:', error.message);
    res.status(500).json({ message: 'Unable to submit ID for verification' });
  }
};

// Get ID verification status
const getIdVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('idVerification');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const submission = user.idVerification && user.idVerification.submittedAt ? user.idVerification : null;

    res.json({
      verification: submission,
    });
  } catch (error) {
    console.error('Failed to get verification status:', error.message);
    res.status(500).json({ message: 'Unable to retrieve verification status' });
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  loginUser,
  getMe,
  submitIdVerification,
  getIdVerificationStatus,
  generateToken,
};