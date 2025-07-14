// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';
import '../css/CharacterProfile.css'; // Re-use styles for the activity feed & account info

const Dashboard = ({ user }) => {
    const [activityFeed, setActivityFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

      useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // FIX: Corrected the endpoint from /api/v1/users/dashboard to /api/v1/profile
                const response = await axios.get('http://localhost:5000/api/v1/profile', config);
                if (response.data.success) {
                    setActivityFeed(response.data.data.activityFeed);
                } else {
                    setError(response.data.message || 'Failed to fetch dashboard data.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (!user) {
        return <div className="loading-container">Please log in to view your dashboard.</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>
            {error && <div className="auth-error-message" style={{marginBottom: '20px'}}>{error}</div>}
            
            <div className="profile-section">
                <h2>Welcome, {user.username}!</h2>
                <div className="action-buttons">
                    <Link to={`/profile/${user.username}`} className="dashboard-button">View Character Profile</Link>
                    <Link to="/profile/search" className="dashboard-button">Search Profiles</Link>
                    <Link to="/order-history" className="dashboard-button">Order History</Link>
                    <Link to="/settings" className="dashboard-button">Account Settings</Link>
                </div>
            </div>

            {/* Account Information is now displayed on the Dashboard */}
            <div className="account-info-section">
                <h3>Account Information</h3>
                <div className="account-info-grid">
                    <div className="info-item">
                        <span className="info-label">Username:</span>
                        <span className="info-value">{user.username}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{user.email}</span>
                    </div>
                    {user.minecraft_uuid && (
                        <div className="info-item full-width">
                            <span className="info-label">Minecraft UUID:</span>
                            <span className="info-value">{user.minecraft_uuid}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="recent-activity-section">
                <h3>Recent Transactions</h3>
                {loading ? (
                    <p>Loading activity...</p>
                ) : activityFeed.length > 0 ? (
                    <ul className="activity-list">
                        {activityFeed.map(item => (
                            <li key={item.id} className="activity-item">
                                <div className="activity-icon purchase">🛒</div>
                                <div className="activity-details">
                                    <span className="activity-description">{item.description}</span>
                                    <span className="activity-timestamp">{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="activity-value">${item.value.toFixed(2)}</div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No recent purchases to display.</p>
                )}
            </div>

            {user.isAdmin && (
                 <div className="quick-actions">
                    <h2>Admin Actions</h2>
                    <div className="action-buttons">
                        <Link to="/admin-dashboard" className="dashboard-button">Admin Dashboard</Link>
                        <Link to="/admin" className="dashboard-button">Manage Store</Link>
                        <Link to="/admin/wiki" className="dashboard-button">Manage Wiki</Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;