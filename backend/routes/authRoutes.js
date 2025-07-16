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

// @route   POST /api/v1/auth/google-login
// @desc    Login/Register a user with Google
// @access  Public
router.post('/google-login', authController.googleLogin);

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

// Route to generate a creator code for the logged-in user (from dashboard quick action)
router.post('/generate-creator-code', protect, authController.generateCreatorCode);

// FIX: Changed route from '/applied-creator-code' to '/creator-code' to match frontend
// @route   PUT /api/v1/auth/creator-code
// @desc    Update a user's applied creator code (from settings page)
router.put('/creator-code', protect, authController.updateUserAppliedCreatorCode);

module.exports = router;