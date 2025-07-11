// backend/controllers/playerStatsController.js
const axios = require('axios');
const User = require('../models/User');

/**
 * @desc    Get player stats by proxying the request to the Minecraft plugin.
 * This acts as a secure bridge between the frontend and the game server.
 * @route   POST /api/v1/player-stats
 * @access  Private (requires user to be logged in)
 */
exports.getPlayerStats = async (req, res) => {
    // The user's ID is attached to the request by the 'protect' middleware
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user || !user.minecraft_uuid) {
            return res.status(404).json({ success: false, message: 'A linked Minecraft account is required to fetch stats.' });
        }

        // --- PROXY REQUEST TO MINECRAFT PLUGIN ---
        const pluginUrl = `http://localhost:${process.env.PLUGIN_PORT || 4567}/player-stats`;
        const pluginSecret = process.env.WEBHOOK_SECRET;

        if (!pluginSecret) {
            console.error('CRITICAL: WEBHOOK_SECRET is not defined in the backend .env file.');
            return res.status(500).json({ success: false, message: 'Server configuration error.' });
        }
        
        const pluginResponse = await axios.post(
            pluginUrl,
            { uuid: user.minecraft_uuid },
            {
                headers: {
                    'Authorization': `Bearer ${pluginSecret}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10-second timeout
            }
        );

        // Forward the plugin's successful response directly to the frontend
        res.status(200).json(pluginResponse.data);

    } catch (error) {
        console.error('Error proxying to Minecraft plugin:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ success: false, message: 'Could not connect to the game server. It may be offline or starting up.' });
        }
        
        // Forward any specific error from the plugin
        if (error.response && error.response.data) {
            return res.status(error.response.status || 500).json(error.response.data);
        }

        res.status(500).json({ success: false, message: 'An internal server error occurred while fetching player stats.' });
    }
};
