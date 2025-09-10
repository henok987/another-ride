const axios = require('axios');

// User Service Integration
// This service handles external user-related operations using axios

class UserService {
  constructor() {
    this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:4003';
    this.timeout = 10000;
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RideService-UserIntegration/1.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[UserService] Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[UserService] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[UserService] Response received: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('[UserService] Response error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // Get user by ID
  async getUserById(userId, userType = 'passenger') {
    try {
      const endpoint = userType === 'driver' ? '/v1/drivers' : '/v1/passengers';
      const response = await this.client.get(`${endpoint}/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to get ${userType} ${userId}:`, error.message);
      throw error;
    }
  }

  // Get multiple users by IDs
  async getUsersByIds(userIds, userType = 'passenger') {
    try {
      const endpoint = userType === 'driver' ? '/v1/drivers' : '/v1/passengers';
      const response = await this.client.post(`${endpoint}/batch`, { ids: userIds });
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to get ${userType}s:`, error.message);
      throw error;
    }
  }

  // Search users by criteria
  async searchUsers(criteria, userType = 'passenger') {
    try {
      const endpoint = userType === 'driver' ? '/v1/drivers' : '/v1/passengers';
      const response = await this.client.get(endpoint, { params: criteria });
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to search ${userType}s:`, error.message);
      throw error;
    }
  }

  // Update user status
  async updateUserStatus(userId, status, userType = 'passenger') {
    try {
      const endpoint = userType === 'driver' ? '/v1/drivers' : '/v1/passengers';
      const response = await this.client.put(`${endpoint}/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to update ${userType} status:`, error.message);
      throw error;
    }
  }

  // Get user location (for drivers)
  async getDriverLocation(driverId) {
    try {
      const response = await this.client.get(`/v1/drivers/${driverId}/location`);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to get driver location:`, error.message);
      throw error;
    }
  }

  // Update user location (for drivers)
  async updateDriverLocation(driverId, locationData) {
    try {
      const response = await this.client.post(`/v1/drivers/${driverId}/location`, locationData);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to update driver location:`, error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('[UserService] Health check failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const userService = new UserService();

// Export individual functions for easier importing
module.exports = {
  getUserById: (userId, userType) => userService.getUserById(userId, userType),
  getDriverById: (driverId) => userService.getUserById(driverId, 'driver'),
  getPassengerById: (passengerId) => userService.getUserById(passengerId, 'passenger'),
  getUsersByIds: (userIds, userType) => userService.getUsersByIds(userIds, userType),
  searchUsers: (criteria, userType) => userService.searchUsers(criteria, userType),
  updateUserStatus: (userId, status, userType) => userService.updateUserStatus(userId, status, userType),
  getDriverLocation: (driverId) => userService.getDriverLocation(driverId),
  updateDriverLocation: (driverId, locationData) => userService.updateDriverLocation(driverId, locationData),
  healthCheck: () => userService.healthCheck(),
  // Also export the instance for advanced usage
  instance: userService
};