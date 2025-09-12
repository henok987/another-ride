const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { requirePermissions, requireRoles } = require('../middleware/rbac');

router.post('/', auth(), requirePermissions('admin:create'), ctrl.create);
router.get('/', auth(), requirePermissions('admin:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('admin:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('admin:update'), ctrl.update);    
router.delete('/:id', auth(), requirePermissions('admin:delete'), ctrl.remove);

router.post('/drivers/:driverId/approve', auth(), requirePermissions('driver:approve'), ctrl.approveDriver);
router.post('/drivers/:driverId/documents/approve', auth(), requirePermissions('driver:documents:approve'), ctrl.approveDriverDocuments);
router.post('/drivers/:driverId/documents/reject', auth(), requirePermissions('driver:documents:approve'), ctrl.rejectDriverDocuments);
router.get('/drivers/pending-documents', auth(), requirePermissions('driver:documents:approve'), ctrl.getPendingDriverDocuments);

// Reward points management
router.post('/drivers/:driverId/reward-points', auth(), requireRoles('admin', 'superadmin'), ctrl.awardDriverPoints);
router.post('/passengers/:passengerId/reward-points', auth(), requireRoles('admin', 'superadmin'), ctrl.awardPassengerPoints);

router.get('/users/filter', auth(), requirePermissions('user:read'), ctrl.filterByRole);
// Alias: /admin/users/by-role → filter
router.get('/users/by-role', auth(), requirePermissions('user:read'), ctrl.filterByRole);

// Admin can get staff by their role
router.get('/staff', auth(), requirePermissions('staff:read'), ctrl.listStaffByRole);
// Alias: /admin/staff/by-role → staff with role or roleId
router.get('/staff/by-role', auth(), requirePermissions('staff:read'), ctrl.listStaffByRole);

// Support POST /admin/drivers/:id/status
router.post('/drivers/:id/status', auth(), requirePermissions('driver:update'), ctrl.updateDriverStatus);

module.exports = router;
