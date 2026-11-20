const express = require('express');
const { getClientProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

// Client profile viewable by the client themself, artists, and admins.
router.get('/:id/profile', protect, authorizeRoles('client', 'musician', 'admin'), getClientProfile);

module.exports = router;
