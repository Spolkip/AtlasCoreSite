// backend/routes/leaderboardRoutes.js
const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');

// @route   GET /api/v1/leaderboards
// @desc    Get leaderboard data for a specific stat
// @access  Public
router.get('/', getLeaderboard);

module.exports = router;