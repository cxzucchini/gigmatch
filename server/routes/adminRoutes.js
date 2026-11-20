const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getPendingVerifications,
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  approveMultiple,
  getStats,
  getIdVerifications,
  getIdVerificationDetail,
  approveIdVerification,
  rejectIdVerification,
} = require('../controllers/adminController');

/**
 * @route   GET /api/admin/verifications/pending
 * @desc    Get all profiles pending verification
 * @access  Admin only
 */
router.get('/verifications/pending', protect, adminOnly, getPendingVerifications);

/**
 * @route   GET /api/admin/verifications/:id
 * @desc    Get verification detail for a specific profile
 * @access  Admin only
 */
router.get('/verifications/:id', protect, adminOnly, getVerificationDetail);

/**
 * @route   POST /api/admin/verifications/:id/approve
 * @desc    Approve a musician's verification
 * @access  Admin only
 */
router.post('/verifications/:id/approve', protect, adminOnly, approveVerification);

/**
 * @route   POST /api/admin/verifications/:id/reject
 * @desc    Reject a musician's verification
 * @access  Admin only
 */
router.post('/verifications/:id/reject', protect, adminOnly, rejectVerification);

/**
 * @route   POST /api/admin/verifications/approve-multiple
 * @desc    Approve multiple musician verifications at once
 * @access  Admin only
 */
router.post('/verifications/approve-multiple', protect, adminOnly, approveMultiple);

/**
 * @route   GET /api/admin/stats
 * @desc    Dashboard counters
 * @access  Admin only
 */
router.get('/stats', protect, adminOnly, getStats);

/**
 * @route   GET /api/admin/id-verifications
 * @desc    Account ID verification queue (required after signup)
 * @access  Admin only
 */
router.get('/id-verifications', protect, adminOnly, getIdVerifications);

/**
 * @route   GET /api/admin/id-verifications/:id
 * @desc    Account ID verification detail
 * @access  Admin only
 */
router.get('/id-verifications/:id', protect, adminOnly, getIdVerificationDetail);

/**
 * @route   POST /api/admin/id-verifications/:id/approve
 * @desc    Approve an account ID verification
 * @access  Admin only
 */
router.post('/id-verifications/:id/approve', protect, adminOnly, approveIdVerification);

/**
 * @route   POST /api/admin/id-verifications/:id/reject
 * @desc    Reject an account ID verification
 * @access  Admin only
 */
router.post('/id-verifications/:id/reject', protect, adminOnly, rejectIdVerification);

module.exports = router;