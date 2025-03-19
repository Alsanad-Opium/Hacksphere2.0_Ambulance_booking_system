const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');
const { sendOTP } = require('../utils/twilioUtils');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'user' } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email or phone');
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role === 'driver' || role === 'hospital_admin' ? role : 'user' // Only allow certain roles on registration
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid user data');
  }

  // Generate OTP for verification
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via SMS
  const smsResult = await sendOTP(user.phone, otp);

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      token,
      otpSent: smsResult.success
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      token
    }
  });
});

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if OTP exists and is valid
  if (
    !user.verificationOTP ||
    !user.verificationOTP.code ||
    user.verificationOTP.code !== otp
  ) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Check if OTP is expired
  if (user.verificationOTP.expiresAt < new Date()) {
    res.status(400);
    throw new Error('OTP has expired');
  }

  // Mark user as verified and clear OTP
  user.isVerified = true;
  user.verificationOTP = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Account verified successfully',
    data: {
      isVerified: user.isVerified
    }
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Generate new OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via SMS
  const smsResult = await sendOTP(user.phone, otp);

  res.json({
    success: true,
    message: 'OTP resent successfully',
    data: {
      otpSent: smsResult.success
    }
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Generate OTP for password reset
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via SMS
  const smsResult = await sendOTP(user.phone, otp);

  res.json({
    success: true,
    message: 'Password reset OTP sent',
    data: {
      otpSent: smsResult.success
    }
  });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if OTP is valid
  if (
    !user.verificationOTP ||
    !user.verificationOTP.code ||
    user.verificationOTP.code !== otp
  ) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Check if OTP is expired
  if (user.verificationOTP.expiresAt < new Date()) {
    res.status(400);
    throw new Error('OTP has expired');
  }

  // Update password and clear OTP
  user.password = newPassword;
  user.verificationOTP = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful'
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -verificationOTP');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update fields
  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.phone = req.body.phone || user.phone;
  user.address = req.body.address || user.address;
  user.emergencyContacts = req.body.emergencyContacts || user.emergencyContacts;
  user.healthInfo = req.body.healthInfo || user.healthInfo;
  
  // Update password if provided
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      address: updatedUser.address,
      emergencyContacts: updatedUser.emergencyContacts,
      healthInfo: updatedUser.healthInfo,
      isVerified: updatedUser.isVerified
    }
  });
});

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile
}; 