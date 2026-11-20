const multer = require('multer');
const {
  AUDIO_MIME_EXTENSIONS,
  AUDIO_EXTENSION_ALLOWLIST,
} = require('../services/audioStorage');

// 20 MB ceiling: generous for MP3/WAV/M4A demo tracks while keeping request
// bodies bounded (memory storage buffers the whole file).
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const isAllowedAudioFile = (file) => {
  if (AUDIO_MIME_EXTENSIONS[file.mimetype]) return true;
  if (typeof file.mimetype === 'string' && file.mimetype.startsWith('audio/')) return true;
  const originalExt = (file.originalname || '').toLowerCase().match(/\.[a-z0-9]+$/);
  return Boolean(originalExt && AUDIO_EXTENSION_ALLOWLIST.includes(originalExt[0]));
};

// Memory storage: the controller streams the buffer to Cloudinary when
// credentials exist, or writes it to the local uploads directory otherwise.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (isAllowedAudioFile(file)) return cb(null, true);
    const rejection = new Error('Only MP3, WAV, M4A, AAC, OGG, or FLAC audio files can be uploaded');
    // The global error handler honours error.status; without this the filter
    // rejection would surface as a generic 500 instead of a client error.
    rejection.status = 400;
    return cb(rejection);
  },
});

module.exports = upload;
