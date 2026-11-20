const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listMyNotifications,
  markNotificationRead,
  bulkMarkNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
  bulkDeleteNotifications,
  registerPushToken,
  removePushToken,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);
router.get('/mine', listMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/bulk-read', bulkMarkNotificationsRead);
router.delete('/bulk-delete', bulkDeleteNotifications);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);
router.post('/push-token', registerPushToken);
router.delete('/push-token', removePushToken);

module.exports = router;
