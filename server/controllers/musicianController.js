const mongoose = require('mongoose');
const Musician = require('../models/Musician');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { geocodeLocation, getDistanceKm } = require('../services/locationGeocoding');
const { isValidEventDate } = require('../services/bookingSchedule');

const getTodayInManila = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
};

const toPublicProfile = (profile, includeContactPhone = false) => ({
  _id: profile._id,
  userId: profile.user._id,
  name: profile.user.name,
  bio: profile.bio,
  genres: profile.genres,
  experienceYears: profile.experienceYears,
  hourlyRate: profile.hourlyRate,
  serviceArea: profile.serviceArea,
  profileImageUrl: profile.profileImageUrl,
  gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
  playlist: Array.isArray(profile.playlist) ? profile.playlist : [],
  verified: profile.verified,
  verificationStatus: profile.verificationStatus,
  socialLinks: profile.socialLinks,
  ...(includeContactPhone ? { contactPhone: profile.contactPhone || '' } : {}),
});

const listMusicians = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    // Show both verified and pending artists for discovery; admins can see all via their role
    const filter = { published: true, verificationStatus: { $in: ['pending', 'approved'] } };

    if (typeof req.query.genre === 'string' && req.query.genre.trim()) {
      filter.genres = new RegExp(`^${req.query.genre.trim().replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')}$`, 'i');
    }
    if (typeof req.query.location === 'string' && req.query.location.trim()) {
      filter.serviceArea = new RegExp(req.query.location.trim().replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&'), 'i');
    }
    if (req.query.minRate !== undefined || req.query.maxRate !== undefined) {
      filter.hourlyRate = {};
      if (req.query.minRate !== undefined) filter.hourlyRate.$gte = Number(req.query.minRate);
      if (req.query.maxRate !== undefined) filter.hourlyRate.$lte = Number(req.query.maxRate);
      if (Object.values(filter.hourlyRate).some((value) => !Number.isFinite(value) || value < 0)) {
        return res.status(400).json({ message: 'Rate filters must be non-negative numbers' });
      }
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const escapedQuery = req.query.q.trim().replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&');
      const matchingUsers = await User.find({
        name: new RegExp(escapedQuery, 'i'),
      }).select('_id').limit(100);
      filter.user = { $in: matchingUsers.map((user) => user._id) };
    }

    let profiles;
    let total;
    let items;
    if (typeof req.query.near === 'string' && req.query.near.trim()) {
      if (req.query.near.trim().length > 180) {
        return res.status(400).json({ message: 'Event location must be 180 characters or fewer' });
      }
      const eventCoordinates = await geocodeLocation(req.query.near);
      if (!eventCoordinates) {
        return res.status(422).json({ message: 'Could not locate that event venue or city. Try a nearby city or general area.' });
      }
      const skip = (page - 1) * limit;
      const nearFilter = {
        ...filter,
        serviceAreaCoordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [eventCoordinates.longitude, eventCoordinates.latitude],
            },
          },
        },
      };
      const locationlessFilter = {
        ...filter,
        'serviceAreaCoordinates.coordinates.0': { $exists: false },
      };
      const [geocodedCount, locationlessCount] = await Promise.all([
        Musician.countDocuments({
          ...filter,
          'serviceAreaCoordinates.coordinates.0': { $exists: true },
        }),
        Musician.countDocuments(locationlessFilter),
      ]);
      const nearbySkip = Math.min(skip, geocodedCount);
      const nearbyLimit = Math.max(0, limit - Math.max(0, skip - geocodedCount));
      const locationlessSkip = Math.max(0, skip - geocodedCount);
      const locationlessLimit = Math.max(0, limit - nearbyLimit);
      const [nearbyProfiles, locationlessProfiles] = await Promise.all([
        nearbyLimit
          ? Musician.find(nearFilter)
            .populate('user', 'name')
            .skip(nearbySkip)
            .limit(nearbyLimit)
          : [],
        locationlessLimit
          ? Musician.find(locationlessFilter)
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .skip(locationlessSkip)
            .limit(locationlessLimit)
          : [],
      ]);
      profiles = [...nearbyProfiles, ...locationlessProfiles];
      total = geocodedCount + locationlessCount;
      items = profiles.map((profile) => {
        const [longitude, latitude] = profile.serviceAreaCoordinates?.coordinates || [];
        return {
          ...toPublicProfile(profile),
          ...(Number.isFinite(latitude) && Number.isFinite(longitude)
            ? {
              distanceKm: getDistanceKm(eventCoordinates, { latitude, longitude }),
              mapCoordinates: {
                latitude: Number(latitude.toFixed(2)),
                longitude: Number(longitude.toFixed(2)),
              },
            }
            : {}
          ),
        };
      });
      res.set('Cache-Control', 'no-store');
      return res.json({
        items,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        origin: eventCoordinates,
      });
    } else {
      [profiles, total] = await Promise.all([
        Musician.find(filter)
          .populate('user', 'name')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Musician.countDocuments(filter),
      ]);
      items = profiles.map(toPublicProfile);
    }

    return res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

