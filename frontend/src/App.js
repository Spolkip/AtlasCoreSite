// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// Import Components
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ProductList from './components/ProductList';
import Login from './components/Login';
import Register from './components/Register';
import AddProducts from './components/AddProducts';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import OrderHistory from './components/OrderHistory';
import ForgotPassword from './components/ForgotPassword';
import LinkMinecraft from './components/LinkMinecraft';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

import './css/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGlobalSettings = async () => {
      try {
          const { data } = await axios.get('http://localhost:5000/api/v1/settings');
          if (data) {
              setSettings(data);
          }
      } catch (error) {
          console.error("Could not fetch global settings", error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setIsAdmin(parsedUser.isAdmin === 1 || parsedUser.isAdmin === true);
      } catch (e) {
        // Handle potential JSON parsing errors
        handleLogout();
      }
    }
    
    fetchGlobalSettings();
  }, []);

  const handleLogin = (userData = {}) => {
    const { user: loggedInUser, token } = userData;
    if (loggedInUser && token) {
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setIsAdmin(loggedInUser.isAdmin === 1 || loggedInUser.isAdmin === true);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCart([]);
  };

  // ---- START OF FIX: Function to update user state from child components ----
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };
  // ---- END OF FIX ----

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
  };

  if (loading) {
      return <div className="loading-container">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <NavBar user={user} isAuthenticated={isAuthenticated} isAdmin={isAdmin} logout={handleLogout} />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            <Route 
              path="/shop" 
              element={<ProductList 
                user={user} 
                cart={cart} 
                setCart={setCart} 
                settings={settings} 
                isAdmin={isAdmin} 
              />} 
            />
            
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/register" element={<Register onLoginSuccess={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {isAuthenticated && (
              <>
                {/* ---- START OF FIX: Pass the onUserUpdate function to Dashboard ---- */}
                <Route path="/dashboard" element={<Dashboard user={user} onUserUpdate={handleUserUpdate} />} />
                {/* ---- END OF FIX ---- */}
                <Route path="/settings" element={<Settings user={user} onSettingsUpdate={updateSettings} />} />
                <Route path="/checkout" element={<Checkout cart={cart} user={user} settings={settings} />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
                <Route path="/order-history" element={<OrderHistory user={user} />} />
                <Route path="/link-minecraft" element={<LinkMinecraft user={user} onLoginSuccess={handleLogin} />} />
              </>
            )}

            {isAdmin && (
              <>
                <Route path="/admin" element={<AddProducts />} />
                <Route path="/admin-dashboard" element={<AdminDashboard user={user} />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
