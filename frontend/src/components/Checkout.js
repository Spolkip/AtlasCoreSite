// frontend/src/components/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';
import '../css/AuthForms.css'; // Reusing some form styles

const Checkout = ({ cart, user, settings }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    
    // New state for credit card details
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiryDate: '', // MM/YY
        cvc: '',
    });

    const navigate = useNavigate();

    const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    // Handler for credit card input changes
    const handleCardDetailsChange = (e) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    // Basic client-side validation for credit card details
    const validateCreditCardDetails = () => {
        const { cardNumber, expiryDate, cvc } = cardDetails;
        if (!cardNumber || !expiryDate || !cvc) {
            setError("All credit card fields are required.");
            return false;
        }
        if (!/^\d{16}$/.test(cardNumber)) { // Simple 16-digit check
            setError("Card number must be 16 digits.");
            return false;
        }
        if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiryDate)) { // MM/YY format
            setError("Expiry date must be in MM/YY format (e.g., 12/25).");
            return false;
        }
        if (!/^\d{3,4}$/.test(cvc)) { // 3 or 4 digits
            setError("CVC must be 3 or 4 digits.");
            return false;
        }
        setError(''); // Clear any previous errors
        return true;
    };

    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
            return;
        }
        
        // Perform client-side validation for credit card if selected
        if (paymentMethod === 'credit-card') {
            if (!validateCreditCardDetails()) {
                return; // Stop if validation fails
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
                    price: item.price
                })),
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                currency: settings?.currency || 'USD'
            };

            const response = await axios.post(
                'http://localhost:5000/api/v1/orders',
                orderData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (paymentMethod === 'paypal' && response.data.paymentUrl) {
                // Redirect to PayPal for actual payment flow
                window.location.href = response.data.paymentUrl;
            } else if (response.data.success) { // For all simulated methods
                // For simulated credit card, directly navigate to success
                navigate('/payment/success');
            } else {
                // Fallback for unexpected success response without paymentUrl (e.g., if backend logic changes)
                // If backend explicitly returns success: false, navigate to cancel
                navigate('/payment/cancel'); 
            }

        } catch (err) {
            // Display specific error message from backend if available
            const errorMessage = err.response?.data?.message || 'Failed to create order. Please try again.';
            setError(errorMessage);
            setLoading(false);

            // FIX: If there's an error from the backend, navigate to cancel page
            // This is crucial for simulated payments where no PayPal redirect happens
            if (err.response) { // Only navigate if it's an actual HTTP response error
                navigate(`/payment/cancel?transaction_id=${err.response.data.orderId || 'unknown'}`);
            }
        }
    };

    if (!user) {
        // Redirect to login if user is not authenticated
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
                                <span>{settings?.currencySymbol || '$'}{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <hr />
                        <div className="cart-total-summary">
                            <strong>Total:</strong>
                            <strong>{settings?.currencySymbol || '$'}{totalAmount.toFixed(2)}</strong>
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
                {/* NEW: Bank Transfer Simulation */}
                <div
                    className={`payment-option ${paymentMethod === 'bank-transfer' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('bank-transfer')}
                >
                    Bank Transfer (Simulation)
                </div>
                {/* NEW: Crypto Payment Simulation */}
                <div
                    className={`payment-option ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('crypto')}
                >
                    Crypto (Simulation)
                </div>
            </div>

            {/* Credit Card Input Fields (conditionally rendered) */}
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
