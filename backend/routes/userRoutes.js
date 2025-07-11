// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeAdmin } = require('../middleware/auth');

// --- START OF FIX: Reordered routes ---
// The specific '/activity' route must come before the generic '/:id' route.

// @desc    Get recent activity for the logged-in user
// @route   GET /api/v1/users/activity
// @access  Private
router.get('/activity', protect, userController.getUserActivity);
// --- END OF FIX ---

// Get all users (Admin only)
router.get('/', protect, authorizeAdmin, userController.getAllUsers);

// Get single user by ID (Admin only)
router.get('/:id', protect, authorizeAdmin, userController.getSingleUser);

// Update user by ID (Admin only)
router.put('/:id', protect, authorizeAdmin, userController.updateUser);

// Delete user by ID (Admin only)
router.delete('/:id', protect, authorizeAdmin, userController.deleteUser);


module.exports = router;
