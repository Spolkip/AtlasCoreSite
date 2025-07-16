// frontend/src/components/DynmapViewer.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
// Removed LiveChat import as it's handled globally
// Removed ZoomInIcon, ZoomOutIcon, HomeIcon imports
import CloseIcon from '@mui/icons-material/Close'; // Assuming Material-UI icons are available
import InfoIcon from '@mui/icons-material/Info'; // For info button
import '../css/DynmapViewer.css';

const DynmapViewer = ({ user, db }) => {
  // Initial Dynmap URL with sensible defaults for world, map type, and zoom
  const initialDynmapBaseUrl = "http://localhost:8123/";
  const initialDynmapHash = "world;flat;0,64,0;0"; // Default world, flat map, center coords, zoom 0

  const [dynmapUrl, setDynmapUrl] = useState(`${initialDynmapBaseUrl}#${initialDynmapHash}`);
  const [serverStats, setServerStats] = useState({ onlinePlayers: '?', serverStatus: 'offline' });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isInfoOverlayOpen, setIsInfoOverlayOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const iframeRef = useRef(null);

  // Function to extract current map state (world, map type, coords, zoom) from Dynmap URL hash
  // This function is still useful if you plan to implement other map state changes (e.g., changing map type)
  const getMapStateFromUrl = useCallback((url) => {
    const defaultState = { world: 'world', mapType: 'flat', x: 0, y: 64, z: 0, zoom: 0 };
    try {
      const urlObj = new URL(url);
      const hash = urlObj.hash;
      if (hash && hash.startsWith('#')) {
        const parts = hash.substring(1).split(';');
        const world = parts[0] || defaultState.world;
        const mapType = parts[1] || defaultState.mapType;
        
        let x = defaultState.x, y = defaultState.y, z = defaultState.z;
        if (parts[2]) {
          const coords = parts[2].split(',').map(Number);
          if (coords.length >= 3 && !isNaN(coords[0]) && !isNaN(coords[1]) && !isNaN(coords[2])) {
            x = coords[0];
            y = coords[1];
            z = coords[2];
          }
        }
        
        const zoom = parts[3] !== undefined && !isNaN(parseInt(parts[3], 10)) 
                     ? parseInt(parts[3], 10) 
                     : defaultState.zoom;
        
        return { world, mapType, x, y, z, zoom };
      }
    } catch (e) {
      console.warn("Error parsing Dynmap URL hash, using defaults:", e);
    }
    return defaultState;
  }, []);

  // Function to update the Dynmap URL (kept for potential future use or dynamic map changes)
  const updateDynmapUrl = useCallback((newWorld, newMapType, newX, newY, newZ, newZoom) => {
    const baseUrl = initialDynmapBaseUrl;
    const newHash = `${newWorld};${newMapType};${newX},${newY},${newZ};${newZoom}`;
    setDynmapUrl(`${baseUrl}#${newHash}`);
  }, [initialDynmapBaseUrl]);

  // Fetch server stats for the info overlay
  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/server/public-stats`
        ); //

        if (response.data.success && response.data.data) { //
          setServerStats({
            onlinePlayers: response.data.data.onlinePlayers, //
            serverStatus: response.data.data.serverStatus, //
          });
        } else {
          console.error('API call successful, but no stats data received or success was false.');
          setServerStats({ onlinePlayers: '??', serverStatus: 'offline' });
        }
      } catch (error) {
        console.error('Could not fetch server stats:', error.message);
        setServerStats({ onlinePlayers: '??', serverStatus: 'offline' });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchServerStats(); // Fetch immediately
    const intervalId = setInterval(fetchServerStats, 30000); // Update every 30 seconds
    return () => clearInterval(intervalId); // Cleanup
  }, []);

  // Handle iframe loading state
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  // Removed handleZoom and handleResetView functions

  return (
    <div className="dynmap-page-container">
      <div className="dynmap-header">
        <h1 className="dynmap-title">Interactive World Map</h1>
        <p className="dynmap-description">Explore the AtlasCore world in real-time!</p>
      </div>

      {/* Main Map and Sidebar Container */}
      <div className="dynmap-content-wrapper">
        <div className="dynmap-map-area">
          {iframeLoading && (
            <div className="dynmap-loading-overlay">
              <div className="spinner"></div>
              <p>Loading Map...</p>
            </div>
          )}
          <iframe
            key={dynmapUrl} // Use key to force re-render on URL change, ensuring src updates
            ref={iframeRef}
            src={dynmapUrl}
            title="Minecraft World Map"
            className="dynmap-iframe"
            allowFullScreen
            onLoad={handleIframeLoad}
          >
            Your browser does not support iframes. Please visit the map directly at <a href={dynmapUrl}>{dynmapUrl}</a>.
          </iframe>

          {/* Removed map-controls div */}
        </div>

        {/* Info Overlay Sidebar */}
        <div className="dynmap-sidebar">
          {/* Toggle Button for Info Overlay */}
          <button className="toggle-info-overlay-button mc-button" onClick={() => setIsInfoOverlayOpen(!isInfoOverlayOpen)}>
            <InfoIcon /> {isInfoOverlayOpen ? 'Hide Info' : 'Show Info'}
          </button>

          {/* Info Overlay */}
          <div className={`dynmap-info-overlay ${isInfoOverlayOpen ? 'open' : ''}`}>
            <div className="overlay-header">
              <h3>Server Info</h3>
              <button className="close-overlay-btn" onClick={() => setIsInfoOverlayOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="overlay-content">
              {loadingStats ? (
                <p>Loading server stats...</p>
              ) : (
                <>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`info-value ${serverStats.serverStatus === 'online' ? 'online' : 'offline'}`}>
                      {serverStats.serverStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Players Online:</span>
                    <span className="info-value">{serverStats.onlinePlayers}</span>
                  </div>
                  <p className="overlay-tip">
                    * Use your mouse scroll wheel to zoom and pan the map directly.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Removed Live Chat Component from here */}
        </div>
      </div>
    </div>
  );
};

export default DynmapViewer;