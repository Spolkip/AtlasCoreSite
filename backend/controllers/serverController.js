// backend/controllers/serverController.js
const { doc, getDoc, setDoc } = require('firebase/firestore');
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
        
        if (typeof onlinePlayers !== 'number' || 
            typeof maxPlayers !== 'number' || 
            typeof newPlayersToday !== 'number') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid stats data format' 
            });
        }

        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        await setDoc(statsDocRef, {
            onlinePlayers,
            maxPlayers,
            newPlayersToday,
            lastUpdated: new Date().toISOString(),
            serverStatus: 'online'
        }, { merge: true });

        res.status(200).json({ success: true, message: 'Stats updated successfully.' });
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
            const lastUpdated = allStats.lastUpdated ? new Date(allStats.lastUpdated) : new Date(0);
            const now = new Date();
            
            // Your plugin updates every 60 seconds. If we haven't heard from it in 
            // 90 seconds, we can assume it's offline.
            const timeoutMilliseconds = 90 * 1000; 

            if ((now - lastUpdated) > timeoutMilliseconds) {
                // It's been too long since the last update, declare it offline.
                res.status(200).json({ 
                    success: true, 
                    data: { onlinePlayers: 0, serverStatus: 'offline' } 
                });
            } else {
                // The last update was recent, so it's online.
                const publicData = {
                    onlinePlayers: allStats.onlinePlayers,
                    serverStatus: 'online'
                };
                res.status(200).json({ success: true, data: publicData });
            }
        } else {
            // If the document doesn't exist at all, it's definitely offline.
            res.status(200).json({ 
                success: true, 
                data: { onlinePlayers: 0, serverStatus: 'offline' } 
            });
        }
    } catch (error) {
        console.error("Error fetching public server stats:", error);
        res.status(500).json({ 
            success: false, 
            data: { onlinePlayers: 0, serverStatus: 'error' },
            message: 'Could not retrieve server status.'
        });
    }
};
