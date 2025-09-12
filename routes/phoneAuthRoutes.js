const express = require('express');
const router = express.Router();
const phoneAuthController = require('../controllers/phoneAuthController');
const { authenticatePhoneUser } = require('../middleware/phoneAuth');

// Public routes (no authentication required)
router.post('/request-otp', phoneAuthController.requestOtp);
router.post('/verify-otp', phoneAuthController.verifyOtp);
router.post('/passenger/register-phone', phoneAuthController.registerPassengerByPhone);
router.post('/passenger/verify-otp', phoneAuthController.verifyPassengerOtpRedirect);
router.post('/login', phoneAuthController.loginWithPhone);

// Protected routes (authentication required)
router.get('/profile', authenticatePhoneUser, phoneAuthController.getUserProfile);

module.exports = router;
