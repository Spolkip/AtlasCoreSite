// frontend/src/components/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Checkout.css';

const Checkout = ({ cart, user, settings }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');
    const navigate = useNavigate();

    const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
            return;
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
                window.location.href = response.data.paymentUrl;
            } else {
                navigate('/payment/success');
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create order');
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

            {error && <div className="auth-error-message">{error}</div>}
            
            <div className="product-info">
                <h3>Order Summary</h3>
                {cart.map(item => (
                    <div key={item.id} className="cart-item-summary">
                        <span>{item.name} x {item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <hr />
                <div className="cart-total-summary">
                    <strong>Total:</strong>
                    <strong>${totalAmount.toFixed(2)}</strong>
                </div>
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
            </div>

            <button onClick={handlePurchase} className="mc-button primary purchase-button" disabled={loading}>
                {loading ? 'Processing...' : `Proceed to Payment`}
            </button>
        </div>
    );
};

export default Checkout;
