/**
 * Admin Controller
 * Handles HTTP requests for admin operations and user management
 */

const adminService = require('../services/admin.service');
const { formatResponse, formatError } = require('../utils/helpers');

class AdminController {
  /**
   * Create a new admin
   */
  async createAdmin(req, res) {
    try {
      const result = await adminService.createAdmin(req.body);
      res.status(201).json(formatResponse(result, 'Admin created successfully', 201));
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(400).json(formatError(error.message, 400));
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(req, res) {
    try {
      const { id } = req.params;
      
      const admin = await adminService.getAdminById(id);
      res.json(formatResponse(admin));
    } catch (error) {
      console.error('Get admin error:', error);
      const statusCode = error.message === 'Admin not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get all users (passengers, drivers, staff, admins)
   */
  async getAllUsers(req, res) {
    try {
      const { userType = 'all' } = req.query;
      
      const result = await adminService.getAllUsers(req.query, userType);
      res.json(formatResponse(result));
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get user by ID (any type)
   */
  async getUserById(req, res) {
    try {
      const { id, userType } = req.params;
      
      const user = await adminService.getUserById(id, userType);
      res.json(formatResponse(user));
    } catch (error) {
      console.error('Get user by ID error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Update user (any type)
   */
  async updateUser(req, res) {
    try {
      const { id, userType } = req.params;
      
      const user = await adminService.updateUser(id, userType, req.body);
      res.json(formatResponse(user, `${userType} updated successfully`));
    } catch (error) {
      console.error('Update user error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Delete user (any type)
   */
  async deleteUser(req, res) {
    try {
      const { id, userType } = req.params;
      
      await adminService.deleteUser(id, userType);
      res.status(204).send();
    } catch (error) {
      console.error('Delete user error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await adminService.authenticateAdmin(email, password);
      res.json(formatResponse(result, 'Authentication successful'));
    } catch (error) {
      console.error('Authenticate admin error:', error);
      const statusCode = error.message === 'Invalid credentials' ? 401 : 
                       error.message === 'Account is deactivated' ? 403 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(req, res) {
    try {
      const stats = await adminService.getSystemStats();
      res.json(formatResponse(stats));
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(req, res) {
    try {
      const logs = await adminService.getUserActivityLogs(req.query);
      res.json(formatResponse(logs));
    } catch (error) {
      console.error('Get user activity logs error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get passengers (admin view)
   */
  async getPassengers(req, res) {
    try {
      const result = await adminService.getAllUsers(req.query, 'passengers');
      res.json(formatResponse(result));
    } catch (error) {
      console.error('Get passengers error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get drivers (admin view)
   */
  async getDrivers(req, res) {
    try {
      const result = await adminService.getAllUsers(req.query, 'drivers');
      res.json(formatResponse(result));
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get staff (admin view)
   */
  async getStaff(req, res) {
    try {
      const result = await adminService.getAllUsers(req.query, 'staff');
      res.json(formatResponse(result));
    } catch (error) {
      console.error('Get staff error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get admins (admin view)
   */
  async getAdmins(req, res) {
    try {
      const result = await adminService.getAllUsers(req.query, 'admins');
      res.json(formatResponse(result));
    } catch (error) {
      console.error('Get admins error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }
}

module.exports = new AdminController();