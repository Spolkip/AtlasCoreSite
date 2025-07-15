// frontend/src/components/CharacterProfile.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { SkinViewer, WalkingAnimation } from 'skinview3d';
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
                await viewer.loadCape(capeUrl);
            } catch (e) {
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
 * Main CharacterProfile Component - REWRITTEN FOR RESILIENCY
 */
const CharacterProfile = ({ user, onUserUpdate }) => {
    const { username } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const auraSkills = [
        { key: 'fighting', name: 'Combat', type: 'combat' }, 
        { key: 'defense', name: 'Defense', type: 'combat' },
        { key: 'archery', name: 'Archery', type: 'combat' },
        { key: 'mining', name: 'Mining', type: 'utility' },
        { key: 'farming', name: 'Farming', type: 'utility' }, 
        { key: 'foraging', name: 'Foraging', type: 'utility' }, 
        { key: 'fishing', name: 'Fishing', type: 'utility' }, 
        { key: 'alchemy', name: 'Alchemy', type: 'utility' }, 
        { key: 'enchanting', name: 'Enchanting', type: 'utility' }, 
        { key: 'excavation', name: 'Excavation', type: 'utility' }, 
        { key: 'endurance', name: 'Endurance', type: 'utility' }, 
        { key: 'agility', name: 'Agility', type: 'utility' }, 
        { key: 'sorcery', name: 'Sorcery', type: 'utility' }, 
        { key: 'healing', name: 'Healing', type: 'utility' }, 
        { key: 'forging', name: 'Forging', type: 'utility' }
    ];

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const profileUsername = username || user?.username;
            if (!profileUsername) {
                setLoading(false);
                setError("No user specified.");
                return;
            }
            
            try {
                const response = await axios.get(`http://localhost:5000/api/v1/profile/${profileUsername}`, config);
                if (response.data.success) {
                    setProfileData(response.data.data);
                    if (response.data.error) {
                        setError(`Could not load in-game stats: ${response.data.error}`);
                    }
                } else {
                    setError(response.data.message || 'Failed to fetch character profile.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching your profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [user, username]);

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

    if (loading) {
        return <div className="loading-container">Loading Character Profile...</div>;
    }
    
    // If the user hasn't linked their account yet
    if (!profileData?.playerStats?.uuid) {
        return (
            <div className="dashboard-container">
                <div className="profile-section">
                    <h2>Account Not Linked</h2>
                    <p>This user has not linked their Minecraft account yet.</p>
                    {user && user.username === username && (
                        <div className="action-buttons" style={{ marginTop: '20px' }}>
                            <Link to="/link-minecraft" className="dashboard-button">Link Account</Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main component render
    const playerStats = profileData?.playerStats;
    const playerBalance = playerStats?.vault_eco_balance ? parseFloat(playerStats.vault_eco_balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';

    return (
        <div className="character-profile-container">
             {successMessage && <div className="auth-success-message" style={{marginBottom: '20px'}}>{successMessage}</div>}

            <div className="profile-upper-section">
                <SkinViewerComponent uuid={playerStats.uuid} />
                <div className="stats-container">
                    <div className="player-identity">
                        {/* Use user's web username as a fallback if in-game name isn't available */}
                        <h2 className="player-name">{playerStats?.player_name || username}</h2>
                        <p className="player-class-race">
                           {playerStats ? `Level ${playerStats.fabled_default_currentlevel || 'N/A'} ${playerStats.fabled_player_races_class || ''} ${playerStats.fabled_player_class_mainclass || ''}` : 'In-game data not available.'}
                        </p>
                        {/* Display Player Balance */}
                        <div className="info-item" style={{ marginTop: '1rem', backgroundColor: 'transparent', border: 'none', padding: '0'}}>
                            <span className="info-label">Player Balance:</span>
                            <span className="info-value" style={{color: '#2ecc71'}}>{playerBalance}</span>
                        </div>
                        {user && user.username === username && (
                            <div className="action-buttons" style={{marginTop: '20px'}}>
                                <Link to="/settings" className="dashboard-button small">Settings</Link>
                                <button onClick={handleUnlinkMinecraft} className="dashboard-button small danger">Unlink Account</button>
                            </div>
                        )}
                    </div>

                    {/* Only render stats panel if stats are available */}
                    {playerStats ? (
                         <div className="skills-combat-panel">
                            <h3>Combat Skills</h3>
                            {auraSkills
                                .filter(skill => skill.type === 'combat')
                                .map(skill => (
                                    <StatBar 
                                        key={skill.key}
                                        label={skill.name} 
                                        value={parseInt(playerStats[`auraskills_${skill.key}`]) || 0} 
                                        max={20}
                                        type={skill.key === 'fighting' ? 'hp' : 'mana'} 
                                    />
                            ))}
                        </div>
                    ) : (
                        // Show a specific error for the combat stats section if they failed to load
                        <div className="auth-error-message">{error || "Could not load in-game combat stats."}</div>
                    )}
                </div>
            </div>

            {/* Only render lower skills section if stats are available */}
            {playerStats ? (
                <div className="skills-lower-section">
                     <h3>General & Utility Skills</h3>
                     <div className="skills-bars-grid">
                        {auraSkills
                            .filter(skill => skill.type === 'utility')
                            .map(skill => (
                                <StatBar 
                                    key={skill.key}
                                    label={skill.name} 
                                    value={parseInt(playerStats[`auraskills_${skill.key}`]) || 0} 
                                    max={20}
                                    type="skill" 
                                />
                        ))}
                    </div>
                </div>
            ) : (
                // If there were no player stats, you can omit this section or show a message
                <div className="skills-lower-section">
                    <h3>General & Utility Skills</h3>
                    <p>In-game skill data is currently unavailable.</p>
                </div>
            )}
        </div>
    );
};

export default CharacterProfile;