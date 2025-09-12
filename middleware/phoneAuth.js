const { verifyToken } = require('../utils/jwt');
const { models } = require('../models');

/**
 * Middleware to authenticate phone-based users
 * Verifies JWT token and attaches user to request
 */
async function authenticatePhoneUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    // Accept token from Authorization header (Bearer) or token query param for redirect flow
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = req.query.token || req.body?.token || bearer;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    try {
      const decoded = verifyToken(token);
      
      // Verify token is for passenger
      if (decoded.type !== 'passenger') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Check if passenger still exists
      const passenger = await models.Passenger.findByPk(decoded.id);
      if (!passenger) {
        return res.status(401).json({
          success: false,
          message: 'Passenger not found'
        });
      }

      // Attach user to request
      req.user = { id: passenger.id, type: 'passenger' };

      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block request if invalid
 */
async function optionalPhoneAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      
      if (decoded.type === 'passenger') {
        const passenger = await models.Passenger.findByPk(decoded.id);
        if (passenger) {
          req.user = { id: passenger.id, type: 'passenger' };
        }
      }
    } catch (tokenError) {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
}

module.exports = {
  authenticatePhoneUser,
  optionalPhoneAuth
};