const getMusician = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid musician profile ID' });
    }
    const profile = await Musician.findOne({
      _id: req.params.id,
      published: true,
      verificationStatus: { $in: ['pending', 'approved'] },
    }).populate('user', 'name');
    if (!profile) return res.status(404).json({ message: 'Musician profile not found' });
    return res.json(toPublicProfile(profile, true));
  } catch (error) {
    return next(error);
  }
};

const getMusicianAvailability = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid musician profile ID' });
    }
    const profile = await Musician.findOne({
      _id: req.params.id,
      published: true,
      verificationStatus: { $in: ['pending', 'approved'] },
    }).select('unavailableDates');
    if (!profile) return res.status(404).json({ message: 'Published musician profile not found' });

    const todayInManila = getTodayInManila();
    const today = new Date(`${todayInManila}T00:00:00.000Z`);
    const confirmedBookings = await Booking.find({
      musician: profile._id,
      status: 'accepted',
      eventDate: { $gte: today },
    }).select('eventDate');
    res.set('Cache-Control', 'no-store');
    return res.json({
      unavailableDates: profile.unavailableDates.filter((date) => date >= todayInManila),
      bookedDates: [...new Set(confirmedBookings.map((booking) => booking.eventDate.toISOString().slice(0, 10)))],
    });
  } catch (error) {
    return next(error);
  }
};

const getMyMusicianProfile = async (req, res, next) => {
  try {
    const profile = await Musician.findOne({ user: req.user._id }).populate('user', 'name');
    if (!profile) return res.status(404).json({ message: 'Create your musician profile first' });
    return res.json({
      ...toPublicProfile(profile, true),
      published: profile.published,
      verified: profile.verified,
      verificationStatus: profile.verificationStatus,
    });
  } catch (error) {
    return next(error);
  }
};

const getMyAvailability = async (req, res, next) => {
  try {
    const profile = await Musician.findOne({ user: req.user._id }).select('unavailableDates');
    const today = getTodayInManila();
    return res.json({ unavailableDates: (profile?.unavailableDates || []).filter((date) => date >= today) });
  } catch (error) {
    return next(error);
  }
};

const updateMyAvailability = async (req, res, next) => {
  const { date, unavailable } = req.body;
  if (!isValidEventDate(date)) {
    return res.status(400).json({ message: 'Date must be a valid YYYY-MM-DD date' });
  }
  if (typeof unavailable !== 'boolean') {
    return res.status(400).json({ message: 'Unavailable must be true or false' });
  }

  const todayInManila = getTodayInManila();
  if (date < todayInManila) {
    return res.status(400).json({ message: 'Past dates cannot be changed' });
  }

  try {
    const profile = await Musician.findOneAndUpdate(
      { user: req.user._id },
      unavailable
        ? { $addToSet: { unavailableDates: date }, $inc: { bookingRevision: 1 } }
        : { $pull: { unavailableDates: date }, $inc: { bookingRevision: 1 } },
      { new: true, runValidators: true },
    ).select('unavailableDates');
    if (!profile) return res.status(409).json({ message: 'Save your musician profile before managing availability' });
    return res.json({ unavailableDates: profile.unavailableDates });
  } catch (error) {
    return next(error);
  }
};

