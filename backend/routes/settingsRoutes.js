// backend/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');
const { protect, authorizeAdmin } = require('../middleware/auth');

// --- Public Settings ---
// @route   GET /api/v1/settings
// @desc    Get public settings
router.get('/', settingsController.getPublicSettings);

// --- Admin Global Settings ---
// @route   GET /api/v1/settings/admin
// @desc    Get global store settings for admin
router.get('/admin', protect, authorizeAdmin, settingsController.getAdminSettings);

// @route   PUT /api/v1/settings/admin
// @desc    Update global store settings
router.put('/admin', protect, authorizeAdmin, settingsController.updateAdminSettings);

module.exports = router;