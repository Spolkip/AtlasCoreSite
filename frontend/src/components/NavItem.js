// src/components/NavItem.js
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../css/_NavItem.css'; // New CSS for NavItem

const NavItem = ({ item, isAuthenticated, user, logout }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navItemRef = useRef(null);
    const timeoutRef = useRef(null); // Used to manage close delay on mouse leave

    const hasSubitems = item.subitems && item.subitems.length > 0;

    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current); // Clear any pending close timeout
        if (hasSubitems) {
            setIsDropdownOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (hasSubitems) {
            // Set a timeout to close the dropdown. This provides a small buffer
            // to allow the mouse to move to a submenu item without closing.
            timeoutRef.current = setTimeout(() => {
                setIsDropdownOpen(false);
            }, 200); // 200ms delay
        }
    };

    const handleSubitemClick = () => {
        clearTimeout(timeoutRef.current); // Clear any pending close on subitem click
        setIsDropdownOpen(false); // Immediately close the dropdown
    };

    const handleClick = (e) => {
        // Only toggle dropdown if it has subitems and is the parent button/link
        if (hasSubitems) {
            e.preventDefault(); // Prevent navigating if it's a parent with submenus
            setIsDropdownOpen(!isDropdownOpen); // Toggle dropdown on click
        } else if (item.name === 'Logout' && logout) {
            // Specific handling for logout button
            logout();
        } else {
            // If it's a direct link (no subitems), ensure dropdown is closed if it somehow opened
            setIsDropdownOpen(false);
        }
    };

    // Keyboard navigation for accessibility
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isDropdownOpen || !navItemRef.current) return;

            const focusableElements = navItemRef.current.querySelectorAll('a, button');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
                // Return focus to the parent nav item button after closing
                navItemRef.current.querySelector('.nav-item-button').focus();
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                const activeIndex = Array.from(focusableElements).indexOf(document.activeElement);
                if (activeIndex < focusableElements.length - 1) {
                    focusableElements[activeIndex + 1].focus();
                } else {
                    firstElement.focus(); // Loop back to first
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const activeIndex = Array.from(focusableElements).indexOf(document.activeElement);
                if (activeIndex > 0) {
                    focusableElements[activeIndex - 1].focus();
                } else {
                    lastElement.focus(); // Loop back to last
                }
            }
        };

        if (isDropdownOpen) {
            // Add a small timeout before focusing the first element, to ensure it's rendered
            setTimeout(() => {
                navItemRef.current?.querySelector('.dropdown-item')?.focus();
            }, 0);
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timeoutRef.current); // Clean up timeout on unmount
        };
    }, [isDropdownOpen, hasSubitems]); // Depend on isDropdownOpen and hasSubitems

    const renderLinkContent = () => (
        <>
            {item.icon && <span className="nav-item-icon">{item.icon}</span>}
            <span className="nav-item-text">{item.name}</span>
            {hasSubitems && <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>}
        </>
    );

    const commonProps = {
        className: `nav-item-button ${hasSubitems ? 'has-dropdown' : ''}`,
        onClick: handleClick,
        'aria-haspopup': hasSubitems ? 'menu' : undefined,
        'aria-expanded': hasSubitems ? isDropdownOpen : undefined,
        'aria-label': item.ariaLabel || item.name,
        tabIndex: hasSubitems ? "0" : undefined, // Ensure button is focusable
    };

    return (
        <div 
            className="nav-item" 
            ref={navItemRef} 
            onMouseEnter={handleMouseEnter} // Keep on parent div
            onMouseLeave={handleMouseLeave} // Keep on parent div
            // onFocus will open the menu, but onBlur needs to be handled carefully with focus management
        >
            {item.path && !hasSubitems ? ( // Direct link without submenu
                <Link to={item.path} {...commonProps}>
                    {renderLinkContent()}
                </Link>
            ) : ( // Parent item with submenu, or special button like Login
                <button type="button" {...commonProps}>
                    {renderLinkContent()}
                </button>
            )}

            {hasSubitems && isDropdownOpen && (
                <div
                    className="dropdown-menu"
                    role="menu" // ARIA role for menu
                    onMouseEnter={handleMouseEnter} // ADDED: Re-trigger mouseEnter on dropdown for robustness
                    onMouseLeave={handleMouseLeave} // ADDED: Re-trigger mouseLeave on dropdown for robustness
                >
                    {item.subitems.map((subitem) => (
                        <Link 
                            key={subitem.name} 
                            to={subitem.path} 
                            className="dropdown-item" 
                            onClick={handleSubitemClick} // Handle click on subitem
                            role="menuitem" // ARIA role for menu item
                            tabIndex={0} // Make focusable
                        >
                            {subitem.name}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NavItem;