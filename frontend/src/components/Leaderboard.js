// frontend/src/components/Leaderboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Leaderboard.css';

const LeaderboardTable = ({ title, players }) => {
    if (!players || players.length === 0) {
        return (
            <div className="leaderboard-table-container">
                <h3>{title}</h3>
                <p>No data available for this leaderboard yet.</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-table-container">
            <h3>{title}</h3>
            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((player) => (
                        <tr key={player.rank}>
                            <td className="leaderboard-rank">#{player.rank}</td>
                            <td className="leaderboard-player">
                                <img 
                                    src={`https://visage.surgeplay.com/face/40/${player.uuid || '8667ba71b85a4004af54457a9734eed7'}`} 
                                    alt={player.username}
                                    className="leaderboard-player-skin"
                                />
                                <span>{player.username}</span>
                            </td>
                            <td className="leaderboard-score">{player.score.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const Leaderboard = () => {
    const [leaderboards, setLeaderboards] = useState({});
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboards = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('http://localhost:5000/api/v1/leaderboards');
                if (data.success) {
                    setLeaderboards(data.leaderboards);
                    const firstCategory = Object.keys(data.leaderboards)[0];
                    if (firstCategory) {
                        setActiveCategory(firstCategory);
                    }
                } else {
                    setError(data.message || 'Could not load leaderboards.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching leaderboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboards();
    }, []);

    const renderLeaderboardsForCategory = () => {
        const categoryData = leaderboards[activeCategory];
        if (!categoryData) {
            return <p>Select a category to view leaderboards.</p>;
        }

        return (
            <div className="leaderboard-category-content">
                {Object.entries(categoryData).map(([boardName, boardData]) => (
                    <LeaderboardTable key={boardName} title={boardName} players={boardData.topPlayers} />
                ))}
            </div>
        );
    };

    if (loading) return <div className="loading-container"><h1>Loading Leaderboards...</h1></div>;
    if (error) return <div className="error-container"><h1>{error}</h1></div>;

    return (
        <div className="leaderboard-container">
            <h1>Leaderboards</h1>
            <nav className="leaderboard-nav">
                {Object.keys(leaderboards).length > 0 ? (
                    Object.keys(leaderboards).map(categoryName => (
                        <button 
                            key={categoryName}
                            className={`leaderboard-nav-button ${activeCategory === categoryName ? 'active' : ''}`}
                            onClick={() => setActiveCategory(categoryName)}
                        >
                            {categoryName}
                        </button>
                    ))
                ) : (
                    <p>No leaderboards are currently available.</p>
                )}
            </nav>
            {activeCategory && renderLeaderboardsForCategory()}
        </div>
    );
};

export default Leaderboard;
