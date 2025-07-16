// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const CreatorCode = require('../models/CreatorCode'); // ADDED: Import CreatorCode model
const User = require('../models/User');
const paymentService = require('../services/paymentService');
const deliveryService = require('../services/DeliveryService');

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        const rate = response.data.rates[toCurrency];
        if (!rate) throw new Error(`Conversion rate from ${fromCurrency} to ${toCurrency} not found.`);
        return amount * rate;
    } catch (error) {
        console.error('Currency conversion failed:', error.message);
        throw new Error('Could not process currency conversion.');
    }
};

const handleSuccessfulOrder = async (order) => {
    // Decrement stock and deliver products
    for (const item of order.products) {
        const product = await Product.findById(item.productId);
        if (product && product.stock !== null) {
            await product.update({ stock: product.stock - item.quantity });
        }
        await deliveryService.deliverProduct(order.userId, item.productId);
    }

    // Handle promo code commands and usage increment
    if (order.promoCode) {
        const appliedPromoCode = await PromoCode.findByCode(order.promoCode);
        if (appliedPromoCode) {
            if (appliedPromoCode.in_game_commands && appliedPromoCode.in_game_commands.length > 0) {
                await deliveryService.executeCommandsForUser(order.userId, appliedPromoCode.in_game_commands);
            }
            appliedPromoCode.uses = (appliedPromoCode.uses || 0) + 1;
            // Note: referralCount for promo codes is handled if they are also creator codes.
            await appliedPromoCode.save();

            const user = await User.findById(order.userId);
            if (user && user.is_admin !== 1) {
                const updatedCodes = [...(user.used_promo_codes || []), appliedPromoCode.id];
                await user.update({ used_promo_codes: updatedCodes });
            }
        }
    }

    // ADDED: Handle Creator Code referral and points
    if (order.creatorCode) { // Check if a creatorCode was stored in the order
        const usedCreatorCode = await CreatorCode.findByCode(order.creatorCode);
        if (usedCreatorCode && usedCreatorCode.isActive) {
            usedCreatorCode.referralCount = (usedCreatorCode.referralCount || 0) + 1;
            await usedCreatorCode.save();

            // Award points to the creator
            if (usedCreatorCode.creatorId) {
                const creatorUser = await User.findById(usedCreatorCode.creatorId);
                // Ensure the user who applied the code is not the creator themselves
                if (creatorUser && creatorUser.id !== order.userId) { 
                    // Example: Award 10 points per successful referral, or based on order total
                    const pointsToAward = 10; // You can make this configurable
                    creatorUser.points = (creatorUser.points || 0) + pointsToAward;
                    await creatorUser.save();
                    console.log(`Awarded ${pointsToAward} points to creator ${creatorUser.username} for code ${usedCreatorCode.code}`);
                }
            }
        }
    }

    await order.update({ status: 'completed' });
};

