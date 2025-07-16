// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// Import middleware
// MODIFIED: Import authorize instead of authorizeAdmin for specific roles
const { protect, authorize, authorizeAdmin, verifySecretKey } = require('../middleware/auth'); 

// Import controllers
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController'); // Keep import for now, though specific functions are moved
const userController = require('../controllers/userController'); // Keep import for now, though specific functions are moved
const wikiController = require('../controllers/wikiController'); // Keep import for now, though specific functions are moved
const vlogController = require('../controllers/vlogController'); // Keep import for now, though specific functions are moved
const promoCodeController = require('../controllers/promoCodeController'); // Keep import for now, though specific functions are moved
const eventController = require('../controllers/eventController'); // Keep import for now, though specific functions are moved

// Create reusable arrays for middleware stacks
const superAdminOnly = [protect, authorizeAdmin]; // Only for is_admin: 1
const storeManager = [protect, authorize(['admin', 'store_manager'])];
const wikiManager = [protect, authorize(['admin', 'wiki_manager'])];
const vlogManager = [protect, authorize(['admin', 'vlog_manager'])];
const promoCodeManager = [protect, authorize(['admin', 'promo_code_manager'])];
const eventManager = [protect, authorize(['admin', 'event_manager'])];
const chatManager = [protect, authorize(['admin', 'chat_manager'])];


// --- Routes for Frontend Admin Panel (Authenticated via JWT) ---

// Dashboard and Trends (Accessible by any admin-level role)
router.get('/dashboard', protect, authorize(['admin', 'event_manager', 'store_manager', 'wiki_manager', 'vlog_manager', 'promo_code_manager', 'chat_manager']), adminController.getAdminDashboard);
router.get('/trends/registrations', superAdminOnly, adminController.getDailyRegistrationTrends); // Only super admin
router.get('/trends/new-players', superAdminOnly, adminController.getNewPlayerTrends); // Only super admin

// Product Management (Store Manager role)
router.post('/products', storeManager, adminController.createProduct); // MODIFIED: Point to adminController
router.put('/products/:id', storeManager, adminController.updateProduct); // MODIFIED: Point to adminController
router.delete('/products/:id', storeManager, adminController.deleteProduct); // MODIFIED: Point to adminController

// Category Management (Store Manager role)
router.get('/categories', storeManager, adminController.getAllCategories);
router.post('/categories', storeManager, adminController.createCategory);
router.put('/categories/:id', storeManager, adminController.updateCategory);
router.delete('/categories/:id', storeManager, adminController.deleteCategory);

// Wiki Management (Wiki Manager role)
router.post('/wiki/categories', wikiManager, adminController.createWikiCategory); // MODIFIED: Point to adminController
router.put('/wiki/categories/:id', wikiManager, adminController.updateWikiCategory); // MODIFIED: Point to adminController
router.delete('/wiki/categories/:id', wikiManager, adminController.deleteWikiCategory); // MODIFIED: Point to adminController
router.post('/wiki/pages', wikiManager, adminController.createWikiPage); // MODIFIED: Point to adminController
router.put('/wiki/pages/:id', wikiManager, adminController.updateWikiPage); // MODIFIED: Point to adminController
router.delete('/wiki/pages/:id', wikiManager, adminController.deleteWikiPage); // MODIFIED: Point to adminController

// Vlog Management (Vlog Manager role)
router.post('/vlog/posts', vlogManager, adminController.createVlogPost); // MODIFIED: Point to adminController
router.put('/vlog/posts/:id', vlogManager, adminController.updateVlogPost); // MODIFIED: Point to adminController
router.delete('/vlog/posts/:id', vlogManager, adminController.deleteVlogPost); // MODIFIED: Point to adminController

// Promo Code Management (Promo Code Manager role)
router.get('/promocodes', promoCodeManager, adminController.getAllPromoCodes); // MODIFIED: Point to adminController
router.post('/promocodes', promoCodeManager, adminController.createPromoCode); // MODIFIED: Point to adminController
router.put('/promocodes/:id', promoCodeManager, adminController.updatePromoCode); // MODIFIED: Point to adminController
router.delete('/promocodes/:id', promoCodeManager, adminController.deletePromoCode); // MODIFIED: Point to adminController

// Event Management (Event Manager role)
router.post('/events', eventManager, adminController.createEvent); // MODIFIED: Point to adminController
router.put('/events/:id', eventManager, adminController.updateEvent); // MODIFIED: Point to adminController
router.delete('/events/:id', eventManager, adminController.deleteEvent); // MODIFIED: Point to adminController

// Chat Management (Chat Manager role)
router.get('/chat/sessions', chatManager, adminController.getChatSessions); // MODIFIED: Point to adminController
router.post('/chat/claim', chatManager, adminController.claimChatSession); // MODIFIED: Point to adminController
router.post('/chat/close', chatManager, adminController.closeChatSession); // MODIFIED: Point to adminController

// User Management (Super Admin only)
router.get('/users', superAdminOnly, userController.getAllUsers); // Still uses userController for general user list
router.get('/users/:id', superAdminOnly, userController.getSingleUser); // Still uses userController for single user fetch
router.put('/users/:id', superAdminOnly, userController.updateUser); // For general user profile updates by admin
router.delete('/users/:id', superAdminOnly, adminController.deleteUserByAdmin);
// NEW: Route to update user roles
router.put('/users/:id/roles', superAdminOnly, adminController.updateUserRoles);


// --- Route for Minecraft Plugin (Authenticated via Secret Key) ---
// This route uses a different authentication method and is handled separately.
router.post('/stats', verifySecretKey, adminController.updateServerStats);


module.exports = router;
