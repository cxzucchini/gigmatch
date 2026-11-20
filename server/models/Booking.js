const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  musician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Musician',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  eventDate: {
    type: Date,
    required: true,
    index: true,
  },
  eventTimezone: {
    type: String,
    enum: ['Asia/Manila'],
    default: 'Asia/Manila',
  },
  startMinute: {
    type: Number,
    required: true,
    min: 0,
    max: 1439,
  },
  durationHours: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  venue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  venueCoordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  serviceArea: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  budget: {
    type: Number,
    min: 0,
    max: 10000000,
  },
  paymentPreference: {
    type: String,
    enum: ['cash', 'bank_transfer', 'gcash', 'maya', 'other'],
    default: 'other',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
    index: true,
  },
}, {
  timestamps: true,
});

bookingSchema.index({ musician: 1, eventDate: 1, status: 1, startMinute: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
