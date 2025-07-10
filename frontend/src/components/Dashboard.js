// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';

const Dashboard = ({ user }) => {
    const [stats, setStats] = useState({
        orders: 0,
        totalSpent: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // Added for success messages

    useEffect(() => {
        const fetchDashboardData = async () => {
            // FIX: Check if the user object is available before making an API call
            if (!user) {
                setError("You must be logged in to view the dashboard.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(''); // Clear previous errors
            setSuccessMessage(''); // Clear previous success messages

            try {
                const token = localStorage.getItem('token');
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                };

                const { data } = await axios.get('http://localhost:5000/api/v1/orders/my-orders', config);

                if (data.success) {
                    // Filter orders to include only 'completed' ones for totalSpent calculation
                    const completedOrders = data.orders.filter(order => order.status === 'completed');
                    const totalSpent = completedOrders.reduce((acc, order) => acc + order.totalAmount, 0);
                    setStats({
                        orders: completedOrders.length, // Count only completed orders
                        totalSpent: totalSpent,
                    });
                } else {
                    setError('Failed to load dashboard data.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleUnlinkMinecraft = async () => {
        setError('');
        setSuccessMessage('');
        if (!window.confirm('Are you sure you want to unlink your Minecraft account?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const response = await axios.put('http://localhost:5000/api/v1/auth/unlink-minecraft', {}, config);

            if (response.data.success) {
                setSuccessMessage(response.data.message);
                // Update the user data in local storage and App component state
                const updatedUser = { ...user, minecraft_uuid: '', is_verified: false };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                window.location.reload(); // Temporary solution to force UI update
            } else {
                setError(response.data.message || 'Failed to unlink Minecraft account.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while unlinking your Minecraft account.');
        }
    };


    if (loading) {
        return <div className="loading-container">Loading Dashboard...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    // FIX: Add a check for the user object before rendering the component
    if (!user) {
        return (
            <div className="dashboard-container">
                <h1>Dashboard</h1>
                <div className="profile-section">
                    <h2>Please log in to continue.</h2>
                    <div className="action-buttons">
                        <Link to="/login" className="dashboard-button">Login</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard-container">
            <h1>Your Dashboard</h1>

            {successMessage && <div className="auth-success-message" style={{marginBottom: '20px'}}>{successMessage}</div>}
            {error && <div className="auth-error-message" style={{marginBottom: '20px'}}>{error}</div>}

            <div className="profile-section">
                <h2>Profile</h2>
                <div className="profile-details">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Minecraft UUID:</strong> {user.minecraft_uuid || 'Not Linked'}</p>
                </div>
                <div className="action-buttons">
                    <Link to="/settings" className="dashboard-button">Settings</Link>
                    {/* Conditionally render Link/Unlink button */}
                    {user.minecraft_uuid && user.isVerified ? (
                        <button onClick={handleUnlinkMinecraft} className="dashboard-button danger">Unlink Minecraft</button>
                    ) : (
                        <Link to="/link-minecraft" className="dashboard-button">Link Minecraft</Link>
                    )}
                </div>
            </div>

            {/* Combined Section for In-Game Level, Skill Level, Class, and Race */}
            <div className="profile-section">
                <h2>In-Game Stats</h2>
                <div className="profile-details">
                    <p><strong>Level:</strong> 50</p> {/* Placeholder */}
                    <p><strong>Skill:</strong> Master Explorer</p> {/* Placeholder */}
                    <p><strong>Class:</strong> Warrior</p> {/* Placeholder */}
                    <p><strong>Race:</strong> Human</p> {/* Placeholder */}
                </div>
            </div>

            <div className="statistics-section">
                <h2>Your Stats</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Orders Placed</h3>
                        <p>{stats.orders}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Spent</h3>
                        <p>${stats.totalSpent.toFixed(2)}</p>
                    </div>
                </div>
            </div>
            {user.isAdmin && (
                 <div className="quick-actions">
                    <h2>Admin Actions</h2>
                    {/* FIX: Corrected the link to the Admin Dashboard */}
                    <Link to="/admin-dashboard" className="dashboard-button">Admin Dashboard</Link>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
