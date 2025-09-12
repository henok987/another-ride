const { models } = require('../models');
const { hashPassword } = require('../utils/password');

exports.create = async (req, res) => {
try {
const data = req.body;
if (data.password) data.password = await hashPassword(data.password);
const row = await models.Driver.create(data);
return res.status(201).json(row);
} catch (e) { return res.status(500).json({ message: e.message }); }
};
exports.list = async (req, res) => { try { const rows = await models.Driver.findAll({ include: ['roles'] }); return res.json(rows); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.get = async (req, res) => { try { const row = await models.Driver.findByPk(req.params.id, { include: ['roles'] }); if (!row) return res.status(404).json({ message: 'Not found' }); return res.json(row); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.update = async (req, res) => {
try {
const body = req.body || {};
// Prevent updates to rating fields from admin route
const data = { ...body };
if ('rating' in data) delete data.rating;
if ('ratingCount' in data) delete data.ratingCount;
if (data.password) data.password = await hashPassword(data.password);
const [count] = await models.Driver.update(data, { where: { id: req.params.id } });
if (!count) return res.status(404).json({ message: 'Not found' });
const updated = await models.Driver.findByPk(req.params.id);
return res.json(updated);
} catch (e) { return res.status(500).json({ message: e.message }); }
};
exports.remove = async (req, res) => { try { const count = await models.Driver.destroy({ where: { id: req.params.id } }); if (!count) return res.status(404).json({ message: 'Not found' }); return res.status(204).send(); } catch (e) { return res.status(500).json({ message: e.message }); } };

// Driver self-control methods
exports.getMyProfile = async (req, res) => {
try {
if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can access this endpoint' });
const driver = await models.Driver.findByPk(req.user.id, { include: ['roles'] });
if (!driver) return res.status(404).json({ message: 'Driver not found' });
return res.json(driver);
} catch (e) { return res.status(500).json({ message: e.message }); }
};

exports.updateMyProfile = async (req, res) => {
try {
if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can access this endpoint' });
const data = { ...req.body };
// Prevent self-updating rating fields and status
if ('rating' in data) delete data.rating;
if ('ratingCount' in data) delete data.ratingCount;
if ('status' in data) delete data.status;
if (data.password) data.password = await hashPassword(data.password);
const [count] = await models.Driver.update(data, { where: { id: req.user.id } });
if (!count) return res.status(404).json({ message: 'Driver not found' });
const updated = await models.Driver.findByPk(req.user.id);
return res.json(updated);
} catch (e) { return res.status(500).json({ message: e.message }); }
};

exports.toggleMyAvailability = async (req, res) => {
try {
if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can toggle availability' });
const driver = await models.Driver.findByPk(req.user.id);
if (!driver) return res.status(404).json({ message: 'Driver not found' });

// Check driver status
if (driver.status === 'pending') {
  return res.status(403).json({ 
    message: 'Cannot change availability. Your account is still pending approval. Please contact support.' 
  });
}

if (driver.status === 'suspended') {
  return res.status(403).json({ 
    message: 'Cannot change availability. Your account has been suspended. Please contact support.' 
  });
}

driver.availability = !driver.availability;
await driver.save();
return res.json({ 
  message: 'Availability updated', 
  availability: driver.availability,
  status: driver.status 
});
} catch (e) { return res.status(500).json({ message: e.message }); }
};

exports.checkBookingEligibility = async (req, res) => {
try {
if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can check booking eligibility' });
const driver = await models.Driver.findByPk(req.user.id);
if (!driver) return res.status(404).json({ message: 'Driver not found' });

const canAcceptBookings = driver.status === 'active' && driver.availability;
let message = '';

if (driver.status === 'pending') {
  message = 'Your account is still pending approval. You cannot accept bookings until your account is approved.';
} else if (driver.status === 'suspended') {
  message = 'Your account has been suspended. You cannot accept bookings. Please contact support.';
} else if (!driver.availability) {
  message = 'You are currently offline. Please toggle your availability to accept bookings.';
} else {
  message = 'You are eligible to accept bookings.';
}

return res.json({
  canAcceptBookings,
  status: driver.status,
  availability: driver.availability,
  message
});
} catch (e) { return res.status(500).json({ message: e.message }); }
};

exports.toggleAvailability = async (req, res) => {
try {
const driver = await models.Driver.findByPk(req.params.id);
if (!driver) return res.status(404).json({ message: 'Driver not found' });
driver.availability = !driver.availability;
await driver.save();
return res.json(driver);
} catch (e) { return res.status(500).json({ message: e.message }); }
};

exports.uploadDocuments = async (req, res) => {
try {
const driver = await models.Driver.findByPk(req.params.id);
if (!driver) return res.status(404).json({ message: 'Driver not found' });

const updateData = {};

if (req.files) {
  if (req.files.nationalId && req.files.nationalId[0]) updateData.nationalIdFile = req.files.nationalId[0].filename;
  if (req.files.vehicleRegistration && req.files.vehicleRegistration[0]) updateData.vehicleRegistrationFile = req.files.vehicleRegistration[0].filename;
  if (req.files.insurance && req.files.insurance[0]) updateData.insuranceFile = req.files.insurance[0].filename;
  if (req.files.document && req.files.document[0]) updateData.document = req.files.document[0].filename;
  if (req.files.license && req.files.license[0]) updateData.drivingLicenseFile = req.files.license[0].filename;
}

// Ensure all required docs are present either already or in this upload
const required = ['nationalIdFile', 'vehicleRegistrationFile', 'insuranceFile', 'document', 'drivingLicenseFile'];
const missing = required.filter(k => !(updateData[k] || driver[k]));
if (missing.length) {
  return res.status(400).json({ message: 'Missing required documents', missing });
}

if (Object.keys(updateData).length > 0) {
  updateData.documentStatus = 'pending';
  await models.Driver.update(updateData, { where: { id: req.params.id } });
}

const updated = await models.Driver.findByPk(req.params.id);
return res.json({ message: 'Documents uploaded successfully', driver: updated, uploadedFiles: Object.keys(updateData).filter(k => k !== 'documentStatus') });
} catch (e) { return res.status(500).json({ message: e.message }); }
};

// Driver rates passenger
exports.ratePassenger = async (req, res) => {
try {
if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can rate passengers' });
const { rating, comment } = req.body;
const passengerId = req.params.passengerId;

const passenger = await models.Passenger.findByPk(passengerId);
if (!passenger) return res.status(404).json({ message: 'Passenger not found' });

// Set rating directly, capped between 0 and 5 (no ratingCount)
const value = Number(rating);
if (!Number.isFinite(value)) return res.status(400).json({ message: 'Invalid rating' });
const newRating = Math.max(0, Math.min(5, value));

await models.Passenger.update({ rating: newRating }, { where: { id: passengerId } });
const updatedPassenger = await models.Passenger.findByPk(passengerId);
return res.json({ message: 'Passenger rated successfully', passenger: updatedPassenger, rating, comment });
} catch (e) { return res.status(500).json({ message: e.message }); }
};
