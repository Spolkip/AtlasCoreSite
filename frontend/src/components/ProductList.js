// frontend/src/components/ProductList.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloseIcon from '@mui/icons-material/Close';
import '../css/ProductList.css';

function ProductList({ isAdmin, cart, setCart, settings, exchangeRates }) {
    const [categorizedProducts, setCategorizedProducts] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const getCurrencySymbol = (currencyCode) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£' };
        return symbols[currencyCode] || '$';
    };

    // --- START OF FIX: Ensure price is handled as a number ---
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
    // --- END OF FIX ---

    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const totalCartAmount = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);

    const addToCart = (product) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                if (product.stock !== null && existingProduct.quantity + 1 > product.stock) {
                    alert(`Cannot add more "${product.name}". Only ${product.stock} left in stock.`);
                    return prevCart;
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                if (product.stock !== null && 1 > product.stock) {
                     alert(`Cannot add "${product.name}". Only ${product.stock} left in stock.`);
                     return prevCart;
                }
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        setIsCartSidebarOpen(true);
    };

    const handleQuantityChange = (product, delta) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                const newQuantity = existingProduct.quantity + delta;
                
                if (product.stock !== null && newQuantity > product.stock) {
                    alert(`Cannot add more "${product.name}". Only ${product.stock} left in stock.`);
                    return prevCart;
                }

                if (newQuantity <= 0) {
                    return prevCart.filter(item => item.id !== product.id);
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: newQuantity } : item
                );
            }
            return prevCart;
        });
    };

    const removeFromCart = (product) => {
        setCart(prevCart => prevCart.filter(item => item.id !== product.id));
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const productsResponse = await axios.get('http://localhost:5000/api/v1/products', config);

            if (productsResponse.data && productsResponse.data.success) {
                setCategorizedProducts(productsResponse.data.products);
                if (Object.keys(productsResponse.data.products).length > 0) {
                    setSelectedCategory(Object.keys(productsResponse.data.products)[0]);
                }
            } else {
                throw new Error(productsResponse.data.message || 'API did not return products.');
            }

        } catch (err) {
            console.error('Error fetching data:', err.response ? err.response.data : err.message);
            setError('Failed to load products from the store. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <div className="loading-container">Loading products...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="store-container">
           <h1 className="store-title">{settings?.store_name || 'Store'}</h1>
            <p className="store-description">{settings?.store_description || 'Welcome to our store!'}</p>

            {isAdmin && (
                <Link to="/admin" className="add-product-fab" title="Manage Store">
                    +
                </Link>
            )}

            <div className="cart-icon-container" onClick={() => setIsCartSidebarOpen(true)}>
                <ShoppingCartIcon className="cart-icon" />
                {cartItemCount > 0 && <span className="cart-count-badge">{cartItemCount}</span>}
            </div>

            {isCartSidebarOpen && (
                <div className="cart-sidebar-overlay" onClick={() => setIsCartSidebarOpen(false)}></div>
            )}

            <div className={`cart-sidebar ${isCartSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Your Cart</h2>
                    <button className="close-sidebar-btn" onClick={() => setIsCartSidebarOpen(false)}>
                        <CloseIcon />
                    </button>
                </div>
                {cart.length === 0 ? (
                    <p className="empty-cart-message">Your cart is empty.</p>
                ) : (
                    <>
                        <div className="sidebar-cart-items-list">
                            {cart.map(item => (
                                <div className="sidebar-cart-item" key={item.id}>
                                    <div className="sidebar-cart-item-info">
                                        <h3>{item.name}</h3>
                                        <p>{getCurrencySymbol(settings?.currency)}{getDisplayPrice(item.price, settings?.currency).toFixed(2)}</p>
                                    </div>
                                    <div className="sidebar-cart-item-controls">
                                        <button onClick={() => handleQuantityChange(item, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleQuantityChange(item, 1)}>+</button>
                                        <button className="remove-btn" onClick={() => removeFromCart(item)}>Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="sidebar-cart-summary">
                            <div className="summary-line">
                                <span>Subtotal</span>
                                <span>{getCurrencySymbol(settings?.currency)}{totalCartAmount.toFixed(2)}</span>
                            </div>
                            <div className="summary-line total">
                                <span>Total</span>
                                <span>{getCurrencySymbol(settings?.currency)}{totalCartAmount.toFixed(2)}</span>
                            </div>
                            <button className="mc-button primary checkout-btn" onClick={() => {
                                setIsCartSidebarOpen(false);
                                navigate('/checkout');
                            }}>
                                Proceed to Checkout
                            </button>
                        </div>
                    </>
                )}
            </div>

            <nav className="category-nav">
                {Object.keys(categorizedProducts).length > 0 ? (
                    Object.keys(categorizedProducts).map(category => (
                        <button
                            key={category}
                            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(category)}
                        >
                            {category}
                        </button>
                    ))
                ) : (
                    <p>No categories found.</p>
                )}
            </nav>
            <div className="products-grid">
                {selectedCategory && categorizedProducts[selectedCategory]?.length > 0 ? (
                    categorizedProducts[selectedCategory].map(product => (
                        <div className="product-card" key={product.id}>
                            <div className="product-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            </div>
                            <h3 className="product-name">{product.name}</h3>
                            <p className="product-description">{product.description}</p>
                            <p className="product-price">{getCurrencySymbol(settings?.currency)}{getDisplayPrice(product.price, settings?.currency).toFixed(2)}</p>
                            {product.stock === null || product.stock > 0 ? (
                                <button className="mc-button purchase-button" onClick={() => addToCart(product)}>Add to Cart</button>
                            ) : (
                                <button className="mc-button purchase-button" disabled style={{ backgroundColor: '#c0392b', cursor: 'not-allowed' }}>Out of Stock</button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="empty-category-container">
                        {Object.keys(categorizedProducts).length === 0
                            ? "The store is currently empty. Admins can add categories and products in the dashboard."
                            : "There are no products in this category yet."
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProductList;
