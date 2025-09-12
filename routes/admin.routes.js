/**
 * Admin Routes
 * Defines API endpoints for admin operations and user management
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { 
  requireAdmin,
  requireStaff,
  filterResponseData,
  validateExternalServiceAccess
} = require('../middleware/rbac');

// ===== ADMIN ONLY ROUTES =====

// Create admin (admin only)
router.post('/', 
  authenticate, 
  requireAdmin(), 
  adminController.createAdmin
);

// Authenticate admin
router.post('/auth', adminController.authenticateAdmin);

// Get admin by ID (admin only)
router.get('/:id', 
  authenticate, 
  requireAdmin(), 
  filterResponseData('admin'),
  adminController.getAdminById
);

// ===== USER MANAGEMENT ROUTES =====

// Get all users (admin only)
router.get('/users', 
  authenticate, 
  requireAdmin(), 
  adminController.getAllUsers
);

// Get specific user by ID and type (admin only)
router.get('/users/:userType/:id', 
  authenticate, 
  requireAdmin(), 
  adminController.getUserById
);

// Update specific user by ID and type (admin only)
router.put('/users/:userType/:id', 
  authenticate, 
  requireAdmin(), 
  adminController.updateUser
);

// Delete specific user by ID and type (admin only)
router.delete('/users/:userType/:id', 
  authenticate, 
  requireAdmin(), 
  adminController.deleteUser
);

// ===== SPECIFIC USER TYPE ROUTES =====

// Get passengers (admin view)
router.get('/passengers', 
  authenticate, 
  requireAdmin(), 
  filterResponseData('passenger'),
  adminController.getPassengers
);

// Get drivers (admin view)
router.get('/drivers', 
  authenticate, 
  requireAdmin(), 
  filterResponseData('driver'),
  adminController.getDrivers
);

// Get staff (admin view)
router.get('/staff', 
  authenticate, 
  requireAdmin(), 
  filterResponseData('staff'),
  adminController.getStaff
);

// Get admins (admin view)
router.get('/admins', 
  authenticate, 
  requireAdmin(), 
  filterResponseData('admin'),
  adminController.getAdmins
);

// ===== SYSTEM MANAGEMENT ROUTES =====

// Get system statistics (admin only)
router.get('/stats/system', 
  authenticate, 
  requireAdmin(), 
  adminController.getSystemStats
);

// Get user activity logs (admin only)
router.get('/logs/activity', 
  authenticate, 
  requireAdmin(), 
  adminController.getUserActivityLogs
);

module.exports = router;