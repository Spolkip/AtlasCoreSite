// frontend/src/components/LandingPage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/LandingPage.css';
import axios from 'axios';

const LandingPage = ({ settings }) => {
  const serverIp = 'play.atlascore.net';
  const [serverStats, setServerStats] = useState({
    onlinePlayers: 0,
    maxPlayers: 0,
    serverStatus: 'offline'
  });

  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/v1/server/stats');
        if (data.success) {
          setServerStats(data.stats);
        }
      } catch (error) {
        console.error("Could not fetch server stats", error);
        setServerStats({ onlinePlayers: 0, maxPlayers: 0, serverStatus: 'offline' });
      }
    };

    fetchServerStats();
    const interval = setInterval(fetchServerStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);


  const copyToClipboard = () => {
    const ipElement = document.getElementById('server-ip-to-copy');
    if (ipElement) {
        navigator.clipboard.writeText(ipElement.innerText).then(() => {
            const tooltip = document.getElementById('copy-tooltip');
            if(tooltip) {
                tooltip.classList.add('visible');
                setTimeout(() => tooltip.classList.remove('visible'), 2000);
            }
        }).catch(err => {
            console.error('Failed to copy IP: ', err);
        });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1
    });

    const elementsToAnimate = document.querySelectorAll('.fade-in-section, .feature-card, .story-card');
    elementsToAnimate.forEach(el => observer.observe(el));

    return () => elementsToAnimate.forEach(el => observer.unobserve(el));
  }, []);


  return (
    <div className="landing-page-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
            <h1 className="server-title">{settings?.store_name || 'AtlasCore'}</h1>
            <p className="server-subtitle">An Epic RPG & Roleplaying Adventure</p>
            <div className="server-ip-container">
                <span id="server-ip-to-copy" className="server-ip">{serverIp}</span>
                <button className="mc-button" onClick={copyToClipboard}>
                    <span>Copy IP</span>
                    <span className="copy-tooltip" id="copy-tooltip">Copied!</span>
                </button>
            </div>
             <div className="server-status">
                <span className={`status-dot ${serverStats.serverStatus === 'online' ? 'online-dot' : 'offline-dot'}`}></span>
                <p>
                  {serverStats.serverStatus === 'online'
                    ? <><strong>{serverStats.onlinePlayers}</strong> players forging their legends right now!</>
                    : <strong>Server is currently offline</strong>
                  }
                </p>
            </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="intro-section fade-in-section">
          <h2>What is {settings?.store_name || 'AtlasCore'}?</h2>
          <p>
              Step into a world where Minecraft's familiar blocks are forged into a deep, persistent RPG experience. {settings?.store_name || 'AtlasCore'} is not just a server; it's a living world shaped by its players. Forge alliances, build kingdoms, master unique abilities, and battle mythical beasts in a realm of endless possibility. Your legend is waiting to be written.
          </p>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>A World Alive With Adventure</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚔️</div>
            <h3>Custom Mobs & Items</h3>
            <p>Forget everything you know about Minecraft's fauna. Our world is teeming with dozens of custom-designed monsters and epic bosses, each guarding powerful, unique items and artifacts. Will you be the one to claim them?</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Towns & Diplomacy</h3>
            <p>Build more than a base—create a legacy. Establish towns, grow them into sprawling cities, and engage in a deep diplomacy system. Forge alliances, declare rivalries, and wage war to expand your influence across the realm.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Deep RPG Elements</h3>
            <p>Choose your path with unique races, classes, and abilities. Master the elements, wield powerful magic, or become a legendary warrior. Level up, specialize your skills, and become a force to be reckoned with in the world of Atlas.</p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
          <h2 className="fade-in-section">Forge Your Legend</h2>
          <div className="story-grid">
              <div className="story-card">
                  <h3>Explore New Realities</h3>
                  <p>Journey through breathtaking custom biomes, from enchanted forests glowing with arcane energy to desolate wastelands haunted by ancient spirits. Every corner of the map holds new secrets and challenges.</p>
              </div>
               <div className="story-card">
                  <h3>Choose Your Identity</h3>
                  <p>Select from a diverse roster of custom races and classes, each with its own rich history, unique strengths, and powerful abilities. Whether you're a cunning Elf rogue or a sturdy Dwarven warrior, your identity shapes your adventure.</p>
              </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section fade-in-section">
        <h2>Your Adventure Begins Now</h2>
        <p>The world of {settings?.store_name || 'AtlasCore'} awaits. Join our vibrant community on Discord and jump into the server to start writing your story today.</p>
        <div className="cta-buttons">
          <Link to="/shop" className="mc-button primary">
            <span>Visit The Store</span>
          </Link>
          <a href="https://discord.gg/your-discord" target="_blank" rel="noopener noreferrer" className="mc-button secondary">
            <span>Join Our Discord</span>
          </a>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;