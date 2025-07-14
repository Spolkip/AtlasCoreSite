// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

// Make sure all route handlers are properly referenced from orderController
router.post('/', protect, orderController.createOrder);
router.get('/execute', protect, orderController.executePayment);
router.get('/my-orders', protect, orderController.getMyOrders);
router.post('/cancel', protect, orderController.cancelOrder);

module.exports = router;