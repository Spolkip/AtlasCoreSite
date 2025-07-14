import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/AuthForms.css';

const ProfileSearch = () => {
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (username.trim()) {
            navigate(`/profile/${username.trim()}`);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-form-container">
                <h2 className="auth-title">Search for a Player</h2>
                <form onSubmit={handleSearch}>
                    <div className="form-group">
                        <label htmlFor="username">Player Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>
                    <button type="submit" className="mc-button primary auth-button">
                        Search
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSearch;