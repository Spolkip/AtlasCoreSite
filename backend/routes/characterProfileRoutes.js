// backend/routes/characterProfileRoutes.js
const express = require('express');
const router = express.Router();
const { getCharacterProfile } = require('../controllers/characterProfileController');
const { protect } = require('../middleware/auth');

// @route   GET /api/v1/profile
// @desc    Get all data for the character profile and dashboard pages
// @access  Private
router.get('/', protect, getCharacterProfile);

module.exports = router;
