// backend/routes/leaderboardRoutes.js
const express = require('express');
const router =express.Router();
const { getLeaderboards } = require('../controllers/leaderboardController');

// @route   GET /api/v1/leaderboards
// @desc    Get all leaderboard data
// @access  Public
router.get('/', getLeaderboards);

module.exports = router;
