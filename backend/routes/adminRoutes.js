// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorizeAdmin, verifySecretKey } = require('../middleware/auth');

// Import controllers
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');

// Create a reusable array for the admin middleware stack for cleaner routes
const adminOnly = [protect, authorizeAdmin];

// --- Routes for Frontend Admin Panel (Authenticated via JWT) ---

// Dashboard and Trends
router.get('/dashboard', adminOnly, adminController.getAdminDashboard);
router.get('/trends/registrations', adminOnly, adminController.getDailyRegistrationTrends);
// This path is updated to match what the frontend is requesting.
router.get('/trends/new-players', adminOnly, adminController.getNewPlayerTrends); 

// Product Management
router.post('/products', adminOnly, productController.createProduct);
router.put('/products/:id', adminOnly, productController.updateProduct);
router.delete('/products/:id', adminOnly, productController.deleteProduct);

// Category Management
router.get('/categories', adminOnly, adminController.getAllCategories);
router.post('/categories', adminOnly, adminController.createCategory);
router.put('/categories/:id', adminOnly, adminController.updateCategory);
router.delete('/categories/:id', adminOnly, adminController.deleteCategory);

// User Management (Admin Actions)
router.get('/users', adminOnly, userController.getAllUsers);
router.get('/users/:id', adminOnly, userController.getSingleUser);
router.put('/users/:id', adminOnly, userController.updateUser);
router.delete('/users/:id', adminOnly, adminController.deleteUserByAdmin);
router.put('/users/:id/admin-status', adminOnly, adminController.updateUserAdminStatus);


// --- Route for Minecraft Plugin (Authenticated via Secret Key) ---
// This route uses a different authentication method and is handled separately.
router.post('/stats', verifySecretKey, adminController.updateServerStats);


module.exports = router;
