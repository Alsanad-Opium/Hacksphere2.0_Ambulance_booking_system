// Initialize Twilio client with fallbacks for development mode
let client = null;

// Only initialize Twilio if credentials are properly configured
try {
  const twilio = require('twilio');
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio client initialized successfully');
  } else {
    console.log('Twilio credentials not properly configured, running in mock mode');
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error.message);
}

/**
 * Send an OTP verification code via SMS
 * @param {String} phoneNumber - Recipient phone number (with country code)
 * @param {String} otp - OTP code to send
 * @returns {Promise} Promise object representing the SMS result
 */
const sendOTP = async (phoneNumber, otp) => {
  try {
    // If Twilio is not initialized, log message and return mock response
    if (!client) {
      console.log(`[MOCK SMS] OTP ${otp} would be sent to ${phoneNumber}`);
      return {
        success: true,
        mock: true,
        sid: 'MOCK_SID_' + Date.now()
      };
    }

    const message = await client.messages.create({
      body: `Your Ambulance Booking System verification code is: ${otp}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`SMS sent to ${phoneNumber}, SID: ${message.sid}`);
    return {
      success: true,
      sid: message.sid
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send emergency notification to user
 * @param {String} phoneNumber - Recipient phone number (with country code)
 * @param {Object} ambulanceInfo - Object containing ambulance details
 * @returns {Promise} Promise object representing the SMS result
 */
const sendEmergencyConfirmation = async (phoneNumber, ambulanceInfo) => {
  try {
    const { registrationNumber, eta } = ambulanceInfo;
    
    // If Twilio is not initialized, log message and return mock response
    if (!client) {
      console.log(`[MOCK SMS] Emergency confirmation for ambulance ${registrationNumber} would be sent to ${phoneNumber}`);
      return {
        success: true,
        mock: true,
        sid: 'MOCK_SID_' + Date.now()
      };
    }
    
    const message = await client.messages.create({
      body: `Your ambulance request is confirmed. Ambulance (${registrationNumber}) has been dispatched and will arrive in approximately ${eta}. Track in real-time on the app.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return {
      success: true,
      sid: message.sid
    };
  } catch (error) {
    console.error('Error sending emergency confirmation SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send driver notification
 * @param {String} phoneNumber - Driver's phone number
 * @param {Object} emergencyInfo - Emergency request details
 * @returns {Promise} Promise object representing the SMS result
 */
const notifyDriver = async (phoneNumber, emergencyInfo) => {
  try {
    const { severity, address } = emergencyInfo;
    
    // If Twilio is not initialized, log message and return mock response
    if (!client) {
      console.log(`[MOCK SMS] Driver notification for ${severity} emergency at ${address} would be sent to ${phoneNumber}`);
      return {
        success: true,
        mock: true,
        sid: 'MOCK_SID_' + Date.now()
      };
    }
    
    const message = await client.messages.create({
      body: `NEW EMERGENCY ASSIGNMENT (${severity.toUpperCase()}): Patient located at ${address}. Please confirm and start immediately.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return {
      success: true,
      sid: message.sid
    };
  } catch (error) {
    console.error('Error sending driver notification SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendOTP,
  sendEmergencyConfirmation,
  notifyDriver
}; 