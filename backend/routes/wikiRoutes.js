const express = require('express');
const router = express.Router();
// MODIFIED: Removed protect and authorizeAdmin as admin-facing routes are moved
const { 
    getWikiCategories, 
    getWikiCategory, 
    getWikiPagesByCategory, 
    getWikiPage, 
} = require('../controllers/wikiController');

// Public routes
router.get('/categories', getWikiCategories);
router.get('/categories/:id', getWikiCategory); 
router.get('/pages/by-category/:categoryId', getWikiPagesByCategory);
router.get('/pages/:pageId', getWikiPage);

// REMOVED: Admin routes are moved to adminRoutes.js
// router.post('/categories', protect, authorizeAdmin, createWikiCategory);
// router.put('/categories/:id', protect, authorizeAdmin, updateWikiCategory);
// router.delete('/categories/:id', protect, authorizeAdmin, deleteWikiCategory);

// router.post('/pages', protect, authorizeAdmin, createWikiPage);
// router.put('/pages/:id', protect, authorizeAdmin, updateWikiPage);
// router.delete('/pages/:id', protect, authorizeAdmin, deleteWikiPage);


module.exports = router;
