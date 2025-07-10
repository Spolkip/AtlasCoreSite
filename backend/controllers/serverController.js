// backend/controllers/serverController.js
const { doc, getDoc } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

/**
 * @desc    Get real-time server stats for the admin panel
 * @route   GET /api/v1/server/stats
 * @access  Private/Admin
 */
exports.getServerStats = async (req, res) => {
    try {
        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        const statsDoc = await getDoc(statsDocRef);

        if (statsDoc.exists()) {
            res.status(200).json({ success: true, data: statsDoc.data() });
        } else {
            res.status(200).json({ 
                success: true, 
                data: { onlinePlayers: 0, maxPlayers: 0, newPlayersToday: 0, serverStatus: 'offline' } 
            });
        }
    } catch (error) {
        console.error("Error fetching server stats:", error);
        res.status(500).json({ success: false, message: 'Server error fetching stats.' });
    }
};
/**
 * @desc    Update server stats (called by Minecraft plugin)
 * @route   POST /api/v1/server/stats
 * @access  Private (using shared secret)
 */
exports.updateServerStats = async (req, res) => {
    try {
        const { onlinePlayers, maxPlayers, newPlayersToday } = req.body;
        
        // Validate required fields
        if (typeof onlinePlayers !== 'number' || 
            typeof maxPlayers !== 'number' || 
            typeof newPlayersToday !== 'number') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid stats data format' 
            });
        }

        // Update Firestore
        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        await setDoc(statsDocRef, {
            onlinePlayers,
            maxPlayers,
            newPlayersToday,
            lastUpdated: new Date().toISOString(),
            serverStatus: 'online'
        }, { merge: true });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error updating server stats:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update server stats' 
        });
    }
};

/**
 * @desc    Get public-facing server stats (e.g., for the landing page)
 * @route   GET /api/v1/server/public-stats
 * @access  Public
 */
exports.getPublicStats = async (req, res) => {
    try {
        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        const statsDoc = await getDoc(statsDocRef);

        if (statsDoc.exists()) {
            const allStats = statsDoc.data();
            // Only expose the data needed for the public page
            const publicData = {
                onlinePlayers: allStats.onlinePlayers,
                serverStatus: 'online' // If the document exists, the server is considered online
            };
            res.status(200).json({ success: true, data: publicData });
        } else {
            // If the document doesn't exist, the server is offline
            res.status(200).json({ 
                success: true, 
                data: { onlinePlayers: 0, serverStatus: 'offline' } 
            });
        }
    } catch (error) {
        console.error("Error fetching public server stats:", error);
        // Don't expose detailed errors, just report the server as offline
        res.status(500).json({ 
            success: false, 
            data: { onlinePlayers: 0, serverStatus: 'error' },
            message: 'Could not retrieve server status.'
        });
    }
};
