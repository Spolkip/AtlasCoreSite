// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth'); // Correctly import 'protect' middleware

router.post('/', protect, orderController.createOrder);
router.get('/execute', protect, orderController.executePayment);
router.get('/my-orders', protect, orderController.getMyOrders); // Changed to getMyOrders as per orderController
router.post('/cancel', protect, orderController.cancelOrder);

module.exports = router;
