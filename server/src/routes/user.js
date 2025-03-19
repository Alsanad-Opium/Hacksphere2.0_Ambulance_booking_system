const express = require('express');
const { protect, admin, hospitalAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const User = require('../models/User');

const router = express.Router();

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
router.get('/', protect, admin, asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -verificationOTP');
  res.json({
    success: true,
    count: users.length,
    data: users
  });
}));

/**
 * @desc    Get all drivers
 * @route   GET /api/users/drivers
 * @access  Private/Admin,HospitalAdmin
 */
router.get('/drivers', protect, asyncHandler(async (req, res) => {
  // Only admins and hospital admins can see all drivers
  if (req.user.role !== 'admin' && req.user.role !== 'hospital_admin') {
    res.status(403);
    throw new Error('Not authorized to access this resource');
  }
  
  const drivers = await User.find({ role: 'driver' }).select('-password -verificationOTP');
  res.json({
    success: true,
    count: drivers.length,
    data: drivers
  });
}));

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
router.get('/:id', protect, asyncHandler(async (req, res) => {
  // Only allow admins, or the user themselves
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized to access this resource');
  }

  const user = await User.findById(req.params.id).select('-password -verificationOTP');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  res.json({
    success: true,
    data: user
  });
}));

/**
 * @desc    Update user by ID (admin only)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Update fields
  if (req.body.name) user.name = req.body.name;
  if (req.body.email) user.email = req.body.email;
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.role) user.role = req.body.role;
  if (req.body.isVerified !== undefined) user.isVerified = req.body.isVerified;
  if (req.body.address) user.address = req.body.address;
  
  const updatedUser = await user.save();
  
  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified
    }
  });
}));

/**
 * @desc    Delete user by ID (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  await user.deleteOne();
  
  res.json({
    success: true,
    message: 'User removed'
  });
}));

module.exports = router; 