// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// FIX: Correctly import authorizeAdmin from the auth middleware
const { protect, authorizeAdmin } = require('../middleware/auth');

// Get all users (Admin only)
// FIX: Use authorizeAdmin as the middleware function
router.get('/', protect, authorizeAdmin, userController.getAllUsers);

// Get single user by ID (Admin only)
// FIX: Use authorizeAdmin as the middleware function
router.get('/:id', protect, authorizeAdmin, userController.getSingleUser);

// Update user by ID (Admin only)
// FIX: Use authorizeAdmin as the middleware function
router.put('/:id', protect, authorizeAdmin, userController.updateUser);

// Delete user by ID (Admin only)
// FIX: Use authorizeAdmin and call the correct controller function
router.delete('/:id', protect, authorizeAdmin, userController.deleteUser);

module.exports = router;