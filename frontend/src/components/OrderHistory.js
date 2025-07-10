import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/OrderHistory.css';

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeOrderId, setActiveOrderId] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError("You must be logged in to view your order history.");
                    setLoading(false);
                    return;
                }
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get('http://localhost:5000/api/v1/orders/my-orders', config);

                if (data.success) {
                    // Filter to show ONLY 'completed' orders
                    const completedOrders = data.orders
                        .filter(order => order.status === 'completed') // Changed filter condition
                        .map(order => ({
                            ...order,
                            // Ensure totalAmount is a number
                            totalAmount: Number(order.totalAmount),
                            products: order.products.map(item => ({
                                ...item,
                                // Ensure item.price is a number
                                price: Number(item.price)
                            }))
                        }));
                    setOrders(completedOrders);
                } else {
                    setError('Failed to load order history.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching your orders.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const toggleOrderDetails = (orderId) => {
        setActiveOrderId(activeOrderId === orderId ? null : orderId);
    };


    if (loading) return <div className="loading-container">Loading Order History...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="order-history-container">
            <h2>Your Order History</h2>
            {orders.length === 0 ? (
                <p>You haven't placed any completed orders yet.</p>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order.id} className="order-item">
                            <div className={`order-header ${activeOrderId === order.id ? 'active' : ''}`} onClick={() => toggleOrderDetails(order.id)}>
                                <h3>Order ID: {order.id}</h3>
                                <span className={`order-status status-${order.status}`}>{order.status}</span>
                            </div>
                            {activeOrderId === order.id && (
                                <div className="order-details-content">
                                    <div className="order-info">
                                        {/* Ensure createdAt is a Date object before calling toLocaleDateString */}
                                        <p><strong>Date:</strong> {order.createdAt && typeof order.createdAt.toDate === 'function' ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                        <p><strong>Total:</strong> ${order.totalAmount.toFixed(2)}</p>
                                    </div>
                                    <div className="order-products">
                                        <h4>Items:</h4>
                                        <ul>
                                            {order.products.map(item => (
                                                <li key={item.productId}>{item.name} - {item.quantity} x ${item.price.toFixed(2)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default OrderHistory;
