/**
 * Create or promote an admin user.
 *
 * Usage:
 *   node scripts/createAdmin.js <email> [password] [name]
 *
 * - If the user exists (any role), they are promoted to admin.
 *   If a password is also given (min 8 chars), it is reset for that user.
 * - If not, a new admin account is created with the given password.
 * - Omit the password to promote without touching the existing password.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: node scripts/createAdmin.js <email> [password] [name]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      existing.role = 'admin';
      if (password) {
        if (password.length < 8) {
          console.error('Password must be at least 8 characters.');
          process.exit(1);
        }
        existing.password = password;
      }
      await existing.save();
      console.log(
        `Promoted existing user to admin: ${existing.email} (${existing.name})` +
        (password ? ' — password updated' : '')
      );
    } else {
      if (!password || password.length < 8) {
        console.error('New admin requires a password of at least 8 characters.');
        process.exit(1);
      }
      const admin = await User.create({
        name: name || 'Gigmatch Admin',
        email: email.toLowerCase().trim(),
        password,
        role: 'admin',
      });
      console.log(`Created admin: ${admin.email} (${admin.name})`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
