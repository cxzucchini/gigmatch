const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingMessage = require('../models/BookingMessage');
const Musician = require('../models/Musician');
const { createNotification } = require('../services/pushNotifications');

const getParticipantBooking = async (bookingId, userId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const error = new Error('Invalid booking ID');
    error.status = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }

  const musician = await Musician.findById(booking.musician).select('user');
  const isClient = booking.client.equals(userId);
  const isMusician = musician?.user.equals(userId);
  if (!isClient && !isMusician) {
    const error = new Error('Only the client and assigned musician can access this conversation');
    error.status = 403;
    throw error;
  }

  return booking;
};

const listBookingMessages = async (req, res, next) => {
  try {
    const booking = await getParticipantBooking(req.params.id, req.user._id);
    const messages = await BookingMessage.find({ booking: booking._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name')
      .lean();
    return res.json({ items: messages.reverse() });
  } catch (error) {
    return next(error);
  }
};

const createBookingMessage = async (req, res, next) => {
  if (typeof req.body.text !== 'string' || !req.body.text.trim() || req.body.text.trim().length > 2000) {
    return res.status(400).json({ message: 'Message must contain 1 to 2,000 characters' });
  }

  try {
    const booking = await getParticipantBooking(req.params.id, req.user._id);
    const message = await BookingMessage.create({
      booking: booking._id,
      sender: req.user._id,
      text: req.body.text.trim(),
    });
    await message.populate('sender', 'name');
    const musician = await Musician.findById(booking.musician).select('user');
    const recipientId = booking.client.equals(req.user._id) ? musician?.user : booking.client;
    if (recipientId) {
      try {
        await createNotification({
          recipientId,
          bookingId: booking._id,
          title: `New message from ${req.user.name}`,
          body: req.body.text.trim().slice(0, 160),
          url: `/messages/${booking._id}?eventType=${encodeURIComponent(booking.eventType)}`,
        });
      } catch (notificationError) {
        console.error(`Message notification could not be saved for booking ${booking._id}: ${notificationError.message}`);
      }
    }
    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

const deleteBookingMessages = async (req, res, next) => {
  try {
    const booking = await getParticipantBooking(req.params.id, req.user._id);
    const result = await BookingMessage.deleteMany({ booking: booking._id });
    return res.json({ message: 'Chat deleted', deletedCount: result.deletedCount || 0 });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listBookingMessages, createBookingMessage, deleteBookingMessages };
