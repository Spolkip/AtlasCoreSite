// frontend/src/components/NavBar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ isAuthenticated, logout, user, settings }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    logout(); // Clears the user session
    navigate('/'); // Redirects the user to the homepage
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">{settings?.store_name || 'AtlasCore'}</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/shop">Store</Link>
        <Link to="/wiki">Wiki</Link>
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/settings">Settings</Link>
            <button onClick={handleLogoutClick} className="mc-button-nav">Logout</button>
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
