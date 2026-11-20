const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PushToken = require('../models/PushToken');
const { EXPO_PUSH_TOKEN_PATTERN } = require('../services/pushNotifications');

const listMyNotifications = async (req, res, next) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);
    return res.json({ items, unreadCount });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    return res.json(notification);
  } catch (error) {
    return next(error);
  }
};

const bulkMarkNotificationsRead = async (req, res, next) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: 'ids array is required' });
  }
  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  try {
    await Notification.updateMany(
      { _id: { $in: validIds }, recipient: req.user._id },
      { $set: { readAt: new Date() } },
    );
    return res.json({ success: true, count: validIds.length });
  } catch (error) {
    return next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return next(error);
  }
};

const bulkDeleteNotifications = async (req, res, next) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: 'ids array is required' });
  }
  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  try {
    const result = await Notification.deleteMany({
      _id: { $in: validIds },
      recipient: req.user._id,
    });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    return next(error);
  }
};

const registerPushToken = async (req, res, next) => {
  const { token, platform } = req.body;
  if (typeof token !== 'string' || token.length > 200 || !EXPO_PUSH_TOKEN_PATTERN.test(token)) {
    return res.status(400).json({ message: 'A valid Expo push token is required' });
  }
  if (!['android', 'ios'].includes(platform)) {
    return res.status(400).json({ message: 'Push platform must be android or ios' });
  }
  try {
    const registration = await PushToken.findOneAndUpdate(
      { token },
      { $set: { user: req.user._id, platform, lastRegisteredAt: new Date() } },
      { new: true, upsert: true, runValidators: true },
    );
    return res.status(200).json({ registered: true, id: registration._id });
  } catch (error) {
    return next(error);
  }
};

const removePushToken = async (req, res, next) => {
  if (typeof req.body.token !== 'string' || !EXPO_PUSH_TOKEN_PATTERN.test(req.body.token)) {
    return res.status(400).json({ message: 'A valid Expo push token is required' });
  }
  try {
    await PushToken.deleteOne({ user: req.user._id, token: req.body.token });
    return res.json({ registered: false });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMyNotifications,
  markNotificationRead,
  bulkMarkNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
  bulkDeleteNotifications,
  registerPushToken,
  removePushToken,
};
