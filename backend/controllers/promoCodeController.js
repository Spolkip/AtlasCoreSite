// backend/controllers/promoCodeController.js
const PromoCode = require('../models/PromoCode');
const deliveryService = require('../services/DeliveryService');
const User = require('../models/User'); // ADDED

// REMOVED: Admin-specific promo code functions are moved to adminController.js
// exports.getAllPromoCodes = async (req, res) => { ... }
// exports.createPromoCode = async (req, res) => { ... }
// exports.updatePromoCode = async (req, res) => { ... }
// exports.deletePromoCode = async (req, res) => { ... }

// @desc    Apply a discount code to a cart total
// @route   POST /api/v1/promocodes/apply
// @access  Private
exports.applyPromoCode = async (req, res) => {
    const { code, totalAmount } = req.body;
    try {
        const promoCode = await PromoCode.findByCode(code);

        if (!promoCode || !promoCode.isActive || promoCode.codeType !== 'discount') {
            return res.status(404).json({ success: false, message: 'Discount code not found or is invalid.' });
        }
        if (promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'This code has expired.' });
        }
        if (promoCode.maxUses !== null && promoCode.uses >= promoCode.maxUses) {
            return res.status(400).json({ success: false, message: 'This code has reached its usage limit.' });
        }

        // ADDED: Check if non-admin user has already used this code
        // MODIFIED: Check for 'admin' role instead of is_admin === 1
        if (!req.user.roles.includes('admin') && req.user.used_promo_codes && req.user.used_promo_codes.includes(promoCode.id)) {
            return res.status(400).json({ success: false, message: 'You have already used this code.' });
        }

        let discountAmount = 0;
        if (promoCode.discountType === 'percentage') {
            discountAmount = (totalAmount * promoCode.discountValue) / 100;
        } else if (promoCode.discountType === 'fixed') {
            discountAmount = promoCode.discountValue;
        }

        const newTotal = Math.max(0, totalAmount - discountAmount);
        
        res.status(200).json({
            success: true,
            discountAmount,
            newTotal,
            message: 'Discount code applied successfully.'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error applying promo code.' });
    }
};

// @desc    Redeem a reward code
// @route   POST /api/v1/promocodes/redeem
// @access  Private
exports.redeemRewardCode = async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;
    try {
        const promoCode = await PromoCode.findByCode(code);

        if (!promoCode || !promoCode.isActive || promoCode.codeType !== 'reward') {
            return res.status(404).json({ success: false, message: 'Reward code not found or is invalid.' });
        }
        if (promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'This code has expired.' });
        }
        if (promoCode.maxUses !== null && promoCode.uses >= promoCode.maxUses) {
            return res.status(400).json({ success: false, message: 'This code has reached its usage limit.' });
        }
        
        // ADDED: Check if non-admin user has already used this code
        // MODIFIED: Check for 'admin' role instead of is_admin === 1
        if (!req.user.roles.includes('admin') && req.user.used_promo_codes && req.user.used_promo_codes.includes(promoCode.id)) {
            return res.status(400).json({ success: false, message: 'You have already used this code.' });
        }

        await deliveryService.executeCommandsForUser(userId, promoCode.in_game_commands);

        promoCode.uses += 1;
        await promoCode.save();

        // ADDED: Add code to user's used codes list if they are not an admin
        // MODIFIED: Check for 'admin' role instead of is_admin === 1
        if (!req.user.roles.includes('admin')) {
            const user = await User.findById(userId);
            if (user) {
                const updatedCodes = [...(user.used_promo_codes || []), promoCode.id];
                await user.update({ used_promo_codes: updatedCodes });
            }
        }

        res.status(200).json({ success: true, message: 'Code redeemed successfully! Check your in-game inventory.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error redeeming code.' });
    }
};
