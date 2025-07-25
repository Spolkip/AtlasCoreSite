// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Import Components
import FloatingNavPanel from './components/FloatingNavPanel';

import LandingPage from './components/LandingPage';
import ProductList from './components/ProductList'; 
import AuthPage from './components/AuthPage'; 
import AddProducts from './components/AddProducts';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import OrderHistory from './components/OrderHistory';
import ForgotPassword from './components/ForgotPassword';
import LinkMinecraft from './components/LinkMinecraft';
import Dashboard from './components/Dashboard';
import CharacterProfile from './components/CharacterProfile';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import Wiki from './components/Wiki';
import AdminWiki from './components/AdminWiki';
import LiveChat from './components/LiveChat';
import AdminChat from './components/AdminChat';
import Leaderboard from './components/Leaderboard';
import RedeemCode from './components/RedeemCode';
import AdminVlog from './components/AdminVlog';
import Vlog from './components/Vlog';
import ProfileSearch from './components/ProfileSearch';
import AdminPromoCodes from './components/AdminPromoCodes';
import Events from './components/Events'; 
import AdminEvents from './components/AdminEvents';
import DynmapViewer from './components/DynmapViewer'; 

// Import main CSS for global styles and theme variables
import './css/App.css';
// Import new base CSS that defines global variables and animations
import './css/_base.css';

// Import component-specific CSS files
import './css/Leaderboard.css';
import './css/DynmapViewer.css'; 
import './css/AuthForms.css';
import './css/CharacterProfile.css';
import './css/Checkout.css';
import './css/Dashboard.css';
import './css/Events.css';
import './css/Footer.css';
import './css/LandingPage.css';
import './css/LinkMinecraft.css';
import './css/LiveChat.css';
import './css/OrderHistory.css';
import './css/PrivacyPolicy.css';
import './css/ProductList.css';
import './css/TermsOfService.css';
import './css/Vlog.css';
import './css/Wiki.css';
import './css/AdminChat.css';
import './css/AdminEvents.css';
import './css/AdminWiki.css';
import './css/AddProducts.css';

// Import FloatingNavPanel and its related CSS files directly here
import './css/_FloatingNavPanel.css';
import './css/_NavItem.css';
import './css/_MobileDrawerMenu.css';

// Client-side Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVJv5KBf7DiFxLPw7-DaR0sQNGZd5zko8",
  authDomain: "atlascoreweb.firebaseapp.com",
  projectId: "atlascoreweb",
  storageBucket: "atlascoreweb.appspot.com",
  messagingSenderId: "1017567515762",
  appId: "1:1017567515762:web:a16e81b3cf33287db3deeb",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// This new component contains all the main logic and allows us to use the `useNavigate` hook.