const upsertMyMusicianProfile = async (req, res, next) => {
  const {
      bio,
      genres,
      experienceYears,
      hourlyRate,
      serviceArea,
      contactPhone,
      profileImageUrl,
      gallery,
      playlist,
      published,
      govIdImage,
      socialLinks,
    } = req.body;
  const existingProfile = await Musician.findOne({ user: req.user._id })
    .select('bio genres hourlyRate serviceArea serviceAreaCoordinates verificationStatus govIdImage socialLinks verified');

  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 1200)) {
    return res.status(400).json({ message: 'Bio must be 1,200 characters or fewer' });
  }
  if (genres !== undefined && (
    !Array.isArray(genres)
    || genres.length > 12
    || genres.some((genre) => typeof genre !== 'string' || !genre.trim() || genre.trim().length > 40)
  )) {
    return res.status(400).json({ message: 'Genres must be a list of up to 12 names, each 40 characters or fewer' });
  }
  if (experienceYears !== undefined && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80)) {
    return res.status(400).json({ message: 'Experience must be a whole number between 0 and 80 years' });
  }
  if (hourlyRate !== undefined && (!Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > 1000000)) {
    return res.status(400).json({ message: 'Set price must be a number between 0 and 1,000,000' });
  }
  if (serviceArea !== undefined && (typeof serviceArea !== 'string' || serviceArea.trim().length > 120)) {
    return res.status(400).json({ message: 'Service area must be 120 characters or fewer' });
  }
  if (contactPhone !== undefined) {
    if (typeof contactPhone !== 'string' || contactPhone.length > 24) {
      return res.status(400).json({ message: 'Contact number must be 24 characters or fewer' });
    }
    const trimmedPhone = contactPhone.trim();
    const phoneDigits = trimmedPhone.match(/\d/g) || [];
    if (trimmedPhone && (
      !/^\+?[\d\s().-]+$/.test(trimmedPhone)
      || phoneDigits.length < 7
      || phoneDigits.length > 15
    )) {
      return res.status(400).json({ message: 'Enter a valid contact number with 7 to 15 digits, or leave it blank' });
    }
  }
  if (profileImageUrl !== undefined && (
    typeof profileImageUrl !== 'string'
    || profileImageUrl.length > 2048
    // Accept hosted image URLs (http/https) and same-origin /uploads/ paths
    // written by the file-upload endpoint; still reject file://, data:, etc.
    || (profileImageUrl && !/^(https?:\/\/|\/uploads\/)/i.test(profileImageUrl))
  )) {
    return res.status(400).json({ message: 'Profile image must be a hosted image URL' });
  }
  if (gallery !== undefined && (
    !Array.isArray(gallery)
    || gallery.length > 12
    || gallery.some((url) => typeof url !== 'string' || !url.trim() || url.length > 2048)
  )) {
    return res.status(400).json({ message: 'Gallery must be a list of up to 12 photo URLs' });
  }
  if (playlist !== undefined) {
    if (!Array.isArray(playlist) || playlist.length > 12) {
      return res.status(400).json({ message: 'Playlist must be a list of up to 12 tracks' });
    }
    const hasInvalidTrack = playlist.some((track) => (
      !track
      || typeof track !== 'object'
      || typeof track.url !== 'string'
      || !track.url.trim()
      || track.url.length > 2048
      || (track.title !== undefined && typeof track.title !== 'string')
      || (track.publicId !== undefined && typeof track.publicId !== 'string')
      || (track.duration !== undefined && (!Number.isFinite(track.duration) || track.duration < 0))
    ));
    if (hasInvalidTrack) {
      return res.status(400).json({ message: 'Each playlist track needs a non-empty audio URL' });
    }
  }
  if (published !== undefined && typeof published !== 'boolean') {
    return res.status(400).json({ message: 'Published must be true or false' });
  }
  if (govIdImage !== undefined && (
    typeof govIdImage !== 'string' || govIdImage.length > 2048
  )) {
    return res.status(400).json({ message: 'Government ID image must be a valid URL (2048 chars max)' });
  }
  if (socialLinks !== undefined && (
    typeof socialLinks !== 'object'
    || Array.isArray(socialLinks)
    || socialLinks === null
    || Object.entries(socialLinks).length > 12
    || Object.entries(socialLinks).some(([key, value]) => (
      typeof key !== 'string'
      || !key.trim()
      || key.trim().length > 40
      || typeof value !== 'string'
      || !value.trim()
      || value.trim().length > 2048
      || !/^https?:\/\//i.test(value.trim())
    ))
  )) {
    return res.status(400).json({ message: 'Each social link must be a full https:// URL (up to 12 links)' });
  }
  if (published === true) {
    const effective = {
      bio: bio ?? existingProfile?.bio,
      genres: genres ?? existingProfile?.genres,
      hourlyRate: hourlyRate ?? existingProfile?.hourlyRate,
      serviceArea: serviceArea ?? existingProfile?.serviceArea,
    };
    if (
      !effective.bio?.trim()
      || !effective.genres?.length
      || !Number.isFinite(effective.hourlyRate)
      || effective.hourlyRate <= 0
      || !effective.serviceArea?.trim()
    ) {
      return res.status(400).json({
        message: 'To publish your profile, add a bio, at least one genre, a rate, and a service area',
      });
    }
  }

  const update = {};
  for (const [key, value] of Object.entries({
    bio,
    genres: genres?.map((genre) => genre.trim()),
    experienceYears,
    hourlyRate,
    serviceArea: serviceArea?.trim(),
    contactPhone: contactPhone?.trim(),
    profileImageUrl,
  gallery: gallery?.map((url) => url.trim()),
    playlist: playlist?.map((track) => ({
      title: typeof track.title === 'string' ? track.title.trim().slice(0, 120) : '',
      url: typeof track.url === 'string' ? track.url.trim() : '',
      publicId: typeof track.publicId === 'string' ? track.publicId.trim() : '',
      duration: Number.isFinite(track.duration) && track.duration >= 0 ? track.duration : 0,
    })),
    published,
    govIdImage,
    socialLinks: socialLinks
      ? Object.fromEntries(
        Object.entries(socialLinks).map(([key, value]) => [key.trim().toLowerCase(), value.trim()]),
      )
      : socialLinks,
  })) {
    if (value !== undefined) update[key] = value;
  }

  // Set verification status to pending when publishing
  // Also explicitly set verified: false for new profiles
  if (published === true && existingProfile?.verificationStatus !== 'approved') {
    update.verificationStatus = 'pending';
  }

  if (existingProfile?.verificationStatus === 'rejected') {
    update.verificationStatus = 'pending';
  }

  // Ensure verified is false for pending/rejected profiles
  if (update.verificationStatus || published === true) {
    update.verified = false;
  }

  try {
    const effectiveServiceArea = serviceArea === undefined
      ? existingProfile?.serviceArea || ''
      : serviceArea.trim();
    const locationChanged = serviceArea !== undefined
      && effectiveServiceArea !== (existingProfile?.serviceArea || '');
    const needsLocationUpdate = locationChanged
      || (effectiveServiceArea && !existingProfile?.serviceAreaCoordinates?.coordinates?.length);
    let locationWarning = '';
    let serviceAreaCoordinates = null;
    if (needsLocationUpdate && effectiveServiceArea) {
      try {
        const coordinates = await geocodeLocation(effectiveServiceArea);
        if (coordinates) {
          serviceAreaCoordinates = {
            type: 'Point',
            coordinates: [coordinates.longitude, coordinates.latitude],
          };
        } else {
          locationWarning = 'Profile saved, but the service area could not be located. Try a nearby city or general area for proximity sorting.';
        }
      } catch (locationError) {
        console.warn('Musician service area lookup failed:', locationError.message);
        locationWarning = 'Profile saved, but the service area could not be mapped right now. Try saving again later to enable proximity sorting.';
      }
    }

    const profile = await Musician.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          ...update,
          // Keep existing coordinates when a lookup fails instead of writing
          // null, which the schema validator rejects.
          ...(needsLocationUpdate && serviceAreaCoordinates ? { serviceAreaCoordinates } : {}),
        },
        // `verified` must NOT appear here: when publishing, `$set` also carries
        // `verified: false` (see update.verified above), and Mongo rejects an
        // upsert whose $set and $setOnInsert both touch the same path. The
        // schema default (verified: false) covers plain inserts.
        $setOnInsert: { user: req.user._id },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).populate('user', 'name');
    return res.json({
      ...toPublicProfile(profile, true),
      published: profile.published,
      verified: profile.verified,
      verificationStatus: profile.verificationStatus,
      ...(locationWarning ? { locationWarning } : {}),
    });
  } catch (error) {
    return next(error);
  }
};

const uploadGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image to upload' });
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.status(201).json({ url });
  } catch (error) {
    return next(error);
  }
};

const uploadPlaylistAudio = async (req, res, next) => {
  // Required lazily so a missing Cloudinary install never blocks the rest of
  // the controller; the dependency is declared in package.json.
  const { persistAudioUpload } = require('../services/audioStorage');
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose an audio file to upload' });
    }
    const rawName = String(req.file.originalname || '').replace(/\.[^.]+$/, '').trim();
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim().slice(0, 120)
      : (rawName || 'Untitled track').slice(0, 120);
    const rawDuration = Number(req.body?.duration);
    const duration = Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0;
    const stored = await persistAudioUpload(req.file, req.user?._id);
    const url = stored.url.startsWith('/uploads/')
      ? `${req.protocol}://${req.get('host')}${stored.url}`
      : stored.url;
    return res.status(201).json({ title, url, publicId: stored.publicId, duration });
  } catch (error) {
    return next(error);
  }
};

const deletePlaylistTrack = async (req, res, next) => {
  const { deleteAudioAsset } = require('../services/audioStorage');
  try {
    const requested = req.query?.publicId ?? req.body?.publicId;
    const publicId = typeof requested === 'string' ? requested.trim() : '';
    if (!publicId || publicId.length > 255) {
      return res.status(400).json({ message: 'A track publicId is required to delete' });
    }
    // Best-effort storage delete; the DB row is always removed so a failed
    // object delete cannot leave a phantom track on the profile.
    const storageDeleted = await deleteAudioAsset(publicId);
    await Musician.updateOne(
      { user: req.user._id },
      { $pull: { playlist: { publicId } } },
    );
    return res.json({ deleted: true, storageDeleted });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMusicians,
  getMusician,
  getMusicianAvailability,
  getMyMusicianProfile,
  upsertMyMusicianProfile,
  getMyAvailability,
  updateMyAvailability,
  uploadGalleryImage,
  uploadPlaylistAudio,
  deletePlaylistTrack,
};
