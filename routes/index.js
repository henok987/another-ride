const express = require('express');
const router = express.Router();

// Import controllers
const passengerController = require('../controllers/passengerController');
const driverController = require('../controllers/driverController');
const staffController = require('../controllers/staffController');
const adminController = require('../controllers/adminController');

// Import middleware
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// ===== PASSENGER ROUTES =====
router.post('/passengers', passengerController.createPassenger);
router.post('/passengers/auth', passengerController.authenticatePassenger);

// Public routes (with optional auth for external service access)
router.get('/passengers/:id', optionalAuth, passengerController.getPassengerById);
router.get('/passengers/external/:externalId', optionalAuth, passengerController.getPassengerByExternalId);

// Protected routes
router.get('/passengers', authenticate, authorize('staff', 'admin'), passengerController.listPassengers);
router.put('/passengers/:id', authenticate, authorize('passenger', 'staff', 'admin'), passengerController.updatePassenger);
router.delete('/passengers/:id', authenticate, authorize('staff', 'admin'), passengerController.deletePassenger);
router.post('/passengers/batch', authenticate, authorize('staff', 'admin'), passengerController.getPassengersByIds);

// ===== DRIVER ROUTES =====
router.post('/drivers', driverController.createDriver);
router.post('/drivers/auth', driverController.authenticateDriver);

// Public routes (with optional auth for external service access)
router.get('/drivers/:id', optionalAuth, driverController.getDriverById);
router.get('/drivers/external/:externalId', optionalAuth, driverController.getDriverByExternalId);

// Protected routes
router.get('/drivers', authenticate, authorize('staff', 'admin'), driverController.listDrivers);
router.put('/drivers/:id', authenticate, authorize('driver', 'staff', 'admin'), driverController.updateDriver);
router.delete('/drivers/:id', authenticate, authorize('staff', 'admin'), driverController.deleteDriver);
router.post('/drivers/batch', authenticate, authorize('staff', 'admin'), driverController.getDriversByIds);
router.put('/drivers/:id/rating', authenticate, authorize('passenger', 'staff', 'admin'), driverController.updateDriverRating);

// ===== STAFF ROUTES =====
router.post('/staff', authenticate, authorize('admin'), staffController.createStaff);
router.post('/staff/auth', staffController.authenticateStaff);

// Public routes (with optional auth for external service access)
router.get('/staff/:id', optionalAuth, staffController.getStaffById);
router.get('/staff/external/:externalId', optionalAuth, staffController.getStaffByExternalId);

// Protected routes
router.get('/staff', authenticate, authorize('staff', 'admin'), staffController.listStaff);
router.put('/staff/:id', authenticate, authorize('staff', 'admin'), staffController.updateStaff);
router.delete('/staff/:id', authenticate, authorize('admin'), staffController.deleteStaff);

// ===== ADMIN ROUTES =====
router.post('/admins', authenticate, authorize('admin'), adminController.createAdmin);
router.post('/admins/auth', adminController.authenticateAdmin);

// Public routes (with optional auth for external service access)
router.get('/admins/:id', optionalAuth, adminController.getAdminById);
router.get('/admins/external/:externalId', optionalAuth, adminController.getAdminByExternalId);

// Protected routes
router.get('/admins', authenticate, authorize('admin'), adminController.listAdmins);
router.put('/admins/:id', authenticate, authorize('admin'), adminController.updateAdmin);
router.delete('/admins/:id', authenticate, authorize('admin'), adminController.deleteAdmin);

module.exports = router;