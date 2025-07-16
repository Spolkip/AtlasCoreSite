// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const CreatorCode = require('../models/CreatorCode');
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
    console.log('handleSuccessfulOrder: Processing order ID', order.id);
    console.log('handleSuccessfulOrder: Order details:', JSON.stringify(order));

    // Decrement stock and deliver products
    for (const item of order.products) {
        const product = await Product.findById(item.productId);
        if (product && product.stock !== null) {
            await product.update({ stock: product.stock - item.quantity });
            console.log(`handleSuccessfulOrder: Decremented stock for product ${product.name}`);
        }
        await deliveryService.deliverProduct(order.userId, item.productId);
        console.log(`handleSuccessfulOrder: Delivered product ${item.name} to user ${order.userId}`);
    }

    // Handle promo code commands and usage increment
    if (order.promoCode) {
        console.log('handleSuccessfulOrder: Processing promo code:', order.promoCode);
        const appliedPromoCode = await PromoCode.findByCode(order.promoCode);
        if (appliedPromoCode) {
            if (appliedPromoCode.in_game_commands && appliedPromoCode.in_game_commands.length > 0) {
                await deliveryService.executeCommandsForUser(order.userId, appliedPromoCode.in_game_commands);
                console.log(`handleSuccessfulOrder: Executed in-game commands for promo code ${order.promoCode}`);
            }
            appliedPromoCode.uses = (appliedPromoCode.uses || 0) + 1;
            await appliedPromoCode.save();
            console.log(`handleSuccessfulOrder: Incremented uses for promo code ${order.promoCode}. New uses: ${appliedPromoCode.uses}`);

            const user = await User.findById(order.userId);
            if (user && user.is_admin !== 1) {
                const updatedCodes = [...(user.used_promo_codes || []), appliedPromoCode.id];
                await user.update({ used_promo_codes: updatedCodes });
                console.log(`handleSuccessfulOrder: Added promo code ${order.promoCode} to user's used codes.`);
            }
        } else {
            console.warn(`handleSuccessfulOrder: Applied promo code ${order.promoCode} not found.`);
        }
    }

    // UPDATED: Handle Creator Code referral and points
    if (order.creatorCode) { // Check if a creatorCode was stored in the order
        console.log('handleSuccessfulOrder: Processing creator code:', order.creatorCode);
        const usedCreatorCode = await CreatorCode.findByCode(order.creatorCode);
        
        if (usedCreatorCode) {
            console.log('handleSuccessfulOrder: Found CreatorCode entry:', JSON.stringify(usedCreatorCode));
            if (usedCreatorCode.isActive) {
                console.log('handleSuccessfulOrder: CreatorCode is active.');
                
                // Ensure the user who applied the code is not the creator themselves
                if (usedCreatorCode.creatorId) {
                    console.log('handleSuccessfulOrder: Creator ID found:', usedCreatorCode.creatorId);
                    console.log('handleSuccessfulOrder: Order User ID:', order.userId);
                    
                    if (usedCreatorCode.creatorId === order.userId) {
                        console.log(`handleSuccessfulOrder: User ${order.userId} used their own creator code ${usedCreatorCode.code}. Points not awarded.`);
                    } else {
                        const creatorUser = await User.findById(usedCreatorCode.creatorId);
                        if (creatorUser) {
                            console.log(`handleSuccessfulOrder: Found creator user: ${creatorUser.username} (ID: ${creatorUser.id})`);
                            const pointsToAward = 10; // You can make this configurable
                            creatorUser.points = (creatorUser.points || 0) + pointsToAward;
                            await creatorUser.save();
                            console.log(`handleSuccessfulOrder: Awarded ${pointsToAward} points to creator ${creatorUser.username} for code ${usedCreatorCode.code}. New points: ${creatorUser.points}`);
                            
                            usedCreatorCode.referralCount = (usedCreatorCode.referralCount || 0) + 1;
                            await usedCreatorCode.save();
                            console.log(`handleSuccessfulOrder: Incremented referralCount for creator code ${usedCreatorCode.code}. New count: ${usedCreatorCode.referralCount}`);
                        } else {
                            console.warn(`handleSuccessfulOrder: Creator user with ID ${usedCreatorCode.creatorId} not found for code ${usedCreatorCode.code}. Points not awarded.`);
                        }
                    }
                } else {
                    console.warn(`handleSuccessfulOrder: Creator ID not set for CreatorCode ${usedCreatorCode.code}. Points not awarded.`);
                }
            } else {
                console.warn(`handleSuccessfulOrder: CreatorCode ${order.creatorCode} is not active. Points not awarded.`);
            }
        } else {
            console.warn(`handleSuccessfulOrder: CreatorCode entry for "${order.creatorCode}" not found in database. Points not awarded.`);
        }
    } else {
        console.log('handleSuccessfulOrder: No creator code applied to this order.');
    }

    await order.update({ status: 'completed' });
    console.log('handleSuccessfulOrder: Order status updated to completed.');
};

