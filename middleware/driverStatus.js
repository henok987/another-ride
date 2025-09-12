const { models } = require('../models');

/**
 * Middleware to check if driver can accept bookings
 * Drivers with 'pending' or 'suspended' status cannot accept bookings
 */
exports.canAcceptBookings = async (req, res, next) => {
  try {
    if (req.user.type !== 'driver') {
      return res.status(403).json({ 
        message: 'Only drivers can accept bookings' 
      });
    }

    const driver = await models.Driver.findByPk(req.user.id);
    if (!driver) {
      return res.status(404).json({ 
        message: 'Driver not found' 
      });
    }

    // Check driver status
    if (driver.status === 'pending') {
      return res.status(403).json({ 
        message: 'Cannot accept bookings. Your account is still pending approval. Please contact support.',
        status: driver.status,
        canAcceptBookings: false
      });
    }

    if (driver.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Cannot accept bookings. Your account has been suspended. Please contact support.',
        status: driver.status,
        canAcceptBookings: false
      });
    }

    if (!driver.availability) {
      return res.status(403).json({ 
        message: 'Cannot accept bookings. You are currently offline. Please toggle your availability.',
        status: driver.status,
        availability: driver.availability,
        canAcceptBookings: false
      });
    }

    // Driver is eligible to accept bookings
    req.driver = driver;
    next();
  } catch (error) {
    res.status(500).json({ 
      message: `Error checking driver status: ${error.message}` 
    });
  }
};

/**
 * Middleware to check if driver can be assigned to bookings
 * Used by admin/staff when assigning drivers to bookings
 */
exports.canBeAssigned = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ 
        message: 'Driver ID is required' 
      });
    }

    const driver = await models.Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ 
        message: 'Driver not found' 
      });
    }

    // Check driver status
    if (driver.status === 'pending') {
      return res.status(403).json({ 
        message: `Cannot assign booking to driver. Driver account is still pending approval.`,
        driverId: driver.id,
        driverStatus: driver.status,
        canBeAssigned: false
      });
    }

    if (driver.status === 'suspended') {
      return res.status(403).json({ 
        message: `Cannot assign booking to driver. Driver account has been suspended.`,
        driverId: driver.id,
        driverStatus: driver.status,
        canBeAssigned: false
      });
    }

    if (!driver.availability) {
      return res.status(403).json({ 
        message: `Cannot assign booking to driver. Driver is currently offline.`,
        driverId: driver.id,
        driverStatus: driver.status,
        driverAvailability: driver.availability,
        canBeAssigned: false
      });
    }

    // Driver can be assigned
    req.assignedDriver = driver;
    next();
  } catch (error) {
    res.status(500).json({ 
      message: `Error checking driver assignment eligibility: ${error.message}` 
    });
  }
};
