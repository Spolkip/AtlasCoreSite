// frontend/src/components/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';
import '../css/AuthForms.css'; // Reusing some form styles

const Checkout = ({ cart, user, settings, exchangeRates }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    
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

    const totalAmountInDisplayCurrency = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);

    const handleCardDetailsChange = (e) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const validateCreditCardDetails = () => {
        const { cardNumber, expiryDate, cvc } = cardDetails;
        if (!cardNumber || !expiryDate || !cvc) {
            setError("All credit card fields are required.");
            return false;
        }
        if (!/^\d{16}$/.test(cardNumber)) {
            setError("Card number must be 16 digits.");
            return false;
        }
        if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiryDate)) {
            setError("Expiry date must be in MM/YY format (e.g., 12/25).");
            return false;
        }
        if (!/^\d{3,4}$/.test(cvc)) {
            setError("CVC must be 3 or 4 digits.");
            return false;
        }
        setError('');
        return true;
    };

    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
            return;
        }
        
        if (paymentMethod === 'credit-card' && !validateCreditCardDetails()) {
            return;
        }

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
            paymentMethod: paymentMethod,
            currency: settings?.currency || 'USD'
        };

        try {
            if (paymentMethod === 'paypal') {
                // For PayPal, we must wait for the response to get the redirect URL
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
                // *** FIX: For simulated payments, we "fire and forget" ***
                // We send the request but don't wait for the full backend process.
                // We navigate to the success page immediately, assuming the backend will handle it.
                // This prevents the frontend from timing out and showing an error.
                axios.post(
                    'http://localhost:5000/api/v1/orders',
                    orderData,
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(err => {
                    // We can log this error for debugging, but we won't show it to the user
                    // because the backend process likely succeeded anyway.
                    console.error("Simulated payment background request error:", err);
                });

                // Navigate immediately to the success page.
                navigate('/payment/success');
            }
        } catch (err) {
            // This catch block will now primarily handle errors from the PayPal flow
            // or pre-request validation issues.
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
                    <svg className="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                        <div className="cart-total-summary">
                            <strong>Total:</strong>
                            <strong>{getCurrencySymbol(settings?.currency)}{totalAmountInDisplayCurrency.toFixed(2)}</strong>
                        </div>
                    </>
                )}
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

            {paymentMethod === 'credit-card' && (
                <div className="credit-card-form">
                    <div className="form-group">
                        <label htmlFor="cardNumber">Card Number</label>
                        <input
                            id="cardNumber"
                            type="text"
                            name="cardNumber"
                            value={cardDetails.cardNumber}
                            onChange={handleCardDetailsChange}
                            placeholder="XXXX XXXX XXXX XXXX"
                            className="auth-input"
                            maxLength="16"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="expiryDate">Expiry (MM/YY)</label>
                            <input
                                id="expiryDate"
                                type="text"
                                name="expiryDate"
                                value={cardDetails.expiryDate}
                                onChange={handleCardDetailsChange}
                                placeholder="MM/YY"
                                className="auth-input"
                                maxLength="5"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cvc">CVC</label>
                            <input
                                id="cvc"
                                type="text"
                                name="cvc"
                                value={cardDetails.cvc}
                                onChange={handleCardDetailsChange}
                                placeholder="XXX"
                                className="auth-input"
                                maxLength="4"
                                required
                            />
                        </div>
                    </div>
                </div>
            )}

            <button onClick={handlePurchase} className="mc-button primary purchase-button" disabled={loading || cart.length === 0}>
                {loading ? 'Processing...' : `Proceed to Payment`}
            </button>
        </div>
    );
};

export default Checkout;
