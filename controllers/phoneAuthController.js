const { models } = require('../models');
const { generateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');
const createAdvancedOtpUtil = require('../utils/createAdvancedOtpUtil');

// Initialize OTP utility
const otpUtil = createAdvancedOtpUtil({
  token: process.env.GEEZSMS_TOKEN,
  otpLength: 6,
  otpExpirationSeconds: 300, // 5 minutes
  maxAttempts: 3,
  lockoutSeconds: 1800, // 30 minutes
});

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // Accept Ethiopian format: 09XXXXXXXX or 07XXXXXXXX, or international +2519XXXXXXXX
  return /^(09|07)\d{8}$/.test(cleanPhone) || /^\+?251(9|7)\d{8}$/.test(phone);
}

/**
 * Normalize phone number to international format
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized phone number
 */
function normalizePhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('09') || cleanPhone.startsWith('07')) {
    return '+251' + cleanPhone.substring(1);
  }
  if (cleanPhone.startsWith('251')) {
    return '+' + cleanPhone;
  }
  return phone;
}

/**
 * Request OTP for phone number
 * POST /auth/request-otp
 */
async function requestOtp(req, res) {
  try {
    const { phone } = req.body;

    // Validate input
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use 09XXXXXXXX or 07XXXXXXXX'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Create or find Passenger by phone
    let passenger = await models.Passenger.findOne({ where: { phone: normalizedPhone } });
    if (!passenger) {
      const randomPassword = Math.random().toString(36).slice(2, 12) + '!A1';
      const hashed = await hashPassword(randomPassword);
      const nameSuffix = normalizedPhone.slice(-4);
      passenger = await models.Passenger.create({
        name: `Passenger ${nameSuffix}`,
        phone: normalizedPhone,
        email: null,
        emergencyContacts: null,
        password: hashed
      });
    }

    // Generate and send OTP
    try {
      const otpResponse = await otpUtil.generateAndSendOtp({
        referenceType: 'Passenger',
        referenceId: passenger.id,
        phoneNumber: normalizedPhone
      });

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        phoneNumber: normalizedPhone,
        expiresIn: otpResponse.expiresIn
      });
    } catch (otpError) {
      // Handle rate limiting and other OTP errors
      if (otpError.message.includes('wait') || otpError.message.includes('locked')) {
        return res.status(429).json({ success: false, message: otpError.message });
      }

      // With internal util now swallowing SMS errors, respond success for client
      return res.status(200).json({ success: true, message: 'OTP generated', phoneNumber: normalizedPhone, expiresIn: 300 });
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Verify OTP and activate user account
 * POST /auth/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { phone, otp } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Find passenger
    let passenger = await models.Passenger.findOne({ where: { phone: normalizedPhone } });
    if (!passenger) {
      const randomPassword = Math.random().toString(36).slice(2, 12) + '!A1';
      const hashed = await hashPassword(randomPassword);
      const nameSuffix = normalizedPhone.slice(-4);
      passenger = await models.Passenger.create({
        name: `Passenger ${nameSuffix}`,
        phone: normalizedPhone,
        email: null,
        emergencyContacts: null,
        password: hashed
      });
    }

    // Verify OTP
    try {
      await otpUtil.verifyOtp({
        referenceType: 'Passenger',
        referenceId: passenger.id,
        token: otp,
        phoneNumber: normalizedPhone
      });

      // Generate JWT token for Passenger
      const token = generateToken({ id: passenger.id, type: 'passenger', roles: [], permissions: [] });

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Account activated.',
        passenger: {
          id: passenger.id,
          phone: passenger.phone
        },
        token
      });
    } catch (otpError) {
      // Handle OTP verification errors
      if (otpError.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }
      
      if (otpError.message.includes('locked')) {
        return res.status(429).json({
          success: false,
          message: otpError.message
        });
      }
      
      if (otpError.message.includes('Invalid') || otpError.message.includes('No valid')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please check and try again.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'OTP verification failed. Please try again.'
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Login with phone number (for already verified users)
 * POST /auth/login
 */
async function loginWithPhone(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Find active user
    const passenger = await models.Passenger.findOne({ where: { phone: normalizedPhone } });

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found. Please verify your phone number first.'
      });
    }

    // Generate JWT token for Passenger
    const token = generateToken({ id: passenger.id, type: 'passenger', roles: [], permissions: [] });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      passenger: {
        id: passenger.id,
        phone: passenger.phone
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get user profile (protected route)
 * GET /auth/profile
 */
async function getUserProfile(req, res) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const passenger = await models.Passenger.findByPk(userId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    return res.status(200).json({
      success: true,
      passenger: passenger
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Register passenger by phone and request OTP (alias for requestOtp)
 * POST /auth/passenger/register-phone
 */
async function registerPassengerByPhone(req, res) {
  return requestOtp(req, res);
}

/**
 * Verify passenger OTP and redirect to profile with token in query
 * POST /auth/passenger/verify-otp
 */
async function verifyPassengerOtpRedirect(req, res) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }
    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }
    const normalizedPhone = normalizePhone(phone);
    let passenger = await models.Passenger.findOne({ where: { phone: normalizedPhone } });
    if (!passenger) {
      const randomPassword = Math.random().toString(36).slice(2, 12) + '!A1';
      const hashed = await hashPassword(randomPassword);
      const nameSuffix = normalizedPhone.slice(-4);
      passenger = await models.Passenger.create({
        name: `Passenger ${nameSuffix}`,
        phone: normalizedPhone,
        email: null,
        emergencyContacts: null,
        password: hashed
      });
    }

    await otpUtil.verifyOtp({
      referenceType: 'Passenger',
      referenceId: passenger.id,
      token: otp,
      phoneNumber: normalizedPhone
    });

    const token = generateToken({ id: passenger.id, type: 'passenger', roles: [], permissions: [] });
    const redirectUrl = '/api/passengers/profile/me?token=' + encodeURIComponent(token);
    res.set('Location', redirectUrl);
    return res.status(302).json({ success: true, message: 'Verified', redirect: redirectUrl, token, passenger: { id: passenger.id, phone: passenger.phone } });
  } catch (error) {
    const message = error && error.message ? error.message : 'Verification failed';
    const status = /expired|Invalid|No valid/i.test(message) ? 400 : 500;
    return res.status(status).json({ success: false, message });
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  loginWithPhone,
  getUserProfile,
  registerPassengerByPhone,
  verifyPassengerOtpRedirect
};
