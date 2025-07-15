// frontend/src/components/RedeemCode.js
import React, { useState } from 'react';
import axios from 'axios';
import '../css/AuthForms.css'; // Reusing styles

const RedeemCode = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.post('http://localhost:5000/api/v1/promocodes/redeem', { code }, config);

            if (data.success) {
                setSuccess(data.message);
                setCode('');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to redeem code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-form-container">
                <h2 className="auth-title">Redeem a Code</h2>
                <p className="auth-subtitle">Enter your reward code below to claim your items!</p>

                {error && <div className="auth-error-message">{error}</div>}
                {success && <div className="auth-success-message">{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="code">Reward Code</label>
                        <input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="auth-input"
                            required
                        />
                    </div>
                    <button type="submit" className="mc-button primary auth-button" disabled={loading}>
                        {loading ? 'Redeeming...' : 'Redeem'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RedeemCode;
