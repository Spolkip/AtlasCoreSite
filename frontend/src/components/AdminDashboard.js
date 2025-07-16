// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
    });
    const [serverStats, setServerStats] = useState({
        onlinePlayers: 0,
        maxPlayers: 200,
        serverStatus: 'offline',
        newPlayersToday: 0
    });
    const [orderStatusData, setOrderStatusData] = useState([]);
    const [dailyActivityData, setDailyActivityData] = useState([]);
    const [newPlayerTrendData, setNewPlayerTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAdminData = async () => {
            if (!user || !user.isAdmin) {
                setError("You must be an admin to view this page.");
                setLoading(false);
                return;
            }

            setLoading(true);
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                const dashboardPromise = axios.get('http://localhost:5000/api/v1/admin/dashboard', config);
                const trendsPromise = axios.get('http://localhost:5000/api/v1/admin/trends/registrations', config);
                const serverStatsPromise = axios.get('http://localhost:5000/api/v1/server/stats', config);
                const newPlayerTrendsPromise = axios.get('http://localhost:5000/api/v1/admin/trends/new-players', config);


                const [dashboardResponse, trendsResponse, serverStatsResponse, newPlayerTrendsResponse] = await Promise.all([
                    dashboardPromise,
                    trendsPromise,
                    serverStatsPromise,
                    newPlayerTrendsPromise
                ]);

                // Dashboard Data
                if (dashboardResponse.data.success) {
                    setStats(dashboardResponse.data.data);
                    if (dashboardResponse.data.data.orderStatusCounts) {
                        const formattedData = Object.entries(dashboardResponse.data.data.orderStatusCounts).map(([name, value]) => ({ name, value }));
                        setOrderStatusData(formattedData);
                    }
                } else {
                    setError('Failed to load admin dashboard data.');
                }

                // Trends Data
                if (trendsResponse.data.success) {
                    setDailyActivityData(trendsResponse.data.data);
                }

                // Server Stats
                if (serverStatsResponse.data.success) {
                    setServerStats(serverStatsResponse.data.data);
                }
                
                // New Player Trends Data
                if (newPlayerTrendsResponse.data.success) {
                    setNewPlayerTrendData(newPlayerTrendsResponse.data.data);
                }

            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching admin dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [user]);

    if (loading) {
        return <div className="loading-container">Loading Admin Dashboard...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    if (!user || !user.isAdmin) {
        return (
            <div className="dashboard-container">
                <h1>Admin Dashboard</h1>
                <div className="profile-section">
                    <h2>You are not authorized to view this page.</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <h1>Admin Dashboard</h1>

            <div className="statistics-section">
                <h2>Overview</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Total Users</h3>
                        <p>{stats.totalUsers}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Products</h3>
                        <p>{stats.totalProducts}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Orders</h3>
                        <p>{stats.totalOrders}</p>
                    </div>
                </div>
            </div>

            <div className="statistics-section">
                <h2>Minecraft Server Info</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Online Players</h3>
                        <p>{serverStats.onlinePlayers} / {serverStats.maxPlayers}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Server Status</h3>
                        <p className={serverStats.serverStatus === 'online' ? 'online' : 'offline'}>{serverStats.serverStatus}</p>
                    </div>
                    <div className="stat-card">
                        <h3>New Players Today</h3>
                        <p>{serverStats.newPlayersToday || 0}</p>
                    </div>
                </div>
            </div>

            <div className="statistics-section">
                <h2>Daily Activity Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                        data={dailyActivityData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip contentStyle={{ backgroundColor: '#3a3a3a', border: '1px solid #FFAA00' }} itemStyle={{ color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#fff', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="New Registrations" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="statistics-section">
                <h2>New Player Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                        data={newPlayerTrendData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip contentStyle={{ backgroundColor: '#3a3a3a', border: '1px solid #FFAA00' }} itemStyle={{ color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#fff', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="New Players" stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="quick-actions">
                <h2>Management</h2>
                <div className="action-buttons">
                    <Link to="/admin" className="dashboard-button">Manage Products & Categories</Link>
                    <Link to="/admin/promocodes" className="dashboard-button">Manage Promo Codes</Link>
                    <Link to="/admin/vlog" className="dashboard-button">Manage Vlog</Link>
                    <Link to="/admin/wiki" className="dashboard-button">Manage Wiki</Link>
                    <Link to="/admin/events" className="dashboard-button">Manage Events</Link> {/* New link for Admin Events */}
                    <Link to="/admin/chat" className="dashboard-button">Live Chat</Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
