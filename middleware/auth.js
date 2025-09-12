const jwt = require('jsonwebtoken');
const { Passenger, Driver, Staff, Admin } = require('../models/userModels');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'Failed to authenticate user'
    });
  }
};

// Authorization middleware - check if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Role-based access control for user data
const canAccessUserData = (userRole, targetUserType) => {
  const accessMatrix = {
    'passenger': ['passenger'], // Passengers can only access passenger data
    'driver': ['driver'], // Drivers can only access driver data
    'staff': ['passenger', 'driver', 'staff'], // Staff can access passenger, driver, and staff data
    'admin': ['passenger', 'driver', 'staff', 'admin'] // Admins can access all data
  };

  return accessMatrix[userRole]?.includes(targetUserType) || false;
};

// Middleware to check if user can access specific user type data
const checkUserDataAccess = (userType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (!canAccessUserData(userRole, userType)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. You cannot access ${userType} data`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch (jwtError) {
        // Token is invalid, but we continue without user
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Rate limiting for different user types
const createRateLimit = (windowMs, maxRequests, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: 'Rate limit exceeded',
      message: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  authenticate,
  authorize,
  checkUserDataAccess,
  optionalAuth,
  createRateLimit,
  JWT_SECRET
};