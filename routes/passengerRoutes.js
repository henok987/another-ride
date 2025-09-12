const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/passengerController');
const auth = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');

// Admin routes (require permissions)
router.get('/', auth(), requirePermissions('passenger:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('passenger:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('passenger:update'), ctrl.update);
router.delete('/:id', auth(), requirePermissions('passenger:delete'), ctrl.remove);

// Passenger self-control routes
router.get('/profile/me', auth(), ctrl.getMyProfile);
router.put('/profile/me', auth(), ctrl.updateMyProfile);
router.delete('/profile/me', auth(), ctrl.deleteMyAccount);

// Passenger action: rate driver
router.post('/rate-driver/:driverId', auth(), ctrl.rateDriver);

module.exports = router;
