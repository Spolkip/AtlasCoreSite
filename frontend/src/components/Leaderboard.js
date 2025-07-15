// frontend/src/components/Leaderboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Leaderboard.css';

// FIX: Use the full path to the stat in the Firestore document
const leaderboardTabs = [
    { name: 'Level', stat: 'stats.fabled_default_currentlevel' },
    { name: 'Balance', stat: 'stats.vault_eco_balance' },
    { name: 'Mining', stat: 'stats.auraskills_mining' },
    { name: 'Farming', stat: 'stats.auraskills_farming' },
    { name: 'Combat', stat: 'stats.auraskills_fighting' },
    { name: 'Player Kills', stat: 'stats.statistic_player_kills' },
];

const Leaderboard = () => {
    // ... (rest of the component logic remains the same)
    const [activeTab, setActiveTab] = useState(leaderboardTabs[0].stat);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`http://localhost:5000/api/v1/leaderboards?stat=${activeTab}&limit=10`);
                if (response.data.success && Array.isArray(response.data.leaderboard)) {
                    setLeaderboardData(response.data.leaderboard);
                } else {
                    setLeaderboardData([]);
                    if (!response.data.success) {
                       setError(response.data.message || 'Failed to load leaderboard data.');
                    }
                }
            } catch (err) {
                setLeaderboardData([]);
                setError(err.response?.data?.message || 'An error occurred while fetching the leaderboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [activeTab]);


    return (
        <div className="leaderboard-container">
            <h1>Leaderboards</h1>
            <div className="leaderboard-tabs">
                {leaderboardTabs.map(tab => (
                    <button
                        key={tab.stat}
                        className={`tab-button ${activeTab === tab.stat ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.stat)}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="leaderboard-content">
                {loading ? (
                    <p>Loading leaderboard...</p>
                ) : error ? (
                    <p className="auth-error-message">{error}</p>
                ) : (
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboardData.length > 0 ? (
                                leaderboardData.map((player, index) => (
                                    <tr key={index}>
                                        <td className="rank">#{index + 1}</td>
                                        <td className="player-name">{player.playerName}</td>
                                        <td className="stat-value">{Number(player.statValue).toLocaleString() || '0'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3">No data available for this leaderboard.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};


export default Leaderboard;