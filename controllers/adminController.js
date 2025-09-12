const { Admin } = require('../models/userModels');
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

// Create admin
const createAdmin = async (req, res) => {
  try {
    const { 
      fullName, 
      username, 
      email, 
      phone, 
      password, 
      department, 
      position, 
      adminLevel 
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

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username }]
    });

    if (existingAdmin) {
      return res.status(409).json(formatError('Admin with this email or username already exists', 409));
    }

    // Create new admin
    const adminData = {
      externalId: generateExternalId('ADMN'),
      fullName,
      username,
      email,
      phone: phone || undefined,
      password: await hashPassword(password),
      department: department || undefined,
      position: position || undefined,
      adminLevel: adminLevel || 'admin'
    };

    const admin = await Admin.create(adminData);
    const token = generateToken({ ...admin.toObject(), role: 'admin' });

    res.status(201).json(formatResponse({
      user: sanitizeUserData(admin),
      token
    }, 'Admin created successfully', 201));

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json(formatError('Failed to create admin', 500, error));
  }
};

// Get admin by ID
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).populate('roles');

    if (!admin) {
      return res.status(404).json(formatError('Admin not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(admin)));

  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json(formatError('Failed to get admin', 500, error));
  }
};

// Get admin by external ID
const getAdminByExternalId = async (req, res) => {
  try {
    const { externalId } = req.params;
    const admin = await Admin.findOne({ externalId }).populate('roles');

    if (!admin) {
      return res.status(404).json(formatError('Admin not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(admin)));

  } catch (error) {
    console.error('Get admin by external ID error:', error);
    res.status(500).json(formatError('Failed to get admin', 500, error));
  }
};

// List admins with pagination
const listAdmins = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, adminLevel, isActive } = req.query;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (adminLevel) {
      query.adminLevel = adminLevel;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const admins = await Admin.find(query)
      .populate('roles')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Admin.countDocuments(query);

    const sanitizedAdmins = admins.map(admin => sanitizeUserData(admin));

    res.json(formatResponse(formatPaginationResponse(sanitizedAdmins, page, limit, total)));

  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json(formatError('Failed to list admins', 500, error));
  }
};

// Update admin
const updateAdmin = async (req, res) => {
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

    const admin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roles');

    if (!admin) {
      return res.status(404).json(formatError('Admin not found', 404));
    }

    res.json(formatResponse(sanitizeUserData(admin), 'Admin updated successfully'));

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json(formatError('Failed to update admin', 500, error));
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json(formatError('Admin not found', 404));
    }

    res.status(204).send();

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json(formatError('Failed to delete admin', 500, error));
  }
};

// Authenticate admin
const authenticateAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json(formatError('Username and password are required', 400));
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json(formatError('Invalid credentials', 401));
    }

    if (!admin.isActive) {
      return res.status(403).json(formatError('Account is deactivated', 403));
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateToken({ ...admin.toObject(), role: 'admin' });

    res.json(formatResponse({
      user: sanitizeUserData(admin),
      token
    }, 'Authentication successful'));

  } catch (error) {
    console.error('Authenticate admin error:', error);
    res.status(500).json(formatError('Authentication failed', 500, error));
  }
};

module.exports = {
  createAdmin,
  getAdminById,
  getAdminByExternalId,
  listAdmins,
  updateAdmin,
  deleteAdmin,
  authenticateAdmin
};