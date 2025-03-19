const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 * @param {Object} userId - User ID to encode in the token
 * @param {String} expiresIn - Token expiration time (default: 7 days)
 * @returns {String} JWT token
 */
const generateToken = (userId, expiresIn = '7d') => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn
  });
};

/**
 * Verify a JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Generate a reset password token
 * @param {String} userId - User ID to encode in the token
 * @returns {String} Reset password token
 */
const generateResetToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generateResetToken
}; 