// backend/controllers/eventController.js
const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/v1/events
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.findAll();
        res.status(200).json({ success: true, count: events.length, events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ success: false, message: 'Server error fetching events.' });
    }
};

// @desc    Create a new event
// @route   POST /api/v1/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, type } = req.body;
        if (!title || !date) {
            return res.status(400).json({ success: false, message: 'Event title and date are required.' });
        }
        
        const newEvent = new Event({
            title,
            description,
            date: new Date(date), // Ensure date is a Date object
            type,
        });
        await newEvent.save();
        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ success: false, message: 'Server error creating event.' });
    }
};

// @desc    Update an event
// @route   PUT /api/v1/events/:id
// @access  Private/Admin
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        
        const { title, description, date, type } = req.body;
        
        // Update fields if provided in the request body
        if (title !== undefined) event.title = title;
        if (description !== undefined) event.description = description;
        if (date !== undefined) event.date = new Date(date); // Convert to Date object
        if (type !== undefined) event.type = type;

        await event.save(); // Using save() which handles updates internally
        res.status(200).json({ success: true, event });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ success: false, message: 'Server error updating event.' });
    }
};

// @desc    Delete an event
// @route   DELETE /api/v1/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        await Event.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Event deleted.' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ success: false, message: 'Server error deleting event.' });
    }
};
