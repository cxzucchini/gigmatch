const express = require('express');
const {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  deleteBooking,
} = require('../controllers/bookingController');
const {
  createBookingMessage,
  listBookingMessages,
  deleteBookingMessages,
} = require('../controllers/bookingMessageController');
const { protect } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.use(protect);
router.get('/mine', authorizeRoles('client', 'musician'), listMyBookings);
router.post('/', authorizeRoles('client'), createBooking);
router.get('/:id/messages', authorizeRoles('client', 'musician'), listBookingMessages);
router.post('/:id/messages', authorizeRoles('client', 'musician'), createBookingMessage);
router.delete('/:id/messages', authorizeRoles('client', 'musician'), deleteBookingMessages);
router.patch('/:id/status', authorizeRoles('client', 'musician'), updateBookingStatus);
router.delete('/:id', authorizeRoles('client'), deleteBooking);

module.exports = router;
