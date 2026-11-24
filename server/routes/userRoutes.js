const express = require('express');
const { getClientProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const User = require('../models/User');

const router = express.Router();

// Current signed-in user's editable profile (used by client profile setup).
router.get('/me/profile', protect, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const foundUser = await User.findById(userId).select('-password');
    if (!foundUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      profile: {
        name: foundUser.name || '',
        email: foundUser.email || '',
        phone: foundUser.phone || '',
        city: foundUser.city || foundUser.location || '',
        bio: foundUser.bio || '',
        avatarUrl: foundUser.avatarUrl || foundUser.profilePicture || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/me/profile', protect, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const foundUser = await User.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      foundUser.name = req.body.name.trim();
    }
    if (typeof req.body.phone === 'string') {
      foundUser.phone = req.body.phone.trim();
    }
    if (typeof req.body.city === 'string') {
      foundUser.city = req.body.city.trim();
    }
    if (typeof req.body.bio === 'string') {
      foundUser.bio = req.body.bio.trim();
    }

    const nextAvatar = req.body.avatarUrl ?? req.body.profilePicture;
    if (typeof nextAvatar === 'string') {
      foundUser.avatarUrl = nextAvatar;
      foundUser.profilePicture = nextAvatar;
    }

    await foundUser.save();

    return res.json({
      message: 'Profile updated',
      profile: {
        name: foundUser.name || '',
        email: foundUser.email || '',
        phone: foundUser.phone || '',
        city: foundUser.city || '',
        bio: foundUser.bio || '',
        avatarUrl: foundUser.avatarUrl || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Client profile viewable by the client themself, artists, and admins.
router.get('/:id/profile', protect, authorizeRoles('client', 'musician', 'admin'), getClientProfile);

module.exports = router;