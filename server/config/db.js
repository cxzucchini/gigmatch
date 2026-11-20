const mongoose = require('mongoose');

let connectionPromise;

const connectDB = () => {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gigmatch';
  connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then((connection) => {
      console.log(`MongoDB connected: ${connection.connection.host}`);
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
