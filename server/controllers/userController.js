const Booking = require('../models/Booking');
const Musician = require('../models/Musician');
const User = require('../models/User');

/**
 * Public-ish client profile for artists (and the client themself / admins) to view.
 *
 * - Identity fields (name, member since, verification badge) are shared with any
 *   authenticated viewer.
 * - A musician only ever sees the bookings THEY share with the client, never the
 *   client's bookings with other performers.
 * - The client themself and admins see all of the client's bookings.
 */
const getClientProfile = async (req, res, next) => {
  try {
    const client = await User.findById(req.params.id).select(
      'name role isVerified idVerification createdAt'
    );
    if (!client || client.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    const isSelf = String(req.user._id) === String(client._id);
    const isAdmin = req.user.role === 'admin';

    // Clients may only view their own profile. Artist and admin viewers proceed
    // (musician viewers get the shared-bookings-only filter below).
    if (req.user.role === 'client' && !isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    let musicianProfileId = null;
    if (req.user.role === 'musician') {
      musicianProfileId = await Musician.findOne({ user: req.user._id })
        .select('_id')
        .then((profile) => profile?._id);
    }
    const sharedOnly = req.user.role === 'musician' && !isSelf && !isAdmin;

    const filter = { client: client._id };
    if (sharedOnly) filter.musician = musicianProfileId;

    const bookings = await Booking.find(filter)
      .select('eventType eventDate startMinute durationHours venue serviceArea budget status')
      .sort({ eventDate: -1, startMinute: -1 })
      .limit(30)
      .lean();

    const now = Date.now();
    const idVerification =
      client.idVerification && client.idVerification.submittedAt
        ? {
            status: client.idVerification.status,
            // Only reveal which document type was accepted once approved.
            idDocumentType:
              client.idVerification.status === 'approved'
                ? client.idVerification.idDocumentType
                : undefined,
            submittedAt: client.idVerification.submittedAt,
          }
        : null;

    return res.json({
      profile: {
        _id: client._id,
        name: client.name,
        memberSince: client.createdAt,
        isVerified: Boolean(client.isVerified),
        idVerification,
      },
      viewerIsMusician: sharedOnly,
      summary: {
        totalBookings: bookings.length,
        upcoming: bookings.filter(
          (booking) =>
            ['pending', 'accepted'].includes(booking.status) &&
            new Date(booking.eventDate).getTime() >= now
        ).length,
        completed: bookings.filter((booking) => booking.status === 'completed').length,
      },
      bookings,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getClientProfile };
