const { Driver } = require('../models/userModels');
const { 
  hashPassword, 
  comparePassword, 
  generateToken,
  formatResponse, 
  formatError,
  sanitizeUserData,
  isValidEmail,
  isValidPhone,
  getPaginationParams,
  formatPaginationResponse,
  generateExternalId
} = require('../utils/helpers');

// Create driver
const createDriver = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      email, 
      password, 
      vehicleType, 
      vehicleInfo, 
      licenseInfo 
    } = req.body;

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

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingDriver) {
      return res.status(409).json(formatError('Driver with this email or phone already exists', 409));
    }

    // Create new driver
    const driverData = {
      externalId: generateExternalId('DRIV'),
      name,
      phone,
      email,
      password: await hashPassword(password),
      vehicleType: vehicleType || 'mini',
      vehicleInfo: vehicleInfo || {},
      licenseInfo: licenseInfo || {}
    };

    const driver = await Driver.create(driverData);
    const token = generateToken({ ...driver.toObject(), role: 'driver' });

    res.status(201).json(formatResponse({
      user: sanitizeUserData(driver),
      token
    }, 'Driver created successfully', 201));

  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json(formatError('Failed to create driver', 500, error));
  }
};

// Get driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id).populate('roles');

    if (!driver) {
      return res.status(404).json(formatError('Driver not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(driver)));

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json(formatError('Failed to get driver', 500, error));
  }
};

// Get driver by external ID
const getDriverByExternalId = async (req, res) => {
  try {
    const { externalId } = req.params;
    const driver = await Driver.findOne({ externalId }).populate('roles');

    if (!driver) {
      return res.status(404).json(formatError('Driver not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(driver)));

  } catch (error) {
    console.error('Get driver by external ID error:', error);
    res.status(500).json(formatError('Failed to get driver', 500, error));
  }
};

// List drivers with pagination
const listDrivers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, vehicleType, isActive, isVerified } = req.query;

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

    const sanitizedDrivers = drivers.map(driver => sanitizeUserData(driver));

    res.json(formatResponse(formatPaginationResponse(sanitizedDrivers, page, limit, total)));

  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json(formatError('Failed to list drivers', 500, error));
  }
};

// Update driver
const updateDriver = async (req, res) => {
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

    const driver = await Driver.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!driver) {
      return res.status(404).json(formatError('Driver not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(driver), 'Driver updated successfully'));

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json(formatError('Failed to update driver', 500, error));
  }
};

// Delete driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findByIdAndDelete(id);

    if (!driver) {
      return res.status(404).json(formatError('Driver not found', 404));
    }

    res.status(204).send();

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json(formatError('Failed to delete driver', 500, error));
  }
};

// Batch get drivers by IDs
const getDriversByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(formatError('IDs array is required', 400));
    }

    const drivers = await Driver.find({ _id: { $in: ids } }).populate('roles');
    const sanitizedDrivers = drivers.map(driver => sanitizeUserData(driver));

    res.json(formatResponse(sanitizedDrivers));

  } catch (error) {
    console.error('Get drivers by IDs error:', error);
    res.status(500).json(formatError('Failed to get drivers', 500, error));
  }
};

// Authenticate driver
const authenticateDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatError('Email and password are required', 400));
    }

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    const isPasswordValid = await comparePassword(password, driver.password);
    if (!isPasswordValid) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    if (!driver.isActive) {
      return res.status(403).json(formatError('Account is deactivated', 403));
    }

    // Update last login
    driver.lastLoginAt = new Date();
    await driver.save();

    const token = generateToken({ ...driver.toObject(), role: 'driver' });

    res.json(formatResponse({
      user: sanitizeUserData(driver),
      token
    }, 'Authentication successful'));

  } catch (error) {
    console.error('Authenticate driver error:', error);
    res.status(500).json(formatError('Authentication failed', 500, error));
  }
};

// Update driver rating
const updateDriverRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(formatError('Rating must be between 1 and 5', 400));
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json(formatError('Driver not found', 404));
    }

    // Calculate new average rating
    const currentTotal = driver.rating * driver.ratingCount;
    const newCount = driver.ratingCount + 1;
    const newRating = (currentTotal + rating) / newCount;

    driver.rating = Math.round(newRating * 100) / 100; // Round to 2 decimal places
    driver.ratingCount = newCount;

    await driver.save();

    res.json(formatResponse({
      rating: driver.rating,
      ratingCount: driver.ratingCount
    }, 'Rating updated successfully'));

  } catch (error) {
    console.error('Update driver rating error:', error);
    res.status(500).json(formatError('Failed to update rating', 500, error));
  }
};

module.exports = {
  createDriver,
  getDriverById,
  getDriverByExternalId,
  listDrivers,
  updateDriver,
  deleteDriver,
  getDriversByIds,
  authenticateDriver,
  updateDriverRating
};