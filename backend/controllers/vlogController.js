// backend/controllers/vlogController.js
const VlogPost = require('../models/VlogPost');

// @desc    Get all vlog posts
// @route   GET /api/v1/vlog/posts
// @access  Public
exports.getVlogPosts = async (req, res) => {
    try {
        const posts = await VlogPost.findAll();
        res.status(200).json({ success: true, count: posts.length, posts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching vlog posts' });
    }
};