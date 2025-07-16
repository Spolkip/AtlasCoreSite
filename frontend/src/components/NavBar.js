// frontend/src/components/NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ isAuthenticated, logout, user, settings }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">{settings?.store_name || 'AtlasCore'}</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/shop">Store</Link>
        <Link to="/wiki">Wiki</Link>
        <Link to="/vlog">Vlog</Link>
        <Link to="/leaderboard">Leaderboards</Link>
        <Link to="/events">Events</Link> 
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to={`/profile/${user.username}`}>Profile</Link>
            <button onClick={logout} className="mc-button-nav">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