exports.createOrder = async (req, res, next) => {
    // MODIFIED: Remove creatorCode from req.body, it will now come from user.appliedCreatorCode
    const { products, paymentMethod, currency, promoCode } = req.body; 
    const userId = req.user.id;

    try {
        if (!products || !products.length || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required order information.' });
        }

        let originalTotalAmount = 0;
        const verifiedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            if (product.stock !== null && product.stock < item.quantity) return res.status(400).json({ message: `Not enough stock for ${product.name}.` });
            
            const effectivePrice = (product.discountPrice != null && product.discountPrice < product.price) ? product.discountPrice : product.price;
            originalTotalAmount += effectivePrice * item.quantity;
            verifiedProducts.push({ ...item, name: product.name, price: effectivePrice });
        }

        let finalTotal = originalTotalAmount;
        let discountAmount = 0;
        let appliedCreatorCode = null; // Track the creator code that was actually applied

        // NEW LOGIC: Check for appliedCreatorCode from the user's profile first
        const currentUser = await User.findById(userId);
        if (currentUser && currentUser.appliedCreatorCode) {
            const codeFromProfile = currentUser.appliedCreatorCode;
            const creatorCodeEntry = await CreatorCode.findByCode(codeFromProfile);

            if (creatorCodeEntry && creatorCodeEntry.isActive) {
                if (creatorCodeEntry.expiryDate && new Date(creatorCodeEntry.expiryDate) < new Date()) {
                    // Expired, do not apply
                } else if (creatorCodeEntry.maxUses !== null && creatorCodeEntry.referralCount >= creatorCodeEntry.maxUses) {
                    // Usage limit reached, do not apply
                } else if (creatorCodeEntry.creatorId === userId) {
                    // User is trying to use their own code, do not apply for discount/points
                }
                else {
                    // Valid creator code from user's profile, apply its discount
                    appliedCreatorCode = creatorCodeEntry.code; // Store the code that was applied
                    if (creatorCodeEntry.discountType === 'percentage') {
                        discountAmount = (originalTotalAmount * creatorCodeEntry.discountValue) / 100;
                    } else {
                        discountAmount = creatorCodeEntry.discountValue;
                    }
                    finalTotal = Math.max(0, originalTotalAmount - discountAmount);
                }
            }
        }

        // Apply promo code only if no creator code was successfully applied (or if it's a reward code, which doesn't affect total here)
        if (!appliedCreatorCode && promoCode) { // Only apply promo code if no creator code discount was given
            const appliedPromoCode = await PromoCode.findByCode(promoCode);
            if (appliedPromoCode && appliedPromoCode.isActive && appliedPromoCode.codeType === 'discount') {
                // Check if user has already used this promo code
                if (currentUser.is_admin !== 1 && currentUser.used_promo_codes && currentUser.used_promo_codes.includes(appliedPromoCode.id)) {
                     return res.status(400).json({ message: 'You have already used this promo code.' });
                }
                if (appliedPromoCode.expiryDate && new Date(appliedPromoCode.expiryDate) < new Date()) {
                    // Expired, do not apply
                } else if (appliedPromoCode.maxUses !== null && appliedPromoCode.uses >= appliedPromoCode.maxUses) {
                    // Usage limit reached, do not apply
                } else {
                    if (appliedPromoCode.discountType === 'percentage') {
                        discountAmount = (originalTotalAmount * appliedPromoCode.discountValue) / 100;
                    } else {
                        discountAmount = appliedPromoCode.discountValue;
                    }
                    finalTotal = Math.max(0, originalTotalAmount - discountAmount);
                }
            }
        }


        const storeCurrency = 'USD';
        let processedAmount = finalTotal;
        if (currency.toUpperCase() !== storeCurrency) {
            processedAmount = await convertCurrency(finalTotal, currency, storeCurrency);
        }

        const newOrder = new Order({
            userId,
            products: verifiedProducts,
            totalAmount: finalTotal,
            status: 'pending',
            paymentMethod,
            currency,
            processedAmount,
            processedCurrency: storeCurrency,
            promoCode: promoCode || null, // Keep original promoCode field for tracking
            creatorCode: appliedCreatorCode, // Store the *actually applied* creator code
            discountAmount
        });
        await newOrder.save();

        if (paymentMethod === 'paypal') {
            const payment = await paymentService.createPayment(processedAmount, storeCurrency, 'Store Purchase', newOrder.id);
            await newOrder.update({ paymentIntentId: payment.id });
            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.status(201).json({ success: true, paymentUrl: approvalUrl });
        } else {
            await handleSuccessfulOrder(newOrder);
            res.status(201).json({ success: true, order: newOrder });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Server error creating order' });
    }
};

exports.executePayment = async (req, res) => {
    const { paymentId, PayerID } = req.query;
    try {
        const payment = await paymentService.executePayment(paymentId, PayerID);
        const order = await Order.findByPaymentIntentId(paymentId);

        if (order) {
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount.toFixed(2) !== order.processedAmount.toFixed(2)) {
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }
            await handleSuccessfulOrder(order);
            res.redirect('http://localhost:3000/payment/success');
        } else {
            throw new Error("Order not found for this payment.");
        }
    } catch (error) {
        console.error(error);
        res.redirect(`http://localhost:3000/payment/cancel`);
    }
};

exports.getMyOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const allOrders = await Order.findByUserId(req.user.id);
        const orders = allOrders.slice(offset, offset + limit);
        
        res.status(200).json({
            success: true,
            count: allOrders.length,
            page,
            pages: Math.ceil(allOrders.length / limit),
            orders
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching orders.' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        
        if (!order || order.userId !== req.user.id) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending orders can be cancelled' });
        }
        
        await order.update({ status: 'cancelled' });
        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server error cancelling order' });
    }
};