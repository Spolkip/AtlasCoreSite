// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the Firestore-based User model

// Protect routes by verifying the JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to the request object by fetching from DB
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Grant access to admin users only
exports.authorizeAdmin = (req, res, next) => {
  // Check the is_admin field (1 for admin, 0 for user)
  if (req.user.is_admin !== 1) {
    return res.status(403).json({
      success: false,
      message: `User is not authorized to access this route`,
    });
  }
  next();
};

// Middleware to identify user or allow guest access
exports.identifyUser = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Verify token if it exists
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (error) {
      // Token is invalid, proceed as a guest
      req.user = null;
    }
  } else {
    // No token, proceed as a guest
    req.user = null;
  }
  next();
};


/**
 * NEW MIDDLEWARE
 * @desc    Verify a secret key for server-to-server communication
 * @access  Private
 *
 * This middleware protects endpoints that are called by other services (like your
 * Minecraft plugin) instead of by a logged-in user.
 */
exports.verifySecretKey = (req, res, next) => {
    const { secret } = req.body;
    const expectedSecret = process.env.STATS_SECRET;

    if (!expectedSecret) {
        console.error('CRITICAL: STATS_SECRET is not defined in your .env file.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    if (!secret || secret !== expectedSecret) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid secret key.' });
    }

    next();
};
