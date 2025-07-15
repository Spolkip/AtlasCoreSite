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

// @desc    Create a new vlog post
// @route   POST /api/v1/vlog/posts
// @access  Private/Admin
exports.createVlogPost = async (req, res) => {
    try {
        const newPost = new VlogPost(req.body);
        await newPost.save();
        res.status(201).json({ success: true, post: newPost });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error creating vlog post' });
    }
};

// @desc    Update a vlog post
// @route   PUT /api/v1/vlog/posts/:id
// @access  Private/Admin
exports.updateVlogPost = async (req, res) => {
    try {
        const post = await VlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Vlog post not found' });
        }
        Object.assign(post, req.body);
        await post.save();
        res.status(200).json({ success: true, post });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error updating vlog post' });
    }
};

// @desc    Delete a vlog post
// @route   DELETE /api/v1/vlog/posts/:id
// @access  Private/Admin
exports.deleteVlogPost = async (req, res) => {
    try {
        const post = await VlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Vlog post not found' });
        }
        await VlogPost.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Vlog post deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting vlog post' });
    }
};
