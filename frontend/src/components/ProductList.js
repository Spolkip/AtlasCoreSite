// frontend/src/components/ProductList.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import axios from 'axios';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Import Material-UI icon
import CloseIcon from '@mui/icons-material/Close'; // Import Close icon
import '../css/ProductList.css'; // Contains styles for the store and now the cart sidebar

function ProductList({ isAdmin, cart, setCart, settings }) {
    const [categorizedProducts, setCategorizedProducts] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false); // New state for sidebar
    const navigate = useNavigate(); // Initialize navigate

    const getCurrencySymbol = (currencyCode) => {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
        };
        return symbols[currencyCode] || '$';
    };

    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const totalCartAmount = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0); // Ensure item.price is a number

    const addToCart = (product) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        setIsCartSidebarOpen(true); // Open sidebar when item is added
    };

    const handleQuantityChange = (product, delta) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                const newQuantity = existingProduct.quantity + delta;
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
            const productsResponse = await axios.get('http://localhost:5000/api/v1/products');

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

            {/* Cart Icon */}
            <div className="cart-icon-container" onClick={() => setIsCartSidebarOpen(true)}>
                <ShoppingCartIcon className="cart-icon" />
                {cartItemCount > 0 && <span className="cart-count-badge">{cartItemCount}</span>}
            </div>

            {/* Cart Sidebar Overlay */}
            {isCartSidebarOpen && (
                <div className="cart-sidebar-overlay" onClick={() => setIsCartSidebarOpen(false)}></div>
            )}

            {/* Cart Sidebar */}
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
                                        <p>{getCurrencySymbol(settings?.currency)}{Number(item.price).toFixed(2)}</p> {/* Ensure price is number */}
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
                                setIsCartSidebarOpen(false); // Close sidebar before navigating
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
                                <span>🛒</span>
                            </div>
                            <h3 className="product-name">{product.name}</h3>
                            <p className="product-description">{product.description}</p>
                            <p className="product-price">{getCurrencySymbol(settings?.currency)}{Number(product.price).toFixed(2)}</p>
                            <button className="mc-button purchase-button" onClick={() => addToCart(product)}>Add to Cart</button>
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