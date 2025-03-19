const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify user JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin'
    });
  }
};

/**
 * Middleware to check if user has driver role
 */
const driver = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as a driver'
    });
  }
};

/**
 * Middleware to check if user has hospital admin role
 */
const hospitalAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'hospital_admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as a hospital admin'
    });
  }
};

/**
 * Middleware to check if user is verified
 */
const verified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Account not verified'
    });
  }
};

module.exports = { protect, admin, driver, hospitalAdmin, verified }; 