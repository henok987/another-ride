const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/auth', require('./phoneAuthRoutes')); // Phone-based authentication
router.use('/passengers', require('./passengerRoutes'));
router.use('/drivers', require('./driverRoutes'));
router.use('/staff', require('./staffRoutes'));
router.use('/roles', require('./roleRoutes'));
router.use('/permissions', require('./permissionRoutes'));
router.use('/admins', require('./adminRoutes'));
// Backward-compatible alias: expose admin routes under singular prefix as well
router.use('/admin', require('./adminRoutes'));
// v1 passenger OTP routes removed; use /auth/request-otp and /auth/verify-otp


module.exports = router;
