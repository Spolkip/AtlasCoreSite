// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css';

/**
 * A dedicated component to display player stats. It receives the stats as props.
 * @param {object} props - Contains stats, loading, and error states.
 */
const PlayerStats = ({ stats, loading, error }) => {
    if (loading) return <div className="profile-section"><h2>Loading In-Game Stats...</h2></div>;
    if (error) return <div className="profile-section"><h2>Could Not Load Stats</h2><p>{error}</p></div>;
    if (!stats) {
        return (
            <div className="profile-section">
                <h2>In-Game Stats</h2>
                <p>Link your Minecraft account to see your Fabled and AuraSkills stats here!</p>
            </div>
        );
    }

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

    return (
        <>
            <div className="profile-section">
                <h2>Fabled Stats</h2>
                <div className="profile-details">
                    <p><strong>Class:</strong> {stats.fabled_player_class_mainclass || 'N/A'}</p>
                    <p><strong>Level:</strong> {stats.fabled_default_currentlevel || 'N/A'}</p>
                    <p><strong>Race:</strong> {stats.fabled_player_races_class || 'N/A'}</p>
                </div>
            </div>
            <div className="profile-section">
                <h2>AuraSkills Levels</h2>
                <div className="profile-details">
                     <p><strong>Overall Level:</strong> {stats.auraskills_power || 'N/A'}</p>
                </div>
                <div className="stats-grid" style={{marginTop: '20px'}}>
                    {auraSkills.map(skill => (
                        <div className="stat-card" key={skill.key}>
                            <h3>{skill.name}</h3>
                            <p>{stats[`auraskills_${skill.key}`] || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

/**
 * The main Dashboard component. It now handles fetching all necessary data.
 */
const Dashboard = ({ user }) => {
    const [playerStats, setPlayerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState('');

    useEffect(() => {
        if (!user || !user.minecraft_uuid) {
            setLoadingStats(false);
            return;
        }

        const fetchPlayerStats = async () => {
            setLoadingStats(true);
            setStatsError('');
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
                    setStatsError(response.data.message || 'Failed to fetch player stats.');
                }
            } catch (err) {
                setStatsError(err.response?.data?.message || 'An error occurred while fetching in-game stats.');
            } finally {
                setLoadingStats(false);
            }
        };

        fetchPlayerStats();
    }, [user]);

    if (!user) {
        return (
            <div className="dashboard-container">
                <h1>Dashboard</h1>
                <div className="profile-section">
                    <h2>Please log in to continue.</h2>
                    <div className="action-buttons">
                        <Link to="/login" className="dashboard-button">Login</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <h1>Your Dashboard</h1>
            
            <div className="profile-section">
                <h2>Profile</h2>
                <div className="profile-details">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    {/* ---- START OF FIX: Enhanced Minecraft Account display ---- */}
                    <p>
                        <strong>Minecraft Account:</strong> 
                        {user.minecraft_uuid 
                            ? ` ${playerStats?.player_name || '...'}` 
                            : ' Not Linked'}
                    </p>
                    <p>
                        <strong>Minecraft UUID:</strong>
                        {user.minecraft_uuid 
                            ? ` ${user.minecraft_uuid}` 
                            : ' Not Linked'}
                    </p>
                    {/* ---- END OF FIX ---- */}
                </div>
                <div className="action-buttons">
                    <Link to="/settings" className="dashboard-button">Settings</Link>
                    {!user.minecraft_uuid && (
                        <Link to="/link-minecraft" className="dashboard-button">Link Minecraft</Link>
                    )}
                </div>
            </div>

            <PlayerStats user={user} stats={playerStats} loading={loadingStats} error={statsError} />
            
            {user.isAdmin && (
                 <div className="quick-actions">
                    <h2>Admin Actions</h2>
                    <Link to="/admin-dashboard" className="dashboard-button">Admin Dashboard</Link>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
