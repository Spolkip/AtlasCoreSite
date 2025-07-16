// backend/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../controllers/eventController');

// Public route to get all events
router.get('/', getEvents);

// Admin-only routes
router.post('/', protect, authorizeAdmin, createEvent);
router.put('/:id', protect, authorizeAdmin, updateEvent);
router.delete('/:id', protect, authorizeAdmin, deleteEvent);

module.exports = router;
