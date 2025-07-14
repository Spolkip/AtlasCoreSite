// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.registerUser);

// @route   POST /api/v1/auth/login
// @desc    Login a user
// @access  Public
router.post('/login', authController.loginUser);

// @route   GET /api/v1/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', protect, authController.getUserProfile);

// @route   PUT /api/v1/auth/details
// @desc    Update user details (email, public profile setting)
// @access  Private
router.put('/details', protect, authController.updateUserDetails);

// @route   POST /api/v1/auth/forgot-password
// @desc    Request a password reset
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   PUT /api/v1/auth/reset-password
// @desc    Reset a user's password
// @access  Public
router.put('/reset-password', authController.resetPassword);

// @route   POST /api/v1/auth/send-verification-code
// @desc    Send verification code to a user in-game
// @access  Private
router.post('/send-verification-code', protect, authController.sendVerificationCode);

// @route   POST /api/v1/auth/verify-minecraft-link
// @desc    Verify the code and link the Minecraft account
// @access  Private
router.post('/verify-minecraft-link', protect, authController.verifyMinecraftLink);

// @route   PUT /api/v1/auth/unlink-minecraft
// @desc    Unlink a user's Minecraft account
// @access  Private
router.put('/unlink-minecraft', protect, authController.unlinkMinecraft);

module.exports = router;