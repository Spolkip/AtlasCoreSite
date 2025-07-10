const express_server = require('express');
const server_router = express_server.Router();
const serverController = require('../controllers/serverController');

// Middleware to protect the stats endpoint from unauthorized access
const protectStatsEndpoint = (req, res, next) => {
    const secret = process.env.PLUGIN_STATS_SECRET;
    const authHeader = req.headers.authorization;
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

// Route for the plugin to POST stats to
server_router.post('/stats', protectStatsEndpoint, serverController.updateStats);
// Route for the frontend to GET stats from
server_router.get('/stats', serverController.getStats);

module.exports = server_router;