const { validationResult, body, param, query } = require('express-validator');

/**
 * Middleware to check validation results
 * @returns {Function} Express middleware function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

/**
 * User registration validation rules
 */
const userRegisterRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

/**
 * User login validation rules
 */
const userLoginRules = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * OTP verification validation rules
 */
const otpVerificationRules = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must only contain numbers')
];

/**
 * Emergency request validation rules
 */
const emergencyRequestRules = [
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('location.pickup.address').notEmpty().withMessage('Pickup address is required'),
  body('location.pickup.coordinates.lat').isFloat().withMessage('Valid latitude is required'),
  body('location.pickup.coordinates.lng').isFloat().withMessage('Valid longitude is required'),
  body('emergencyType')
    .optional()
    .isIn(['accident', 'cardiac', 'respiratory', 'neurological', 'burn', 'pregnancy', 'trauma', 'other'])
    .withMessage('Invalid emergency type')
];

/**
 * Ambulance location update validation rules
 */
const ambulanceLocationRules = [
  body('lat').isFloat().withMessage('Valid latitude is required'),
  body('lng').isFloat().withMessage('Valid longitude is required')
];

/**
 * Message validation rules
 */
const messageRules = [
  body('emergencyId').isMongoId().withMessage('Valid emergency ID is required'),
  body('receiverId').isMongoId().withMessage('Valid receiver ID is required'),
  body('text').notEmpty().withMessage('Message text is required')
];

/**
 * Hospital creation validation rules
 */
const hospitalRules = [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.zipCode').notEmpty().withMessage('Zip code is required'),
  body('address.country').notEmpty().withMessage('Country is required'),
  body('location.coordinates').isArray().withMessage('Location coordinates are required')
];

/**
 * Ambulance creation validation rules
 */
const ambulanceRules = [
  body('registrationNumber').notEmpty().withMessage('Registration number is required'),
  body('type')
    .isIn(['basic', 'advanced', 'critical', 'patient-transport', 'neonatal'])
    .withMessage('Invalid ambulance type'),
  body('currentLocation.lat').isFloat().withMessage('Valid latitude is required'),
  body('currentLocation.lng').isFloat().withMessage('Valid longitude is required')
];

module.exports = {
  validate,
  userRegisterRules,
  userLoginRules,
  otpVerificationRules,
  emergencyRequestRules,
  ambulanceLocationRules,
  messageRules,
  hospitalRules,
  ambulanceRules
}; 