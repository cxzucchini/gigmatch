const mongoose = require('mongoose');

const musicianSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 1200,
    default: '',
  },
  genres: {
    type: [String],
    default: [],
    validate: {
      validator: (genres) => genres.length <= 12,
      message: 'A musician can list up to 12 genres',
    },
  },
  experienceYears: {
    type: Number,
    min: 0,
    max: 80,
    default: 0,
  },
  hourlyRate: {
    type: Number,
    min: 0,
    max: 1000000,
    default: 0,
  },
  serviceArea: {
    type: String,
    trim: true,
    maxlength: 120,
    default: '',
  },
  contactPhone: {
    type: String,
    trim: true,
    maxlength: 24,
    default: '',
  },
  serviceAreaCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      validate: {
        // Absent/empty coordinates are valid: profiles may exist without a
        // geocoded service area, and upsert update-validation casts untouched
        // nested paths to an empty array.
        validator: (coordinates) => (
          !Array.isArray(coordinates)
          || coordinates.length === 0
          || (
            coordinates.length === 2
            && coordinates.every(Number.isFinite)
            && Math.abs(coordinates[0]) <= 180
            && Math.abs(coordinates[1]) <= 90
          )
        ),
        message: 'Service area coordinates must be a valid longitude and latitude',
      },
    },
  },
  profileImageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    gallery: {
      type: [String],
      default: [],
      validate: {
        validator: (gallery) => gallery.length <= 12,
        message: 'A musician can upload up to 12 gallery photos',
      },
    },
    playlist: {
      type: [{
        title: {
          type: String,
          trim: true,
          maxlength: 120,
          default: '',
        },
        url: {
          type: String,
          trim: true,
          maxlength: 2048,
          default: '',
        },
        publicId: {
          type: String,
          trim: true,
          maxlength: 255,
          default: '',
        },
        duration: {
          type: Number,
          min: 0,
          default: 0,
        },
      }],
      default: [],
      validate: {
        validator: (playlist) => playlist.length <= 12,
        message: 'A musician can upload up to 12 playlist tracks',
      },
    },
  published: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    govIdImage: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    govIdVerifiedAt: {
      type: Date,
      default: null,
    },
    socialLinks: {
      type: Map,
      of: String,
      default: {},
    },
    performanceClips: [{
      url: {
        type: String,
        trim: true,
        maxlength: 2048,
      },
      title: {
        type: String,
        trim: true,
        maxlength: 120,
      },
      duration: {
        type: String,
        trim: true,
        maxlength: 20,
      },
    }],
    unavailableDates: {
    type: [String],
    default: [],
    validate: {
      validator: (dates) => dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
      message: 'Unavailable dates must use YYYY-MM-DD format',
    },
  },
  bookingRevision: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

musicianSchema.index({ published: 1, genres: 1, hourlyRate: 1 });
musicianSchema.index({ serviceAreaCoordinates: '2dsphere' });

module.exports = mongoose.model('Musician', musicianSchema);
