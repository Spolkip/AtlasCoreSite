// backend/controllers/characterProfileController.js
const User = require('../models/User');
const Order = require('../models/Order');
const { collection, getDocs, query, where } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');
const axios = require('axios');

// Helper to call the Minecraft plugin
const callMinecraftPlugin = async (endpoint, payload) => {
    try {
        const pluginUrl = `http://localhost:${process.env.PLUGIN_PORT || 4567}${endpoint}`;
        const pluginSecret = process.env.WEBHOOK_SECRET;

        if (!pluginSecret) {
            console.error('CRITICAL: WEBHOOK_SECRET is not defined in the backend .env file.');
            throw new Error('Server configuration error.');
        }
        
        const pluginResponse = await axios.post(
            pluginUrl,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${pluginSecret}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10-second timeout
            }
        );
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
                    activityFeed
                }
            });
        }

        let statsResponse = null;
        let statsError = null;
        try {
            statsResponse = await callMinecraftPlugin('/player-stats', { uuid: user.minecraft_uuid });
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
                activityFeed: activityFeed
            },
            error: statsError 
        });

    } catch (error) {
        console.error('Error fetching character profile data:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching profile data.' });
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
                    activityFeed
                }
            });
        }

        let statsResponse = null;
        let statsError = null;
        try {
            statsResponse = await callMinecraftPlugin('/player-stats', { uuid: userToView.minecraft_uuid });
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
                activityFeed: activityFeed
            },
            error: statsError
        });

    } catch (error) {
        console.error('Error fetching character profile data:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching profile data.' });
    }
};