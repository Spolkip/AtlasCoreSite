// backend/routes/vlogRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const {
    getVlogPosts,
    createVlogPost,
    updateVlogPost,
    deleteVlogPost
} = require('../controllers/vlogController');

// Public route to get all posts
router.get('/posts', getVlogPosts);

// Admin-only routes
router.post('/posts', protect, authorizeAdmin, createVlogPost);
router.put('/posts/:id', protect, authorizeAdmin, updateVlogPost);
router.delete('/posts/:id', protect, authorizeAdmin, deleteVlogPost);

module.exports = router;
