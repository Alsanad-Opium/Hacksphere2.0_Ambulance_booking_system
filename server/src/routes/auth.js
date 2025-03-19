const express = require('express');
const { 
  registerUser, 
  loginUser, 
  verifyOTP, 
  resendOTP, 
  forgotPassword, 
  resetPassword, 
  getUserProfile, 
  updateUserProfile 
} = require('../controllers/authController');
const { protect, verified } = require('../middlewares/auth');
const { 
  userRegisterRules, 
  userLoginRules, 
  otpVerificationRules,
  validate 
} = require('../middlewares/validator');

const router = express.Router();

// Public routes
router.post('/register', userRegisterRules, validate, registerUser);
router.post('/login', userLoginRules, validate, loginUser);
router.post('/verify-otp', otpVerificationRules, validate, verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router; 