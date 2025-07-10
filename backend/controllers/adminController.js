const User = require('../models/User');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

/**
 * @desc    Get admin dashboard overview data, including server stats
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
exports.getAdminDashboard = async (req, res) => {
    try {
        // Fetch application data
        const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'users'));
        const productsSnapshot = await getDocs(collection(FIREBASE_DB, 'products'));
        const allOrders = await Order.findAll();

        // Fetch real-time server stats from the plugin
        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        const statsDoc = await getDoc(statsDocRef);
        const serverStats = statsDoc.exists() ? statsDoc.data() : { onlinePlayers: 0, maxPlayers: 0, newPlayersToday: 0 };

        // Calculate order status counts
        const orderStatusCounts = allOrders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totalUsers: usersSnapshot.size,
                totalProducts: productsSnapshot.size,
                totalOrders: allOrders.length,
                orderStatusCounts,
                ...serverStats // Merge server stats into the response
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Update server statistics from the Minecraft plugin
 * @route   POST /api/v1/admin/stats
 * @access  Private (via shared secret)
 */
exports.updateServerStats = async (req, res) => {
    try {
        const { onlinePlayers, maxPlayers, newPlayersToday } = req.body;

        if (onlinePlayers === undefined || maxPlayers === undefined || newPlayersToday === undefined) {
            return res.status(400).json({ message: 'Missing required stats fields.' });
        }

        // 1. Update the main, real-time stats document
        const statsDocRef = doc(FIREBASE_DB, 'server', 'stats');
        const statsData = {
            onlinePlayers,
            maxPlayers,
            newPlayersToday,
            lastUpdated: new Date().toISOString(),
        };
        await setDoc(statsDocRef, statsData, { merge: true });

        // 2. Update the daily trend document for historical charts
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        const dailyStatsDocRef = doc(FIREBASE_DB, 'daily_stats', todayUTC.toISOString().split('T')[0]);
        
        const dailyStatsData = {
            date: todayUTC,
            newPlayersToday
        };
        await setDoc(dailyStatsDocRef, dailyStatsData, { merge: true });

        res.status(200).json({ success: true, message: 'Stats updated successfully.' });
    } catch (error) {
        console.error('Error updating server stats:', error);
        res.status(500).json({ message: 'Server error while updating stats.' });
    }
};


/**
 * @desc    Get daily registration trends for the last 7 days
 * @route   GET /api/v1/admin/trends/registrations
 * @access  Private/Admin
 */
exports.getDailyRegistrationTrends = async (req, res) => {
    try {
        const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'users'));
        const trends = Array(7).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { date: d.toISOString().split('T')[0], count: 0 };
        }).reverse();

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.created_at && user.created_at.toDate) {
                const registrationDate = user.created_at.toDate().toISOString().split('T')[0];
                const trend = trends.find(t => t.date === registrationDate);
                if (trend) {
                    trend.count++;
                }
            }
        });

        const chartData = trends.map(t => ({
            name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            'New Registrations': t.count
        }));

        res.status(200).json({ success: true, data: chartData });
    } catch (error) {
        console.error('Error fetching registration trends:', error);
        res.status(500).json({ success: false, message: 'Server error fetching trends' });
    }
};

/**
 * @desc    Get new player trends for the last 7 days
 * @route   GET /api/v1/admin/trends/players
 * @access  Private/Admin
 */
exports.getNewPlayerTrends = async (req, res) => {
    try {
        const statsCollection = collection(FIREBASE_DB, 'daily_stats');
        const q = query(statsCollection, orderBy('date', 'desc'), limit(7));
        const statsSnapshot = await getDocs(q);

        const trends = Array(7).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { date: d.toISOString().split('T')[0], count: 0 };
        }).reverse();

        statsSnapshot.forEach(doc => {
            const stat = doc.data();
            const statDate = stat.date.toDate().toISOString().split('T')[0];
            const trend = trends.find(t => t.date === statDate);
            if (trend) {
                trend.count = stat.newPlayersToday || 0;
            }
        });

        const chartData = trends.map(t => ({
            name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            'New Players': t.count
        }));

        res.status(200).json({ success: true, data: chartData });
    } catch (error) {
        console.error('Error fetching new player trends:', error);
        res.status(500).json({ success: false, message: 'Server error fetching new player trends' });
    }
};

// --- Category Management ---

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.status(200).json({ success: true, count: categories.length, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        await newCategory.save();
        res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        await category.update(req.body);
        res.status(200).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        await Category.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- User Management ---

exports.updateUserAdminStatus = async (req, res) => {
    const { is_admin } = req.body;
    try {
        if (typeof is_admin !== 'number' || (is_admin !== 0 && is_admin !== 1)) {
            return res.status(400).json({ success: false, message: 'Invalid is_admin value' });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await user.update({ is_admin });
        res.status(200).json({ success: true, message: 'User admin status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await User.delete(req.params.id);
        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
