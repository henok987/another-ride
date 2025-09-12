/**
 * Driver Service
 * Handles business logic for driver operations
 */

const { Driver } = require('../models/userModels');
const { 
  hashPassword, 
  comparePassword, 
  generateToken,
  isValidEmail,
  isValidPhone,
  getPaginationParams,
  formatPaginationResponse,
  generateExternalId
} = require('../utils/helpers');
const { populateBasicInfo, populateBasicInfoBatch } = require('../utils/populate');

class DriverService {
  /**
   * Create a new driver
   * @param {Object} driverData - Driver data
   * @returns {Object} Created driver with token
   */
  async createDriver(driverData) {
    const { 
      name, 
      phone, 
      email, 
      password, 
      vehicleType, 
      vehicleInfo, 
      licenseInfo 
    } = driverData;

    // Validation
    if (!name || !phone || !email || !password) {
      throw new Error('Name, phone, email, and password are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidPhone(phone)) {
      throw new Error('Invalid phone format');
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingDriver) {
      throw new Error('Driver with this email or phone already exists');
    }

    // Create new driver
    const newDriverData = {
      externalId: generateExternalId('DRIV'),
      name,
      phone,
      email,
      password: await hashPassword(password),
      vehicleType: vehicleType || 'mini',
      vehicleInfo: vehicleInfo || {},
      licenseInfo: licenseInfo || {}
    };

    const driver = await Driver.create(newDriverData);
    const token = generateToken({ ...driver.toObject(), role: 'driver' });

    return {
      user: populateBasicInfo(driver, 'driver', 'driver'),
      token
    };
  }

  /**
   * Get driver by ID
   * @param {string} id - Driver ID
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Driver data filtered by role
   */
  async getDriverById(id, requesterRole = 'driver') {
    const driver = await Driver.findById(id).populate('roles');
    
    if (!driver) {
      throw new Error('Driver not found');
    }

    return populateBasicInfo(driver, requesterRole, 'driver');
  }

  /**
   * Get driver by external ID
   * @param {string} externalId - External ID
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Driver data filtered by role
   */
  async getDriverByExternalId(externalId, requesterRole = 'driver') {
    const driver = await Driver.findOne({ externalId }).populate('roles');
    
    if (!driver) {
      throw new Error('Driver not found');
    }

    return populateBasicInfo(driver, requesterRole, 'driver');
  }

  /**
   * List drivers with pagination
   * @param {Object} queryParams - Query parameters
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Paginated driver list
   */
  async listDrivers(queryParams, requesterRole = 'driver') {
    const { page, limit, skip } = getPaginationParams(queryParams);
    const { search, vehicleType, isActive, isVerified } = queryParams;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    const drivers = await Driver.find(query)
      .populate('roles')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Driver.countDocuments(query);

    const filteredDrivers = populateBasicInfoBatch(drivers, requesterRole, 'driver');

    return formatPaginationResponse(filteredDrivers, page, limit, total);
  }

  /**
   * Update driver
   * @param {string} id - Driver ID
   * @param {Object} updateData - Update data
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Updated driver data
   */
  async updateDriver(id, updateData, requesterRole = 'driver') {
    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.externalId;
    delete updateData._id;

    // Validate email if provided
    if (updateData.email && !isValidEmail(updateData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (updateData.phone && !isValidPhone(updateData.phone)) {
      throw new Error('Invalid phone format');
    }

    const driver = await Driver.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!driver) {
      throw new Error('Driver not found');
    }

    return populateBasicInfo(driver, requesterRole, 'driver');
  }

  /**
   * Delete driver
   * @param {string} id - Driver ID
   * @returns {boolean} Success status
   */
  async deleteDriver(id) {
    const driver = await Driver.findByIdAndDelete(id);
    
    if (!driver) {
      throw new Error('Driver not found');
    }

    return true;
  }

  /**
   * Batch get drivers by IDs
   * @param {Array} ids - Array of driver IDs
   * @param {string} requesterRole - Role of the requester
   * @returns {Array} Array of driver data
   */
  async getDriversByIds(ids, requesterRole = 'driver') {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('IDs array is required');
    }

    const drivers = await Driver.find({ _id: { $in: ids } }).populate('roles');
    
    return populateBasicInfoBatch(drivers, requesterRole, 'driver');
  }

  /**
   * Authenticate driver
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Object} Driver data with token
   */
  async authenticateDriver(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const driver = await Driver.findOne({ email });
    if (!driver) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, driver.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!driver.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    driver.lastLoginAt = new Date();
    await driver.save();

    const token = generateToken({ ...driver.toObject(), role: 'driver' });

    return {
      user: populateBasicInfo(driver, 'driver', 'driver'),
      token
    };
  }

  /**
   * Update driver rating
   * @param {string} id - Driver ID
   * @param {number} rating - New rating (1-5)
   * @returns {Object} Updated rating data
   */
  async updateDriverRating(id, rating) {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Calculate new average rating
    const currentTotal = driver.rating * driver.ratingCount;
    const newCount = driver.ratingCount + 1;
    const newRating = (currentTotal + rating) / newCount;

    driver.rating = Math.round(newRating * 100) / 100; // Round to 2 decimal places
    driver.ratingCount = newCount;

    await driver.save();

    return {
      rating: driver.rating,
      ratingCount: driver.ratingCount
    };
  }

  /**
   * Get available drivers
   * @param {Object} filters - Filter criteria
   * @param {string} requesterRole - Role of the requester
   * @returns {Array} Array of available drivers
   */
  async getAvailableDrivers(filters = {}, requesterRole = 'passenger') {
    const { vehicleType, location, rating } = filters;

    let query = {
      isActive: true,
      isVerified: true
    };

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    if (rating) {
      query.rating = { $gte: rating };
    }

    const drivers = await Driver.find(query)
      .populate('roles')
      .sort({ rating: -1, ratingCount: -1 })
      .limit(20);

    return populateBasicInfoBatch(drivers, requesterRole, 'driver');
  }

  /**
   * Get driver statistics
   * @returns {Object} Driver statistics
   */
  async getDriverStats() {
    const total = await Driver.countDocuments();
    const active = await Driver.countDocuments({ isActive: true });
    const verified = await Driver.countDocuments({ isVerified: true });
    const byVehicleType = await Driver.aggregate([
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
    ]);

    return {
      total,
      active,
      verified,
      byVehicleType
    };
  }
}

module.exports = new DriverService();