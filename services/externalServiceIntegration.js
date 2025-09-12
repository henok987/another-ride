const axios = require('axios');

/**
 * External Service Integration Layer
 * Handles communication with external services and provides standardized interfaces
 */

class ExternalServiceIntegration {
  constructor() {
    this.services = {
      ride: process.env.RIDE_SERVICE_URL || 'http://localhost:4000',
      payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001',
      notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4002'
    };
    
    this.timeout = parseInt(process.env.EXTERNAL_SERVICE_TIMEOUT) || 5000;
    this.retryAttempts = parseInt(process.env.EXTERNAL_SERVICE_RETRY_ATTEMPTS) || 3;
  }

  /**
   * Create axios instance with default configuration
   */
  createAxiosInstance(serviceUrl) {
    return axios.create({
      baseURL: serviceUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'User-Service/1.0.0'
      }
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(serviceName, endpoint, method = 'GET', data = null, headers = {}) {
    const serviceUrl = this.services[serviceName];
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const axiosInstance = this.createAxiosInstance(serviceUrl);
    
    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const config = {
          method,
          url: endpoint,
          headers: {
            ...headers,
            'X-Service-Source': 'user-service',
            'X-Request-ID': this.generateRequestId()
          }
        };

        if (data) {
          config.data = data;
        }

        const response = await axiosInstance(config);
        return response.data;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed for ${serviceName}:${endpoint}`, error.message);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to connect to ${serviceName} after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Generate unique request ID for tracing
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate user data for external service consumption
   */
  validateUserDataForService(userData, serviceType) {
    const requiredFields = {
      ride: ['id', 'externalId', 'name', 'email', 'phone'],
      payment: ['id', 'externalId', 'name', 'email'],
      notification: ['id', 'externalId', 'name', 'email', 'phone']
    };

    const fields = requiredFields[serviceType] || requiredFields.ride;
    const missingFields = fields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields for ${serviceType} service: ${missingFields.join(', ')}`);
    }

    return true;
  }

  /**
   * Notify external service about user data changes
   */
  async notifyUserUpdate(serviceName, userData, changeType = 'update') {
    try {
      this.validateUserDataForService(userData, serviceName);
      
      const endpoint = '/api/v1/users/sync';
      const payload = {
        userData,
        changeType,
        timestamp: new Date().toISOString(),
        source: 'user-service'
      };

      return await this.makeRequest(serviceName, endpoint, 'POST', payload);
    } catch (error) {
      console.error(`Failed to notify ${serviceName} about user update:`, error.message);
      // Don't throw error to avoid breaking the main flow
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user preferences for external service
   */
  async getUserPreferences(serviceName, userId) {
    try {
      const endpoint = `/api/v1/users/${userId}/preferences`;
      return await this.makeRequest(serviceName, endpoint, 'GET');
    } catch (error) {
      console.error(`Failed to get user preferences from ${serviceName}:`, error.message);
      return null;
    }
  }

  /**
   * Batch notify multiple services about user changes
   */
  async batchNotifyServices(userData, changeType = 'update', services = ['ride', 'payment', 'notification']) {
    const promises = services.map(serviceName => 
      this.notifyUserUpdate(serviceName, userData, changeType)
    );

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      service: services[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  /**
   * Health check for external services
   */
  async checkServiceHealth(serviceName) {
    try {
      const endpoint = '/health';
      const response = await this.makeRequest(serviceName, endpoint, 'GET');
      return {
        service: serviceName,
        status: 'healthy',
        response: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check health of all configured services
   */
  async checkAllServicesHealth() {
    const services = Object.keys(this.services);
    const promises = services.map(serviceName => this.checkServiceHealth(serviceName));
    
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      service: services[index],
      health: result.status === 'fulfilled' ? result.value : {
        service: services[index],
        status: 'unhealthy',
        error: result.reason?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceName) {
    return {
      url: this.services[serviceName],
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    };
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName, config) {
    if (config.url) {
      this.services[serviceName] = config.url;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.retryAttempts) {
      this.retryAttempts = config.retryAttempts;
    }
  }
}

// Create singleton instance
const externalServiceIntegration = new ExternalServiceIntegration();

module.exports = externalServiceIntegration;