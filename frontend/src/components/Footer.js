// frontend/src/components/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Footer.css';

const Footer = ({ storeName }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-section about">
          <h3>About {storeName || 'AtlasCore'}</h3>
          <p>Your ultimate destination for an epic Minecraft RPG experience. Join us and forge your legend!</p>
        </div>
        
        <div className="footer-section links">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Store</Link></li>
            {/* Add more links as needed, e.g., for specific game features */}
            <li><a href="https://discord.gg/your-discord" target="_blank" rel="noopener noreferrer">Discord</a></li>
          </ul>
        </div>
        
        <div className="footer-section social">
          <h3>Follow Us</h3>
          <div className="social-icons">
            {/* Social Media Links */}
            <a href="https://discord.gg/your-discord-invite" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <i className="fab fa-discord"></i> {/* Discord icon */}
            </a>
            <a href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i> {/* Facebook icon */}
            </a>
            <a href="https://instagram.com/yourhandle" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i> {/* Instagram icon */}
            </a>
            <a href="https://www.tiktok.com/@yourhandle" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fab fa-tiktok"></i> {/* TikTok icon */}
            </a>
            {/* Retaining previous example if needed */}
            <a href="https://youtube.com/yourchannel" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube"></i> {/* YouTube icon */}
            </a>
          </div>
        </div>
        
        <div className="footer-section legal">
          <h3>Legal</h3>
          <ul>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© {currentYear} {storeName || 'AtlasCore'}. All rights reserved.</p>
        <p>Minecraft is © Mojang AB.</p>
      </div>
    </footer>
  );
};

export default Footer;