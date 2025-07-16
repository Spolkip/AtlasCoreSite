// frontend/src/components/Checkout.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';
import '../css/AuthForms.css'; // Reusing some form styles

const Checkout = ({ cart, user, settings, exchangeRates, onUpdateCart }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(null);
    
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvc: '',
    });

    const navigate = useNavigate();

    const getCurrencySymbol = (currencyCode) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£' };
        return symbols[currencyCode] || '$';
    };

    const getDisplayPrice = (basePrice, targetCurrency) => {
        const numericBasePrice = Number(basePrice);
        if (isNaN(numericBasePrice)) {
            console.error("Invalid basePrice provided to getDisplayPrice:", basePrice);
            return 0; 
        }

        if (!exchangeRates || !targetCurrency || targetCurrency === 'USD') {
            return numericBasePrice;
        }

        const rate = exchangeRates[targetCurrency];
        return rate ? numericBasePrice * rate : numericBasePrice;
    };

    const initialTotal = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);
    
    const totalAmountInDisplayCurrency = discount ? discount.newTotal : initialTotal;

    const handleCardDetailsChange = (e) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyPromoCode = async (e) => {
        e.preventDefault();
        if (!promoCode) {
            setError("Please enter a promo code.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(
                'http://localhost:5000/api/v1/promocodes/apply', 
                { code: promoCode, totalAmount: initialTotal }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                setDiscount({
                    amount: data.discountAmount,
                    newTotal: data.newTotal,
                    code: promoCode
                });
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to apply promo code.');
        } finally {
            setLoading(false);
        }
    };


    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
            return;
        }
        
        // FIX: Removed the error message for credit card payments
        // if (paymentMethod === 'credit-card') {
        //     setError("Credit card payments are not yet supported.");
        //     return;
        // }

        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        const orderData = {
            products: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                name: item.name,
                price: item.price
            })),
            totalAmount: totalAmountInDisplayCurrency,
            paymentMethod: paymentMethod, // This will now correctly be 'credit-card' for simulation
            currency: settings?.currency || 'USD',
            promoCode: discount ? discount.code : null,
            discountAmount: discount ? discount.amount : 0
        };

        try {
            if (paymentMethod === 'paypal') {
                const response = await axios.post(
                    'http://localhost:5000/api/v1/orders',
                    orderData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (response.data.paymentUrl) {
                    window.location.href = response.data.paymentUrl;
                } else {
                    throw new Error('PayPal approval URL not received from server.');
                }
            } else {
                // This block now handles 'credit-card', 'bank-transfer', and 'crypto' as simulations
                axios.post(
                    'http://localhost:5000/api/v1/orders',
                    orderData,
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(err => {
                    console.error("Simulated payment background request error:", err);
                });
                navigate('/payment/success');
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

            {error && (
                <div className="auth-error-message">
                    <span>{error}</span>
                </div>
            )}
            
            <div className="product-info">
                <h3>Order Summary</h3>
                {cart.length === 0 ? (
                    <p>Your cart is empty. Please add items to proceed.</p>
                ) : (
                    <>
                        {cart.map(item => (
                            <div key={item.id} className="cart-item-summary">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{getCurrencySymbol(settings?.currency)}{getDisplayPrice(item.price * item.quantity, settings?.currency).toFixed(2)}</span>
                            </div>
                        ))}
                        <hr />
                        {discount && (
                             <div className="cart-total-summary discount">
                                <strong>Discount ({discount.code}):</strong>
                                <strong>- {getCurrencySymbol(settings?.currency)}{discount.amount.toFixed(2)}</strong>
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
                <form onSubmit={handleApplyPromoCode} className="promo-code-form">
                    <input 
                        type="text" 
                        value={promoCode} 
                        onChange={(e) => setPromoCode(e.target.value)} 
                        placeholder="Enter discount code"
                        className="promo-code-input"
                    />
                    <button type="submit" className="mc-button apply-promo-btn">Apply</button>
                </form>
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
                    className={`payment-option ${paymentMethod === 'credit-card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('credit-card')}
                >
                    Credit Card (Simulation)
                </div>
                <div
                    className={`payment-option ${paymentMethod === 'bank-transfer' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('bank-transfer')}
                >
                    Bank Transfer (Simulation)
                </div>
                <div
                    className={`payment-option ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('crypto')}
                >
                    Crypto (Simulation)
                </div>
            </div>

            <button onClick={handlePurchase} className="mc-button primary purchase-button" disabled={loading || cart.length === 0}>
                {loading ? 'Processing...' : `Proceed to Payment`}
            </button>
        </div>
    );
};

export default Checkout;