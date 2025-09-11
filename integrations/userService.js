const axios = require('axios');

// User Service Integration
// This service handles external user-related operations using axios

class UserService {
  constructor() {
    this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:4003';
    this.timeout = 10000;
    
    // Create axios instance with default config
    const trimmedBaseUrl = (this.baseURL || '').replace(/\/+$/, '');
    // Allow overriding the path prefix explicitly
    const configuredPrefix = process.env.USER_SERVICE_PREFIX;
    if (configuredPrefix !== undefined) {
      const normalized = String(configuredPrefix || '').trim();
      this.endpointPrefix = normalized ? (normalized.startsWith('/') ? normalized : `/${normalized}`) : '';
    } else {
      const hasV1Suffix = /\/v1$/.test(trimmedBaseUrl);
      this.endpointPrefix = hasV1Suffix ? '' : '/v1';
    }

    this.client = axios.create({
      baseURL: trimmedBaseUrl,
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

  buildEndpoint(path) {
    return `${this.endpointPrefix}${path}`;
  }

  // Get user by ID
  async getUserById(userId, userType = 'passenger', options = undefined) {
    try {
      const endpoint = userType === 'driver' ? this.buildEndpoint('/drivers') : this.buildEndpoint('/passengers');
      const config = {};
      if (options && options.headers && options.headers.Authorization) {
        config.headers = { Authorization: options.headers.Authorization };
      } else if (process.env.AUTH_SERVICE_BEARER) {
        config.headers = { Authorization: `Bearer ${process.env.AUTH_SERVICE_BEARER}` };
      }
      const response = await this.client.get(`${endpoint}/${userId}`, config);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to get ${userType} ${userId}:`, error.message);
      throw error;
    }
  }

  // Get multiple users by IDs
  async getUsersByIds(userIds, userType = 'passenger', options = undefined) {
    try {
      const endpoint = userType === 'driver' ? this.buildEndpoint('/drivers') : this.buildEndpoint('/passengers');
      const config = {};
      if (options && options.headers && options.headers.Authorization) {
        config.headers = { Authorization: options.headers.Authorization };
      } else if (process.env.AUTH_SERVICE_BEARER) {
        config.headers = { Authorization: `Bearer ${process.env.AUTH_SERVICE_BEARER}` };
      }
      const response = await this.client.post(`${endpoint}/batch`, { ids: userIds }, config);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed batch ${userType}s lookup:`, error.message);
      // Fallback to per-id GETs to improve resilience
      try {
        const perId = await Promise.all(
          (userIds || []).map(async (id) => {
            try {
              const u = await this.getUserById(id, userType, options);
              return u ? u : null;
            } catch (_) { return null; }
          })
        );
        return perId.filter(Boolean);
      } catch (e) {
        console.error(`[UserService] Per-id ${userType}s lookup also failed:`, e.message);
        throw error;
      }
    }
  }

  // Search users by criteria
  async searchUsers(criteria, userType = 'passenger') {
    try {
      const endpoint = userType === 'driver' ? this.buildEndpoint('/drivers') : this.buildEndpoint('/passengers');
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
      const endpoint = userType === 'driver' ? this.buildEndpoint('/drivers') : this.buildEndpoint('/passengers');
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
      const response = await this.client.get(`${this.buildEndpoint('/drivers')}/${driverId}/location`);
      return response.data;
    } catch (error) {
      console.error(`[UserService] Failed to get driver location:`, error.message);
      throw error;
    }
  }

  // Update user location (for drivers)
  async updateDriverLocation(driverId, locationData) {
    try {
      const response = await this.client.post(`${this.buildEndpoint('/drivers')}/${driverId}/location`, locationData);
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