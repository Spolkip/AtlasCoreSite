// frontend/src/components/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';
import '../css/AuthForms.css'; // Reusing some form styles

// --- START OF EDIT: Pass exchangeRates as a prop ---
const Checkout = ({ cart, user, settings, exchangeRates }) => {
// --- END OF EDIT ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvc: '',
    });

    const navigate = useNavigate();

    // --- START OF EDIT: Currency conversion logic for display ---
    const getCurrencySymbol = (currencyCode) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£' };
        return symbols[currencyCode] || '$';
    };

    const getDisplayPrice = (basePrice, targetCurrency) => {
        if (!exchangeRates || !targetCurrency || targetCurrency === 'USD') {
            return basePrice;
        }
        const rate = exchangeRates[targetCurrency];
        return rate ? basePrice * rate : basePrice;
    };

    const totalAmountInDisplayCurrency = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);
    // --- END OF EDIT ---


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
        
        if (paymentMethod === 'credit-card') {
            if (!validateCreditCardDetails()) {
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const orderData = {
                products: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    name: item.name,
                    price: item.price // Always send base price
                })),
                // --- EDIT: Send the converted total and the selected currency ---
                totalAmount: totalAmountInDisplayCurrency,
                paymentMethod: paymentMethod,
                currency: settings?.currency || 'USD'
            };

            const response = await axios.post(
                'http://localhost:5000/api/v1/orders',
                orderData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (paymentMethod === 'paypal' && response.data.paymentUrl) {
                window.location.href = response.data.paymentUrl;
            } else if (response.data.success) {
                navigate('/payment/success');
            } else {
                navigate('/payment/cancel'); 
            }

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create order. Please try again.';
            setError(errorMessage);
            setLoading(false);

            if (err.response) {
                navigate(`/payment/cancel?transaction_id=${err.response.data.orderId || 'unknown'}`);
            }
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
