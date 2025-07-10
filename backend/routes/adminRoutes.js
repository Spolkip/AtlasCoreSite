// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorizeAdmin } = require('../middleware/auth');

// Import controllers
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');

// Apply protect and authorizeAdmin middleware to all routes in this file
router.use(protect, authorizeAdmin);

// --- Dashboard ---
router.get('/dashboard', adminController.getAdminDashboard);
router.get('/trends/registrations', adminController.getDailyRegistrationTrends);
router.get('/trends/new-players', adminController.getNewPlayerTrends);

// --- User Management ---
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getSingleUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', adminController.deleteUserByAdmin);
router.put('/users/:id/admin-status', adminController.updateUserAdminStatus);

// --- Product Management ---
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// --- Category Management ---
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

module.exports = router;