// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  executePayment
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

// All these routes are protected and require a logged-in user
router.use(protect);

router.route('/')
  .post(createOrder);

router.route('/my-orders')
  .get(getMyOrders);

router.route('/cancel')
  .post(cancelOrder);

// The execute route is called by PayPal after payment approval
router.route('/execute')
  .get(executePayment);

module.exports = router;