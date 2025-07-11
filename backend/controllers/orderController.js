// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const paymentService = require('../services/paymentService');
const deliveryService = require('../services/DeliveryService');

// --- START OF EDIT: Currency Conversion Helper ---
/**
 * Converts an amount from a source currency to a target currency using an external API.
 * @param {number} amount The amount to convert.
 * @param {string} fromCurrency The source currency code (e.g., 'EUR').
 * @param {string} toCurrency The target currency code (e.g., 'USD').
 * @returns {Promise<number>} The converted amount.
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    try {
        // Using a free, no-key-required API for exchange rates.
        const response = await axios.get(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        const rate = response.data.rates[toCurrency];
        if (!rate) {
            throw new Error(`Conversion rate from ${fromCurrency} to ${toCurrency} not found.`);
        }
        return amount * rate;
    } catch (error) {
        console.error('Currency conversion failed:', error.message);
        throw new Error('Could not process currency conversion.');
    }
};
// --- END OF EDIT ---

exports.createOrder = async (req, res, next) => {
    const { products, totalAmount, paymentMethod, currency } = req.body;
    const userId = req.user.id;

    // --- START OF EDIT: Define store's base currency and handle conversion ---
    const storeCurrency = 'USD'; // Your store's primary currency
    let processedAmount = totalAmount;

    try {
        // If the transaction currency is different from the store's base currency, convert it.
        if (currency.toUpperCase() !== storeCurrency) {
            processedAmount = await convertCurrency(totalAmount, currency, storeCurrency);
        }
    // --- END OF EDIT ---

        if (!products || !products.length || !totalAmount || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required order information.' });
        }

        const newOrder = new Order({ 
            userId, 
            products, 
            totalAmount, 
            status: 'pending', 
            paymentMethod, 
            currency,
            processedAmount,      // Store the converted amount
            processedCurrency: storeCurrency // Store the currency sent to payment gateway
        });
        await newOrder.save();

        if (paymentMethod === 'paypal') {
            // Pass the processed amount and currency to PayPal
            const payment = await paymentService.createPayment(processedAmount, storeCurrency, 'Store Purchase', newOrder.id);
            await newOrder.update({ paymentIntentId: payment.id });
            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.status(201).json({ success: true, paymentUrl: approvalUrl });
        } else if (paymentMethod === 'credit-card' || paymentMethod === 'bank-transfer' || paymentMethod === 'crypto') {
            let simulatedPaymentResult;
            if (paymentMethod === 'credit-card') {
                simulatedPaymentResult = { success: true }; 
            } else if (paymentMethod === 'bank-transfer') {
                simulatedPaymentResult = await paymentService.processBankTransfer(processedAmount, storeCurrency, 'Store Purchase', newOrder.id);
            } else if (paymentMethod === 'crypto') {
                simulatedPaymentResult = await paymentService.processCryptoPayment(processedAmount, storeCurrency, 'Store Purchase', newOrder.id);
            }

            if (simulatedPaymentResult.success) {
                for (const item of products) {
                    const product = await Product.findById(item.productId);
                    if (!product || (product.stock !== null && product.stock !== undefined && product.stock < item.quantity)) {
                        await newOrder.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                        return res.status(400).json({ message: `Product ${item.name} is out of stock or not found` });
                    }
                    if (product.stock !== null && product.stock !== undefined) {
                        await product.update({ stock: product.stock - item.quantity });
                    }
                }
                await newOrder.update({ status: 'completed' });

                for (const item of products) {
                    await deliveryService.deliverProduct(userId, item.productId);
                }
                
                res.status(201).json({ success: true, order: newOrder });
            } else {
                await newOrder.update({ status: 'failed', failure_reason: simulatedPaymentResult.message || 'Simulated payment failed.' });
                res.status(400).json({ message: simulatedPaymentResult.message || 'Simulated payment failed.' });
            }
        } else {
            res.status(400).json({ message: 'Invalid payment method' });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Server error creating order' });
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
        // error handling
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ _id: orderId, userId: req.user.id });
        
        if (!order) {
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
exports.executePayment = async (req, res) => {
    const { paymentId, PayerID } = req.query;
    try {
        const payment = await paymentService.executePayment(paymentId, PayerID);
        const order = await Order.findByPaymentIntentId(paymentId);

        if (order) {
            // --- EDIT: Compare against the processedAmount ---
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount.toFixed(2) !== order.processedAmount.toFixed(2)) {
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }
            // --- END OF EDIT ---

            for (const item of order.products) {
                const product = await Product.findById(item.productId);
                 if (!product || (product.stock !== null && product.stock !== undefined && product.stock < item.quantity)) {
                    await order.update({ status: 'failed', failure_reason: `Product ${item.name} is out of stock.` });
                    return res.redirect(`http://localhost:3000/payment/cancel`);
                }
                if (product.stock !== null && product.stock !== undefined) {
                    await product.update({ stock: product.stock - item.quantity });
                }
            }

            await order.update({ status: 'completed' });

            for (const item of order.products) {
                await deliveryService.deliverProduct(order.userId, item.productId);
            }

            res.redirect('http://localhost:3000/payment/success');
        } else {
            throw new Error("Order not found for this payment.");
        }
    } catch (error) {
        console.error(error);
        res.redirect(`http://localhost:3000/payment/cancel`);
    }
};
