// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Import Components
import FloatingNavPanel from './components/FloatingNavPanel'; // NEW: Import FloatingNavPanel

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
import './css/_base.css'; // NEW: Import base styles first

// Import component-specific CSS files (ensure they use CSS variables for theming)
// These should ideally be imported globally if used across multiple components,
// or within the component's JS file if using CSS Modules or Styled Components.
// For this structure, keeping them in App.js for simplicity.
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

// NEW: Import FloatingNavPanel and its related CSS files directly here
import './css/_FloatingNavPanel.css'; // New styles for the main floating navigation
import './css/_NavItem.css'; // Styles for individual navigation items and dropdowns
import './css/_MobileDrawerMenu.css'; // Styles for the mobile drawer and hamburger

// Client-side Firebase configuration (from provided content)
// This configuration is used to initialize Firebase services like Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyDVJv5KBf7DiFxLPw7-DaR0sQNGZd5zko8",
  authDomain: "atlascoreweb.firebaseapp.com",
  projectId: "atlascoreweb",
  storageBucket: "atlascoreweb.appspot.com",
  messagingSenderId: "1017567515762",
  appId: "1:1017567515762:web:a16e81b3cf33287db3deeb",
};

// Initialize Firebase App and Firestore Database instance
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/**
 * Main application component responsible for routing, authentication,
 * global state management (user, cart, theme), and fetching initial settings.
 */
