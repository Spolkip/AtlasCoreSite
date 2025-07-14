const jwt_config = require('jsonwebtoken');
const User_config = require('../models/User'); // Assuming you have a User model
require('dotenv').config();

const authMiddleware = {
  /**
   * Verify JWT token and attach user to request
   */
  verifyToken: async (req, res, next) => {
    try {
      // Get token from header or cookie
      let token = req.header('Authorization')?.replace('Bearer ', '') || 
                 req.cookies?.token;

      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication required' 
        });
      }

      // Verify token
      const decoded = jwt_config.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database
      const user = await User_config.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);

      let message = 'Invalid token';
      if (error.name === 'TokenExpiredError') {
        message = 'Token expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Malformed token';
      }

      res.status(401).json({ 
        success: false,
        message 
      });
    }
  },

  /**
   * Verify admin privileges
   */
  verifyAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    // Check the is_admin field (1 for admin, 0 for user)
    if (req.user.is_admin !== 1) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin privileges required' 
      });
    }

    next();
  },

  /**
   * Generate JWT token
   */
  generateToken: (userId, isAdmin, expiresIn = '1d') => {
    return jwt_config.sign(
      { id: userId, isAdmin }, // Include isAdmin in the token payload
      process.env.JWT_SECRET,
      { expiresIn }
    );
  },

  /**
   * Set JWT token as HTTP-only cookie
   */
  setAuthCookie: (res, token, options = {}) => {
    const defaults = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'strict'
    };

    res.cookie('token', token, { ...defaults, ...options });
  }
};

module.exports = authMiddleware;
