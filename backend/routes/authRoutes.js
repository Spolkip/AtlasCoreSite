const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  linkMinecraft,
  sendVerificationCode, // ADDED: New function for requesting verification code
  verifyMinecraftLink, // ADDED: New function for verifying code and linking
  unlinkMinecraft, // ADDED: New function for unlinking Minecraft account
  getServerStats, // ADDED: New function for getting server stats
  getPlayerStats // NEW: Import getPlayerStats
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/v1/auth/register
router.post('/register', registerUser);

// @route   POST /api/v1/auth/login
router.post('/login', loginUser);

// @route   GET /api/v1/auth/me
router.get('/me', protect, getUserProfile);

// @route   POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// @route   POST /api/v1/auth/reset-password
router.post('/reset-password', resetPassword);

// @route   POST /api/v1/auth/send-verification-code
// Protect this route as it requires a logged-in user to initiate linking
router.post('/send-verification-code', protect, sendVerificationCode);

// @route   POST /api/v1/auth/verify-minecraft-link
// Protect this route as it updates sensitive user information
router.post('/verify-minecraft-link', protect, verifyMinecraftLink);

// @route   PUT /api/v1/auth/unlink-minecraft
// Protect this route as it updates sensitive user information
router.put('/unlink-minecraft', protect, unlinkMinecraft);

// @route   GET /api/v1/auth/server-stats
router.get('/server-stats', getServerStats); // No protection needed for public stats

// NEW ROUTE: Get player-specific stats from Minecraft plugin
// @route   GET /api/v1/auth/player-stats
router.get('/player-stats', protect, getPlayerStats); // Protected as it's user-specific


// @route   POST /api/v1/auth/link-minecraft (Direct UUID link - existing, kept for now)
// This route can be used for direct UUID linking or by admins.
router.post('/link-minecraft', protect, linkMinecraft);

module.exports = router;
