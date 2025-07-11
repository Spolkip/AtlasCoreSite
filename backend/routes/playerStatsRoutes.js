// backend/routes/playerStatsRoutes.js
const express = require('express');
const router = express.Router();
const { getPlayerStats } = require('../controllers/playerStatsController');
const { protect } = require('../middleware/auth');

// Defines the route POST /api/v1/player-stats
// The 'protect' middleware ensures only logged-in users can access this.
router.post('/', protect, getPlayerStats);

module.exports = router;
