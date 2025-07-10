// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes by verifying a JWT.
 */
exports.protect = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env file.');
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user for token not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Protect] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: `Not authorized, token is invalid (${error.name})` });
  }
};

/**
 * Middleware to grant access to admin users only.
 */
exports.authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication error, user not found.' });
  }

  if (req.user.is_admin === 1 || req.user.is_admin === true) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'User does not have admin privileges',
    });
  }
};

/**
 * Middleware to protect a route with a shared secret key.
 * Used for server-to-server communication, like from the Minecraft plugin.
 */
exports.verifySecretKey = (req, res, next) => {
    // Safely access `secret` from `req.body`. If `req.body` is undefined, this will not throw.
    const secret = req.body?.secret; 
    const expectedSecret = process.env.SPIGOT_SECRET_KEY;

    if (!expectedSecret) {
        console.error('FATAL ERROR: SPIGOT_SECRET_KEY is not defined in .env file.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    if (secret && secret === expectedSecret) {
        next();
    } else {
        // Provide a more informative error message if the body or secret is missing.
        if (!req.body) {
             console.error('[Auth SecretKey] Request body is missing. Ensure client is sending a JSON body with Content-Type: application/json.');
             return res.status(400).json({ success: false, message: 'Bad Request: Missing request body.' });
        }
        if (!secret) {
             console.error('[Auth SecretKey] Secret key is missing from request body.');
             return res.status(401).json({ success: false, message: 'Unauthorized: Missing secret key.' });
        }
        // This case is for when the secret is present but incorrect.
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid secret key.' });
    }
};
