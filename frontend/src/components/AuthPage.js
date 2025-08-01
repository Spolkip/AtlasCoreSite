// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import '../css/AuthForms.css';

const AuthPage = ({ onLoginSuccess }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // State for Login form
  const [loginFormData, setLoginFormData] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for Register form
  const [registerFormData, setRegisterFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  
  // Shared state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setError(''); // Clear errors when flipping
  };

  const handleLoginChange = (e) => {
    setLoginFormData({ ...loginFormData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegisterChange = (e) => {
    setRegisterFormData({ ...registerFormData, [e.target.name]: e.target.value });
    setError('');
  };
  
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        ...loginFormData,
        rememberMe: rememberMe
      });
      if (response.data.success) {
        onLoginSuccess(response.data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (registerFormData.password !== registerFormData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/register', registerFormData);
      if (response.data.success) {
        onLoginSuccess(response.data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
        const res = await axios.post('http://localhost:5000/api/v1/auth/google-login', {
            credential: credentialResponse.credential
        });
        if (res.data.success) {
            onLoginSuccess(res.data);
            navigate('/dashboard');
        }
    } catch (err) {
        setError('Google login failed. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="flip-card-inner">
          {/* Login Form (Front) */}
          <div className="flip-card-front">
            <div className="auth-form-container">
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Sign in to your account</p>
              {error && !isFlipped && <div className="auth-error-message">{error}</div>}
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="identifier">Username or Email</label>
                  <input id="identifier" type="text" name="identifier" value={loginFormData.identifier} onChange={handleLoginChange} className="auth-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={loginFormData.password}
                      onChange={handleLoginChange}
                      className="auth-input"
                      required
                    />
                    <button type="button" className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="form-options">
                  <label className="remember-me-label">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    Remember Me
                  </label>
                  <Link to="/forgot-password">Forgot Password?</Link>
                </div>
                <button type="submit" className="mc-button primary auth-button" disabled={isLoading}>
                  {isLoading ? 'Logging In...' : 'Log In'}
                </button>
              </form>
              <div style={{'display': 'flex', 'justifyContent': 'center', 'marginTop': '20px'}}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google login failed.')}
                />
              </div>
              <div className="auth-footer-link">
                <p>Don't have an account? <button onClick={handleFlip} className="flip-button">Register Here</button></p>
              </div>
            </div>
          </div>

          {/* Register Form (Back) */}
          <div className="flip-card-back">
            <div className="auth-form-container">
              <h2 className="auth-title">Create an Account</h2>
              <p className="auth-subtitle">Join the Atlas Core community!</p>
              {error && isFlipped && <div className="auth-error-message">{error}</div>}
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label htmlFor="reg-username">Username</label>
                  <input id="reg-username" type="text" name="username" onChange={handleRegisterChange} className="auth-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-email">Email</label>
                  <input id="reg-email" type="email" name="email" onChange={handleRegisterChange} className="auth-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password">Password</label>
                  <input id="reg-password" type="password" name="password" onChange={handleRegisterChange} className="auth-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input id="confirmPassword" type="password" name="confirmPassword" onChange={handleRegisterChange} className="auth-input" required />
                </div>
                <button type="submit" className="mc-button primary auth-button" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Register'}
                </button>
              </form>
              <div className="auth-footer-link">
                <p>Already have an account? <button onClick={handleFlip} className="flip-button">Log In</button></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
