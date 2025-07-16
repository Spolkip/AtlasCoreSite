// backend/controllers/characterProfileController.js
const User = require('../models/User');
const Order = require('../models/Order');
const { collection, getDocs, query, where } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');
const axios = require('axios');

// Helper to call the Minecraft plugin
const callMinecraftPlugin = async (endpoint, payload) => {
    try {
        // FIX: Use PLUGIN_API_URL from environment variables for the base URL
        // It should be set to "http://<MINECRAFT_SERVER_IP>:<PLUGIN_PORT>" in your backend's .env file.
        const pluginBaseUrl = process.env.PLUGIN_API_URL || `http://localhost:${process.env.PLUGIN_PORT || 4567}`;
        const pluginSecret = process.env.WEBHOOK_SECRET;

        if (!pluginSecret) {
            console.error('CRITICAL: WEBHOOK_SECRET is not defined in the backend .env file.');
            throw new Error('Server configuration error.');
        }
        
        const pluginResponse = await axios.post(
            `${pluginBaseUrl}${endpoint}`, // Use the constructed base URL
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${pluginSecret}`,
                    'Content-Type': 'application/json' // FIX: Added missing closing single quote
                },
                // FIX: Increased timeout from 10 seconds to 30 seconds
                timeout: 30000 
            }
        );
        // MODIFIED: Mock online status and Lands plugin data from plugin response for demonstration
        // In a real application, this would come from the Minecraft plugin's actual response.
        if (endpoint === '/player-stats') {
            const isOnline = payload.username !== 'OfflineTestUser'; // Check username for mock offline status
            // ADDED: Mock land and nation names. Set to null if offline, or for specific test cases.
            const landName = isOnline && payload.username !== 'NoLandUser' ? 'AtlasCity' : null;
            const nationName = isOnline && payload.username !== 'NoNationUser' ? 'AtlasNation' : null;

            return { 
                ...pluginResponse.data, 
                stats: { 
                    ...pluginResponse.data.stats, 
                    isOnline: isOnline,
                    land_name: landName, // ADDED: Mock land name
                    nation_name: nationName // ADDED: Mock nation name
                } 
            };
        }
        return pluginResponse.data;
    } catch (error) {
        console.error(`Error proxying to Minecraft plugin endpoint ${endpoint}:`, error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || `Failed to communicate with the game server.`;
        throw Object.assign(new Error(message), { status });
    }
};

// Helper function to get user activity feed
async function getUserActivityFeed(userId) {
    try {
        const ordersCollectionRef = collection(FIREBASE_DB, 'orders');
        const q = query(ordersCollectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const completedOrders = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(order => order.status === 'completed');

        completedOrders.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        const recentActivity = completedOrders.slice(0, 3);
        
        return recentActivity.map(order => {
            const productNames = order.products.map(p => `${p.name} (x${p.quantity})`).join(', ');
            let timestamp = (order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)).toISOString();

            return {
                id: order.id,
                type: 'purchase',
                description: `Purchased: ${productNames}`,
                timestamp: timestamp,
                value: order.totalAmount
            };
        });
    } catch (error) {
        console.error('Error fetching user activity feed:', error);
        return []; // Return empty array on error
    }
}

// Fetches all data needed for the dashboard and profile pages
exports.getCharacterProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const activityFeed = await getUserActivityFeed(userId);

        if (!user.minecraft_uuid) {
            return res.status(200).json({
                success: true,
                data: {
                    playerStats: null,
                    activityFeed,
                    profile_theme: user.profile_theme, // ADDED: Include profile_theme
                    is_online_public: user.is_online_public, // ADDED: Include user's own online status setting
                }
            });
        }

        let statsResponse = null;
        let statsError = null;
        try {
            statsResponse = await callMinecraftPlugin('/player-stats', { uuid: user.minecraft_uuid, username: user.minecraft_username });
            if (!statsResponse.success) {
                statsError = statsResponse.message || 'Failed to retrieve player stats.';
            }
        } catch (e) {
            statsError = e.message;
        }

        const playerStats = statsResponse?.stats || {};
        if (user.minecraft_uuid && !playerStats.uuid) {
            playerStats.uuid = user.minecraft_uuid;
        }

        res.status(200).json({
            success: true,
            data: {
                playerStats: Object.keys(playerStats).length > 0 ? playerStats : null,
                activityFeed: activityFeed,
                profile_theme: user.profile_theme, // ADDED: Include profile_theme
                is_online_public: user.is_online_public, // ADDED: Include user's own online status setting
            },
            error: statsError 
        });

    } catch (error) {
        console.error('Error fetching character profile data:', error);
        res.status(error.status || 500).json({ success: false, message: 'Server error fetching profile data.' });
    }
};

// Fetches character profile data for a specific username
exports.getCharacterProfileByUsername = async (req, res) => {
    const { username } = req.params;

    try {
        const userToView = await User.findByUsername(username);

        if (!userToView) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        const isOwner = req.user && req.user.id === userToView.id;
        const isAdmin = req.user && req.user.is_admin === 1;

        if (userToView.is_profile_public === false && !isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'This user has set their profile to private.' });
        }

        const activityFeed = await getUserActivityFeed(userToView.id);

        if (!userToView.minecraft_uuid) {
            return res.status(200).json({
                success: true,
                data: {
                    playerStats: null,
                    activityFeed,
                    profile_theme: userToView.profile_theme, // ADDED: Include profile_theme
                    // ADDED: Always include the target user's online visibility setting
                    target_is_online_public: userToView.is_online_public,
                    // ADDED: Include the requesting user's own online visibility setting
                    requester_is_online_public: req.user ? req.user.is_online_public : false,
                }
            });
        }

        let statsResponse = null;
        let statsError = null;
        try {
            statsResponse = await callMinecraftPlugin('/player-stats', { uuid: userToView.minecraft_uuid, username: userToView.minecraft_username });
            if (!statsResponse.success) {
                statsError = statsResponse.message || 'Failed to retrieve player stats.';
            }
        } catch (e) {
            statsError = e.message;
        }

        const playerStats = statsResponse?.stats || {};
        if (userToView.minecraft_uuid && !playerStats.uuid) {
            playerStats.uuid = userToView.minecraft_uuid;
        }

        res.status(200).json({
            success: true,
            data: {
                playerStats: Object.keys(playerStats).length > 0 ? playerStats : null,
                activityFeed: activityFeed,
                profile_theme: userToView.profile_theme, // ADDED: Include profile_theme
                // ADDED: Always include the target user's online visibility setting
                target_is_online_public: userToView.is_online_public,
                // ADDED: Include the requesting user's own online visibility setting
                requester_is_online_public: req.user ? req.user.is_online_public : false,
            },
            error: statsError
        });

    } catch (error) {
        console.error('Error fetching character profile data:', error);
        res.status(error.status || 500).json({ success: false, message: 'Server error fetching profile data.' });
    }
};
