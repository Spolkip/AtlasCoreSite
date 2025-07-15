// frontend/src/components/Leaderboards.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Leaderboards.css';

const Leaderboard = ({ title, data, valueKey, valueLabel }) => (
    <div className="leaderboard-card">
        <h2>{title}</h2>
        {data.length > 0 ? (
            <ol className="leaderboard-list">
                {data.map((player, index) => (
                    <li key={player.uuid || index} className="leaderboard-item">
                        <span className="leaderboard-rank">{index + 1}.</span>
                        <div className="leaderboard-player-info">
                            <img 
                                src={`https://crafatar.com/avatars/${player.uuid}?size=40&overlay`} 
                                alt={player.playerName} 
                                onError={(e) => { e.target.onerror = null; e.target.src='https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7?size=40&overlay'; }}
                            />
                            <span className="leaderboard-player-name">{player.playerName}</span>
                        </div>
                        <span className="leaderboard-value">{player[valueKey] ? Number(player[valueKey]).toLocaleString() : '0'} {valueLabel}</span>
                    </li>
                ))}
            </ol>
        ) : (
            <p>No data available.</p>
        )}
    </div>
);

const Leaderboards = () => {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/v1/leaderboards');
                if (response.data.success) {
                    setLeaderboardData(response.data.data);
                } else {
                    setError('Failed to load leaderboard data.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'An error occurred while fetching leaderboards.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, []);

    if (loading) {
        return <div className="loading-container"><h1>Loading Leaderboards...</h1></div>;
    }

    if (error) {
        return <div className="error-container"><h1>{error}</h1></div>;
    }

    return (
        <div className="leaderboards-container">
            <h1>Leaderboards</h1>
            <div className="leaderboard-grid">
                <Leaderboard 
                    title="Richest Players" 
                    data={leaderboardData?.balance || []} 
                    valueKey="vault_eco_balance"
                    valueLabel="$"
                />
                <Leaderboard 
                    title="Most Kills" 
                    data={leaderboardData?.kills || []} 
                    valueKey="statistic_player_kills"
                    valueLabel="Kills"
                />
                <Leaderboard 
                    title="Most Deaths" 
                    data={leaderboardData?.deaths || []} 
                    valueKey="statistic_deaths"
                    valueLabel="Deaths"
                />
                <Leaderboard 
                    title="Top Fighters" 
                    data={leaderboardData?.fighting || []} 
                    valueKey="auraskills_fighting"
                    valueLabel="Level"
                />
                 <Leaderboard 
                    title="Top Miners" 
                    data={leaderboardData?.mining || []} 
                    valueKey="auraskills_mining"
                    valueLabel="Level"
                />
            </div>
        </div>
    );
};

export default Leaderboards;
