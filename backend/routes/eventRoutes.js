// backend/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
// MODIFIED: Removed protect and authorizeAdmin as admin-facing routes are moved
const { getEvents } = require('../controllers/eventController');

// Public route to get all events
router.get('/', getEvents);

// REMOVED: Admin-only routes are moved to adminRoutes.js
// router.post('/', protect, authorizeAdmin, createEvent);
// router.put('/:id', protect, authorizeAdmin, updateEvent);
// router.delete('/:id', protect, authorizeAdmin, deleteEvent);

module.exports = router;
