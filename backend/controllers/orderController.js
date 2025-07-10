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
        } else if (paymentMethod === 'credit-card' || paymentMethod === 'bank-transfer' || paymentMethod === 'crypto') {
            // Handle simulated payment methods
            let simulatedPaymentResult;
            if (paymentMethod === 'credit-card') {
                // For credit card, we don't need to call paymentService here as it's a frontend simulation.
                // The frontend will directly navigate to success.
                // However, we still need to perform stock updates and delivery.
                simulatedPaymentResult = { success: true }; // Assume success from frontend validation
            } else if (paymentMethod === 'bank-transfer') {
                simulatedPaymentResult = await paymentService.processBankTransfer(totalAmount, currency, 'Store Purchase', newOrder.id);
            } else if (paymentMethod === 'crypto') {
                simulatedPaymentResult = await paymentService.processCryptoPayment(totalAmount, currency, 'Store Purchase', newOrder.id);
            }

            if (simulatedPaymentResult.success) {
                // Perform stock checks and updates for all simulated methods
                for (const item of products) {
                    const product = await Product.findById(item.productId);
                    // FIX: Check for infinite stock (null or undefined)
                    if (!product || (product.stock !== null && product.stock !== undefined && product.stock < item.quantity)) {
                        await newOrder.update({ status: 'failed', failure_reason: `Product ${item.productId} is out of stock.` });
                        return res.status(400).json({ message: `Product ${item.name} is out of stock or not found` });
                    }
                    // Only decrease stock if it's not infinite
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
// Updated getMyOrders with pagination
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
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount !== order.totalAmount) {
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }

            for (const item of order.products) {
                const product = await Product.findById(item.productId);
                 // FIX: Check for infinite stock (null or undefined)
                 if (!product || (product.stock !== null && product.stock !== undefined && product.stock < item.quantity)) {
                    await order.update({ status: 'failed', failure_reason: `Product ${item.name} is out of stock.` });
                    return res.redirect(`http://localhost:3000/payment/cancel`);
                }
                // Only decrease stock if it's not infinite
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
