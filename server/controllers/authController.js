const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password, role });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('Registration failed:', error.message);
    res.status(500).json({ message: 'Unable to create account right now' });
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
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ message: 'Unable to sign in right now' });
  }
};

const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
};

// Submit ID for verification (required after account creation, for clients and musicians)
const ID_DOCUMENT_TYPES = ['Passport', "Driver's License", 'National ID (PhilID)', 'UMID', "Voter's ID", 'PRC ID'];

const submitIdVerification = async (req, res) => {
  const { idDocumentType, idDocumentUrl } = req.body;

  try {
    if (!ID_DOCUMENT_TYPES.includes(idDocumentType)) {
      return res.status(400).json({ message: 'Choose a valid ID type' });
    }
    if (typeof idDocumentUrl !== 'string' || !idDocumentUrl.trim()) {
      return res.status(400).json({ message: 'Upload a photo of your ID' });
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

    // Only count a real submission: schema defaults create the subdocument with
    // status 'pending' even when the user has never uploaded anything, so use
    // submittedAt as the marker of an actual submission.
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
  loginUser,
  getMe,
  submitIdVerification,
  getIdVerificationStatus,
  generateToken,
};
