const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('./models/User');

async function resetPassword(email, newPassword) {
  try {
    // Find the user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Old Password Hash:', user.password);

    // Set new password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    console.log('\n✅ Password reset successfully!');
    console.log('New password hash:', user.password);
    console.log(`You can now login with email: ${email} and password: ${newPassword}`);

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <new-password>');
  console.log('Example: node reset-password.js govind@gmail.com password123');
  process.exit(1);
}

resetPassword(email, newPassword);
