// src/components/MobileDrawerMenu.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../css/_MobileDrawerMenu.css'; // New CSS for this component

const ThemeSwitcher = ({ theme, toggleTheme }) => {
    // A simple lever-like switch, can be styled with CSS
    return (
        <div className="theme-switcher" onClick={toggleTheme} aria-label="Toggle light/dark theme">
            <div className={`lever ${theme}-mode`}>
                <div className="lever-handle"></div>
            </div>
            <span className="theme-text">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </div>
    );
};

const MobileDrawerMenu = ({ isOpen, onClose, navStructure, isAuthenticated, user, isAdmin, logout, theme, toggleTheme }) => {
    const drawerRef = useRef(null);

    const handleLinkClick = () => {
        onClose(); // Close drawer on link click
    };

    // Accessibility: Close drawer on Escape key
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    return (
        <div
            className={`mobile-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
        >
            <div
                className={`mobile-drawer ${isOpen ? 'open' : ''}`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                ref={drawerRef}
            >
                <h2 id="mobile-menu-title" className="drawer-title">Navigation</h2>
                
                <div className="drawer-content">
                    <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />

                    <ul className="drawer-nav-list" role="menu">
                        {navStructure.map((item) => (
                            <li key={item.name} className="drawer-nav-item">
                                {item.path ? (
                                    <Link to={item.path} onClick={handleLinkClick} className="drawer-link" role="menuitem">
                                        {item.name}
                                    </Link>
                                ) : (
                                    // For parent items with submenus in mobile, they still act as toggles
                                    <span className="drawer-link parent-link" onClick={() => { /* Toggle submenu or handle if needed */ }} role="menuitem" aria-haspopup="true">
                                        {item.name}
                                    </span>
                                )}
                                {item.subitems && item.subitems.length > 0 && (
                                    <ul className="drawer-sub-list">
                                        {item.subitems.map((subitem) => (
                                            <li key={subitem.name}>
                                                <Link to={subitem.path} onClick={handleLinkClick} className="drawer-sub-link" role="menuitem">
                                                    {subitem.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                        {isAuthenticated && (
                            <>
                                <li className="drawer-nav-item">
                                    <button onClick={() => { logout(); handleLinkClick(); }} className="drawer-link" role="menuitem">Logout</button>
                                </li>
                            </>
                        )}
                        {!isAuthenticated && (
                            <li className="drawer-nav-item">
                                <Link to="/login" onClick={handleLinkClick} className="drawer-link" role="menuitem">Login</Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MobileDrawerMenu;