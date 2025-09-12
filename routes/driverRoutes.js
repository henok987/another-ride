const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/driverController');
const auth = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');

// Multer storage for driver documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join('uploads', 'drivers'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const driverId = req.params.id || 'unknown';
    const field = file.fieldname;
    const ts = Date.now();
    cb(null, `${driverId}_${field}_${ts}${ext}`);
  }
});
const upload = multer({ storage });

// Admin routes (require permissions)
router.get('/', auth(), requirePermissions('driver:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('driver:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('driver:update'), ctrl.update);
router.delete('/:id', auth(), requirePermissions('driver:delete'), ctrl.remove);

// Driver self-control routes (driver can manage their own data)
router.get('/profile/me', auth(), ctrl.getMyProfile);
router.put('/profile/me', auth(), ctrl.updateMyProfile);
router.get('/booking-eligibility', auth(), ctrl.checkBookingEligibility);
// Driver self toggle availability
router.post('/profile/me/toggle-availability', auth(), ctrl.toggleMyAvailability);

// Document upload route
router.post(
  '/:id/documents',
  auth(),
  upload.fields([
    { name: 'nationalId', maxCount: 1 },
    { name: 'vehicleRegistration', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'license', maxCount: 1 },
  ]),
  ctrl.uploadDocuments
);

// Admin toggle availability for a driver
router.post('/:id/toggle-availability', auth(), requirePermissions('driver:update'), ctrl.toggleAvailability);

// Rating routes
router.post('/rate-passenger/:passengerId', auth(), ctrl.ratePassenger);

module.exports = router;
