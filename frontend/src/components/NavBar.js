// frontend/src/components/NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ isAuthenticated, logout, user, settings }) => { // Removed 'cart' from props

  // Removed cartItemCount calculation as cart link is being removed

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">{settings?.store_name || 'AtlasCore'}</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/shop">Store</Link>
        {/* Removed Cart Link */}
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/order-history">My Orders</Link>
            <Link to="/settings">Settings</Link>
            <button onClick={logout} className="mc-button-nav">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;