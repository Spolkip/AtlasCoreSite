const express = require('express');
const router = express.Router();
// MODIFIED: Removed authorizeAdmin as admin-facing routes are moved
const { protect, identifyUser } = require('../middleware/auth'); 
// MODIFIED: Only import user-facing chat functions
const { getChatHistory, sendMessage } = require('../controllers/chatController'); 

// User-facing routes
router.get('/history', protect, getChatHistory);
// MODIFIED: Use identifyUser middleware to allow guest users to send messages
router.post('/send', identifyUser, sendMessage); 

// REMOVED: Admin-facing routes are moved to adminRoutes.js
// router.get('/sessions', protect, authorizeAdmin, getChatSessions);
// router.post('/claim', protect, authorizeAdmin, claimChatSession); 
// router.post('/close', protect, authorizeAdmin, closeChatSession); 

module.exports = router;
