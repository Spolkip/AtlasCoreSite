// frontend/src/components/ProductList.js

import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloseIcon from '@mui/icons-material/Close';
import '../css/ProductList.css';

function ProductList({ isAdmin, cart, setCart, settings, exchangeRates }) {
    const [categorizedProducts, setCategorizedProducts] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('');
    // Removed the 'loading' state to prevent explicit loading messages
    const [error, setError] = useState(null);
    const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

    // New filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [showInStockOnly, setShowInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState(''); // e.g., 'priceAsc', 'priceDesc', 'nameAsc', 'nameDesc'

    const navigate = useNavigate();
    const debounceTimeoutRef = useRef(null); // Ref for debounce timeout

    // Helper function to get currency symbol
    const getCurrencySymbol = (currencyCode) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£' };
        return symbols[currencyCode] || '$';
    };
    
    // Helper function to get display price based on currency and discount
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

    // Calculate cart item count and total amount
    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const totalCartAmount = cart.reduce((total, item) => {
        const displayPrice = getDisplayPrice(item.price, item.discountPrice, settings?.currency);
        return total + displayPrice * item.quantity;
    }, 0);

    // Add product to cart logic
    const addToCart = (product) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                if (product.stock !== null && existingProduct.quantity + 1 > product.stock) {
                    // Display a user-friendly message if stock limit is reached
                    alert(`Cannot add more "${product.name}". Only ${product.stock} left in stock.`);
                    return prevCart;
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                if (product.stock !== null && 1 > product.stock) {
                     // Display a user-friendly message if product is out of stock
                     alert(`Cannot add "${product.name}". Only ${product.stock} left in stock.`);
                     return prevCart;
                }
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        setIsCartSidebarOpen(true); // Open cart sidebar when item is added
    };

    // Handle quantity change in cart
    const handleQuantityChange = (product, delta) => {
        setCart(prevCart => {
            const existingProduct = prevCart.find(item => item.id === product.id);
            if (existingProduct) {
                const newQuantity = existingProduct.quantity + delta;
                
                if (product.stock !== null && newQuantity > product.stock) {
                    // Prevent adding more than available stock
                    alert(`Cannot add more "${product.name}". Only ${product.stock} left in stock.`);
                    return prevCart;
                }

                if (newQuantity <= 0) {
                    // Remove item from cart if quantity is 0 or less
                    return prevCart.filter(item => item.id !== product.id);
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: newQuantity } : item
                );
            }
            return prevCart;
        });
    };

    // Remove product from cart
    const removeFromCart = (product) => {
        setCart(prevCart => prevCart.filter(item => item.id !== product.id));
    };

    // Handle category button click
    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    // Fetch products and categories from the backend
    const fetchData = useCallback(async () => {
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Build query parameters for filtering and sorting
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('searchTerm', searchTerm);
            if (minPrice) queryParams.append('minPrice', minPrice);
            if (maxPrice) queryParams.append('maxPrice', maxPrice);
            if (showInStockOnly) queryParams.append('inStockOnly', 'true');
            if (sortBy) queryParams.append('sortBy', sortBy);

            const productsResponse = await axios.get(
                `http://localhost:5000/api/v1/products?${queryParams.toString()}`,
                config
            );

            // Fetch categories separately as they are not affected by product filters
            const categoriesResponse = await axios.get('http://localhost:5000/api/v1/admin/categories', config);


            if (productsResponse.data && productsResponse.data.success) {
                const fetchedProducts = productsResponse.data.products;
                // If a category is selected, filter products client-side based on that category
                const filteredProductsByCategory = {};
                for (const categoryName in fetchedProducts) {
                    if (selectedCategory === '' || categoryName === selectedCategory) {
                        filteredProductsByCategory[categoryName] = fetchedProducts[categoryName];
                    }
                }
                setCategorizedProducts(filteredProductsByCategory);

                // If no category is selected initially, or if the previously selected category
                // is no longer present after filtering, default to the first available category.
                if (selectedCategory === '' || !(selectedCategory in fetchedProducts)) {
                    const firstCategory = Object.keys(fetchedProducts)[0];
                    if (firstCategory) {
                        setSelectedCategory(firstCategory);
                    } else {
                        setSelectedCategory(''); // No products, no selected category
                    }
                }
            } else {
                throw new Error(productsResponse.data.message || 'API did not return products.');
            }

            // Set categories for the navigation buttons
            if (categoriesResponse.data && categoriesResponse.data.success) {
                // We only need the category names and IDs for the buttons
                // The actual product grouping is done by the backend with filters applied.
                // This ensures all categories are shown in the nav, even if they have no products
                // matching the current filters.
                const allCategoryNames = categoriesResponse.data.categories.map(cat => cat.name);
                // Reconstruct categorizedProducts based on fetched products and all category names
                const finalCategorizedProducts = {};
                allCategoryNames.forEach(catName => {
                    finalCategorizedProducts[catName] = productsResponse.data.products[catName] || [];
                });
                setCategorizedProducts(finalCategorizedProducts);

                // Ensure a category is selected if products exist
                if (Object.keys(finalCategorizedProducts).length > 0 && !selectedCategory) {
                    setSelectedCategory(Object.keys(finalCategorizedProducts)[0]);
                } else if (Object.keys(finalCategorizedProducts).length > 0 && !finalCategorizedProducts[selectedCategory]) {
                    // If current selected category has no products after filter, switch to first available
                    setSelectedCategory(Object.keys(finalCategorizedProducts)[0]);
                } else if (Object.keys(finalCategorizedProducts).length === 0) {
                    setSelectedCategory(''); // No products at all
                }
            }


        } catch (err) {
            console.error('Error fetching data:', err.response ? err.response.data : err.message);
            setError('Failed to load products from the store. Please try again later.');
        } finally {
            // Removed setLoading(false) here
        }
    }, [searchTerm, minPrice, maxPrice, showInStockOnly, sortBy, selectedCategory, settings?.currency, exchangeRates]); // Add all filter states to dependencies

    // Debounce searchTerm updates to reduce API calls
    const handleSearchTermChange = useCallback((value) => {
        setSearchTerm(value);
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            fetchData();
        }, 500); // 500ms debounce delay
    }, [fetchData]);


    useEffect(() => {
        fetchData();
        // Clear debounce timeout on component unmount
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [fetchData]);

    // Handle resetting all filters
    const handleResetFilters = () => {
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setShowInStockOnly(false);
        setSortBy('');
        setSelectedCategory(''); // Reset selected category as well
    };

    // Render product price with or without discount
    const renderPrice = (product) => {
        const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
        const symbol = getCurrencySymbol(settings?.currency);
        
        const originalDisplayPrice = getDisplayPrice(product.price, null, settings?.currency);
        const discountDisplayPrice = hasDiscount ? getDisplayPrice(product.price, product.discountPrice, settings?.currency) : null;

        if (hasDiscount) {
            return (
                <p className="product-price">
                    <span style={{ textDecoration: 'line-through', color: '#c0392b', marginRight: '10px' }}>
                        {symbol}{originalDisplayPrice.toFixed(2)}
                    </span>
                    {symbol}{discountDisplayPrice.toFixed(2)}
                </p>
            );
        } else {
            return <p className="product-price">{symbol}{originalDisplayPrice.toFixed(2)}</p>;
        }
    };


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
                                        <p>{getCurrencySymbol(settings?.currency)}{getDisplayPrice(item.price, item.discountPrice, settings?.currency).toFixed(2)}</p>
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

            {/* New Filters Section */}
            <div className="filters-section">
                <div className="filter-group">
                    <label htmlFor="search-term">Search Product:</label>
                    <input
                        type="text"
                        id="search-term"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)} // Use debounced handler
                        className="filter-input"
                    />
                </div>

                <div className="filter-group price-range-group">
                    <label>Price Range:</label>
                    <input
                        type="number"
                        id="min-price"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="filter-input price-input"
                    />
                    <span>-</span>
                    <input
                        type="number"
                        id="max-price"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="filter-input price-input"
                    />
                </div>

                <div className="filter-group checkbox-group">
                    <input
                        type="checkbox"
                        id="in-stock-only"
                        checked={showInStockOnly}
                        onChange={(e) => setShowInStockOnly(e.target.checked)}
                    />
                    <label htmlFor="in-stock-only">In Stock Only</label>
                </div>

                <div className="filter-group">
                    <label htmlFor="sort-by">Sort By:</label>
                    <select
                        id="sort-by"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Default</option>
                        <option value="priceAsc">Price: Low to High</option>
                        <option value="priceDesc">Price: High to Low</option>
                        <option value="nameAsc">Name: A-Z</option>
                        <option value="nameDesc">Name: Z-A</option>
                    </select>
                </div>

                <button onClick={handleResetFilters} className="mc-button small reset-filters-btn">
                    Reset Filters
                </button>
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
                            {renderPrice(product)}
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