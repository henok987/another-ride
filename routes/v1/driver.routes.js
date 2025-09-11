const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/driver.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Remove driver creation via API
router.get('/', authenticate, authorize('admin','staff'), ctrl.list);
router.get('/available', authenticate, ctrl.availableNearby);
router.get('/:id', authenticate, authorize('admin','staff'), ctrl.get);
// Driver self-service
// Driver self-service (id inferred from token; param ignored)
router.post('/:id/availability', authenticate, authorize('driver'), ctrl.setAvailability);
router.post('/:id/location', authenticate, authorize('driver'), ctrl.updateLocation);

// Fare estimation endpoints
router.post('/estimate-fare', authenticate, authorize('passenger'), ctrl.estimateFareForPassenger);
router.get('/estimate-fare/:bookingId', authenticate, authorize('driver'), ctrl.estimateFareForDriver);

// Combined discover + estimate
router.post('/discover-and-estimate', authenticate, ctrl.discoverAndEstimate);

module.exports = router;

