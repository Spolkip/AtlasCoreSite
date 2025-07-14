// frontend/src/components/LandingPage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/LandingPage.css';

const LandingPage = () => {
  const serverIp = 'play.atlascore.net';

  // State for server status and player count
  var [serverStats, setServerStats] = useState({
    onlinePlayers: 0,
    serverStatus: 'offline',
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // State for the class/race carousel
  const [currentClassIndex, setCurrentClassIndex] = useState(0);

  // Data for classes/races
  const classes = [
    {
      name: 'The Warrior',
      description: 'A master of close combat, the Warrior charges into battle with unwavering courage. Specializing in heavy armor and powerful melee attacks, they are the shield of their allies and the bane of their enemies. Unleash devastating blows and stand firm against any foe.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L10 7L12 12L14 7L12 2Z" fill="#FFD700" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 7L5 9L7 14L12 12L10 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 7L19 9L17 14L12 12L14 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M12 12L10 17L12 22L14 17L12 12Z" fill="#8B4513" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 17L5 19L7 24L12 22L10 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 17L19 19L17 24L12 22L14 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      name: 'The Mage',
      description: 'Harnessing the raw power of the elements, the Mage weaves intricate spells to control the battlefield. From fiery explosions to icy blizzards, their arcane might can turn the tide of any conflict. Master ancient incantations and become a force of nature.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFFF55" stroke="#000" strokeWidth="1.5"/>
          <path d="M18 6L19 8L21 9L19 10L18 12L17 10L15 9L17 8L18 6Z" fill="#00FFFF" stroke="#000" strokeWidth="0.5"/>
          <path d="M3 15L4 17L6 18L4 19L3 21L2 19L0 18L2 17L3 15Z" fill="#FF00FF" stroke="#000" strokeWidth="0.5"/>
        </svg>
      ),
    },
    {
      name: 'The Rogue',
      description: 'A master of stealth and deception, the Rogue strikes from the shadows with deadly precision. Agile and cunning, they excel at disarming traps, picking locks, and delivering critical blows to unsuspecting foes. Embrace the darkness and become an unseen threat.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L10 7L12 12L14 7L12 2Z" fill="#FFD700" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 7L5 9L7 14L12 12L10 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 7L19 9L17 14L12 12L14 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M12 12L10 17L12 22L14 17L12 12Z" fill="#8B4513" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 17L5 19L7 24L12 22L10 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 17L19 19L17 24L12 22L14 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      name: 'The Archer',
      description: 'With keen eyes and steady hands, the Archer rains down arrows from afar, striking down enemies before they can even draw close. Master the bow and various elemental arrows to control the battlefield from a distance. Precision and patience are your greatest weapons.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L10 7L12 12L14 7L12 2Z" fill="#FFD700" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 7L5 9L7 14L12 12L10 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 7L19 9L17 14L12 12L14 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
          <path d="M12 12L10 17L12 22L14 17L12 12Z" fill="#8B4513" stroke="#000" strokeWidth="1.5"/>
          <path d="M10 17L5 19L7 24L12 22L10 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
          <path d="M14 17L19 19L17 24L12 22L14 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
        </svg>
      ),
    },
  ];

  // Effect for fetching server stats periodically
  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        // FIX: Changed the endpoint to call the public stats route
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/server/public-stats`
        );
        
        if (response.data.success && response.data.data) { // Access response.data.data
          setServerStats({
            onlinePlayers: response.data.data.onlinePlayers,
            serverStatus: response.data.data.serverStatus,
          });
        } else {
          console.error('API call successful, but no stats data received or success was false.');
          setServerStats({ onlinePlayers: '??', serverStatus: 'offline' });
        }
      } catch (error) {
        console.error('Could not fetch server stats:', error.message);
        setServerStats({ onlinePlayers: '??', serverStatus: 'offline' });
      } finally {
        // Set loading to false only after the first fetch
        setLoadingStats(false);
      }
    };

    // Fetch immediately on component mount
    fetchServerStats();

    // Then, fetch every 30 seconds
    const intervalId = setInterval(fetchServerStats, 30000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []); // An empty dependency array ensures this effect runs only once on mount

  // Carousel navigation functions
  const nextClass = () => setCurrentClassIndex((prevIndex) => (prevIndex + 1) % classes.length);
  const prevClass = () => setCurrentClassIndex((prevIndex) => (prevIndex - 1 + classes.length) % classes.length);

  // Function to copy the server IP to clipboard
  const copyToClipboard = () => {
    const ipElement = document.getElementById('server-ip-to-copy');
    if (ipElement) {
      // Using document.execCommand('copy') for broader compatibility in iframes
      const tempInput = document.createElement('input');
      tempInput.value = ipElement.innerText;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand('copy');
        const tooltip = document.getElementById('copy-tooltip');
        if(tooltip) {
          tooltip.classList.add('visible');
          setTimeout(() => tooltip.classList.remove('visible'), 2000);
        }
      } catch (err) {
        console.error('Failed to copy IP: ', err);
      } finally {
        document.body.removeChild(tempInput);
      }
    }
  };

  // Effect hook for scroll-based fade-in animations
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

    const elementsToAnimate = document.querySelectorAll('.fade-in-section, .feature-card, .story-card, .class-carousel-container');
    elementsToAnimate.forEach(el => observer.observe(el));

    return () => elementsToAnimate.forEach(el => observer.unobserve(el));
  }, []);


  return (
    <div className="landing-page-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <svg className="hero-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L10 7L12 12L14 7L12 2Z" fill="#FFD700" stroke="#000" strokeWidth="1.5"/>
            <path d="M10 7L5 9L7 14L12 12L10 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
            <path d="M14 7L19 9L17 14L12 12L14 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
            <path d="M12 12L10 17L12 22L14 17L12 12Z" fill="#8B4513" stroke="#000" strokeWidth="1.5"/>
            <path d="M10 17L5 19L7 24L12 22L10 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
            <path d="M14 17L19 19L17 24L12 22L14 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
          </svg>
          <h1 className="server-title">ATLAS CORE</h1>
          <p className="server-subtitle">An Epic RPG & Roleplaying Adventure</p>
          <div className="server-ip-container glowing-border">
            <span id="server-ip-to-copy" className="server-ip">{serverIp}</span>
            <button className="mc-button primary copy-button" onClick={copyToClipboard}>
              <span>Copy IP</span>
              <span className="copy-tooltip" id="copy-tooltip">Copied!</span>
            </button>
          </div>
          <div className="server-status">
            {loadingStats ? (
              <p>Loading server status...</p>
            ) : (
              <>
                <span className={`online-dot ${serverStats.serverStatus === 'online' ? 'pulsating-glow' : 'offline'}`}></span>
                <p><strong>{serverStats.onlinePlayers}</strong> players forging their legends right now!</p>
              </>
            )}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="cta-section fade-in-section block-element">
        <h2>Your Adventure Begins Now</h2>
        <p>The world of Atlas Core awaits. Join our vibrant community on Discord and jump into the server to start writing your story today.</p>
        <div className="cta-buttons">
          <Link to="/shop" className="mc-button primary glowing-button">
            <span>Visit The Store</span>
          </Link>
          <a href="https://discord.gg/your-discord" target="_blank" rel="noopener noreferrer" className="mc-button secondary glowing-button">
            <span>Join Our Discord</span>
          </a>
        </div>
      </section>
      {/* Intro Section */}
      <section className="intro-section fade-in-section block-element">
        <h2>What is Atlas Core?</h2>
        <p>
          Step into a world where Minecraft's familiar blocks are forged into a deep, persistent RPG experience. Atlas Core is not just a server; it's a living world shaped by its players. Forge alliances, build kingdoms, master unique abilities, and battle mythical beasts in a realm of endless possibility. Your legend is waiting to be written.
        </p>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>A World Alive With Adventure</h2>
        <div className="features-grid">
          <div className="feature-card glowing-border">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L10 7L12 12L14 7L12 2Z" fill="#FFD700" stroke="#000" strokeWidth="1.5"/>
                <path d="M10 7L5 9L7 14L12 12L10 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
                <path d="M14 7L19 9L17 14L12 12L14 7Z" fill="#C0C0C0" stroke="#000" strokeWidth="1.5"/>
                <path d="M12 12L10 17L12 22L14 17L12 12Z" fill="#8B4513" stroke="#000" strokeWidth="1.5"/>
                <path d="M10 17L5 19L7 24L12 22L10 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
                <path d="M14 17L19 19L17 24L12 22L14 17Z" fill="#A0522D" stroke="#000" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3>Custom Mobs & Items</h3>
            <p>Forget everything you know about Minecraft's fauna. Our world is teeming with dozens of custom-designed monsters and epic bosses, each guarding powerful, unique items and artifacts. Will you be the one to claim them?</p>
          </div>
          <div className="feature-card glowing-border">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#000" strokeWidth="1.5" fill="#3498db"/>
                <path d="M12 2C16.4183 2 20 5.58172 20 10C20 14.4183 16.4183 18 12 18C7.58172 18 4 14.4183 4 10C4 5.58172 7.58172 2 12 2Z" fill="url(#globeGradient)" stroke="#000" strokeWidth="1.5"/>
                <path d="M12 2V22" stroke="#000" strokeWidth="1.5"/>
                <path d="M2 12H22" stroke="#000" strokeWidth="1.5"/>
                <path d="M3.46447 6.53553C6.02613 4.41378 9.02613 3.29828 12 3.29828C14.9739 3.29828 17.9739 4.41378 20.5355 6.53553" stroke="#000" strokeWidth="1.5"/>
                <path d="M3.46447 17.4645C6.02613 19.5862 9.02613 20.7017 12 20.7017C14.9739 20.7017 17.9739 19.5862 20.5355 17.4645" stroke="#000" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="globeGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2980b9"/>
                    <stop offset="1" stopColor="#3498db"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>Towns & Diplomacy</h3>
            <p>Build more than a base—create a legacy. Establish towns, grow them into sprawling cities, and engage in a deep diplomacy system. Forge alliances, declare rivalries, and wage war to expand your influence across the realm.</p>
          </div>
          <div className="feature-card glowing-border">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFFF55" stroke="#000" strokeWidth="1.5"/>
                <path d="M18 6L19 8L21 9L19 10L18 12L17 10L15 9L17 8L18 6Z" fill="#00FFFF" stroke="#000" strokeWidth="0.5"/>
                <path d="M3 15L4 17L6 18L4 19L3 21L2 19L0 18L2 17L3 15Z" fill="#FF00FF" stroke="#000" strokeWidth="0.5"/>
              </svg>
            </div>
            <h3>Deep RPG Elements</h3>
            <p>Choose your path with unique races, classes, and abilities. Master the elements, wield powerful magic, or become a legendary warrior. Level up, specialize your skills, and become a force to be reckoned with in the world of Atlas.</p>
          </div>
        </div>
      </section>

      {/* Classes/Races Carousel Section */}
      <section className="class-carousel-section fade-in-section block-element">
        <h2>Choose Your Destiny</h2>
        <div className="class-carousel-container glowing-border">
          <button onClick={prevClass} className="mc-button secondary carousel-nav-button prev-button">
            <span>&#9664;</span>
          </button>
          <div className="class-carousel-content">
            <div className="class-card">
              <div className="class-icon">
                {classes[currentClassIndex].icon}
              </div>
              <h3>{classes[currentClassIndex].name}</h3>
              <p>{classes[currentClassIndex].description}</p>
            </div>
          </div>
          <button onClick={nextClass} className="mc-button secondary carousel-nav-button next-button">
            <span>&#9654;</span>
          </button>
        </div>
        <div className="carousel-dots">
          {classes.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentClassIndex ? 'active' : ''}`}
              onClick={() => setCurrentClassIndex(index)}
            ></span>
          ))}
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
          <h2 className="fade-in-section">Forge Your Legend</h2>
          <div className="story-grid">
              <div className="story-card glowing-border">
                  <h3>Explore New Realities</h3>
                  <p>Journey through breathtaking custom biomes, from enchanted forests glowing with arcane energy to desolate wastelands haunted by ancient spirits. Every corner of the map holds new secrets and challenges.</p>
              </div>
               <div className="story-card glowing-border">
                  <h3>Choose Your Identity</h3>
                  <p>Select from a diverse roster of custom races and classes, each with its own rich history, unique strengths, and powerful abilities. Whether you're a cunning Elf rogue or a sturdy Dwarven warrior, your identity shapes your adventure.</p>
              </div>
          </div>
      </section>
    </div>
  );
};

export default LandingPage;