const AppContent = () => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [cart, setCart] = useState([]);
    const [settings, setSettings] = useState(null);
    const [exchangeRates, setExchangeRates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('dark');
    const navigate = useNavigate();

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    const handleLogout = useCallback(() => {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCart([]);
        navigate('/'); // Redirect to homepage after logout
    }, [navigate]);

    const fetchUserProfile = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            handleLogout();
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get('http://localhost:5000/api/v1/auth/me', config);
            if (response.data.success) {
                const fetchedUser = response.data.user;
                setUser(fetchedUser);
                setIsAuthenticated(true);
                setIsAdmin(fetchedUser.isAdmin === 1 || fetchedUser.isAdmin === true);
                localStorage.setItem('user', JSON.stringify(fetchedUser));
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
            handleLogout();
        }
    }, [handleLogout]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [settingsResponse, ratesResponse] = await Promise.all([
                    axios.get('http://localhost:5000/api/v1/settings'),
                    axios.get('https://open.er-api.com/v6/latest/USD')
                ]);
                if (settingsResponse.data) setSettings(settingsResponse.data);
                if (ratesResponse.data?.rates) setExchangeRates(ratesResponse.data.rates);
            } catch (error) {
                console.error("Could not fetch initial data:", error);
                setSettings(s => s || { store_name: 'AtlasCore', currency: 'USD' });
            } finally {
                setLoading(false);
            }
        };

        const loadUserFromStorage = () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                    setIsAdmin(parsedUser.isAdmin === 1 || parsedUser.isAdmin === true);
                    fetchUserProfile(); 
                } catch (e) {
                    handleLogout();
                }
            }
        };

        loadUserFromStorage();
        fetchInitialData();
    }, [handleLogout, fetchUserProfile]);

    const handleLogin = (userData = {}) => {
        const { user: loggedInUser, token } = userData;
        if (loggedInUser && token) {
            setUser(loggedInUser);
            setIsAuthenticated(true);
            setIsAdmin(loggedInUser.isAdmin === 1 || loggedInUser.isAdmin === true);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            fetchUserProfile();
        }
    };

    const handleUserUpdate = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser)); 
    };

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
    };

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className={`App ${theme}-theme`}>
            <FloatingNavPanel 
                user={user} 
                isAuthenticated={isAuthenticated} 
                isAdmin={isAdmin} 
                logout={handleLogout} 
                settings={settings}
                theme={theme}
                toggleTheme={toggleTheme}
            />
            
            <main className="content">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/shop" element={<ProductList user={user} cart={cart} setCart={setCart} settings={settings} isAdmin={isAdmin} exchangeRates={exchangeRates} />} />
                <Route path="/login" element={<AuthPage onLoginSuccess={handleLogin} />} />
                <Route path="/register" element={<AuthPage onLoginSuccess={handleLogin} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/wiki" element={<Wiki user={user} />}>
                  <Route path=":type/:id" element={<Wiki user={user} />} />
                </Route>
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/redeem" element={<RedeemCode />} />
                <Route path="/vlog" element={<Vlog user={user} />} />
                <Route path="/events" element={<Events user={user} />} />
                <Route path="/map" element={<DynmapViewer user={user} db={db} />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/about" element={<div style={{textAlign: 'center', marginTop: '50px', fontSize: '2em', color: 'var(--color-text)'}}><h2>About Us</h2><p>Information about the server will go here.</p></div>} />
                <Route path="/community/forums" element={<div style={{textAlign: 'center', marginTop: '50px', fontSize: '2em', color: 'var(--color-text)'}}><h2>Forums</h2><p>Our community forums will be hosted here.</p></div>} />

                {isAuthenticated && (
                  <>
                    <Route path="/dashboard" element={<Dashboard user={user} onUserUpdate={handleUserUpdate} fetchUserProfile={fetchUserProfile} />} />
                    <Route path="/profile/:username" element={<CharacterProfile user={user} onUserUpdate={handleUserUpdate} />} /> 
                    <Route path="/settings" element={<Settings user={user} onUserUpdate={handleUserUpdate} onSettingsUpdate={updateSettings} theme={theme} toggleTheme={toggleTheme} logout={handleLogout} />} />
                    <Route path="/checkout" element={<Checkout cart={cart} user={user} settings={settings} exchangeRates={exchangeRates} onUpdateCart={setCart} />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/cancel" element={<PaymentCancel />} />
                    <Route path="/order-history" element={<OrderHistory user={user} />} />
                    <Route path="/link-minecraft" element={<LinkMinecraft onLoginSuccess={handleLogin} />} />
                    <Route path="/search-profiles" element={<ProfileSearch />} />
                  </>
                )}

                {isAdmin && (
                  <>
                    <Route path="/admin" element={<AddProducts />} />
                    <Route path="/admin/promocodes" element={<AdminPromoCodes />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard user={user} />} />
                    <Route path="/admin/vlog" element={<AdminVlog user={user} />} />
                    <Route path="/admin/wiki" element={<AdminWiki />} />
                    <Route path="/admin/chat" element={<AdminChat user={user} db={db} />} /> 
                    <Route path="/admin/events" element={<AdminEvents />} />
                  </>
                )}
              </Routes>
            </main>
            
            <Footer storeName={settings?.store_name} />
            <LiveChat user={user} isAdmin={isAdmin} db={db} />
        </div>
    );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;