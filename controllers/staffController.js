const { Staff } = require('../models/userModels');
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

// Create staff
const createStaff = async (req, res) => {
  try {
    const { 
      fullName, 
      username, 
      email, 
      phone, 
      password, 
      department, 
      position, 
      employeeId 
    } = req.body;

    // Validation
    if (!fullName || !username || !email || !password) {
      return res.status(400).json(formatError('Full name, username, email, and password are required', 400));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(formatError('Invalid email format', 400));
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json(formatError('Invalid phone format', 400));
    }

    // Check if staff already exists
    const existingStaff = await Staff.findOne({
      $or: [{ email }, { username }, { employeeId }]
    });

    if (existingStaff) {
      return res.status(409).json(formatError('Staff with this email, username, or employee ID already exists', 409));
    }

    // Create new staff
    const staffData = {
      externalId: generateExternalId('STAF'),
      fullName,
      username,
      email,
      phone: phone || undefined,
      password: await hashPassword(password),
      department: department || undefined,
      position: position || undefined,
      employeeId: employeeId || undefined
    };

    const staff = await Staff.create(staffData);
    const token = generateToken({ ...staff.toObject(), role: 'staff' });

    res.status(201).json(formatResponse({
      user: sanitizeUserData(staff),
      token
    }, 'Staff created successfully', 201));

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json(formatError('Failed to create staff', 500, error));
  }
};

// Get staff by ID
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id).populate('roles');

    if (!staff) {
      return res.status(404).json(formatError('Staff not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(staff)));

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json(formatError('Failed to get staff', 500, error));
  }
};

// Get staff by external ID
const getStaffByExternalId = async (req, res) => {
  try {
    const { externalId } = req.params;
    const staff = await Staff.findOne({ externalId }).populate('roles');

    if (!staff) {
      return res.status(404).json(formatError('Staff not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(staff)));

  } catch (error) {
    console.error('Get staff by external ID error:', error);
    res.status(500).json(formatError('Failed to get staff', 500, error));
  }
};

// List staff with pagination
const listStaff = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, department, isActive } = req.query;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) {
      query.department = department;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const staff = await Staff.find(query)
      .populate('roles')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Staff.countDocuments(query);

    const sanitizedStaff = staff.map(staffMember => sanitizeUserData(staffMember));

    res.json(formatResponse(formatPaginationResponse(sanitizedStaff, page, limit, total)));

  } catch (error) {
    console.error('List staff error:', error);
    res.status(500).json(formatError('Failed to list staff', 500, error));
  }
};

// Update staff
const updateStaff = async (req, res) => {
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

    const staff = await Staff.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!staff) {
      return res.status(404).json(formatError('Staff not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(staff), 'Staff updated successfully'));

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json(formatError('Failed to update staff', 500, error));
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);

    if (!staff) {
      return res.status(404).json(formatError('Staff not found', 404));
    }

    res.status(204).send();

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json(formatError('Failed to delete staff', 500, error));
  }
};

// Authenticate staff
const authenticateStaff = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json(formatError('Username and password are required', 400));
    }

    const staff = await Staff.findOne({ username });
    if (!staff) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    const isPasswordValid = await comparePassword(password, staff.password);
    if (!isPasswordValid) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    if (!staff.isActive) {
      return res.status(403).json(formatError('Account is deactivated', 403));
    }

    // Update last login
    staff.lastLoginAt = new Date();
    await staff.save();

    const token = generateToken({ ...staff.toObject(), role: 'staff' });

    res.json(formatResponse({
      user: sanitizeUserData(staff),
      token
    }, 'Authentication successful'));

  } catch (error) {
    console.error('Authenticate staff error:', error);
    res.status(500).json(formatError('Authentication failed', 500, error));
  }
};

module.exports = {
  createStaff,
  getStaffById,
  getStaffByExternalId,
  listStaff,
  updateStaff,
  deleteStaff,
  authenticateStaff
};