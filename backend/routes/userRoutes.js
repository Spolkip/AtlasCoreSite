// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// MODIFIED: Removed protect and authorizeAdmin as admin-facing routes are moved to adminRoutes.js
// const { protect, authorizeAdmin } = require('../middleware/auth');

// REMOVED: All these routes are now handled in adminRoutes.js with proper role checks
// Get all users (Admin only)
// router.get('/', protect, authorizeAdmin, userController.getAllUsers);

// Get single user by ID (Admin only)
// router.get('/:id', protect, authorizeAdmin, userController.getSingleUser);

// Update user by ID (Admin only)
// router.put('/:id', protect, authorizeAdmin, userController.updateUser);

// Delete user by ID (Admin only)
// router.delete('/:id', protect, authorizeAdmin, userController.deleteUser);

module.exports = router;
