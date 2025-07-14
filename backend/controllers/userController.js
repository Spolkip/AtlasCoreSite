// backend/controllers/userController.js
const User = require('../models/User');
const { collection, getDocs } = require('firebase/firestore');
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
