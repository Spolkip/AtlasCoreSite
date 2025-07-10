// frontend/src/components/LinkMinecraft.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/LinkMinecraft.css'; // Import the new CSS file

const LinkMinecraft = ({ onLoginSuccess }) => {
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1 for username input, 2 for code input
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear messages after 5 seconds
    const timer = setTimeout(() => {
      if (error || success) {
        setError('');
        setSuccess('');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, success]);

  const validateUsername = (username) => {
    // Minecraft usernames are 3-16 characters, alphanumeric and underscores
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateUsername(minecraftUsername)) {
      setError('Invalid Minecraft username (3-16 characters, letters, numbers and underscores only)');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // API call to backend to request verification code from Minecraft plugin
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/auth/send-verification-code`,
        { username: minecraftUsername },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message || 'A verification code has been sent to you in-game. Please check your Minecraft chat.');
      setStep(2); // Move to the next step to enter code
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Error sending verification code.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // API call to backend to verify code and link Minecraft account
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/auth/verify-minecraft-link`,
        { username: minecraftUsername, code: verificationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess(response.data.message || 'Minecraft account linked successfully!');
      // Update the user context in the App component and local storage
      if (onLoginSuccess && response.data.user) {
        onLoginSuccess({ user: response.data.user, token: localStorage.getItem('token') }); // Pass the updated user and current token
      }
      setTimeout(() => navigate('/dashboard'), 2000); // Redirect to dashboard
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to link Minecraft account.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="link-minecraft-container">
      <h2 className="link-minecraft-title">{step === 1 ? 'Link Your Minecraft Account' : 'Enter Verification Code'}</h2>
      
      {error && <p className="link-minecraft-message link-minecraft-error">{error}</p>}
      {success && <p className="link-minecraft-message link-minecraft-success">{success}</p>}
      
      {step === 1 ? (
        <form onSubmit={handleSendCode} className="link-minecraft-form">
          <div className="link-minecraft-form-group">
            <label htmlFor="minecraft-username" className="link-minecraft-label">Minecraft Username</label>
            <input
              id="minecraft-username"
              type="text"
              value={minecraftUsername}
              onChange={(e) => setMinecraftUsername(e.target.value)}
              placeholder="Enter your Minecraft username"
              required
              maxLength={16}
              className="link-minecraft-input"
            />
          </div>
          <button type="submit" disabled={isLoading} className="link-minecraft-button">
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="link-minecraft-form">
          <div className="link-minecraft-form-group">
            <label htmlFor="verification-code" className="link-minecraft-label">Verification Code</label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter the code from in-game"
              required
              className="link-minecraft-input"
            />
          </div>
          <button type="submit" disabled={isLoading} className="link-minecraft-button">
            {isLoading ? 'Verifying...' : 'Link Account'}
          </button>
        </form>
      )}
    </div>
  );
};

export default LinkMinecraft;