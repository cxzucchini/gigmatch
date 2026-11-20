const PushToken = require('../models/PushToken');
const Notification = require('../models/Notification');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TOKEN_PATTERN = /^(Expo|Exponent)PushToken\[[^\]]+\]$/;

const sendPush = async (recipientId, notification) => {
  const registrations = await PushToken.find({ user: recipientId }).select('token');
  if (!registrations.length) return;

  for (let offset = 0; offset < registrations.length; offset += 100) {
    const batch = registrations.slice(offset, offset + 100);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map(({ token }) => ({
          to: token,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: { url: notification.url, notificationId: String(notification._id) },
          channelId: 'booking-updates',
          priority: 'high',
        }))),
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(`Expo push service returned HTTP ${response.status} for notification ${notification._id}`);
        continue;
      }

      const result = await response.json();
      for (const [index, ticket] of (result.data || []).entries()) {
        if (ticket.status === 'error') {
          console.warn(`Expo push delivery failed for notification ${notification._id}: ${ticket.message || ticket.details?.error || 'unknown error'}`);
          if (ticket.details?.error === 'DeviceNotRegistered' && batch[index]) {
            await PushToken.deleteOne({ token: batch[index].token });
          }
        }
      }
    } catch (error) {
      console.warn(`Expo push dispatch failed for notification ${notification._id}: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
};

const createNotification = async ({ recipientId, bookingId, title, body, url }) => {
  const notification = await Notification.create({
    recipient: recipientId,
    booking: bookingId,
    title,
    body,
    url,
  });
  await sendPush(recipientId, notification);
  return notification;
};

module.exports = { createNotification, EXPO_PUSH_TOKEN_PATTERN };
