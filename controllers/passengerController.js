const { Passenger } = require('../models/userModels');
const { 
  hashPassword, 
  comparePassword, 
  generateToken,
  formatResponse, 
  formatError,
  sanitizeUserData,
  sanitizeForExternalService,
  sanitizeBatchUserData,
  isValidEmail,
  isValidPhone,
  getPaginationParams,
  formatPaginationResponse,
  generateExternalId
} = require('../utils/helpers');

// Create passenger
const createPassenger = async (req, res) => {
  try {
    const { name, phone, email, password, emergencyContacts, preferences } = req.body;

    // Validation
    if (!name || !phone || !email || !password) {
      return res.status(400).json(formatError('Name, phone, email, and password are required', 400));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(formatError('Invalid email format', 400));
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json(formatError('Invalid phone format', 400));
    }

    // Check if user already exists
    const existingUser = await Passenger.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(409).json(formatError('User with this email or phone already exists', 409));
    }

    // Create new passenger
    const passengerData = {
      externalId: generateExternalId('PASS'),
      name,
      phone,
      email,
      password: await hashPassword(password),
      emergencyContacts: emergencyContacts || [],
      preferences: preferences || {}
    };

    const passenger = await Passenger.create(passengerData);
    const token = generateToken({ ...passenger.toObject(), role: 'passenger' });

    res.status(201).json(formatResponse({
      user: sanitizeUserData(passenger),
      token
    }, 'Passenger created successfully', 201));

  } catch (error) {
    console.error('Create passenger error:', error);
    res.status(500).json(formatError('Failed to create passenger', 500, error));
  }
};

// Get passenger by ID
const getPassengerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceType = 'ride' } = req.query;
    const passenger = await Passenger.findById(id).populate('roles');

    if (!passenger) {
      return res.status(404).json(formatError('Passenger not found', 404));
    }

    // Determine requester role from authentication
    const requesterRole = req.user?.role || 'public';
    const sanitizedData = sanitizeForExternalService(passenger, requesterRole, serviceType);

    res.json(formatResponse(sanitizedData));

  } catch (error) {
    console.error('Get passenger error:', error);
    res.status(500).json(formatError('Failed to get passenger', 500, error));
  }
};

// Get passenger by external ID
const getPassengerByExternalId = async (req, res) => {
  try {
    const { externalId } = req.params;
    const { serviceType = 'ride' } = req.query;
    const passenger = await Passenger.findOne({ externalId }).populate('roles');

    if (!passenger) {
      return res.status(404).json(formatError('Passenger not found', 404));
    }

    // Determine requester role from authentication
    const requesterRole = req.user?.role || 'public';
    const sanitizedData = sanitizeForExternalService(passenger, requesterRole, serviceType);

    res.json(formatResponse(sanitizedData));

  } catch (error) {
    console.error('Get passenger by external ID error:', error);
    res.status(500).json(formatError('Failed to get passenger', 500, error));
  }
};

// List passengers with pagination
const listPassengers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, isActive, serviceType = 'ride' } = req.query;

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

    // Determine requester role from authentication
    const requesterRole = req.user?.role || 'public';
    const sanitizedPassengers = sanitizeBatchUserData(passengers, requesterRole, serviceType);

    res.json(formatResponse(formatPaginationResponse(sanitizedPassengers, page, limit, total)));

  } catch (error) {
    console.error('List passengers error:', error);
    res.status(500).json(formatError('Failed to list passengers', 500, error));
  }
};

// Update passenger
const updatePassenger = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.externalId;
    delete updateData._id;

    // Validate email if provided
    if (updateData.email && !isValidEmail(updateData.email)) {
      return res.status(400).json(formatError('Invalid email format', 400));
    }

    // Validate phone if provided
    if (updateData.phone && !isValidPhone(updateData.phone)) {
      return res.status(400).json(formatError('Invalid phone format', 400));
    }

    const passenger = await Passenger.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!passenger) {
      return res.status(404).json(formatError('Passenger not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(passenger), 'Passenger updated successfully'));

  } catch (error) {
    console.error('Update passenger error:', error);
    res.status(500).json(formatError('Failed to update passenger', 500, error));
  }
};

// Delete passenger
const deletePassenger = async (req, res) => {
  try {
    const { id } = req.params;
    const passenger = await Passenger.findByIdAndDelete(id);

    if (!passenger) {
      return res.status(404).json(formatError('Passenger not found', 404));
    }

    res.status(204).send();

  } catch (error) {
    console.error('Delete passenger error:', error);
    res.status(500).json(formatError('Failed to delete passenger', 500, error));
  }
};

// Batch get passengers by IDs
const getPassengersByIds = async (req, res) => {
  try {
    const { ids, serviceType = 'ride' } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(formatError('IDs array is required', 400));
    }

    const passengers = await Passenger.find({ _id: { $in: ids } }).populate('roles');
    
    // Determine requester role from authentication
    const requesterRole = req.user?.role || 'public';
    const sanitizedPassengers = sanitizeBatchUserData(passengers, requesterRole, serviceType);

    res.json(formatResponse(sanitizedPassengers));

  } catch (error) {
    console.error('Get passengers by IDs error:', error);
    res.status(500).json(formatError('Failed to get passengers', 500, error));
  }
};

// Authenticate passenger
const authenticatePassenger = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatError('Email and password are required', 400));
    }

    const passenger = await Passenger.findOne({ email });
    if (!passenger) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    const isPasswordValid = await comparePassword(password, passenger.password);
    if (!isPasswordValid) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    if (!passenger.isActive) {
      return res.status(403).json(formatError('Account is deactivated', 403));
    }

    // Update last login
    passenger.lastLoginAt = new Date();
    await passenger.save();

    const token = generateToken({ ...passenger.toObject(), role: 'passenger' });

    res.json(formatResponse({
      user: sanitizeUserData(passenger),
      token
    }, 'Authentication successful'));

  } catch (error) {
    console.error('Authenticate passenger error:', error);
    res.status(500).json(formatError('Authentication failed', 500, error));
  }
};

module.exports = {
  createPassenger,
  getPassengerById,
  getPassengerByExternalId,
  listPassengers,
  updatePassenger,
  deletePassenger,
  getPassengersByIds,
  authenticatePassenger
};