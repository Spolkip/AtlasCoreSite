const Order = require('../models/Order');
const Product = require('../models/Product');
const paymentService = require('../services/paymentService');
const deliveryService = require('../services/DeliveryService');

exports.createOrder = async (req, res, next) => {
    const { products, totalAmount, paymentMethod, currency } = req.body;
    const userId = req.user.id;

    try {
        if (!products || !products.length || !totalAmount || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required order information.' });
        }

        const newOrder = new Order({ userId, products, totalAmount, status: 'pending', paymentMethod });
        await newOrder.save();

        if (paymentMethod === 'paypal') {
            const payment = await paymentService.createPayment(totalAmount, currency, 'Store Purchase', newOrder.id);
            await newOrder.update({ paymentIntentId: payment.id });
            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.status(201).json({ success: true, paymentUrl: approvalUrl });
        } else if (paymentMethod === 'credit-card') {
            for (const item of products) {
                const product = await Product.findById(item.productId);
                if (!product || product.stock < item.quantity) {
                    await newOrder.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                    return res.status(400).json({ message: `Product ${item.productId} is out of stock or not found` });
                }
                await product.update({ stock: product.stock - item.quantity });
            }
            await newOrder.update({ status: 'completed' });

            for (const item of products) {
                await deliveryService.deliverProduct(userId, item.productId);
            }
            
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
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount !== order.totalAmount) {
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }

            for (const item of order.products) {
                const product = await Product.findById(item.productId);
                 if (!product || product.stock < item.quantity) {
                    await order.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                    return res.redirect(`http://localhost:3000/payment/cancel`);
                }
                await product.update({ stock: product.stock - item.quantity });
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