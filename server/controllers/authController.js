const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Debug log
      console.log('Login attempt for:', email);

      // Find user with password field explicitly included
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        console.log('User not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Debug log user details (excluding password)
      console.log('Found user:', {
        id: user._id,
        email: user.email,
        role: user.role
      });

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        console.log('Invalid password for user:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Create token with consistent secret
      const token = jwt.sign(
        { 
          userId: user._id,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Token generated with secret:', process.env.JWT_SECRET.substring(0, 5) + '...');

      // Success response
      res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user (password will be hashed by pre-save middleware)
      const user = new User({
        name,
        email,
        password,
        role: role || 'student'
      });

      await user.save();

      // Create token
      const token = jwt.sign(
        { 
          userId: user._id,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data (without password) and token
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during registration',
        error: error.message
      });
    }
  },

  getMe: async (req, res) => {
    try {
      let user;
      if (req.user.role === 'teacher') {
        user = await User.findById(req.user._id)
          .select('-password')
          .populate({
            path: 'classrooms',
            select: 'name description',
            match: { teacher: req.user._id }
          });
      } else {
        user = await User.findById(req.user._id)
          .select('-password')
          .populate({
            path: 'classrooms',
            select: 'name description teacher',
            match: { students: req.user._id }
          });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user profile',
        error: error.message
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, email } = req.body;
      const userId = req.user._id;

      // Validate input
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }

      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, email },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: error.message
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user._id;

      // Validate input
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Old password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Set new password (will be hashed by the pre-save middleware)
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: error.message
      });
    }
  }
};

module.exports = authController;