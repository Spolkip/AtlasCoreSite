// frontend/src/components/Settings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Dashboard.css'; // Reusing some styles
import '../css/AuthForms.css'; // For form styling

const currencies = [
  { code: 'USD', name: 'United States Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound Sterling (£)' },
  // ... other currencies
];

// ADDED: Define available profile themes
const profileThemes = [
    { id: 'default', name: 'Default' },
    { id: 'forest', name: 'Forest Theme' },
    { id: 'lava', name: 'Lava Theme' },
    { id: 'night', name: 'Night Theme' }, // ADDED: Night Theme
    { id: 'space', name: 'Space Theme' }, // ADDED: Space Theme
    { id: 'water', name: 'Water Theme' }, // ADDED: Water Theme
];

const Settings = ({ user, onUserUpdate, onSettingsUpdate, theme, toggleTheme }) => {
  // State for Admin Settings
  const [adminSettings, setAdminSettings] = useState({});
  const [newAdminSettings, setNewAdminSettings] = useState({});

  // State for User Settings
  const [userDetails, setUserDetails] = useState({ 
      email: user?.email || '',
      is_profile_public: user?.is_profile_public ?? true,
      profile_theme: user?.profile_theme || 'default', // ADDED: Initialize profile_theme
  });
  const [passwordDetails, setPasswordDetails] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // General State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchAdminSettings = async () => {
      if (user?.isAdmin) {
        try {
          const { data } = await axios.get('http://localhost:5000/api/v1/settings/admin', config);
          const settingsObj = data.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
          }, {});
          setAdminSettings(settingsObj);
          setNewAdminSettings(settingsObj);
        } catch (err) {
          setError('Failed to load admin settings.');
        }
      }
    };

    fetchAdminSettings().finally(() => setLoading(false));
  }, [token, user]);

  const handleAdminSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAdminSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? String(checked) : value }));
  };
  
  const handleUserSettingsChange = (e) => {
      const { name, value, type, checked } = e.target;
      setUserDetails(prev => ({...prev, [name]: type === 'checkbox' ? checked : value}));
  }

  const handlePasswordChange = (e) => {
      const { name, value } = e.target;
      setPasswordDetails(prev => ({...prev, [name]: value}));
  }

  const handleUpdateAdminSettings = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError('');
    try {
      const settingsArray = Object.entries(newAdminSettings).map(([key, value]) => ({ key, value }));
      await axios.put('http://localhost:5000/api/v1/settings/admin', { settings: settingsArray }, config);
      onSettingsUpdate(newAdminSettings); // Update app-level state
      setSuccessMessage('Admin settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update admin settings.');
    }
  };
  
  const handleUpdateUserSettings = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError('');
    try {
        const response = await axios.put('http://localhost:5000/api/v1/auth/details', userDetails, config);
        onUserUpdate(response.data.user); // Update app-level user state
        setSuccessMessage('Your details have been updated!');
    } catch (err) {
         setError(err.response?.data?.message || 'Failed to update details.');
    }
  }

  const handleUpdatePassword = async (e) => {
      e.preventDefault();
      setSuccessMessage('');
      setError('');
      if (passwordDetails.newPassword !== passwordDetails.confirmNewPassword) {
          return setError("New passwords do not match.");
      }
      try {
        await axios.put('http://localhost:5000/api/v1/auth/updatepassword', {
            currentPassword: passwordDetails.currentPassword,
            newPassword: passwordDetails.newPassword
        }, config);
        setSuccessMessage('Password updated successfully!');
        setPasswordDetails({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      } catch (err) {
          setError(err.response?.data?.message || 'Failed to update password.');
      }
  }

  if (loading && user?.isAdmin) return <div className="loading-container"><h1>Loading Settings...</h1></div>;

  return (
    <div className="dashboard-container">
      <h1>Settings</h1>

      {error && <div className="auth-error-message" style={{marginBottom: '20px'}}>{error}</div>}
      {successMessage && <div className="auth-success-message" style={{marginBottom: '20px'}}>{successMessage}</div>}

      <div className="profile-section">
          <h2>Your Profile</h2>
          <form onSubmit={handleUpdateUserSettings} className="admin-form">
              <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" name="email" value={userDetails.email} onChange={handleUserSettingsChange} className="auth-input" required />
              </div>
              <div className="form-group">
                <label className="remember-me-label">
                    <input 
                        type="checkbox" 
                        name="is_profile_public" 
                        checked={userDetails.is_profile_public} 
                        onChange={handleUserSettingsChange} 
                    />
                    Make Profile Public
                </label>
                <p style={{fontSize: '1rem', color: '#999', marginTop: '5px'}}>
                    If unchecked, other players will not be able to search for or view your profile.
                </p>
              </div>
              {/* ADDED: Profile Theme Selection */}
              <div className="form-group">
                  <label htmlFor="profile_theme">Profile Theme</label>
                  <select 
                      id="profile_theme" 
                      name="profile_theme" 
                      value={userDetails.profile_theme} 
                      onChange={handleUserSettingsChange} 
                      className="auth-input"
                  >
                      {profileThemes.map(themeOption => (
                          <option key={themeOption.id} value={themeOption.id}>
                              {themeOption.name}
                          </option>
                      ))}
                  </select>
                  <p style={{fontSize: '1rem', color: '#999', marginTop: '5px'}}>
                      Choose a custom theme for your public character profile.
                  </p>
              </div>
              <button type="submit" className="mc-button primary">Update Details</button>
          </form>

          <h3 style={{marginTop: '40px', fontSize: '1.8rem'}}>Change Password</h3>
           <form onSubmit={handleUpdatePassword} className="admin-form">
              <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input id="currentPassword" type="password" name="currentPassword" value={passwordDetails.currentPassword} onChange={handlePasswordChange} className="auth-input" required />
              </div>
               <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input id="newPassword" type="password" name="newPassword" value={passwordDetails.newPassword} onChange={handlePasswordChange} className="auth-input" required />
              </div>
               <div className="form-group">
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <input id="confirmNewPassword" type="password" name="confirmNewPassword" value={passwordDetails.confirmNewPassword} onChange={handlePasswordChange} className="auth-input" required />
              </div>
              <button type="submit" className="mc-button primary">Change Password</button>
          </form>
      </div>
      
      <div className="profile-section">
          <h2>Display Settings</h2>
          <div className="form-group">
              <label>Theme</label>
              <button onClick={toggleTheme} className="mc-button secondary">
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </button>
          </div>
      </div>

      {user && user.isAdmin && (
        <div className="profile-section">
          <h2>Admin Settings</h2>
          <form onSubmit={handleUpdateAdminSettings} className="admin-form">
            <div className="form-group">
              <label htmlFor="store_name">Store Name</label>
              <input id="store_name" type="text" name="store_name" value={newAdminSettings.store_name || ''} onChange={handleAdminSettingsChange} className="auth-input" required />
            </div>
            <div className="form-group">
              <label htmlFor="store_description">Store Description</label>
              <textarea id="store_description" name="store_description" value={newAdminSettings.store_description || ''} onChange={handleAdminSettingsChange} className="auth-input" rows="3" required />
            </div>
            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select id="currency" name="currency" value={newAdminSettings.currency || 'USD'} onChange={handleAdminSettingsChange} className="auth-input" required>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="remember-me-label">
                <input type="checkbox" name="maintenance_mode" checked={newAdminSettings.maintenance_mode === 'true'} onChange={handleAdminSettingsChange} />
                Enable Maintenance Mode
              </label>
            </div>
            <button type="submit" className="mc-button primary">Update Admin Settings</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
