// backend/routes/creatorCodeRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const {
    getAllCreatorCodes,
    createCreatorCode,
    updateCreatorCode,
    deleteCreatorCode,
    applyCreatorCode, // This is the function needed for checkout
    getCreatorCodeByUserId
} = require('../controllers/creatorCodeController');

// Public route to apply a creator code (used by any user during checkout)
router.post('/apply', applyCreatorCode);

// Admin-only routes for managing creator codes
router.route('/')
    .get(protect, authorizeAdmin, getAllCreatorCodes)
    .post(protect, authorizeAdmin, createCreatorCode);

router.route('/:id')
    .put(protect, authorizeAdmin, updateCreatorCode)
    .delete(protect, authorizeAdmin, deleteCreatorCode);

// Route to get a creator code by user ID (for dashboard display)
router.get('/user/:userId', protect, getCreatorCodeByUserId);

module.exports = router;