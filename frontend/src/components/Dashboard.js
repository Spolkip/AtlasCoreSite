// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';
import '../css/CharacterProfile.css'; // Re-use styles for the activity feed & account info

const Dashboard = ({ user, fetchUserProfile }) => {
    const [activityFeed, setActivityFeed] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(true); // Overall dashboard loading
    const [activityFeedLoading, setActivityFeedLoading] = useState(false); // Specific for activity feed
    const [error, setError] = useState('');
    const [generateCodeMessage, setGenerateCodeMessage] = useState(''); // State for code generation messages

    // useCallback to memoize the data fetching function
    const fetchDashboardData = useCallback(async () => {
        if (!user) {
            setDashboardLoading(false);
            return;
        }

        setActivityFeedLoading(true); // Set loading for activity feed
        setError('');
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // Fetch the user's own profile data, which now includes creatorCode and points
            const response = await axios.get('http://localhost:5000/api/v1/profile', config);
            if (response.data.success) {
                setActivityFeed(response.data.data.activityFeed);
            } else {
                setError(response.data.message || 'Failed to fetch dashboard data.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while fetching dashboard data.');
        } finally {
            setActivityFeedLoading(false); // Unset loading for activity feed
            setDashboardLoading(false); // Unset overall loading after initial fetch
        }
    }, [user]); // Depend on user to re-fetch if user object changes

    useEffect(() => {
        // Initial fetch when the component mounts or user changes
        fetchDashboardData();

        // Optional: Set up a periodic refresh for activity feed if desired
        // const interval = setInterval(fetchDashboardData, 60000); // Refresh every 60 seconds
        // return () => clearInterval(interval); // Cleanup interval on unmount
    }, [fetchDashboardData]); // Depend on memoized fetchDashboardData

    // Helper to check if creatorCode has a valid non-empty string value
    const hasCreatorCode = user.creatorCode && user.creatorCode.trim() !== '';

    // ADDED: Handler for generating creator code
    const handleGenerateCreatorCode = async () => {
        setGenerateCodeMessage(''); // Clear previous messages
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:5000/api/v1/auth/generate-creator-code', {}, config);
            
            if (response.data.success) {
                setGenerateCodeMessage(response.data.message);
                // Immediately refresh user profile in App.js to update dashboard
                fetchUserProfile(); 
            } else {
                setError(response.data.message || 'Failed to generate creator code.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while generating code.');
        }
    };


    if (dashboardLoading) {
        return <div className="loading-container">Loading Dashboard...</div>;
    }

    if (!user) {
        return <div className="loading-container">Please log in to view your dashboard.</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>
            {error && <div className="auth-error-message" style={{marginBottom: '20px'}}>{error}</div>}
            {generateCodeMessage && <div className="auth-success-message" style={{marginBottom: '20px'}}>{generateCodeMessage}</div>}
            
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
                                    <span>Manage Promo Codes</span>
                                </Link>
                                {/* ADDED: Link to manage Creator Codes */}
                                <Link to="/admin/creatorcodes" className="dashboard-button">
                                    <i className="fas fa-users icon"></i> {/* Using a 'users' icon for affiliates */}
                                    <span>Manage Creator Codes</span>
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
                        {/* UPDATED: Use hasCreatorCode helper for conditional rendering */}
                        {hasCreatorCode && (
                            <div className="info-item">
                                <span className="info-label">Your Creator Code:</span>
                                <span className="info-value">{user.creatorCode}</span>
                            </div>
                        )}
                        {/* Display Points if available */}
                        {user.points !== undefined && ( // Check for undefined to allow 0 to be displayed
                            <div className="info-item">
                                <span className="info-label">Affiliate Points:</span>
                                <span className="info-value">{user.points}</span>
                            </div>
                        )}
                        {/* ADDED: Generate Creator Code button */}
                        {!hasCreatorCode && (
                            <button onClick={handleGenerateCreatorCode} className="mc-button primary" style={{marginTop: '1rem', justifyContent: 'center'}}>
                                Generate Creator Code
                            </button>
                        )}
                        <Link to="/settings" className="dashboard-button small" style={{marginTop: '1rem', justifyContent: 'center'}}>
                            <i className="fas fa-cog icon" style={{fontSize: '1.5rem', margin: '0'}}></i>
                            <span>Account Settings</span>
                        </Link>
                    </div>

                    <div className="recent-activity-section">
                        <h3>Recent Transactions</h3>
                        {activityFeedLoading ? ( // Use activityFeedLoading here
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
