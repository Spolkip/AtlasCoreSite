// frontend/src/components/Checkout.js
import React, { useState, useEffect } from 'react'; // Corrected import: removed ' => '
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
    const [appliedDiscountType, setAppliedDiscountType] = useState(null); // 'promo' or 'creator'
    
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
        return rate ? numericBasePrice * rate : numericPrice;
    };

    const initialTotal = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);
    
    // Determine the total amount based on which discount is applied (creator code takes precedence)
    let currentTotal = initialTotal;
    if (discount) { // If any discount is set
        currentTotal = discount.newTotal;
    }

    const handleCardDetailsChange = (e) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    // MODIFIED: Consolidated discount application logic into a single function
    const applyDiscountCode = async (code, type) => {
        setLoading(true);
        setError('');
        setDiscount(null); // Clear any existing discount
        setAppliedDiscountType(null); // Clear discount type

        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            let endpoint = '';

            if (type === 'promo') {
                endpoint = 'http://localhost:5000/api/v1/promocodes/apply';
            } else if (type === 'creator') {
                endpoint = 'http://localhost:5000/api/v1/creatorcodes/apply';
            } else {
                throw new Error('Invalid discount type.');
            }

            const { data } = await axios.post(
                endpoint,
                { code, totalAmount: initialTotal }, // Always apply to initial total
                { headers }
            );

            if (data.success) {
                setDiscount({
                    amount: data.discountAmount,
                    newTotal: data.newTotal,
                    code: code
                });
                setAppliedDiscountType(type);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Failed to apply ${type} code.`);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPromoCode = (e) => {
        e.preventDefault();
        if (!promoCode) {
            setError("Please enter a promo code.");
            return;
        }
        applyDiscountCode(promoCode, 'promo');
    };

    // ADDED: useEffect to apply creator code from user profile automatically
    useEffect(() => {
        // Only apply if user is logged in and has an appliedCreatorCode set
        if (user && user.appliedCreatorCode && user.appliedCreatorCode.trim() !== '') {
            // Check if a discount is already applied, if not, apply the creator code
            // This prevents the creator code from overriding a manually entered promo code
            if (!discount) { 
                applyDiscountCode(user.appliedCreatorCode, 'creator');
            }
        }
    }, [user, initialTotal]); // Re-run if user or initialTotal changes


    const handlePurchase = async () => {
        if (cart.length === 0) {
            setError("Your cart is empty.");
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
            totalAmount: currentTotal, // Use the calculated total with discount
            paymentMethod: paymentMethod,
            currency: settings?.currency || 'USD',
            // Pass the applied promoCode or creatorCode based on which was active
            promoCode: appliedDiscountType === 'promo' ? discount.code : null,
            // UPDATED: Pass the appliedCreatorCode from user profile if it was used for discount
            creatorCode: appliedDiscountType === 'creator' ? discount.code : null, 
            discountAmount: discount ? discount.amount : 0,
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
                                <strong>{appliedDiscountType === 'creator' ? 'Creator Code' : 'Discount'} ({discount.code}):</strong>
                                <strong>- {getCurrencySymbol(settings?.currency)}{discount.amount.toFixed(2)}</strong>
                            </div>
                        )}
                        <div className="cart-total-summary">
                            <strong>Total:</strong>
                            <strong>{getCurrencySymbol(settings?.currency)}{currentTotal.toFixed(2)}</strong>
                        </div>
                    </>
                )}
            </div>
            
            {/* ADDED: Display currently applied creator code from settings if available */}
            {user.appliedCreatorCode && (
                <div className="promo-code-section" style={{ border: '1px solid #2ecc71', padding: '10px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', color: '#2ecc71' }}>
                        Applying Creator Code from settings: <strong>{user.appliedCreatorCode}</strong>
                    </p>
                </div>
            )}

            <div className="promo-code-section">
                <form onSubmit={handleApplyPromoCode} className="promo-code-form">
                    <input 
                        type="text" 
                        value={promoCode} 
                        onChange={(e) => setPromoCode(e.target.value)} 
                        placeholder="Enter promo code"
                        className="promo-code-input"
                    />
                    <button type="submit" className="mc-button apply-promo-btn">Apply Promo Code</button>
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
