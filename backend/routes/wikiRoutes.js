const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const { 
    getWikiCategories, 
    getWikiCategory, // New
    getWikiPagesByCategory, 
    getWikiPage, 
    createWikiCategory, 
    createWikiPage,
    updateWikiCategory,
    deleteWikiCategory,
    updateWikiPage,
    deleteWikiPage
} = require('../controllers/wikiController');

// Public routes
router.get('/categories', getWikiCategories);
router.get('/categories/:id', getWikiCategory); // New route for single category
router.get('/pages/by-category/:categoryId', getWikiPagesByCategory);
router.get('/pages/:pageId', getWikiPage);

// Admin routes
router.post('/categories', protect, authorizeAdmin, createWikiCategory);
router.put('/categories/:id', protect, authorizeAdmin, updateWikiCategory);
router.delete('/categories/:id', protect, authorizeAdmin, deleteWikiCategory);

router.post('/pages', protect, authorizeAdmin, createWikiPage);
router.put('/pages/:id', protect, authorizeAdmin, updateWikiPage);
router.delete('/pages/:id', protect, authorizeAdmin, deleteWikiPage);


module.exports = router;
