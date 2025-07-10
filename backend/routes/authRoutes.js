const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  linkMinecraft
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

// @route   POST /api/v1/auth/link-minecraft
router.post('/link-minecraft', protect, linkMinecraft);

module.exports = router;