const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('./models/User');

async function checkUserPassword() {
  try {
    // Find the user by email
    const user = await User.findOne({ email: 'govind@gmail.com' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password Hash:', user.password);
    console.log('Password Hash Length:', user.password.length);
    
    // Check if the password hash looks like bcrypt (should start with $2a$ or $2b$)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      console.log('✅ Password appears to be properly hashed with bcrypt');
    } else {
      console.log('❌ Password does not appear to be properly hashed');
    }

    // Test some common passwords to see if they match
    const testPasswords = ['password', '123456', 'govind', 'test', 'admin'];
    
    console.log('\nTesting common passwords:');
    for (const testPassword of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log(`✅ "${testPassword}" matches the stored password!`);
        } else {
          console.log(`❌ "${testPassword}" does not match`);
        }
      } catch (error) {
        console.log(`❌ Error testing "${testPassword}":`, error.message);
      }
    }

    // Option to reset password
    console.log('\nTo reset the password to "password123", run:');
    console.log('node reset-password.js govind@gmail.com password123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUserPassword();
