/**
 * Populate Utility - Role-based data filtering for external service use
 * Filters user data based on the requester's role and target user type
 */

/**
 * Populate basic info based on requester role
 * @param {Object} model - User model (passenger, driver, admin, staff)
 * @param {string} requesterRole - Role of the user making the request
 * @param {string} targetUserType - Type of user being requested (passenger, driver, admin, staff)
 * @returns {Object} Filtered user data
 */
const populateBasicInfo = (model, requesterRole, targetUserType = null) => {
  if (!model) return null;

  // Determine target user type if not provided
  if (!targetUserType) {
    targetUserType = model.constructor.modelName.toLowerCase();
  }

  // Base fields that are always included
  const baseFields = {
    id: model._id || model.id,
    externalId: model.externalId,
    name: model.name || model.fullName,
    email: model.email,
    phone: model.phone,
    profilePicture: model.profilePicture,
    isActive: model.isActive,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt
  };

  // Role-based field access matrix
  const accessMatrix = {
    // Passenger accessing different user types
    passenger: {
      passenger: {
        // Passengers can see their own full data
        fields: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'preferences', 'emergencyContacts', 'createdAt', 'updatedAt']
      },
      driver: {
        // Passengers can see basic driver info for booking
        fields: ['id', 'externalId', 'name', 'phone', 'vehicleType', 'vehicleInfo', 'rating', 'ratingCount', 'isVerified', 'isActive']
      },
      staff: {
        // Passengers can see basic staff info
        fields: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'isActive']
      },
      admin: {
        // Passengers can see basic admin info
        fields: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
      }
    },

    // Driver accessing different user types
    driver: {
      passenger: {
        // Drivers can see passenger info for ride completion
        fields: ['id', 'externalId', 'name', 'phone', 'profilePicture', 'preferences', 'isActive']
      },
      driver: {
        // Drivers can see their own full data
        fields: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'vehicleType', 'vehicleInfo', 'licenseInfo', 'rating', 'ratingCount', 'isActive', 'isVerified', 'lastLoginAt', 'createdAt', 'updatedAt']
      },
      staff: {
        // Drivers can see basic staff info
        fields: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'isActive']
      },
      admin: {
        // Drivers can see basic admin info
        fields: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
      }
    },

    // Staff accessing different user types
    staff: {
      passenger: {
        // Staff can see most passenger data
        fields: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'preferences', 'emergencyContacts', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt']
      },
      driver: {
        // Staff can see most driver data
        fields: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'vehicleType', 'vehicleInfo', 'licenseInfo', 'rating', 'ratingCount', 'isActive', 'isVerified', 'lastLoginAt', 'createdAt', 'updatedAt']
      },
      staff: {
        // Staff can see their own full data
        fields: ['id', 'externalId', 'fullName', 'username', 'email', 'phone', 'profilePicture', 'department', 'position', 'employeeId', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt']
      },
      admin: {
        // Staff can see basic admin info
        fields: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
      }
    },

    // Admin accessing different user types
    admin: {
      passenger: {
        // Admins can see all passenger data
        fields: ['*'] // All fields
      },
      driver: {
        // Admins can see all driver data
        fields: ['*'] // All fields
      },
      staff: {
        // Admins can see all staff data
        fields: ['*'] // All fields
      },
      admin: {
        // Admins can see all admin data
        fields: ['*'] // All fields
      }
    }
  };

  // Get allowed fields for the requester role and target user type
  const allowedFields = accessMatrix[requesterRole]?.[targetUserType]?.fields || [];

  // If admin or all fields allowed, return full object
  if (allowedFields.includes('*')) {
    return model.toObject ? model.toObject() : model;
  }

  // Filter fields based on allowed fields
  const filteredData = {};
  allowedFields.forEach(field => {
    if (model[field] !== undefined) {
      filteredData[field] = model[field];
    }
  });

  // Always include base fields
  Object.keys(baseFields).forEach(field => {
    if (baseFields[field] !== undefined && !filteredData[field]) {
      filteredData[field] = baseFields[field];
    }
  });

  return filteredData;
};

/**
 * Populate basic info for multiple models (batch operation)
 * @param {Array} models - Array of user models
 * @param {string} requesterRole - Role of the user making the request
 * @param {string} targetUserType - Type of users being requested
 * @returns {Array} Array of filtered user data
 */
const populateBasicInfoBatch = (models, requesterRole, targetUserType = null) => {
  if (!Array.isArray(models)) return [];
  
  return models.map(model => populateBasicInfo(model, requesterRole, targetUserType));
};

/**
 * Get allowed fields for a specific role and user type combination
 * @param {string} requesterRole - Role of the user making the request
 * @param {string} targetUserType - Type of user being requested
 * @returns {Array} Array of allowed field names
 */
const getAllowedFields = (requesterRole, targetUserType) => {
  const accessMatrix = {
    passenger: {
      passenger: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'isActive', 'preferences', 'emergencyContacts', 'createdAt', 'updatedAt'],
      driver: ['id', 'externalId', 'name', 'phone', 'vehicleType', 'vehicleInfo', 'rating', 'ratingCount', 'isVerified', 'isActive'],
      staff: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'isActive'],
      admin: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
    },
    driver: {
      passenger: ['id', 'externalId', 'name', 'phone', 'profilePicture', 'preferences', 'isActive'],
      driver: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'vehicleType', 'vehicleInfo', 'licenseInfo', 'rating', 'ratingCount', 'isActive', 'isVerified', 'lastLoginAt', 'createdAt', 'updatedAt'],
      staff: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'isActive'],
      admin: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
    },
    staff: {
      passenger: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'preferences', 'emergencyContacts', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
      driver: ['id', 'externalId', 'name', 'email', 'phone', 'profilePicture', 'vehicleType', 'vehicleInfo', 'licenseInfo', 'rating', 'ratingCount', 'isActive', 'isVerified', 'lastLoginAt', 'createdAt', 'updatedAt'],
      staff: ['id', 'externalId', 'fullName', 'username', 'email', 'phone', 'profilePicture', 'department', 'position', 'employeeId', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
      admin: ['id', 'externalId', 'name', 'phone', 'department', 'position', 'adminLevel', 'isActive']
    },
    admin: {
      passenger: ['*'],
      driver: ['*'],
      staff: ['*'],
      admin: ['*']
    }
  };

  return accessMatrix[requesterRole]?.[targetUserType] || [];
};

/**
 * Check if a role can access a specific field
 * @param {string} requesterRole - Role of the user making the request
 * @param {string} targetUserType - Type of user being requested
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field is accessible
 */
const canAccessField = (requesterRole, targetUserType, fieldName) => {
  const allowedFields = getAllowedFields(requesterRole, targetUserType);
  return allowedFields.includes('*') || allowedFields.includes(fieldName);
};

module.exports = {
  populateBasicInfo,
  populateBasicInfoBatch,
  getAllowedFields,
  canAccessField
};