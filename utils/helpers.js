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

// Data sanitization utilities
const sanitizeUserData = (user, includeSensitive = false) => {
  const sanitized = {
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

  // Include sensitive data only if explicitly requested and user has permission
  if (includeSensitive) {
    sanitized.lastLoginAt = user.lastLoginAt;
    sanitized.roles = user.roles;
  }

  return sanitized;
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
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  getPaginationParams,
  formatPaginationResponse,
  generateExternalId
};