const express = require('express');
const {
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
} = require('../controllers/musicianController');
const { protect } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const upload = require('../middleware/uploadImage');
const audioUpload = require('../middleware/uploadAudio');

const router = express.Router();

router.get('/', listMusicians);
router.get('/me/availability', protect, authorizeRoles('musician'), getMyAvailability);
router.patch('/me/availability', protect, authorizeRoles('musician'), updateMyAvailability);
router.get('/me', protect, authorizeRoles('musician'), getMyMusicianProfile);
router.put('/me', protect, authorizeRoles('musician'), upsertMyMusicianProfile);
router.post('/me/gallery-image', protect, authorizeRoles('musician'), upload.single('image'), uploadGalleryImage);
router.post('/me/playlist-audio', protect, authorizeRoles('musician'), audioUpload.single('audio'), uploadPlaylistAudio);
router.delete('/me/playlist-track', protect, authorizeRoles('musician'), deletePlaylistTrack);
router.get('/:id/availability', getMusicianAvailability);
router.get('/:id', getMusician);

module.exports = router;
