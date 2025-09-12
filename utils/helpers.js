const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Password utilities
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
const generateToken = (user) => {
  const payload = {
    id: user.id || user._id,
    externalId: user.externalId,
    role: user.role || 'user',
    email: user.email,
    name: user.name || user.fullName,
    phone: user.phone
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'user-service',
    audience: 'ride-service'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Response formatting utilities
const formatResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

const formatError = (message, statusCode = 500, error = null) => {
  return {
    success: false,
    statusCode,
    message,
    error: error?.message || error,
    timestamp: new Date().toISOString()
  };
};

// Data sanitization utilities for external service access
const sanitizeUserData = (user, requesterRole = 'public', includeSensitive = false) => {
  const baseData = {
    id: user.id || user._id,
    externalId: user.externalId,
    name: user.name || user.fullName,
    email: user.email,
    phone: user.phone,
    profilePicture: user.profilePicture,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Role-based data access levels
  const accessLevels = {
    'public': ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive'],
    'passenger': ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'preferences'],
    'driver': ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'vehicleType', 'vehicleInfo', 'rating', 'ratingCount', 'isVerified'],
    'staff': ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'department', 'position', 'employeeId'],
    'admin': ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'department', 'position', 'adminLevel']
  };

  // Get allowed fields for the requester role
  const allowedFields = accessLevels[requesterRole] || accessLevels['public'];
  
  // Filter data based on allowed fields
  const sanitized = {};
  allowedFields.forEach(field => {
    if (user[field] !== undefined) {
      sanitized[field] = user[field];
    }
  });

  // Add common fields that are always included
  sanitized.createdAt = user.createdAt;
  sanitized.updatedAt = user.updatedAt;

  // Include sensitive data only if explicitly requested and user has permission
  if (includeSensitive && ['staff', 'admin'].includes(requesterRole)) {
    sanitized.lastLoginAt = user.lastLoginAt;
    sanitized.roles = user.roles;
  }

  return sanitized;
};

// Enhanced sanitization for external service access
const sanitizeForExternalService = (user, requesterRole = 'public', serviceType = 'ride') => {
  const baseData = sanitizeUserData(user, requesterRole);
  
  // Service-specific data filtering
  switch (serviceType) {
    case 'ride':
      // For ride service, include essential information
      return {
        ...baseData,
        // Add ride-specific fields if available
        ...(user.vehicleType && { vehicleType: user.vehicleType }),
        ...(user.rating && { rating: user.rating }),
        ...(user.isVerified && { isVerified: user.isVerified })
      };
    
    case 'payment':
      // For payment service, include payment-relevant information
      return {
        ...baseData,
        // Add payment-specific fields if available
        ...(user.paymentMethods && { paymentMethods: user.paymentMethods }),
        ...(user.preferences && { preferences: user.preferences })
      };
    
    case 'notification':
      // For notification service, include notification preferences
      return {
        ...baseData,
        ...(user.preferences && { preferences: user.preferences }),
        ...(user.notificationSettings && { notificationSettings: user.notificationSettings })
      };
    
    default:
      return baseData;
  }
};

// Batch sanitization for multiple users
const sanitizeBatchUserData = (users, requesterRole = 'public', serviceType = 'ride') => {
  return users.map(user => sanitizeForExternalService(user, requesterRole, serviceType));
};

// Validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Pagination utilities
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const formatPaginationResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

// External ID generation
const generateExternalId = (prefix = 'USR') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  formatResponse,
  formatError,
  sanitizeUserData,
  sanitizeForExternalService,
  sanitizeBatchUserData,
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  getPaginationParams,
  formatPaginationResponse,
  generateExternalId
};