/**
 * Admin Service
 * Handles business logic for admin operations and user management
 */

const { Passenger, Driver, Staff, Admin } = require('../models/userModels');
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

class AdminService {
  /**
   * Create a new admin
   * @param {Object} adminData - Admin data
   * @returns {Object} Created admin with token
   */
  async createAdmin(adminData) {
    const { 
      fullName, 
      username, 
      email, 
      password, 
      phone, 
      department, 
      position, 
      adminLevel 
    } = adminData;

    // Validation
    if (!fullName || !username || !email || !password) {
      throw new Error('Full name, username, email, and password are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (phone && !isValidPhone(phone)) {
      throw new Error('Invalid phone format');
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username }]
    });

    if (existingAdmin) {
      throw new Error('Admin with this email or username already exists');
    }

    // Create new admin
    const newAdminData = {
      externalId: generateExternalId('ADMIN'),
      fullName,
      username,
      email,
      password: await hashPassword(password),
      phone: phone || '',
      department: department || '',
      position: position || '',
      adminLevel: adminLevel || 'admin'
    };

    const admin = await Admin.create(newAdminData);
    const token = generateToken({ ...admin.toObject(), role: 'admin' });

    return {
      user: populateBasicInfo(admin, 'admin', 'admin'),
      token
    };
  }

  /**
   * Get admin by ID
   * @param {string} id - Admin ID
   * @returns {Object} Admin data
   */
  async getAdminById(id) {
    const admin = await Admin.findById(id).populate('roles');
    
    if (!admin) {
      throw new Error('Admin not found');
    }

    return populateBasicInfo(admin, 'admin', 'admin');
  }

  /**
   * List all users (passengers, drivers, staff, admins)
   * @param {Object} queryParams - Query parameters
   * @param {string} userType - Type of users to fetch
   * @returns {Object} Paginated user list
   */
  async getAllUsers(queryParams, userType = 'all') {
    const { page, limit, skip } = getPaginationParams(queryParams);
    const { search, isActive } = queryParams;

    let results = [];
    let total = 0;

    if (userType === 'all' || userType === 'passengers') {
      let passengerQuery = {};
      if (search) {
        passengerQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        passengerQuery.isActive = isActive === 'true';
      }

      const passengers = await Passenger.find(passengerQuery)
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      results = results.concat(passengers.map(p => ({ ...p.toObject(), userType: 'passenger' })));
      total += await Passenger.countDocuments(passengerQuery);
    }

    if (userType === 'all' || userType === 'drivers') {
      let driverQuery = {};
      if (search) {
        driverQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        driverQuery.isActive = isActive === 'true';
      }

      const drivers = await Driver.find(driverQuery)
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      results = results.concat(drivers.map(d => ({ ...d.toObject(), userType: 'driver' })));
      total += await Driver.countDocuments(driverQuery);
    }

    if (userType === 'all' || userType === 'staff') {
      let staffQuery = {};
      if (search) {
        staffQuery.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        staffQuery.isActive = isActive === 'true';
      }

      const staff = await Staff.find(staffQuery)
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      results = results.concat(staff.map(s => ({ ...s.toObject(), userType: 'staff' })));
      total += await Staff.countDocuments(staffQuery);
    }

    if (userType === 'all' || userType === 'admins') {
      let adminQuery = {};
      if (search) {
        adminQuery.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        adminQuery.isActive = isActive === 'true';
      }

      const admins = await Admin.find(adminQuery)
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      results = results.concat(admins.map(a => ({ ...a.toObject(), userType: 'admin' })));
      total += await Admin.countDocuments(adminQuery);
    }

    // Sort combined results by creation date
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination to combined results
    const paginatedResults = results.slice(skip, skip + limit);

    return formatPaginationResponse(paginatedResults, page, limit, total);
  }

  /**
   * Get user by ID (any type)
   * @param {string} id - User ID
   * @param {string} userType - Type of user
   * @returns {Object} User data
   */
  async getUserById(id, userType) {
    let user = null;

    switch (userType) {
      case 'passenger':
        user = await Passenger.findById(id).populate('roles');
        break;
      case 'driver':
        user = await Driver.findById(id).populate('roles');
        break;
      case 'staff':
        user = await Staff.findById(id).populate('roles');
        break;
      case 'admin':
        user = await Admin.findById(id).populate('roles');
        break;
      default:
        throw new Error('Invalid user type');
    }

    if (!user) {
      throw new Error(`${userType} not found`);
    }

    return populateBasicInfo(user, 'admin', userType);
  }

  /**
   * Update user (any type)
   * @param {string} id - User ID
   * @param {string} userType - Type of user
   * @param {Object} updateData - Update data
   * @returns {Object} Updated user data
   */
  async updateUser(id, userType, updateData) {
    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.externalId;
    delete updateData._id;

    let user = null;

    switch (userType) {
      case 'passenger':
        user = await Passenger.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('roles');
        break;
      case 'driver':
        user = await Driver.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('roles');
        break;
      case 'staff':
        user = await Staff.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('roles');
        break;
      case 'admin':
        user = await Admin.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('roles');
        break;
      default:
        throw new Error('Invalid user type');
    }

    if (!user) {
      throw new Error(`${userType} not found`);
    }

    return populateBasicInfo(user, 'admin', userType);
  }

  /**
   * Delete user (any type)
   * @param {string} id - User ID
   * @param {string} userType - Type of user
   * @returns {boolean} Success status
   */
  async deleteUser(id, userType) {
    let user = null;

    switch (userType) {
      case 'passenger':
        user = await Passenger.findByIdAndDelete(id);
        break;
      case 'driver':
        user = await Driver.findByIdAndDelete(id);
        break;
      case 'staff':
        user = await Staff.findByIdAndDelete(id);
        break;
      case 'admin':
        user = await Admin.findByIdAndDelete(id);
        break;
      default:
        throw new Error('Invalid user type');
    }

    if (!user) {
      throw new Error(`${userType} not found`);
    }

    return true;
  }

  /**
   * Authenticate admin
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Object} Admin data with token
   */
  async authenticateAdmin(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateToken({ ...admin.toObject(), role: 'admin' });

    return {
      user: populateBasicInfo(admin, 'admin', 'admin'),
      token
    };
  }

  /**
   * Get system statistics
   * @returns {Object} System statistics
   */
  async getSystemStats() {
    const [
      passengerStats,
      driverStats,
      staffStats,
      adminStats
    ] = await Promise.all([
      Passenger.countDocuments(),
      Driver.countDocuments(),
      Staff.countDocuments(),
      Admin.countDocuments()
    ]);

    const [
      activePassengers,
      activeDrivers,
      activeStaff,
      activeAdmins
    ] = await Promise.all([
      Passenger.countDocuments({ isActive: true }),
      Driver.countDocuments({ isActive: true }),
      Staff.countDocuments({ isActive: true }),
      Admin.countDocuments({ isActive: true })
    ]);

    return {
      users: {
        passengers: { total: passengerStats, active: activePassengers },
        drivers: { total: driverStats, active: activeDrivers },
        staff: { total: staffStats, active: activeStaff },
        admins: { total: adminStats, active: activeAdmins }
      },
      totals: {
        totalUsers: passengerStats + driverStats + staffStats + adminStats,
        activeUsers: activePassengers + activeDrivers + activeStaff + activeAdmins
      }
    };
  }

  /**
   * Get user activity logs
   * @param {Object} queryParams - Query parameters
   * @returns {Object} Activity logs
   */
  async getUserActivityLogs(queryParams) {
    const { page, limit, skip } = getPaginationParams(queryParams);
    const { userType, userId, action } = queryParams;

    // This would typically come from a separate logs collection
    // For now, we'll return a placeholder structure
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
}

module.exports = new AdminService();