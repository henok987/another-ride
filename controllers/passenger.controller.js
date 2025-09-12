/**
 * Passenger Controller
 * Handles HTTP requests for passenger operations
 */

const passengerService = require('../services/passenger.service');
const { formatResponse, formatError } = require('../utils/helpers');

class PassengerController {
  /**
   * Create a new passenger
   */
  async createPassenger(req, res) {
    try {
      const result = await passengerService.createPassenger(req.body);
      res.status(201).json(formatResponse(result, 'Passenger created successfully', 201));
    } catch (error) {
      console.error('Create passenger error:', error);
      res.status(400).json(formatError(error.message, 400));
    }
  }

  /**
   * Get passenger by ID
   */
  async getPassengerById(req, res) {
    try {
      const { id } = req.params;
      const requesterRole = req.user?.role || 'passenger';
      
      const passenger = await passengerService.getPassengerById(id, requesterRole);
      res.json(formatResponse(passenger));
    } catch (error) {
      console.error('Get passenger error:', error);
      const statusCode = error.message === 'Passenger not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get passenger by external ID
   */
  async getPassengerByExternalId(req, res) {
    try {
      const { externalId } = req.params;
      const requesterRole = req.user?.role || 'passenger';
      
      const passenger = await passengerService.getPassengerByExternalId(externalId, requesterRole);
      res.json(formatResponse(passenger));
    } catch (error) {
      console.error('Get passenger by external ID error:', error);
      const statusCode = error.message === 'Passenger not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * List passengers with pagination
   */
  async listPassengers(req, res) {
    try {
      const requesterRole = req.user?.role || 'passenger';
      
      const result = await passengerService.listPassengers(req.query, requesterRole);
      res.json(formatResponse(result));
    } catch (error) {
      console.error('List passengers error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }

  /**
   * Update passenger
   */
  async updatePassenger(req, res) {
    try {
      const { id } = req.params;
      const requesterRole = req.user?.role || 'passenger';
      
      const passenger = await passengerService.updatePassenger(id, req.body, requesterRole);
      res.json(formatResponse(passenger, 'Passenger updated successfully'));
    } catch (error) {
      console.error('Update passenger error:', error);
      const statusCode = error.message === 'Passenger not found' ? 404 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Delete passenger
   */
  async deletePassenger(req, res) {
    try {
      const { id } = req.params;
      
      await passengerService.deletePassenger(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete passenger error:', error);
      const statusCode = error.message === 'Passenger not found' ? 404 : 500;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Batch get passengers by IDs
   */
  async getPassengersByIds(req, res) {
    try {
      const { ids } = req.body;
      const requesterRole = req.user?.role || 'passenger';
      
      const passengers = await passengerService.getPassengersByIds(ids, requesterRole);
      res.json(formatResponse(passengers));
    } catch (error) {
      console.error('Get passengers by IDs error:', error);
      res.status(400).json(formatError(error.message, 400));
    }
  }

  /**
   * Authenticate passenger
   */
  async authenticatePassenger(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await passengerService.authenticatePassenger(email, password);
      res.json(formatResponse(result, 'Authentication successful'));
    } catch (error) {
      console.error('Authenticate passenger error:', error);
      const statusCode = error.message === 'Invalid credentials' ? 401 : 
                       error.message === 'Account is deactivated' ? 403 : 400;
      res.status(statusCode).json(formatError(error.message, statusCode));
    }
  }

  /**
   * Get passenger statistics
   */
  async getPassengerStats(req, res) {
    try {
      const stats = await passengerService.getPassengerStats();
      res.json(formatResponse(stats));
    } catch (error) {
      console.error('Get passenger stats error:', error);
      res.status(500).json(formatError(error.message, 500));
    }
  }
}

module.exports = new PassengerController();