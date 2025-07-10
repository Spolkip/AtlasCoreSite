const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes for logged-in users
exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware to restrict access to admin users
exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

// New middleware to protect routes with a shared secret key
exports.protectWithSecret = (req, res, next) => {
    const statsSecret = process.env.STATS_SECRET_KEY;
    if (!statsSecret) {
        console.error('STATS_SECRET_KEY is not defined in environment variables.');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    if (token !== statsSecret) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    // If token is valid, proceed
    next();
};