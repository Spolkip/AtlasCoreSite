// src/components/FloatingNavPanel.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NavItem from './NavItem'; // Import the new NavItem component
import MobileDrawerMenu from './MobileDrawerMenu'; // Import the new mobile drawer
import '../css/_FloatingNavPanel.css'; // New CSS for this component
import '../css/_NavItem.css'; // NavItem styles are imported here to ensure they are available globally
import '../css/_MobileDrawerMenu.css'; // MobileDrawerMenu styles are imported here

const FloatingNavPanel = ({ user, isAuthenticated, isAdmin, logout, settings, theme, toggleTheme }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navRef = useRef(null);

    // Data for navigation items with submenus
    const navStructure = [
        {
            name: 'Information',
            path: null, // No direct path for parent with submenus
            subitems: [
                { name: 'Events', path: '/events' },
                { name: 'Wiki', path: '/wiki' },
                { name: 'Vlog', path: '/vlog' },
                { name: 'Map', path: '/map', ariaLabel: 'World map page' }, // MOVED: Map link from top-level to Information dropdown
            ],
            icon: '📜', // Example icon for Information
            ariaLabel: 'Information menu'
        },
        {
            name: 'Account',
            path: null,
            subitems: [
                { name: 'Dashboard', path: '/dashboard' },
                // REMOVED: Profile from here as it's now a top-level item
                { name: 'Settings', path: '/settings' }, // Settings link
            ],
            icon: '👤', // Example icon for Account
            ariaLabel: 'Account menu'
        },
        { name: 'Profile', path: user ? `/profile/${user.username}` : '/login', subitems: [], icon: '👤', ariaLabel: 'Profile page' }, // ADDED: Profile as a top-level item
        { name: 'Store', path: '/shop', subitems: [], icon: '💰', ariaLabel: 'Store page' },
        // REMOVED: Map from here as it's now in Information dropdown
    ];

    // Handle clicks outside the mobile menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && !navRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Placeholder for pixel logo animation (CSS handles most of this)
    const renderPixelLogo = () => (
        <span className="pixel-logo" aria-label="AtlasCore Logo">
            💎
        </span>
    );

    return (
        <nav className="floating-nav-panel-wrapper" ref={navRef} role="navigation" aria-label="Main Navigation">
            <div className="floating-nav-panel">
                <div className="navbar-brand">
                    <Link to="/" className="logo-link">
                        {renderPixelLogo()}
                        <span className="store-name">{settings?.store_name || 'AtlasCore'}</span>
                    </Link>
                </div>

                <div className="desktop-nav-links">
                    {navStructure.map((item) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isAuthenticated={isAuthenticated}
                            user={user}
                            logout={logout}
                        />
                    ))}
                    {isAuthenticated ? (
                        <>
                        </>
                    ) : (
                        <NavItem item={{ name: 'Login', path: '/login', subitems: [] }} />
                    )}
                </div>

                {/* Mobile Hamburger Menu */}
                <button
                    className="hamburger-icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-drawer"
                    aria-label="Open navigation menu"
                >
                    {isMobileMenuOpen ? '✕' : '☰'} {/* Simple X for close, hamburger for open */}
                </button>
            </div>

            <MobileDrawerMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                navStructure={navStructure}
                isAuthenticated={isAuthenticated}
                user={user}
                isAdmin={isAdmin}
                logout={logout}
                theme={theme}
                toggleTheme={toggleTheme}
            />
        </nav>
    );
};

export default FloatingNavPanel;