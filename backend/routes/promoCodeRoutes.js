// backend/routes/promoCodeRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const {
    getAllPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    applyPromoCode,
    redeemRewardCode
} = require('../controllers/promoCodeController');

router.route('/')
    .get(protect, authorizeAdmin, getAllPromoCodes)
    .post(protect, authorizeAdmin, createPromoCode);

router.route('/:id')
    .put(protect, authorizeAdmin, updatePromoCode)
    .delete(protect, authorizeAdmin, deletePromoCode);
    
// This route is now public, allowing anyone to check a code.
router.post('/apply', applyPromoCode); 
// This route remains protected because a user must be logged in to receive a reward.
router.post('/redeem', protect, redeemRewardCode);

module.exports = router;
