// adminController.js (User Service)
const { models, Op } = require('../models');
const { hashPassword } = require('../utils/password');

exports.create = async (req, res) => {
  try {
    const data = req.body;
    if (data.password) data.password = await hashPassword(data.password);
    const row = await models.Admin.create(data);
    // When creating, you might want to return the admin with roles immediately
    const adminWithRoles = await models.Admin.findByPk(row.id, { include: ['roles'] });
    return res.status(201).json(adminWithRoles);
  } catch (e) {
    console.error('Error creating admin:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.list = async (req, res) => {
  try {
    const rows = await models.Admin.findAll({ include: ['roles'] });
    return res.json(rows);
  } catch (e) {
    console.error('Error listing admins:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.get = async (req, res) => {
  try {
    const row = await models.Admin.findByPk(req.params.id, { include: ['roles'] });
    if (!row) return res.status(404).json({ message: 'Admin not found' }); // More specific message
    return res.json(row);
  } catch (e) {
    console.error('Error getting admin:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = req.body;
    if (data.password) data.password = await hashPassword(data.password);
    const [count] = await models.Admin.update(data, { where: { id: req.params.id } });
    if (!count) return res.status(404).json({ message: 'Admin not found' }); // More specific message
    const updated = await models.Admin.findByPk(req.params.id, { include: ['roles'] }); // Include roles on update as well
    return res.json(updated);
  } catch (e) {
    console.error('Error updating admin:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const count = await models.Admin.destroy({ where: { id: req.params.id } });
    if (!count) return res.status(404).json({ message: 'Admin not found' }); // More specific message
    return res.status(204).send();
  } catch (e) {
    console.error('Error deleting admin:', e);
    return res.status(500).json({ message: e.message });
  }
};

// --- Driver Approval and Document Management (now specifically for Driver, not general 'Admin') ---
// These functions are managing Driver entities, but are exposed by the Admin controller for admin actions.
// They will operate on the Driver model within the User Service.

exports.approveDriver = async (req, res) => {
  try {
    const driver = await models.Driver.findByPk(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.verification = true;
    driver.documentStatus = 'approved';
    driver.status = 'active'; // Set to active upon approval
    await driver.save();
    return res.json(driver);
  } catch (e) {
    console.error('Error approving driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.approveDriverDocuments = async (req, res) => {
  try {
    const driver = await models.Driver.findByPk(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.documentStatus = 'approved';
    // If documents are approved, and status is still pending, move to active if verification is also true
    if (driver.verification && driver.status === 'pending') {
      driver.status = 'active';
    }
    await driver.save();
    return res.json(driver);
  } catch (e) {
    console.error('Error approving driver documents:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.rejectDriverDocuments = async (req, res) => {
  try {
    const driver = await models.Driver.findByPk(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.documentStatus = 'rejected';
    driver.status = 'rejected'; // If documents are rejected, the overall status should also be rejected
    driver.verification = false; // And verification should be false
    driver.availability = false; // Driver cannot be available if rejected
    await driver.save();
    return res.json(driver);
  } catch (e) {
    console.error('Error rejecting driver documents:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.getPendingDriverDocuments = async (req, res) => {
  try {
    // Return any drivers whose account/documents are pending review
    const drivers = await models.Driver.findAll({
      where: {
        [Op.or]: [
          { status: 'pending' },
          { documentStatus: 'pending' },
          { documentStatus: null }, // Treat null as pending review
          { documentStatus: '' }    // Treat empty string as pending review
        ]
      }
    });
    return res.json(drivers);
  } catch (e) {
    console.error('Error getting pending driver documents:', e);
    return res.status(500).json({ message: e.message });
  }
};

// --- User Filtering by Role (within User Service) ---
// This function queries the specific user models directly.
exports.filterByRole = async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) return res.status(400).json({ message: 'Role parameter is required' });

    let users = [];
    switch (role.toLowerCase()) {
      case 'passenger':
        users = await models.Passenger.findAll({ include: ['roles'] });
        break;
      case 'driver':
        users = await models.Driver.findAll({ include: ['roles'] });
        break;
      case 'staff':
        users = await models.Staff.findAll({ include: ['roles'] });
        break;
      case 'admin':
        users = await models.Admin.findAll({ include: ['roles'] });
        break;
      default:
        return res.status(400).json({ message: 'Invalid role. Use: passenger, driver, staff, admin' });
    }

    return res.json(users);
  } catch (e) {
    console.error('Error filtering users by role:', e);
    return res.status(500).json({ message: e.message });
  }
};

// --- List Staff by Role (within User Service) ---
exports.listStaffByRole = async (req, res) => {
  try {
    const { role, roleId } = req.query; // supports role name or roleId
    let include = ['roles'];
    if (roleId) {
      include = [{ association: 'roles', where: { id: Number(roleId) }, required: true }];
    } else if (role) {
      include = [{ association: 'roles', where: { name: role }, required: true }];
    }
    const staff = await models.Staff.findAll({ include });
    return res.json(staff);
  } catch (e) {
    console.error('Error listing staff by role:', e);
    return res.status(500).json({ message: e.message });
  }
};

// --- Award Reward Points (Admin acting on users within User Service) ---
// These directly modify driver/passenger points stored in the User Service database.
exports.awardDriverPoints = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { points } = req.body;
    const amount = Number(points);
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: 'points must be a non-zero number' });
    const driver = await models.Driver.findByPk(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.rewardPoints = (driver.rewardPoints || 0) + amount;
    await driver.save();
    return res.json({ message: 'Driver points updated', driverId: driver.id, rewardPoints: driver.rewardPoints });
  } catch (e) {
    console.error('Error awarding driver points:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.awardPassengerPoints = async (req, res) => {
  try {
    const { passengerId } = req.params;
    const { points } = req.body;
    const amount = Number(points);
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: 'points must be a non-zero number' });
    const passenger = await models.Passenger.findByPk(passengerId);
    if (!passenger) return res.status(404).json({ message: 'Passenger not found' });
    passenger.rewardPoints = (passenger.rewardPoints || 0) + amount;
    await passenger.save();
    return res.json({ message: 'Passenger points updated', passengerId: passenger.id, rewardPoints: passenger.rewardPoints });
  } catch (e) {
    console.error('Error awarding passenger points:', e);
    return res.status(500).json({ message: e.message });
  }
};

// Update a driver's status-related fields (verification, documentStatus, availability, status)
exports.updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification, documentStatus, availability, status } = req.body || {};
    const driver = await models.Driver.findByPk(id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    if (typeof verification !== 'undefined') driver.verification = Boolean(verification);
    if (typeof documentStatus !== 'undefined') driver.documentStatus = documentStatus;
    if (typeof availability !== 'undefined') driver.availability = Boolean(availability);

    // Optional: update high-level account status
    if (typeof status !== 'undefined') {
      let normalized = String(status).toLowerCase();
      // 'active' is an alias for 'approved' for external consistency, internally use 'approved'
      if (normalized === 'active') normalized = 'approved';
      const allowed = ['pending', 'approved', 'suspended', 'rejected'];
      if (!allowed.includes(normalized)) {
        return res.status(400).json({
          message: "Invalid status. Allowed values: pending, approved, suspended, rejected."
        });
      }
      driver.status = normalized;
      // Apply side-effects
      if (normalized === 'approved') {
        driver.verification = true;
        driver.documentStatus = 'approved';
        driver.availability = true; // Approved drivers are generally available by default
      } else if (normalized === 'pending') {
        driver.verification = false;
        driver.documentStatus = 'pending';
        driver.availability = false;
      } else if (normalized === 'suspended') {
        driver.availability = false;
      } else if (normalized === 'rejected') {
        driver.verification = false;
        driver.documentStatus = 'rejected';
        driver.availability = false;
      }
    }

    await driver.save();
    return res.json({ message: 'Driver status updated', driver });
  } catch (e) {
    console.error('Error updating driver status:', e);
    return res.status(500).json({ message: e.message });
  }
};