import express from 'express';
import { catchAsync } from '../middleware/errorHandler.js';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Apply auth rate limiter to all routes
router.use(authLimiter);

// Register new user
router.post('/register', validateUserRegistration, catchAsync(async (req, res) => {
  const { name, email, password, department, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    department,
    phone
  });

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  // Remove password from response
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
}));

// Login user
router.post('/login', validateUserLogin, catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  // Remove password from response
  user.password = undefined;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
}));

// Get current user profile
router.get('/me', authenticate, catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// Update current user profile
router.patch('/me', authenticate, catchAsync(async (req, res) => {
  // Fields that can be updated
  const allowedFields = ['name', 'department', 'phone', 'preferences'];
  const updates = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Validate name if provided
  if (updates.name && (updates.name.trim().length < 2 || updates.name.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Name must be between 2 and 100 characters'
    });
  }

  // Update user
  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
}));

// Change password
router.patch('/change-password', authenticate, catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters long'
    });
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout (client-side token removal)
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Deactivate account
router.delete('/deactivate', authenticate, catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

export default router;