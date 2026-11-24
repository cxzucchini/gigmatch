require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// CLIENT_URL accepts a single origin or a comma-separated list, e.g.
// CLIENT_URL=https://gigmatch.vercel.app,https://gigmatch-jay.vercel.app
// Unset (local dev) => allow all origins.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const requireDatabase = async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    return next(error);
  }
};

app.get('/', (req, res) => {
  res.json({
    message: 'Gigmatch API is running',
    status: 'ok',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/auth', requireDatabase);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/musicians', requireDatabase, require('./routes/musicianRoutes'));
app.use('/api/bookings', requireDatabase, require('./routes/bookingRoutes'));
app.use('/api/notifications', requireDatabase, require('./routes/notificationRoutes'));
app.use('/api/admin', requireDatabase, require('./routes/adminRoutes'));
app.use('/api/users', requireDatabase, require('./routes/userRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled API error:', error.message);
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  res.status(status).json({
    message: status === 500 ? 'An unexpected server error occurred' : error.message,
  });
});

let server;
if (process.env.VERCEL) {
  module.exports = app;
} else {
  connectDB().catch((error) => {
    console.warn('MongoDB connection warning:', error.message);
    console.log('Server will retry the MongoDB connection on the next request.');
  });
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  module.exports = { app, server };
}