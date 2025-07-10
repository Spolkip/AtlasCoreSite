// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts'; // Import Recharts components

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
    });
    const [orderStatusData, setOrderStatusData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dummy data for graphs (replace with actual API calls later)
    const dailyActivityData = [
        { name: 'Day 1', 'Active Users': 400, 'New Registrations': 50 },
        { name: 'Day 2', 'Active Users': 300, 'New Registrations': 30 },
        { name: 'Day 3', 'Active Users': 500, 'New Registrations': 70 },
        { name: 'Day 4', 'Active Users': 450, 'New Registrations': 60 },
        { name: 'Day 5', 'Active Users': 600, 'New Registrations': 80 },
        { name: 'Day 6', 'Active Users': 550, 'New Registrations': 75 },
        { name: 'Day 7', 'Active Users': 700, 'New Registrations': 90 },
    ];


    useEffect(() => {
        const fetchAdminDashboardData = async () => {
            if (!user || !user.isAdmin) {
                setError("You must be an admin to view this page.");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                };

                const { data } = await axios.get('http://localhost:5000/api/v1/admin/dashboard', config);

                if (data.success) {
                    setStats(data.data);
                    if (data.data.orderStatusCounts) {
                        const formattedData = Object.entries(data.data.orderStatusCounts).map(([name, value]) => ({ name, value }));
                        setOrderStatusData(formattedData);
                    }
                } else {
                    setError('Failed to load admin dashboard data.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching admin dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminDashboardData();
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

            {/* Minecraft Server Info - Removed Server IP */}
            <div className="statistics-section">
                <h2>Minecraft Server Info</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Online Players</h3>
                        <p>150 / 200</p> {/* Placeholder */}
                    </div>
                    <div className="stat-card">
                        <h3>Server Status</h3>
                        <p className="online">Online</p> {/* Placeholder */}
                    </div>
                </div>
            </div>

            {/* Activity Trends Graph */}
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
                        <Line type="monotone" dataKey="Active Users" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="New Registrations" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Order Status Distribution Graph */}
            <div className="statistics-section">
                <h2>Order Status Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={orderStatusData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip contentStyle={{ backgroundColor: '#3a3a3a', border: '1px solid #FFAA00' }} itemStyle={{ color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#fff', paddingTop: '10px' }} />
                        <Bar dataKey="value" fill="#FFAA00" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="quick-actions">
                <h2>Management</h2>
                <div className="action-buttons">
                    <Link to="/admin" className="dashboard-button">Manage Products & Categories</Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;