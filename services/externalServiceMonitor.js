const fs = require('fs');
const path = require('path');

/**
 * Monitoring and Logging Service for External Service Access
 * Provides comprehensive logging and monitoring for external service interactions
 */

class ExternalServiceMonitor {
  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.maxLogSize = parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 5;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Initialize metrics
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byService: {},
        byEndpoint: {},
        byUserRole: {}
      },
      responseTime: {
        average: 0,
        min: Infinity,
        max: 0,
        percentiles: {}
      },
      errors: {
        total: 0,
        byType: {},
        byService: {}
      }
    };
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log external service request
   */
  logRequest(req, res, next) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Store request info for later logging
    req.externalServiceRequest = {
      id: requestId,
      startTime,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userRole: req.user?.role || 'anonymous',
      serviceName: req.user?.serviceName || 'unknown'
    };

    // Log response when finished
    res.on('finish', () => {
      this.logResponse(req, res, startTime);
    });

    next();
  }

  /**
   * Log external service response
   */
  logResponse(req, res, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const requestInfo = req.externalServiceRequest;

    if (!requestInfo) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: requestInfo.id,
      method: requestInfo.method,
      url: requestInfo.url,
      statusCode: res.statusCode,
      duration: duration,
      userRole: requestInfo.userRole,
      serviceName: requestInfo.serviceName,
      ip: requestInfo.ip,
      userAgent: requestInfo.userAgent,
      responseSize: res.get('Content-Length') || 0
    };

    // Write to log file
    this.writeToLogFile('external-service-access.log', logEntry);

    // Update metrics
    this.updateMetrics(logEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} - ${logEntry.statusCode} (${duration}ms)`);
    }
  }

  /**
   * Log error
   */
  logError(error, req, additionalInfo = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: req.externalServiceRequest || {},
      additionalInfo
    };

    // Write to error log file
    this.writeToLogFile('external-service-errors.log', logEntry);

    // Update error metrics
    this.metrics.errors.total++;
    this.metrics.errors.byType[error.name] = (this.metrics.errors.byType[error.name] || 0) + 1;
    
    if (req.externalServiceRequest?.serviceName) {
      this.metrics.errors.byService[req.externalServiceRequest.serviceName] = 
        (this.metrics.errors.byService[req.externalServiceRequest.serviceName] || 0) + 1;
    }

    console.error(`[ERROR] ${logEntry.timestamp}: ${error.message}`);
  }

  /**
   * Write log entry to file
   */
  writeToLogFile(filename, logEntry) {
    const logPath = path.join(this.logDir, filename);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(logPath, logLine);
      
      // Rotate log file if it exceeds max size
      this.rotateLogFile(logPath);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Rotate log file when it exceeds max size
   */
  rotateLogFile(logPath) {
    try {
      const stats = fs.statSync(logPath);
      
      if (stats.size > this.maxLogSize) {
        // Rotate existing files
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${logPath}.${i}`;
          const newFile = `${logPath}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Move current file to .1
        fs.renameSync(logPath, `${logPath}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(logEntry) {
    // Update request metrics
    this.metrics.requests.total++;
    
    if (logEntry.statusCode >= 200 && logEntry.statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update service-specific metrics
    const serviceName = logEntry.serviceName || 'unknown';
    this.metrics.requests.byService[serviceName] = (this.metrics.requests.byService[serviceName] || 0) + 1;

    // Update endpoint-specific metrics
    const endpoint = `${logEntry.method} ${logEntry.url}`;
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Update user role metrics
    const userRole = logEntry.userRole || 'anonymous';
    this.metrics.requests.byUserRole[userRole] = (this.metrics.requests.byUserRole[userRole] || 0) + 1;

    // Update response time metrics
    this.updateResponseTimeMetrics(logEntry.duration);
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(duration) {
    if (duration < this.metrics.responseTime.min) {
      this.metrics.responseTime.min = duration;
    }
    if (duration > this.metrics.responseTime.max) {
      this.metrics.responseTime.max = duration;
    }

    // Calculate average
    const totalRequests = this.metrics.requests.total;
    this.metrics.responseTime.average = 
      (this.metrics.responseTime.average * (totalRequests - 1) + duration) / totalRequests;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byService: {},
        byEndpoint: {},
        byUserRole: {}
      },
      responseTime: {
        average: 0,
        min: Infinity,
        max: 0,
        percentiles: {}
      },
      errors: {
        total: 0,
        byType: {},
        byService: {}
      }
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.errors.total / this.metrics.requests.total) * 100 
      : 0;

    const successRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.successful / this.metrics.requests.total) * 100 
      : 100;

    return {
      status: errorRate < 5 && successRate > 95 ? 'healthy' : 'degraded',
      metrics: {
        totalRequests: this.metrics.requests.total,
        successRate: Math.round(successRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(this.metrics.responseTime.average),
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const externalServiceMonitor = new ExternalServiceMonitor();

module.exports = externalServiceMonitor;