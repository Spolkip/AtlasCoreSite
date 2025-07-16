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
    
// MODIFIED: This route is now protected to check user's usage history.
router.post('/apply', protect, applyPromoCode); 
router.post('/redeem', protect, redeemRewardCode);

module.exports = router;