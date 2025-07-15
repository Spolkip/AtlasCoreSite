// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User'); // ADDED
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
            await appliedPromoCode.save();
            
            // ADDED: Add promo code to user's used list
            const user = await User.findById(order.userId);
            if (user && user.is_admin !== 1) {
                const updatedCodes = [...(user.used_promo_codes || []), appliedPromoCode.id];
                await user.update({ used_promo_codes: updatedCodes });
            }
        }
    }

    await order.update({ status: 'completed' });
};

exports.createOrder = async (req, res, next) => {
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
        if (promoCode) {
            const appliedPromoCode = await PromoCode.findByCode(promoCode);
            if (appliedPromoCode && appliedPromoCode.isActive) {
                // ADDED: Check if user has already used this code before creating order
                const user = await User.findById(userId);
                if (user.is_admin !== 1 && user.used_promo_codes && user.used_promo_codes.includes(appliedPromoCode.id)) {
                     return res.status(400).json({ message: 'You have already used this promo code.' });
                }

                if (appliedPromoCode.discountType === 'percentage') {
                    discountAmount = (originalTotalAmount * appliedPromoCode.discountValue) / 100;
                } else {
                    discountAmount = appliedPromoCode.discountValue;
                }
                finalTotal = Math.max(0, originalTotalAmount - discountAmount);
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
            promoCode: promoCode || null,
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