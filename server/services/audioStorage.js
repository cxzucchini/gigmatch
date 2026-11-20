const os = require('os');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

// mimetype -> file extension allowlist (browser values for mp3/wav/m4a + friends)
const AUDIO_MIME_EXTENSIONS = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/vnd.wave': '.wav',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
};

const AUDIO_EXTENSION_ALLOWLIST = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.oga', '.flac', '.opus'];

// Cloudinary is used when the project configures credentials (CLOUDINARY_URL or
// the CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET trio); otherwise uploads fall
// back to the local disk uploads directory served by server.js.
const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_URL
  || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
);

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
};

const extensionForFile = (file) => {
  const mimeExt = AUDIO_MIME_EXTENSIONS[file.mimetype];
  if (mimeExt) return mimeExt;
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  if (AUDIO_EXTENSION_ALLOWLIST.includes(originalExt)) return originalExt;
  return '.mp3';
};

const uploadToCloudinary = (buffer, publicId) => new Promise((resolve, reject) => {
  configureCloudinary();
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'gigmatch/playlists',
      public_id: publicId,
      resource_type: 'auto',
    },
    (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
  );
  stream.end(buffer);
});

const saveLocalFile = (buffer, filename) => {
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return filename;
};

const localFilenameFor = (userId, file) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `playlist-${userId || 'anon'}-${unique}${extensionForFile(file)}`;
};

const isSafeLocalFilename = (publicId) => (
  typeof publicId === 'string'
  && publicId.startsWith('playlist-')
  && /^[\w][\w.-]{0,250}$/.test(publicId)
  && !publicId.includes('..')
);

// Stores one audio upload and returns { url, publicId }. Cloudinary when
// configured (url is absolute); otherwise a relative /uploads/ path the
// controller expands against the request host.
const persistAudioUpload = async (file, userId) => {
  if (isCloudinaryConfigured()) {
    const publicId = `playlist-${userId || 'anon'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const uploaded = await uploadToCloudinary(file.buffer, publicId);
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  }
  const filename = localFilenameFor(userId, file);
  saveLocalFile(file.buffer, filename);
  return { url: `/uploads/${filename}`, publicId: filename };
};

// Best-effort storage delete; returns true when the asset is gone (or never
// existed). Only deletes local files whose name matches our playlist- prefix.
const deleteAudioAsset = async (publicId) => {
  if (isCloudinaryConfigured()) {
    configureCloudinary();
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
      return result?.result === 'ok' || result?.result === 'not found';
    } catch (error) {
      console.warn('Cloudinary playlist delete failed:', error.message);
      return false;
    }
  }
  if (!isSafeLocalFilename(publicId)) return false;
  const targetPath = path.join(uploadsDir, publicId);
  if (!targetPath.startsWith(uploadsDir + path.sep)) return false;
  try {
    fs.unlinkSync(targetPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    console.warn('Local playlist delete failed:', error.message);
    return false;
  }
};

module.exports = {
  AUDIO_MIME_EXTENSIONS,
  AUDIO_EXTENSION_ALLOWLIST,
  extensionForFile,
  isCloudinaryConfigured,
  uploadToCloudinary,
  saveLocalFile,
  localFilenameFor,
  persistAudioUpload,
  deleteAudioAsset,
  uploadsDir,
};
