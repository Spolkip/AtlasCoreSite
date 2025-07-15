// frontend/src/components/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';
import '../css/AuthForms.css'; // Reusing some form styles

const Checkout = ({ cart, setCart, user, settings, exchangeRates }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // For promo code success
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(null);
    
    const navigate = useNavigate();

    const getCurrencySymbol = (currencyCode) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£' };
        return symbols[currencyCode] || '$';
    };

    const getDisplayPrice = (basePrice, discountPrice, targetCurrency) => {
        let effectivePrice = (discountPrice != null && discountPrice < basePrice) ? discountPrice : basePrice;
        const numericPrice = Number(effectivePrice);
        if (isNaN(numericPrice)) return 0;

        if (!exchangeRates || !targetCurrency || targetCurrency === 'USD') {
            return numericPrice;
        }
        const rate = exchangeRates[targetCurrency];
        return rate ? numericPrice * rate : numericPrice;
    };

    const originalTotal = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, item.discountPrice, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);

    const totalAmountInDisplayCurrency = discount ? discount.newTotal : originalTotal;

    const handleApplyPromoCode = async () => {
        if (!promoCode) return;
        setError('');
        setSuccess('');
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/promocodes/apply', {
                code: promoCode,
                totalAmount: originalTotal
            });
            if (data.success) {
                setDiscount({
                    amount: data.discountAmount,
                    newTotal: data.newTotal
                });
                setSuccess(data.message); // Set success message
            } else {
                setError(data.message);
                setDiscount(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid promo code.');
            setDiscount(null);
        }
    };

    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const orderData = {
                products: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity
                })),
                paymentMethod: paymentMethod,
                currency: settings?.currency || 'USD',
                promoCode: discount ? promoCode : null
            };

            const response = await axios.post(
                'http://localhost:5000/api/v1/orders',
                orderData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (paymentMethod === 'paypal' && response.data.paymentUrl) {
                window.location.href = response.data.paymentUrl;
            } else if (response.data.success) {
                setCart([]); // Clear cart on successful purchase
                navigate('/payment/success');
            } else {
                navigate('/payment/cancel'); 
            }

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create order. Please try again.';
            setError(errorMessage);
            setLoading(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="checkout-container">
            <h2>Checkout</h2>

            {error && <div className="auth-error-message"><span>{error}</span></div>}
            {success && <div className="auth-success-message"><span>{success}</span></div>}
            
            <div className="product-info">
                <h3>Order Summary</h3>
                {cart.length === 0 ? (
                    <p>Your cart is empty. Please add items to proceed.</p>
                ) : (
                    <>
                        {cart.map(item => (
                            <div key={item.id} className="cart-item-summary">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{getCurrencySymbol(settings?.currency)}{(getDisplayPrice(item.price, item.discountPrice, settings?.currency) * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <hr />
                        {discount && (
                            <div className="cart-item-summary discount">
                                <span>Discount ({promoCode}):</span>
                                <span>-{getCurrencySymbol(settings?.currency)}{discount.amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="cart-total-summary">
                            <strong>Total:</strong>
                            <strong>{getCurrencySymbol(settings?.currency)}{totalAmountInDisplayCurrency.toFixed(2)}</strong>
                        </div>
                    </>
                )}
            </div>

            <div className="promo-code-section">
                <input 
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter Promo Code"
                    className="auth-input"
                />
                <button onClick={handleApplyPromoCode} className="mc-button">Apply</button>
            </div>

            <div className="payment-options">
                <h3>Select Payment Method</h3>
                <div
                    className={`payment-option ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                >
                    PayPal
                </div>
                <div
                    className={`payment-option ${paymentMethod === 'debit_card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('debit_card')}
                >
                    Debit Card (Simulation)
                </div>
            </div>

            <button onClick={handlePurchase} className="mc-button primary purchase-button" disabled={loading || cart.length === 0}>
                {loading ? 'Processing...' : `Proceed to Payment`}
            </button>
        </div>
    );
};

export default Checkout;