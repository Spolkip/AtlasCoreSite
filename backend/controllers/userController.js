// backend/controllers/userController.js
const User = require('../models/User');
const Order = require('../models/Order');
const { collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

// @desc    Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'users'));
    const users = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        delete data.password; // Never send password hash
        return { id: doc.id, ...data };
    });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single user by ID (Admin only)
exports.getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    delete user.password;
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user details (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...updates } = req.body; // Exclude password
    await user.update(updates);
    res.status(200).json({ success: true, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a user by ID (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await User.delete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get recent activity feed for the logged-in user
 * @route   GET /api/v1/users/activity
 * @access  Private
 */
exports.getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const ordersCollectionRef = collection(FIREBASE_DB, 'orders');

        // --- START OF FIX: Query simplification to avoid needing a composite index ---
        // 1. Fetch all orders for the user. This is a simple query.
        const q = query(ordersCollectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        // 2. Filter, sort, and limit the results in JavaScript.
        const completedOrders = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(order => order.status === 'completed');

        completedOrders.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA; // Sort descending (newest first)
        });

        const recentActivity = completedOrders.slice(0, 3);
        // --- END OF FIX ---
        
        const activityFeed = recentActivity.map(order => {
            const productNames = order.products.map(p => `${p.name} (x${p.quantity})`).join(', ');

            let timestamp;
            if (order.createdAt && typeof order.createdAt.toDate === 'function') {
                timestamp = order.createdAt.toDate().toISOString();
            } else if (order.createdAt) {
                timestamp = new Date(order.createdAt).toISOString();
            } else {
                timestamp = new Date().toISOString();
            }

            return {
                id: order.id,
                type: 'purchase',
                description: `Purchased: ${productNames}`,
                timestamp: timestamp,
                value: order.totalAmount
            };
        });

        res.status(200).json({ success: true, activity: activityFeed });

    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ success: false, message: 'Server error fetching activity' });
    }
};
