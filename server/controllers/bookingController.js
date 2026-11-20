const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingMessage = require('../models/BookingMessage');
const Musician = require('../models/Musician');
const { isValidEventDate, getStartMinute, getEventInstant, isOverlapping } = require('../services/bookingSchedule');
const { geocodeLocation } = require('../services/locationGeocoding');
const { createNotification } = require('../services/pushNotifications');

const createBooking = async (req, res, next) => {
  const {
    musicianId,
    eventType,
    eventDate,
    startTime,
    eventTimezone = 'Asia/Manila',
    durationHours,
    venue,
    serviceArea,
    budget,
    paymentPreference,
    notes,
  } = req.body;

  if (!mongoose.isValidObjectId(musicianId)) {
    return res.status(400).json({ message: 'A valid musician profile is required' });
  }
  if (typeof eventType !== 'string' || !eventType.trim() || eventType.trim().length > 80) {
    return res.status(400).json({ message: 'Event type is required and must be 80 characters or fewer' });
  }
  if (!isValidEventDate(eventDate)) {
    return res.status(400).json({ message: 'Event date must be a valid YYYY-MM-DD date' });
  }
  const startMinute = getStartMinute(startTime);
  if (startMinute === null) {
    return res.status(400).json({ message: 'Start time must use 24-hour HH:mm format' });
  }
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 12) {
    return res.status(400).json({ message: 'Performance length must be between 1 and 12 whole hours' });
  }
  if (startMinute + durationHours * 60 > 1440) {
    return res.status(400).json({ message: 'Performance must finish on the same calendar day' });
  }
  if (eventTimezone !== 'Asia/Manila') {
    return res.status(400).json({ message: 'Event time zone must be Asia/Manila' });
  }
  const startsAt = getEventInstant(eventDate, startTime, eventTimezone);
  if (startsAt <= new Date()) {
    return res.status(400).json({ message: 'Event must be scheduled for a future date and time' });
  }
  if (typeof venue !== 'string' || !venue.trim() || venue.trim().length > 160) {
    return res.status(400).json({ message: 'Venue is required and must be 160 characters or fewer' });
  }
  if (typeof serviceArea !== 'string' || !serviceArea.trim() || serviceArea.trim().length > 120) {
    return res.status(400).json({ message: 'Service area is required and must be 120 characters or fewer' });
  }
  if (budget !== undefined && (!Number.isFinite(budget) || budget < 0 || budget > 10000000)) {
    return res.status(400).json({ message: 'Budget must be a non-negative number of 10,000,000 or less' });
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    return res.status(400).json({ message: 'Notes must be 1,000 characters or fewer' });
  }
  const allowedPaymentPreferences = ['cash', 'bank_transfer', 'gcash', 'maya', 'other'];
  if (paymentPreference !== undefined && !allowedPaymentPreferences.includes(paymentPreference)) {
    return res.status(400).json({ message: 'Select a supported payment preference' });
  }

  try {
    const musician = await Musician.findOne({ _id: musicianId, published: true });
    if (!musician) return res.status(404).json({ message: 'Published musician profile not found' });

    if (musician.unavailableDates.includes(eventDate)) {
      return res.status(409).json({ message: 'This musician marked that date as unavailable. Choose another date.' });
    }
    const dayStart = new Date(`${eventDate}T00:00:00.000Z`);
    const acceptedBookings = await Booking.find({
      musician: musician._id,
      eventDate: dayStart,
      status: 'accepted',
    }).select('startMinute durationHours');
    const hasConflict = acceptedBookings.some((booking) => isOverlapping(
      startMinute,
      durationHours,
      booking.startMinute,
      booking.durationHours,
    ));
    if (hasConflict) {
      return res.status(409).json({ message: 'The musician already has a confirmed booking during that time. Choose another time or date.' });
    }

    let venueCoordinates;
    let mapWarning = '';
    try {
      const coordinates = await geocodeLocation(`${venue.trim()}, ${serviceArea.trim()}`);
      if (coordinates) {
        venueCoordinates = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      } else {
        mapWarning = 'Booking created, but the venue could not be located for the map.';
      }
    } catch (geocodeError) {
      console.warn('Booking venue map lookup failed:', geocodeError.message);
      mapWarning = 'Booking created, but the venue map is unavailable right now.';
    }

    const booking = await Booking.create({
      client: req.user._id,
      musician: musician._id,
      eventType: eventType.trim(),
      eventDate: new Date(`${eventDate}T00:00:00.000Z`),
      eventTimezone,
      startMinute,
      durationHours,
      venue: venue.trim(),
      ...(venueCoordinates ? { venueCoordinates } : {}),
      serviceArea: serviceArea.trim(),
      budget,
      paymentPreference: paymentPreference || 'other',
      notes: notes?.trim() || '',
    });

    try {
      await createNotification({
        recipientId: musician.user,
        bookingId: booking._id,
        title: 'New booking request',
        body: `${eventType.trim()} · ${eventDate}`,
        url: `/bookings?highlight=${booking._id}`,
      });
    } catch (notificationError) {
      console.error(`Booking notification could not be saved for ${booking._id}: ${notificationError.message}`);
    }

    return res.status(201).json({
      ...booking.toObject(),
      ...(mapWarning ? { mapWarning } : {}),
    });
  } catch (error) {
    return next(error);
  }
};

const listMyBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const filter = req.user.role === 'client'
      ? { client: req.user._id }
      : { musician: await Musician.findOne({ user: req.user._id }).select('_id').then((profile) => profile?._id) };

    if (req.user.role === 'musician' && !filter.musician) {
      return res.json({ items: [], page, limit, total: 0, pages: 0 });
    }

    const [bookingDocuments, total] = await Promise.all([
      Booking.find(filter)
        .populate('client', 'name email')
        .populate({
          path: 'musician',
          select: 'user serviceArea serviceAreaCoordinates genres hourlyRate profileImageUrl',
          populate: { path: 'user', select: 'name' },
        })
        .sort({ eventDate: 1, startMinute: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const items = bookingDocuments.map((booking) => {
      const item = booking.toObject();
      const coordinates = item.musician?.serviceAreaCoordinates?.coordinates;
      if (coordinates?.length === 2) {
        item.musician.mapCoordinates = {
          latitude: Number(coordinates[1].toFixed(2)),
          longitude: Number(coordinates[0].toFixed(2)),
        };
      }
      if (item.musician) delete item.musician.serviceAreaCoordinates;
      return item;
    });
    return res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  const { status } = req.body;
  if (!['accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Select a valid booking status' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid booking ID' });
  }

  const session = await mongoose.startSession();
  let notificationRecipient;
  try {
    let updatedBooking;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const musicianProfile = await Musician.findById(booking.musician).session(session);
      const isClient = req.user.role === 'client' && booking.client.equals(req.user._id);
      const isMusician = req.user.role === 'musician'
        && musicianProfile
        && musicianProfile.user.equals(req.user._id);
      notificationRecipient = isMusician ? booking.client : musicianProfile?.user;
      if (!isClient && !isMusician) {
        const error = new Error('You do not have permission to update this booking');
        error.status = 403;
        throw error;
      }

      if (status === 'accepted') {
        if (!isMusician || booking.status !== 'pending' || !musicianProfile) {
          const error = new Error('Only the assigned musician can accept a pending booking');
          error.status = 409;
          throw error;
        }
        if (musicianProfile.unavailableDates.includes(booking.eventDate.toISOString().slice(0, 10))) {
          const error = new Error('This musician marked the event date as unavailable');
          error.status = 409;
          throw error;
        }

        await Musician.updateOne(
          { _id: musicianProfile._id },
          { $inc: { bookingRevision: 1 } },
          { session },
        );

        const dayStart = new Date(booking.eventDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const activeBookings = await Booking.find({
          _id: { $ne: booking._id },
          musician: musicianProfile._id,
          eventDate: dayStart,
          status: { $in: ['accepted'] },
        }).session(session);
        const hasConflict = activeBookings.some((other) => isOverlapping(
          booking.startMinute,
          booking.durationHours,
          other.startMinute,
          other.durationHours,
        ));
        if (hasConflict) {
          const error = new Error('This musician already has an accepted booking during that time');
          error.status = 409;
          throw error;
        }
      } else if (status === 'rejected') {
        if (!isMusician || booking.status !== 'pending') {
          const error = new Error('Only the assigned musician can reject a pending booking');
          error.status = 409;
          throw error;
        }
      } else if (status === 'cancelled') {
        if (!isClient || !['pending', 'accepted'].includes(booking.status)) {
          const error = new Error('Only the client can cancel a pending or accepted booking');
          error.status = 409;
          throw error;
        }
      } else if (!isMusician || booking.status !== 'accepted') {
        const error = new Error('Only the assigned musician can complete an accepted booking');
        error.status = 409;
        throw error;
      }

      booking.status = status;
      updatedBooking = await booking.save({ session });
    });

    try {
      await createNotification({
        recipientId: notificationRecipient,
        bookingId: updatedBooking._id,
        title: `Booking ${status}`,
        body: `${updatedBooking.eventType} · ${updatedBooking.eventDate.toISOString().slice(0, 10)}`,
        url: `/bookings?highlight=${updatedBooking._id}`,
      });
    } catch (notificationError) {
      console.error(`Booking status notification could not be saved for ${updatedBooking._id}: ${notificationError.message}`);
    }
    return res.json(updatedBooking);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    await session.endSession();
  }
};

const deleteBooking = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid booking ID' });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }
      const isClient = req.user.role === 'client' && booking.client.equals(req.user._id);
      if (!isClient) {
        const error = new Error('You do not have permission to delete this booking');
        error.status = 403;
        throw error;
      }
      if (booking.status !== 'cancelled') {
        const error = new Error('Only cancelled bookings can be deleted');
        error.status = 409;
        throw error;
      }
      // Chat history belongs to the booking; remove it with the record.
      await BookingMessage.deleteMany({ booking: booking._id }).session(session);
      await Booking.deleteOne({ _id: booking._id }).session(session);
    });
    return res.json({ message: 'Booking deleted' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = { createBooking, listMyBookings, updateBookingStatus, deleteBooking };
