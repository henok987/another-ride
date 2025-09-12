const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/booking.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.post('/', authenticate, authorize('passenger'), ctrl.create);
router.get('/', authenticate, authorize('passenger','admin','superadmin','staff'), ctrl.list);
// Debug endpoint to check authentication
router.get('/debug/auth', authenticate, (req, res) => {
  res.json({ 
    user: req.user, 
    userType: req.user?.type, 
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
});
router.get('/:id', authenticate, authorize('passenger','admin','superadmin','staff'), ctrl.get);
router.put('/:id', authenticate, authorize('passenger'), ctrl.update);
router.delete('/:id', authenticate, authorize('passenger'), ctrl.remove);
// Admin and driver lifecycle and assignment
router.post('/:id/lifecycle', authenticate, authorize('admin','superadmin','driver'), ctrl.lifecycle);
// Driver: list nearby pending bookings
router.get('/nearby/pending', authenticate, authorize('driver'), async (req, res) => {
  try {
    const { getDistance } = require('geolib');
    const { Booking } = require('../../models/bookingModels');
    const { Driver } = require('../../models/userModels');
    const radiusKm = Number(req.query.radiusKm || 3);
    const driver = await Driver.findById(req.user.id).lean();
    if (!driver || !driver.lastKnownLocation) {
      return res.status(400).json({ message: 'Driver location unknown. Update location first.' });
    }
    const pending = await Booking.find({ status: 'requested' }).lean();
    const nearby = pending.filter(b => {
      const meters = getDistance(
        { latitude: driver.lastKnownLocation.latitude, longitude: driver.lastKnownLocation.longitude },
        { latitude: b.pickup.latitude, longitude: b.pickup.longitude }
      );
      return (meters/1000) <= radiusKm;
    }).map(b => ({
      id: String(b._id),
      passengerId: b.passengerId,
      pickup: b.pickup,
      dropoff: b.dropoff,
      vehicleType: b.vehicleType,
      status: b.status,
      createdAt: b.createdAt
    }));
    return res.json(nearby);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});
router.post('/:id/assign', authenticate, authorize('admin','superadmin','staff'), ctrl.assign);
// Fare estimation by admin
router.post('/estimate', authenticate, authorize('admin','superadmin'), ctrl.estimate);
// Rating endpoints
router.post('/:id/rate-passenger', authenticate, authorize('driver'), ctrl.ratePassenger);
router.post('/:id/rate-driver', authenticate, authorize('passenger'), ctrl.rateDriver);
// Passenger vehicle types
router.get('/vehicle/types', authenticate, authorize('passenger'), (req, res) => res.json(['mini','sedan','van']));

module.exports = router;

