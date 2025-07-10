const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

// @desc    Get admin dashboard overview data
exports.getAdminDashboard = async (req, res) => {
  try {
    const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'users'));
    const productsSnapshot = await getDocs(collection(FIREBASE_DB, 'products'));
    const allOrders = await Order.findAll(); // Fetch all orders

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
        orderStatusCounts: orderStatusCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get daily registration trends for the last 7 days
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
            // Ensure created_at exists and is a timestamp
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

// @desc    Get new player trends for the last 7 days
exports.getNewPlayerTrends = async (req, res) => {
    try {
        // This is a simplified example. In a real-world scenario, you would
        // likely store daily stats in a separate collection.
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


// @desc    Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.status(200).json({ success: true, count: categories.length, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a new category
exports.createCategory = async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        await newCategory.save();
        res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update a category
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

// @desc    Delete a category
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

// @desc    Update a user's admin status
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

// @desc    Delete a user by admin
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