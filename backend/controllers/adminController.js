const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { collection, getDocs } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

// @desc    Get admin dashboard overview data
exports.getAdminDashboard = async (req, res) => {
  try {
    const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'users'));
    const productsSnapshot = await getDocs(collection(FIREBASE_DB, 'products'));
    const ordersSnapshot = await getDocs(collection(FIREBASE_DB, 'orders'));
    res.status(200).json({
      success: true,
      data: {
        totalUsers: usersSnapshot.size,
        totalProducts: productsSnapshot.size,
        totalOrders: ordersSnapshot.size,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
