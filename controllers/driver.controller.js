// driverController.js (User Service)
const { models } = require('../models');
const { hashPassword } = require('../utils/password');

exports.create = async (req, res) => {
  try {
    const data = req.body;
    if (data.password) data.password = await hashPassword(data.password);
    // New drivers should start with 'pending' status by default
    const row = await models.Driver.create({ ...data, status: data.status || 'pending' });
    const driverWithRoles = await models.Driver.findByPk(row.id, { include: ['roles'] });
    return res.status(201).json(driverWithRoles);
  } catch (e) {
    console.error('Error creating driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.list = async (req, res) => {
  try {
    const rows = await models.Driver.findAll({ include: ['roles'] });
    return res.json(rows);
  } catch (e) {
    console.error('Error listing drivers:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.get = async (req, res) => {
  try {
    const row = await models.Driver.findByPk(req.params.id, { include: ['roles'] });
    if (!row) return res.status(404).json({ message: 'Driver not found' });
    return res.json(row);
  } catch (e) {
    console.error('Error getting driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const body = req.body || {};
    // Prevent updates to rating fields and sensitive status fields from this admin-like route
    const data = { ...body };
    if ('rating' in data) delete data.rating;
    if ('ratingCount' in data) delete data.ratingCount;
    if ('documentStatus' in data) delete data.documentStatus; // Should be updated via adminController's specific functions
    if ('verification' in data) delete data.verification;       // Should be updated via adminController's specific functions
    if ('status' in data) delete data.status;                   // Should be updated via adminController's specific functions

    if (data.password) data.password = await hashPassword(data.password);
    const [count] = await models.Driver.update(data, { where: { id: req.params.id } });
    if (!count) return res.status(404).json({ message: 'Driver not found' });
    const updated = await models.Driver.findByPk(req.params.id, { include: ['roles'] });
    return res.json(updated);
  } catch (e) {
    console.error('Error updating driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const count = await models.Driver.destroy({ where: { id: req.params.id } });
    if (!count) return res.status(404).json({ message: 'Driver not found' });
    return res.status(204).send();
  } catch (e) {
    console.error('Error deleting driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

// Driver self-control methods
exports.getMyProfile = async (req, res) => {
  try {
    // req.user will be populated by authentication middleware (within User Service)
    if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can access this endpoint' });
    const driver = await models.Driver.findByPk(req.user.id, { include: ['roles'] });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.json(driver);
  } catch (e) {
    console.error('Error getting driver profile:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can access this endpoint' });
    const data = { ...req.body };
    // Prevent drivers from self-updating rating fields, and critical status/verification fields
    if ('rating' in data) delete data.rating;
    if ('ratingCount' in data) delete data.ratingCount;
    if ('status' in data) delete data.status;
    if ('verification' in data) delete data.verification;
    if ('documentStatus' in data) delete data.documentStatus;
    if ('rewardPoints' in data) delete data.rewardPoints; // Driver cannot award themselves points

    if (data.password) data.password = await hashPassword(data.password);
    const [count] = await models.Driver.update(data, { where: { id: req.user.id } });
    if (!count) return res.status(404).json({ message: 'Driver not found' });
    const updated = await models.Driver.findByPk(req.user.id, { include: ['roles'] });
    return res.json(updated);
  } catch (e) {
    console.error('Error updating driver profile:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.toggleMyAvailability = async (req, res) => {
  try {
    if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can toggle availability' });
    const driver = await models.Driver.findByPk(req.user.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Check driver status before allowing availability change
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

    if (driver.status === 'rejected') {
      return res.status(403).json({
        message: 'Cannot change availability. Your account has been rejected. Please contact support.'
      });
    }

    driver.availability = !driver.availability;
    await driver.save();
    return res.json({
      message: 'Availability updated',
      availability: driver.availability,
      status: driver.status
    });
  } catch (e) {
    console.error('Error toggling driver availability:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.checkBookingEligibility = async (req, res) => {
  try {
    if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can check booking eligibility' });
    const driver = await models.Driver.findByPk(req.user.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Using 'approved' as the internal active status
    const canAcceptBookings = driver.status === 'approved' && driver.availability;
    let message = '';

    if (driver.status === 'pending') {
      message = 'Your account is still pending approval. You cannot accept bookings until your account is approved.';
    } else if (driver.status === 'suspended') {
      message = 'Your account has been suspended. You cannot accept bookings. Please contact support.';
    } else if (driver.status === 'rejected') {
      message = 'Your account has been rejected. You cannot accept bookings. Please contact support.';
    } else if (!driver.availability) {
      message = 'You are currently offline. Please toggle your availability to accept bookings.';
    } else { // status is 'approved' and availability is true
      message = 'You are eligible to accept bookings.';
    }

    return res.json({
      canAcceptBookings,
      status: driver.status,
      availability: driver.availability,
      message
    });
  } catch (e) {
    console.error('Error checking driver booking eligibility:', e);
    return res.status(500).json({ message: e.message });
  }
};

// This endpoint seems redundant with toggleMyAvailability for the authenticated driver.
// If it's for an admin to toggle ANY driver's availability, it should be in adminController.
// For now, keeping it here but noting potential redundancy.
exports.toggleAvailability = async (req, res) => {
  try {
    // This looks like an admin-level action, or for a driver to toggle their own via a different route.
    // Assuming this is an admin acting on a specific driver ID. If not, it should be adjusted.
    const driver = await models.Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Apply the same status checks as toggleMyAvailability
    if (driver.status === 'pending' || driver.status === 'suspended' || driver.status === 'rejected') {
        return res.status(403).json({
            message: `Cannot change availability. Driver account is ${driver.status}. Please address account status first.`
        });
    }

    driver.availability = !driver.availability;
    await driver.save();
    return res.json(driver);
  } catch (e) {
    console.error('Error toggling driver availability (admin-like):', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.uploadDocuments = async (req, res) => {
  try {
    const driver = await models.Driver.findByPk(req.params.id); // Assuming this is for a specific driver ID, e.g., driver self-uploading or admin assisting.
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const updateData = {};

    // Assuming req.files is populated by a middleware like 'multer'
    if (req.files) {
      if (req.files.nationalId && req.files.nationalId[0]) updateData.nationalIdFile = req.files.nationalId[0].filename;
      if (req.files.vehicleRegistration && req.files.vehicleRegistration[0]) updateData.vehicleRegistrationFile = req.files.vehicleRegistration[0].filename;
      if (req.files.insurance && req.files.insurance[0]) updateData.insuranceFile = req.files.insurance[0].filename;
      // 'document' seems generic; assuming it refers to an 'other document' field
      if (req.files.document && req.files.document[0]) updateData.document = req.files.document[0].filename;
      if (req.files.license && req.files.license[0]) updateData.drivingLicenseFile = req.files.license[0].filename;
    }

    // Ensure all required docs are present either already or in this upload
    const required = ['nationalIdFile', 'vehicleRegistrationFile', 'insuranceFile', 'document', 'drivingLicenseFile'];
    // Check if the file is being uploaded now OR if the driver already has it
    const missing = required.filter(k => !(updateData[k] || driver[k]));
    if (missing.length) {
      return res.status(400).json({ message: 'Missing required documents', missing });
    }

    if (Object.keys(updateData).length > 0) {
      updateData.documentStatus = 'pending'; // Documents submitted, status changes to pending review
      await models.Driver.update(updateData, { where: { id: req.params.id } });
    }

    const updated = await models.Driver.findByPk(req.params.id, { include: ['roles'] }); // Re-fetch with roles
    return res.json({ message: 'Documents uploaded successfully', driver: updated, uploadedFiles: Object.keys(updateData).filter(k => k !== 'documentStatus') });
  } catch (e) {
    console.error('Error uploading driver documents:', e);
    return res.status(500).json({ message: e.message });
  }
};

// Driver rates passenger (occurs entirely within User Service)
exports.ratePassenger = async (req, res) => {
  try {
    if (req.user.type !== 'driver') return res.status(403).json({ message: 'Only drivers can rate passengers' });
    const { rating, comment } = req.body; // Comment is not stored in Passenger model directly, but could be in a separate Rating model
    const passengerId = req.params.passengerId;

    const passenger = await models.Passenger.findByPk(passengerId);
    if (!passenger) return res.status(404).json({ message: 'Passenger not found' });

    // Set rating directly, capped between 0 and 5
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 0 || value > 5) return res.status(400).json({ message: 'Invalid rating. Must be a number between 0 and 5.' });
    const newRating = Math.max(0, Math.min(5, value)); // Ensure rating is within 0-5

    await models.Passenger.update({ rating: newRating }, { where: { id: passengerId } });
    const updatedPassenger = await models.Passenger.findByPk(passengerId);
    return res.json({ message: 'Passenger rated successfully', passenger: updatedPassenger, rating: newRating, comment });
  } catch (e) {
    console.error('Error rating passenger:', e);
    return res.status(500).json({ message: e.message });
  }
};