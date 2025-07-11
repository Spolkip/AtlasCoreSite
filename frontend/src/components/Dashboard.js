// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SkinViewer, WalkingAnimation } from 'skinview3d';
import '../css/Dashboard.css';
import '../css/CharacterProfile.css';

/**
 * Helper component for the 3D skin viewer with robust error handling.
 */
const SkinViewerComponent = ({ uuid }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!uuid || !canvasRef.current) return;

        let viewer = new SkinViewer({
            canvas: canvasRef.current,
            width: 300,
            height: 400,
        });

        const skinUrl = `https://visage.surgeplay.com/skin/${uuid}`;
        const capeUrl = `https://visage.surgeplay.com/cape/${uuid}`;
        const defaultSkinUrl = "https://visage.surgeplay.com/skin/8667ba71b85a4004af54457a9734eed7";

        const loadResources = async () => {
            try {
                await viewer.loadSkin(skinUrl, { model: "slim" });
            } catch (e) {
                console.warn(`Could not load custom skin for ${uuid}. Loading default skin.`);
                try {
                    await viewer.loadSkin(defaultSkinUrl);
                } catch (fallbackError) {
                    console.error("Failed to load even the default fallback skin.", fallbackError);
                }
            }

            try {
                // Attempt to load the cape. The 400 error is expected for players without capes.
                await viewer.loadCape(capeUrl);
            } catch (e) {
                // Silently ignore cape loading errors as most players don't have one.
                console.log(`No cape found for player ${uuid}.`);
            }
        };

        loadResources();

        viewer.animation = new WalkingAnimation();
        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = false;

        const handleResize = () => {
            if (canvasRef.current && viewer) {
                viewer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (viewer) {
                viewer.dispose();
            }
        };
    }, [uuid]);
    return <canvas ref={canvasRef} className="skin-viewer-container"></canvas>;
};


/**
 * Helper component for stat bars (HP, Mana, Skills).
 */
const StatBar = ({ label, value, max, type }) => {
    const percentage = max > 0 ? (Math.min(value, max) / max) * 100 : 0;
    return (
        <div className="stat-bar">
            <div className="stat-bar-label">
                <span>{label}</span>
                <span>{value} / {max}</span>
            </div>
            <div className="stat-bar-background">
                <div className={`stat-bar-foreground ${type}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

/**
 * Main Dashboard Component
 */
const Dashboard = ({ user, onUserUpdate }) => {
    const [playerStats, setPlayerStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // --- START OF EDIT: Define AuraSkills array here for use in rendering ---
    const auraSkills = [
        { key: 'fighting', name: 'Combat' }, { key: 'mining', name: 'Mining' },
        { key: 'farming', name: 'Farming' }, { key: 'foraging', name: 'Foraging' },
        { key: 'fishing', name: 'Fishing' }, { key: 'alchemy', name: 'Alchemy' },
        { key: 'enchanting', name: 'Enchanting' }, { key: 'excavation', name: 'Excavation' },
        { key: 'archery', name: 'Archery' }, { key: 'defense', name: 'Defense' },
        { key: 'endurance', name: 'Endurance' }, { key: 'agility', name: 'Agility' },
        { key: 'sorcery', name: 'Sorcery' }, { key: 'healing', name: 'Healing' },
        { key: 'forging', name: 'Forging' }
    ];
    // --- END OF EDIT ---

    useEffect(() => {
        if (!user || !user.minecraft_uuid) {
            setLoading(false);
            return;
        }
        const fetchPlayerStats = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(
                    'http://localhost:5000/api/v1/player-stats',
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.data.success) {
                    setPlayerStats(response.data.stats);
                } else {
                    setError(response.data.message || 'Failed to fetch player stats.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching in-game stats.');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayerStats();
    }, [user]);

    const handleUnlinkMinecraft = async () => {
        setError('');
        setSuccessMessage('');
        if (!window.confirm('Are you sure you want to unlink your Minecraft account? This cannot be undone.')) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put('http://localhost:5000/api/v1/auth/unlink-minecraft', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setSuccessMessage(response.data.message);
                const updatedUser = { ...user, minecraft_uuid: '', is_verified: false };
                onUserUpdate(updatedUser);
            } else {
                setError(response.data.message || 'Failed to unlink account.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while unlinking.');
        }
    };

    const renderContent = () => {
        if (!user.minecraft_uuid) {
            return (
                <div className="profile-section">
                    <h2>Account Not Linked</h2>
                    <p>Link your Minecraft account to view your character profile.</p>
                    <div className="action-buttons">
                        <Link to="/link-minecraft" className="dashboard-button">Link Minecraft</Link>
                    </div>
                </div>
            );
        }

        if (loading) {
            return <div className="loading-container">Loading Character Profile...</div>;
        }

        if (error) {
            return <div className="profile-section"><h2>Could Not Load Stats</h2><p>{error}</p></div>;
        }

        if (playerStats) {
            return (
                <div className="character-profile-container">
                    <div className="profile-main">
                        <SkinViewerComponent uuid={user.minecraft_uuid} />
                        <div className="stats-container">
                            <div className="player-identity">
                                <h2 className="player-name">{playerStats.player_name || 'Player'}</h2>
                                <p className="player-class-race">
                                    Level {playerStats.fabled_default_currentlevel || 'N/A'} {playerStats.fabled_player_races_class || ''} {playerStats.fabled_player_class_mainclass || ''}
                                </p>
                                <div className="action-buttons" style={{marginTop: '20px'}}>
                                    <Link to="/settings" className="dashboard-button small">Settings</Link>
                                    <button onClick={handleUnlinkMinecraft} className="dashboard-button small danger">Unlink Account</button>
                                </div>
                            </div>
                            {/* --- START OF EDIT: Replace HP/Mana with AuraSkills bars --- */}
                            <div className="skills-bars-grid">
                                {auraSkills.map(skill => (
                                    <StatBar 
                                        key={skill.key}
                                        label={skill.name} 
                                        value={parseInt(playerStats[`auraskills_${skill.key}`]) || 0} 
                                        max={20} // Hardcoded max level
                                        type="skill" 
                                    />
                                ))}
                            </div>
                            {/* --- END OF EDIT --- */}
                        </div>
                    </div>
                </div>
            );
        }

        return <div className="profile-section"><h2>Could not load character data.</h2></div>;
    };

    if (!user) {
        return <div className="loading-container">Please log in to view your dashboard.</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Character Profile</h1>
            {error && <div className="auth-error-message" style={{marginBottom: '20px'}}>{error}</div>}
            {successMessage && <div className="auth-success-message" style={{marginBottom: '20px'}}>{successMessage}</div>}
            
            {renderContent()}
            
            {user.isAdmin && (
                 <div className="quick-actions" style={{marginTop: '2rem'}}>
                    <h2>Admin Actions</h2>
                    <Link to="/admin-dashboard" className="dashboard-button">Admin Dashboard</Link>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