exports.createOrder = async (req, res, next) => {
    const { products, paymentMethod, currency, promoCode } = req.body; 
    const userId = req.user.id;

    try {
        console.log('createOrder: Starting order creation for user', userId);
        console.log('createOrder: Request body:', JSON.stringify(req.body));

        if (!products || !products.length || !paymentMethod) {
            console.error('createOrder: Missing required order information.');
            return res.status(400).json({ message: 'Missing required order information.' });
        }

        let originalTotalAmount = 0;
        const verifiedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.error(`createOrder: Product with ID ${item.productId} not found.`);
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            if (product.stock !== null && product.stock < item.quantity) {
                console.error(`createOrder: Not enough stock for ${product.name}.`);
                return res.status(400).json({ message: `Not enough stock for ${product.name}.` });
            }
            
            const effectivePrice = (product.discountPrice != null && product.discountPrice < product.price) ? product.discountPrice : product.price;
            originalTotalAmount += effectivePrice * item.quantity;
            verifiedProducts.push({ ...item, name: product.name, price: effectivePrice });
        }
        console.log('createOrder: Verified products. Original total:', originalTotalAmount);

        let finalTotal = originalTotalAmount;
        let discountAmount = 0;
        let appliedCreatorCodeForOrder = null; // This will store the creator code that actually gives a discount/points

        // NEW LOGIC: Always check user's appliedCreatorCode first for discount and for storing in order
        const currentUser = await User.findById(userId);
        console.log('createOrder: Current user profile:', JSON.stringify(currentUser));

        if (currentUser && currentUser.appliedCreatorCode) {
            const codeFromProfile = currentUser.appliedCreatorCode;
            console.log('createOrder: User has applied creator code in profile:', codeFromProfile);
            const creatorCodeEntry = await CreatorCode.findByCode(codeFromProfile);
            console.log('createOrder: Found CreatorCode entry for profile code:', JSON.stringify(creatorCodeEntry));

            // Ensure the creator code is valid and active, and not being used by its own creator
            if (creatorCodeEntry && creatorCodeEntry.isActive && creatorCodeEntry.creatorId !== userId) {
                if (creatorCodeEntry.expiryDate && new Date(creatorCodeEntry.expiryDate) < new Date()) {
                    console.log('createOrder: Applied creator code is expired.');
                    // Expired, do not apply discount or store for points
                } else if (creatorCodeEntry.maxUses !== null && creatorCodeEntry.referralCount >= creatorCodeEntry.maxUses) {
                    console.log('createOrder: Applied creator code reached max uses.');
                    // Usage limit reached, do not apply discount or store for points
                } else {
                    // This creator code is valid and will be applied
                    appliedCreatorCodeForOrder = creatorCodeEntry.code; // Store the code that was applied
                    if (creatorCodeEntry.discountType === 'percentage') {
                        discountAmount = (originalTotalAmount * creatorCodeEntry.discountValue) / 100;
                    } else {
                        discountAmount = creatorCodeEntry.discountValue;
                    }
                    finalTotal = Math.max(0, originalTotalAmount - discountAmount);
                    console.log(`createOrder: Applied creator code ${appliedCreatorCodeForOrder}. Discount: ${discountAmount}, New Total: ${finalTotal}`);
                }
            } else {
                if (creatorCodeEntry && creatorCodeEntry.creatorId === userId) {
                    console.log('createOrder: User tried to apply their own creator code. Not applied for discount/points.');
                } else {
                    console.log('createOrder: Applied creator code from profile is invalid, inactive, or not found.');
                }
            }
        }

        // Apply promo code only if no creator code was successfully applied for a discount
        if (!appliedCreatorCodeForOrder && promoCode) { 
            console.log('createOrder: No creator code applied, checking promo code:', promoCode);
            const appliedPromoCode = await PromoCode.findByCode(promoCode);
            if (appliedPromoCode && appliedPromoCode.isActive && appliedPromoCode.codeType === 'discount') {
                // Check if user has already used this promo code
                if (currentUser.is_admin !== 1 && currentUser.used_promo_codes && currentUser.used_promo_codes.includes(appliedPromoCode.id)) {
                    console.log('createOrder: User already used this promo code.');
                     return res.status(400).json({ message: 'You have already used this promo code.' });
                }
                if (appliedPromoCode.expiryDate && new Date(appliedPromoCode.expiryDate) < new Date()) {
                    console.log('createOrder: Promo code is expired.');
                    // Expired, do not apply
                } else if (appliedPromoCode.maxUses !== null && appliedPromoCode.uses >= appliedPromoCode.maxUses) {
                    console.log('createOrder: Promo code reached max uses.');
                    // Usage limit reached, do not apply
                } else {
                    // Apply promo code discount
                    if (appliedPromoCode.discountType === 'percentage') {
                        discountAmount = (originalTotalAmount * appliedPromoCode.discountValue) / 100;
                    } else {
                        discountAmount = appliedPromoCode.discountValue;
                    }
                    finalTotal = Math.max(0, originalTotalAmount - discountAmount);
                    console.log(`createOrder: Applied promo code ${promoCode}. Discount: ${discountAmount}, New Total: ${finalTotal}`);
                }
            } else {
                console.log('createOrder: Promo code is invalid, inactive, or not a discount type.');
            }
        }


        const storeCurrency = 'USD';
        let processedAmount = finalTotal;
        if (currency.toUpperCase() !== storeCurrency) {
            processedAmount = await convertCurrency(finalTotal, currency, storeCurrency);
            console.log(`createOrder: Converted amount from ${currency} to ${storeCurrency}. Processed amount: ${processedAmount}`);
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
            creatorCode: appliedCreatorCodeForOrder, // Store the *actually applied* creator code for points
            discountAmount
        });
        await newOrder.save();
        console.log('createOrder: Order saved with ID:', newOrder.id);
        console.log('createOrder: Order creatorCode field:', newOrder.creatorCode);


        if (paymentMethod === 'paypal') {
            console.log('createOrder: Initiating PayPal payment...');
            const payment = await paymentService.createPayment(processedAmount, storeCurrency, 'Store Purchase', newOrder.id);
            await newOrder.update({ paymentIntentId: payment.id });
            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.status(201).json({ success: true, paymentUrl: approvalUrl });
        } else {
            console.log('createOrder: Simulating direct payment (not PayPal).');
            await handleSuccessfulOrder(newOrder); // Directly call handleSuccessfulOrder for simulated payments
            res.status(201).json({ success: true, order: newOrder });
        }
    } catch (error) {
        console.error('createOrder: Error during order creation:', error);
        res.status(500).json({ message: 'Server error creating order' });
    }
};

exports.executePayment = async (req, res) => {
    const { paymentId, PayerID } = req.query;
    console.log('executePayment: Executing PayPal payment for paymentId:', paymentId);
    try {
        const payment = await paymentService.executePayment(paymentId, PayerID);
        const order = await Order.findByPaymentIntentId(paymentId);

        if (order) {
            console.log('executePayment: Order found for paymentId:', order.id);
            const paidAmount = parseFloat(payment.transactions[0].amount.total);
            if (paidAmount.toFixed(2) !== order.processedAmount.toFixed(2)) {
                 console.error('executePayment: Payment amount mismatch!');
                 await order.update({ status: 'failed', failure_reason: 'Payment amount mismatch.' });
                 return res.redirect(`http://localhost:3000/payment/cancel`);
            }
            await handleSuccessfulOrder(order);
            res.redirect('http://localhost:3000/payment/success');
        } else {
            console.error('executePayment: Order not found for this payment ID.');
            throw new Error("Order not found for this payment.");
        }
    } catch (error) {
        console.error('executePayment: Error during payment execution:', error);
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