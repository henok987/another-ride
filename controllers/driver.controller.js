/**
 * Driver Controller
 * Handles HTTP requests for driver operations
 */

const driverService = require('../services/driver.service');
const { formatResponse, formatError } = require('../utils/helpers');

class DriverController {
  /**
   * Create a new driver
   */
  async createDriver(req, res) {
    try {
      const result = await driverService.createDriver(req.body);
      res.status(201).json(formatResponse(result, 'Driver created successfully', 201));
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(400).json(formatError(error.message, 400));
    }
  }

  /**
   * Get driver by ID
   */
  async getDriverById(req, res) {
    try {
      const { id } = req.params;
      const requesterRole = req.user?.role || 'driver';
      
      const driver = await driverService.getDriverById(id, requesterRole);
      res.json(formatResponse(driver));
    } catch (error) {
      console.error('Get driver error:', error);
      const statusCode = error.message === 'Driver not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get driver by external ID
   */
  async getDriverByExternalId(req, res) {
    try {
      const { externalId } = req.params;
      const requesterRole = req.user?.role || 'driver';
      
      const driver = await driverService.getDriverByExternalId(externalId, requesterRole);
      res.json(formatResponse(driver));
    } catch (error) {
      console.error('Get driver by external ID error:', error);
      const statusCode = error.message === 'Driver not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * List drivers with pagination
   */
  async listDrivers(req, res) {
    try {
      const requesterRole = req.user?.role || 'driver';
      
      const result = await driverService.listDrivers(req.query, requesterRole);
      res.json(formatResponse(result));
    } catch (error) {
      console.error('List drivers error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Update driver
   */
  async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const requesterRole = req.user?.role || 'driver';
      
      const driver = await driverService.updateDriver(id, req.body, requesterRole);
      res.json(formatResponse(driver, 'Driver updated successfully'));
    } catch (error) {
      console.error('Update driver error:', error);
      const statusCode = error.message === 'Driver not found' ? 404 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Delete driver
   */
  async deleteDriver(req, res) {
    try {
      const { id } = req.params;
      
      await driverService.deleteDriver(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete driver error:', error);
      const statusCode = error.message === 'Driver not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Batch get drivers by IDs
   */
  async getDriversByIds(req, res) {
    try {
      const { ids } = req.body;
      const requesterRole = req.user?.role || 'driver';
      
      const drivers = await driverService.getDriversByIds(ids, requesterRole);
      res.json(formatResponse(drivers));
    } catch (error) {
      console.error('Get drivers by IDs error:', error);
      res.status(400).json(formatError(error.message, 400));
    }
  }

  /**
   * Authenticate driver
   */
  async authenticateDriver(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await driverService.authenticateDriver(email, password);
      res.json(formatResponse(result, 'Authentication successful'));
    } catch (error) {
      console.error('Authenticate driver error:', error);
      const statusCode = error.message === 'Invalid credentials' ? 401 : 
                       error.message === 'Account is deactivated' ? 403 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Update driver rating
   */
  async updateDriverRating(req, res) {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      const result = await driverService.updateDriverRating(id, rating);
      res.json(formatResponse(result, 'Rating updated successfully'));
    } catch (error) {
      console.error('Update driver rating error:', error);
      const statusCode = error.message === 'Driver not found' ? 404 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get available drivers
   */
  async getAvailableDrivers(req, res) {
    try {
      const requesterRole = req.user?.role || 'passenger';
      
      const drivers = await driverService.getAvailableDrivers(req.query, requesterRole);
      res.json(formatResponse(drivers));
    } catch (error) {
      console.error('Get available drivers error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Get driver statistics
   */
  async getDriverStats(req, res) {
    try {
      const stats = await driverService.getDriverStats();
      res.json(formatResponse(stats));
    } catch (error) {
      console.error('Get driver stats error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }
}

module.exports = new DriverController();