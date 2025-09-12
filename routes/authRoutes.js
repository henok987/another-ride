const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const rateLimit = require('../middleware/rateLimit');

router.post('/passenger/register', rateLimit({ windowMs: 60_000, max: 10 }), ctrl.registerPassenger);
router.post('/passenger/login', rateLimit({ windowMs: 60_000, max: 20 }), ctrl.loginPassenger);

router.post('/driver/register', rateLimit({ windowMs: 60_000, max: 10 }), ctrl.registerDriver);
router.post('/driver/login', rateLimit({ windowMs: 60_000, max: 20 }), ctrl.loginDriver);

router.post('/staff/login', rateLimit({ windowMs: 60_000, max: 20 }), ctrl.loginStaff);

router.post('/admin/register', rateLimit({ windowMs: 60_000, max: 10 }), ctrl.registerAdmin);
router.post('/admin/login', rateLimit({ windowMs: 60_000, max: 20 }), ctrl.loginAdmin);

module.exports = router;
