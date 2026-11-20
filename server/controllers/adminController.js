const Musician = require('../models/Musician');

const toVerifiedProfile = (profile) => ({
  ...profile,
  verification: {
    verified: profile.verified,
    verifiedAt: profile.govIdVerifiedAt,
    canDisplayBadge: profile.verified && profile.published,
  },
});

const getPendingVerifications = async (req, res, next) => {
  try {
    const profiles = await Musician.find({
      verificationStatus: 'pending',
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      items: profiles,
      count: profiles.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getVerificationDetail = async (req, res, next) => {
  try {
    const profile = await Musician.findOne({ _id: req.params.id })
      .populate('user', 'name email')
      .lean();

    if (!profile) {
      return res.status(404).json({ message: 'Musician profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
};

const approveVerification = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const profile = await Musician.findOneAndUpdate(
      { _id: req.params.id },
      {
        verified: true,
        verificationStatus: 'approved',
        govIdVerifiedAt: new Date(),
        $addToSet: { adminNotes: { admin: req.user.name, notes, createdAt: new Date() } },
      },
      { new: true, runValidators: true }
    ).populate('user', 'name').lean();

    if (!profile) {
      return res.status(404).json({ message: 'Musician profile not found' });
    }

    return res.json(toVerifiedProfile(profile));
  } catch (error) {
    return next(error);
  }
};

const rejectVerification = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const profile = await Musician.findOneAndUpdate(
      { _id: req.params.id },
      {
        verified: false,
        verificationStatus: 'rejected',
        $addToSet: { adminNotes: { admin: req.user.name, notes: `Rejected: ${reason}`, createdAt: new Date() } },
      },
      { new: true, runValidators: true }
    ).populate('user', 'name').lean();

    if (!profile) {
      return res.status(404).json({ message: 'Musician profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
};

const approveMultiple = async (req, res, next) => {
  try {
    const { ids, notes } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Provide at least one profile ID' });
    }

    const result = await Musician.updateMany(
      { _id: { $in: ids }, verificationStatus: 'pending' },
      {
        verified: true,
        verificationStatus: 'approved',
        govIdVerifiedAt: new Date(),
        $addToSet: { adminNotes: { admin: req.user.name, notes, createdAt: new Date() } },
      }
    );

    return res.json({
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
};

// ---- Admin dashboard + account ID verification queue ----
const User = require('../models/User');
const Booking = require('../models/Booking');

const getStats = async (req, res, next) => {
  try {
    const [pendingMusicianVerifications, pendingIdVerifications, totalUsers, totalMusicians, totalBookings] = await Promise.all([
      Musician.countDocuments({ verificationStatus: 'pending' }),
      User.countDocuments({ 'idVerification.submittedAt': { $ne: null }, 'idVerification.status': 'pending' }),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Musician.countDocuments({}),
      Booking.countDocuments({}),
    ]);
    return res.json({
      pendingMusicianVerifications,
      pendingIdVerifications,
      totalUsers,
      totalMusicians,
      totalBookings,
    });
  } catch (error) {
    return next(error);
  }
};

const getIdVerifications = async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'rejected', 'all'].includes(req.query.status) ? req.query.status : 'pending';
    const query = { 'idVerification.submittedAt': { $ne: null } };
    if (status !== 'all') {
      query['idVerification.status'] = status;
    }
    const users = await User.find(query)
      .select('name email role idVerification')
      .sort({ 'idVerification.submittedAt': -1 })
      .lean();
    return res.json({ items: users, count: users.length });
  } catch (error) {
    return next(error);
  }
};

const getIdVerificationDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name email role idVerification isVerified').lean();
    if (!user || !user.idVerification || !user.idVerification.submittedAt) {
      return res.status(404).json({ message: 'ID verification submission not found' });
    }
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const approveIdVerification = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, 'idVerification.submittedAt': { $ne: null } },
      {
        'idVerification.status': 'approved',
        'idVerification.reviewedAt': new Date(),
        'idVerification.reviewedBy': req.user.name,
        isVerified: true,
      },
      { new: true }
    ).select('name email role idVerification isVerified').lean();
    if (!user) {
      return res.status(404).json({ message: 'ID verification submission not found' });
    }
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const rejectIdVerification = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'Provide a rejection reason' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, 'idVerification.submittedAt': { $ne: null } },
      {
        'idVerification.status': 'rejected',
        'idVerification.reviewedAt': new Date(),
        'idVerification.reviewedBy': req.user.name,
        isVerified: false,
      },
      { new: true }
    ).select('name email role idVerification isVerified').lean();
    if (!user) {
      return res.status(404).json({ message: 'ID verification submission not found' });
    }
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPendingVerifications,
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  approveMultiple,
  getStats,
  getIdVerifications,
  getIdVerificationDetail,
  approveIdVerification,
  rejectIdVerification,
};