function App() {
  // State for user authentication and details
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State for shopping cart
  const [cart, setCart] = useState([]);
  
  // State for global application settings (e.g., store name, currency)
  const [settings, setSettings] = useState(null);
  
  // State for currency exchange rates (fetched from external API)
  const [exchangeRates, setExchangeRates] = useState(null);
  
  // Loading state for initial data fetch
  const [loading, setLoading] = useState(true);
  
  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState('dark');

  /**
   * Toggles the application's theme between 'dark' and 'light'.
   */
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  /**
   * Handles user logout: clears user state, authentication flags,
   * removes items from local storage, and resets the cart.
   */
  const handleLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCart([]);
  }, []);

  /**
   * Fetches the latest user profile from the backend API.
   * This is called on initial load (if token exists) and after login/updates
   * to ensure the user state is always up-to-date.
   */
  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleLogout(); // If no token, user is not authenticated
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('http://localhost:5000/api/v1/auth/me', config);
      if (response.data.success) {
        const fetchedUser = response.data.user;
        setUser(fetchedUser);
        setIsAuthenticated(true);
        // Ensure isAdmin is correctly set based on the fetched user data
        setIsAdmin(fetchedUser.isAdmin === 1 || fetchedUser.isAdmin === true);
        localStorage.setItem('user', JSON.stringify(fetchedUser)); // Update local storage
      } else {
        handleLogout(); // If API call fails or returns no user, log out
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      handleLogout(); // Log out on API error
    }
  }, [handleLogout]);

  /**
   * useEffect hook for initial data fetching and user session loading.
   * Runs once on component mount.
   */
  useEffect(() => {
    /**
     * Fetches initial application settings and currency exchange rates.
     */
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [settingsResponse, ratesResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/settings'),
          axios.get('https://open.er-api.com/v6/latest/USD') // Fetch exchange rates from USD base
        ]);

        if (settingsResponse.data) {
          setSettings(settingsResponse.data);
        }
        if (ratesResponse.data && ratesResponse.data.rates) {
          setExchangeRates(ratesResponse.data.rates);
        }

      } catch (error) {
        console.error("Could not fetch initial data:", error);
        // Fallback settings if API calls fail
        setSettings(s => s || { store_name: 'AtlasCore', currency: 'USD' });
      } finally {
        setLoading(false);
      }
    };

    /**
     * Attempts to load user authentication details from local storage.
     * If found, it then calls `fetchUserProfile` to validate and get the latest data.
     */
    const loadUserFromStorage = () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            setIsAdmin(parsedUser.isAdmin === 1 || parsedUser.isAdmin === true);
            // After loading from storage, immediately fetch the latest from backend
            fetchUserProfile(); 
          } catch (e) {
            console.error("Error parsing stored user data:", e);
            handleLogout(); // Clear invalid stored data
          }
        }
    };

    loadUserFromStorage(); // Attempt to load user session
    fetchInitialData();   // Fetch global app settings and rates
  }, [handleLogout, fetchUserProfile]); // Dependencies ensure this runs correctly

  /**
   * Handles successful user login. Updates state, local storage, and fetches
   * the latest user profile.
   * @param {object} userData - Contains user object and authentication token.
   */
  const handleLogin = (userData = {}) => {
    const { user: loggedInUser, token } = userData;
    if (loggedInUser && token) {
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setIsAdmin(loggedInUser.isAdmin === 1 || loggedInUser.isAdmin === true);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      fetchUserProfile(); // Fetch latest profile after login to ensure consistency
    }
  };

  /**
   * Updates the user state and local storage with new user data.
   * @param {object} updatedUser - The updated user object.
   */
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser)); 
  };

  /**
   * Updates the global application settings state.
   * @param {object} newSettings - The new settings object.
   */
  const updateSettings = (newSettings) => {
    setSettings(newSettings);
  };

  // Display a loading indicator while initial data is being fetched
  if (loading) {
      return <div className="loading-container">Loading...</div>;
  }

  return (
    <Router>
      {/* The main application container. The 'theme' class is applied here
          to control global CSS variables for light/dark mode. */}
      <div className={`App ${theme}-theme`}>
        {/* SVG filter for digital noise transition (can be used for page transitions) */}
        <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
            <filter id="noiseFilter1">
                <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" result="noise" />
                <feColorMatrix type="saturate" values="0" />
                <feBlend mode="multiply" in="SourceGraphic" in2="noise" />
            </filter>
            <filter id="noiseFilter2">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise" />
                <feColorMatrix type="saturate" values="0" />
                <feBlend mode="multiply" in="SourceGraphic" in2="noise" />
            </filter>
            <filter id="noiseFilter3">
                <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" stitchTiles="stitch" result="noise" />
                <feColorMatrix type="saturate" values="0" />
                <feBlend mode="multiply" in="SourceGraphic" in2="noise" />
            </filter>
        </svg>

        {/* Navigation Bar component, passed necessary props for dynamic display */}
        <FloatingNavPanel 
            user={user} 
            isAuthenticated={isAuthenticated} 
            isAdmin={isAdmin} 
            logout={handleLogout} 
            settings={settings}
            theme={theme}
            toggleTheme={toggleTheme}
        />
        
        {/* Main content area, where routes are rendered */}
        <main className="content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/shop" 
              element={<ProductList 
                user={user} 
                cart={cart} 
                setCart={setCart} 
                settings={settings} 
                isAdmin={isAdmin} 
                exchangeRates={exchangeRates} 
              />} 
            />
            <Route path="/login" element={<AuthPage onLoginSuccess={handleLogin} />} />
            <Route path="/register" element={<AuthPage onLoginSuccess={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/wiki" element={<Wiki user={user} />}>
              <Route path=":type/:id" element={<Wiki user={user} />} /> {/* Nested route for wiki pages */}
            </Route>
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/redeem" element={<RedeemCode />} />
            <Route path="/vlog" element={<Vlog user={user} />} />
            <Route path="/events" element={<Events user={user} />} />
            <Route path="/map" element={<DynmapViewer user={user} db={db} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            {/* Placeholder Routes for new pages (removed "Join Server" and "Vote" specific ones) */}
            <Route path="/about" element={
                <div style={{textAlign: 'center', marginTop: '50px', fontSize: '2em', color: 'var(--color-text)'}}>
                    <h2>About Us</h2>
                    <p>Information about the server will go here.</p>
                </div>
            } />
            <Route path="/community/forums" element={
                <div style={{textAlign: 'center', marginTop: '50px', fontSize: '2em', color: 'var(--color-text)'}}>
                    <h2>Forums</h2>
                    <p>Our community forums will be hosted here.</p>
                </div>
            } />

            {/* Authenticated User Routes */}
            {isAuthenticated && (
              <>
                <Route path="/dashboard" element={<Dashboard user={user} onUserUpdate={handleUserUpdate} fetchUserProfile={fetchUserProfile} />} />
                <Route path="/profile/:username" element={<CharacterProfile user={user} onUserUpdate={handleUserUpdate} />} /> 
                <Route path="/settings" element={<Settings user={user} onUserUpdate={handleUserUpdate} onSettingsUpdate={updateSettings} theme={theme} toggleTheme={toggleTheme} />} />
                <Route path="/checkout" element={<Checkout cart={cart} user={user} settings={settings} exchangeRates={exchangeRates} onUpdateCart={setCart} />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
                <Route path="/order-history" element={<OrderHistory user={user} />} />
                <Route path="/link-minecraft" element={<LinkMinecraft onLoginSuccess={handleLogin} />} />
                <Route path="/search-profiles" element={<ProfileSearch />} />
              </>
            )}

            {/* Admin-only Routes */}
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
        
        {/* Footer component */}
        <Footer storeName={settings?.store_name} />
        
        {/* Live Chat component, passed user and admin status, and Firestore DB instance */}
        <LiveChat user={user} isAdmin={isAdmin} db={db} />
      </div>
    </Router>
  );
}

export default App;