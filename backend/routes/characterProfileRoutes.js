// backend/routes/characterProfileRoutes.js
const express = require('express');
const router = express.Router();
const { getCharacterProfile, getCharacterProfileByUsername } = require('../controllers/characterProfileController');
const { protect } = require('../middleware/auth');

// @route   GET /api/v1/profile
// @desc    Get all data for the logged-in user's character profile and dashboard pages
// @access  Private
router.get('/', protect, getCharacterProfile);

// @route   GET /api/v1/profile/:username
// @desc    Get character profile data for a specific user
// @access  Private
router.get('/:username', protect, getCharacterProfileByUsername);


module.exports = router;