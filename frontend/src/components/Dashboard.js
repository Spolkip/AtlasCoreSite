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
            
            <div className="dashboard-grid">
                <div className="dashboard-main-content">
                    <div className="profile-section">
                        <h2>Welcome, {user.username}!</h2>
                        <p>This is your central hub for managing your account, viewing your character's progress, and accessing all of AtlasCore's features.</p>
                    </div>

                    <div className="quick-actions">
                        <h2>Quick Actions</h2>
                        <div className="action-buttons-grid">
                            <Link to={`/profile/${user.username}`} className="dashboard-button">
                                <i className="fas fa-user icon"></i>
                                <span>View Profile</span>
                            </Link>
                            <Link to="/search-profiles" className="dashboard-button">
                                <i className="fas fa-search icon"></i>
                                <span>Search Profiles</span>
                            </Link>
                            <Link to="/order-history" className="dashboard-button">
                                <i className="fas fa-history icon"></i>
                                <span>Order History</span>
                            </Link>
                            <Link to="/redeem" className="dashboard-button">
                                <i className="fas fa-gift icon"></i>
                                <span>Redeem a Code</span>
                            </Link>
                        </div>
                    </div>

                    {user.isAdmin && (
                        <div className="quick-actions">
                            <h2>Admin Actions</h2>
                            <div className="action-buttons-grid">
                                <Link to="/admin-dashboard" className="dashboard-button">
                                    <i className="fas fa-tachometer-alt icon"></i>
                                    <span>Admin Dashboard</span>
                                </Link>
                                <Link to="/admin" className="dashboard-button">
                                    <i className="fas fa-store icon"></i>
                                    <span>Manage Store</span>
                                </Link>
                                <Link to="/admin/promocodes" className="dashboard-button">
                                    <i className="fas fa-tags icon"></i>
                                    <span>Manage Codes</span>
                                </Link>
                                <Link to="/admin/vlog" className="dashboard-button">
                                    <i className="fas fa-blog icon"></i>
                                    <span>Manage Vlog</span>
                                </Link>
                                <Link to="/admin/wiki" className="dashboard-button">
                                    <i className="fas fa-book icon"></i>
                                    <span>Manage Wiki</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-sidebar">
                    <div className="account-info-section">
                        <h3>Account Information</h3>
                        <div className="info-item">
                            <span className="info-label">Username:</span>
                            <span className="info-value">{user.username}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Email:</span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        {user.minecraft_uuid && (
                            <div className="info-item">
                                <span className="info-label">Minecraft UUID:</span>
                                <span className="info-value">{user.minecraft_uuid}</span>
                            </div>
                        )}
                        <Link to="/settings" className="dashboard-button small" style={{marginTop: '1rem', justifyContent: 'center'}}>
                            <i className="fas fa-cog icon" style={{fontSize: '1.5rem', margin: '0'}}></i>
                            <span>Account Settings</span>
                        </Link>
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
                </div>
            </div>
        </div>
    );
};

export default Dashboard;