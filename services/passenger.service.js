/**
 * Passenger Service
 * Handles business logic for passenger operations
 */

const { Passenger } = require('../models/userModels');
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

class PassengerService {
  /**
   * Create a new passenger
   * @param {Object} passengerData - Passenger data
   * @returns {Object} Created passenger with token
   */
  async createPassenger(passengerData) {
    const { name, phone, email, password, emergencyContacts, preferences } = passengerData;

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

    // Check if user already exists
    const existingUser = await Passenger.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Create new passenger
    const newPassengerData = {
      externalId: generateExternalId('PASS'),
      name,
      phone,
      email,
      password: await hashPassword(password),
      emergencyContacts: emergencyContacts || [],
      preferences: preferences || {}
    };

    const passenger = await Passenger.create(newPassengerData);
    const token = generateToken({ ...passenger.toObject(), role: 'passenger' });

    return {
      user: populateBasicInfo(passenger, 'passenger', 'passenger'),
      token
    };
  }

  /**
   * Get passenger by ID
   * @param {string} id - Passenger ID
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Passenger data filtered by role
   */
  async getPassengerById(id, requesterRole = 'passenger') {
    const passenger = await Passenger.findById(id).populate('roles');
    
    if (!passenger) {
      throw new Error('Passenger not found');
    }

    return populateBasicInfo(passenger, requesterRole, 'passenger');
  }

  /**
   * Get passenger by external ID
   * @param {string} externalId - External ID
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Passenger data filtered by role
   */
  async getPassengerByExternalId(externalId, requesterRole = 'passenger') {
    const passenger = await Passenger.findOne({ externalId }).populate('roles');
    
    if (!passenger) {
      throw new Error('Passenger not found');
    }

    return populateBasicInfo(passenger, requesterRole, 'passenger');
  }

  /**
   * List passengers with pagination
   * @param {Object} queryParams - Query parameters
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Paginated passenger list
   */
  async listPassengers(queryParams, requesterRole = 'passenger') {
    const { page, limit, skip } = getPaginationParams(queryParams);
    const { search, isActive } = queryParams;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const passengers = await Passenger.find(query)
      .populate('roles')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Passenger.countDocuments(query);

    const filteredPassengers = populateBasicInfoBatch(passengers, requesterRole, 'passenger');

    return formatPaginationResponse(filteredPassengers, page, limit, total);
  }

  /**
   * Update passenger
   * @param {string} id - Passenger ID
   * @param {Object} updateData - Update data
   * @param {string} requesterRole - Role of the requester
   * @returns {Object} Updated passenger data
   */
  async updatePassenger(id, updateData, requesterRole = 'passenger') {
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

    const passenger = await Passenger.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!passenger) {
      throw new Error('Passenger not found');
    }

    return populateBasicInfo(passenger, requesterRole, 'passenger');
  }

  /**
   * Delete passenger
   * @param {string} id - Passenger ID
   * @returns {boolean} Success status
   */
  async deletePassenger(id) {
    const passenger = await Passenger.findByIdAndDelete(id);
    
    if (!passenger) {
      throw new Error('Passenger not found');
    }

    return true;
  }

  /**
   * Batch get passengers by IDs
   * @param {Array} ids - Array of passenger IDs
   * @param {string} requesterRole - Role of the requester
   * @returns {Array} Array of passenger data
   */
  async getPassengersByIds(ids, requesterRole = 'passenger') {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('IDs array is required');
    }

    const passengers = await Passenger.find({ _id: { $in: ids } }).populate('roles');
    
    return populateBasicInfoBatch(passengers, requesterRole, 'passenger');
  }

  /**
   * Authenticate passenger
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Object} Passenger data with token
   */
  async authenticatePassenger(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const passenger = await Passenger.findOne({ email });
    if (!passenger) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, passenger.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!passenger.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    passenger.lastLoginAt = new Date();
    await passenger.save();

    const token = generateToken({ ...passenger.toObject(), role: 'passenger' });

    return {
      user: populateBasicInfo(passenger, 'passenger', 'passenger'),
      token
    };
  }

  /**
   * Get passenger statistics
   * @returns {Object} Passenger statistics
   */
  async getPassengerStats() {
    const total = await Passenger.countDocuments();
    const active = await Passenger.countDocuments({ isActive: true });
    const inactive = await Passenger.countDocuments({ isActive: false });
    const recent = await Passenger.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    return {
      total,
      active,
      inactive,
      recent
    };
  }
}

module.exports = new PassengerService();