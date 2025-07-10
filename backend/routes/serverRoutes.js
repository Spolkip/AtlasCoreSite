const express = require('express');
const router = express.Router();

// Corrected imports to match auth.js exports
const { protect, authorizeAdmin, verifySecretKey } = require('../middleware/auth');
const { 
    getServerStats, 
    getPublicStats,
    updateServerStats
} = require('../controllers/serverController');

// Protected admin route
router.get('/stats', [protect, authorizeAdmin], getServerStats);

// Public route
router.get('/public-stats', getPublicStats);

// Protected stats update route (using secret verification)
router.post('/stats', verifySecretKey, updateServerStats);

module.exports = router;