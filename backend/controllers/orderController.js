// backend/controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const paymentService = require('../services/paymentService');

exports.createOrder = async (req, res, next) => {
    const { products, totalAmount, paymentMethod, currency } = req.body;
    const userId = req.user.id;

    try {
        // Basic validation
        if (!products || !products.length || !totalAmount || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required order information.' });
        }

        // Create a preliminary order record
        const newOrder = new Order({
            userId,
            products,
            totalAmount,
            status: 'pending',
            paymentMethod,
        });
        await newOrder.save();

        if (paymentMethod === 'paypal') {
            const payment = await paymentService.createPayment(totalAmount, currency, 'AtlasCore Store Purchase', newOrder.id);
            await newOrder.update({ paymentIntentId: payment.id });

            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.status(201).json({ success: true, paymentUrl: approvalUrl });

        } else if (paymentMethod === 'credit-card') {
            // This is a simulation. In a real app, you would integrate with a credit card processor like Stripe.
            // For now, we'll just mark the order as completed.
            for (const item of products) {
                const product = await Product.findById(item.productId);
                if (!product || product.stock < item.quantity) {
                    await newOrder.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                    return res.status(400).json({ message: `Product ${item.productId} is out of stock or not found` });
                }
                await product.update({ stock: product.stock - item.quantity });
            }
            await newOrder.update({ status: 'completed' });
            res.status(201).json({ success: true, order: newOrder });
        } else {
            res.status(400).json({ message: 'Invalid payment method' });
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
            // Verify the total amount matches
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount !== order.totalAmount) {
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }

            // Deduct stock
            for (const item of order.products) {
                const product = await Product.findById(item.productId);
                 if (!product || product.stock < item.quantity) {
                    await order.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                    return res.redirect(`http://localhost:3000/payment/cancel`);
                }
                await product.update({ stock: product.stock - item.quantity });
            }

            await order.update({ status: 'completed' });
            res.redirect('http://localhost:3000/payment/success');
        } else {
            throw new Error("Order not found for this payment.");
        }
    } catch (error) {
        console.error(error);
        res.redirect(`http://localhost:3000/payment/cancel`);
    }
};

exports.cancelOrder = async (req, res) => {
    const { transaction_id } = req.query;
    if(transaction_id) {
        const order = await Order.findById(transaction_id);
        if(order) {
            await order.update({ status: 'cancelled' });
        }
    }
    res.redirect('http://localhost:3000/payment/cancel');
};

exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.findByUserId(req.user.id);

        res.status(200).json({
            success: true,
            count: orders.length,
            orders: orders.map(order => ({
                id: order.id,
                userId: order.userId,
                products: order.products,
                totalAmount: order.totalAmount,
                status: order.status,
                paymentIntentId: order.paymentIntentId,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            message: 'Server error fetching user orders'
        });
    }
};
