const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  token: { type: String, required: true, unique: true, trim: true },
  platform: { type: String, enum: ['android', 'ios'], required: true },
  lastRegisteredAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('PushToken', pushTokenSchema);
