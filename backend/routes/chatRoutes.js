const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const { getChatHistory, sendMessage, getChatSessions, claimChatSession, closeChatSession } = require('../controllers/chatController');

// User-facing routes
router.get('/history', protect, getChatHistory);
router.post('/send', protect, sendMessage);

// Admin-facing routes
router.get('/sessions', protect, authorizeAdmin, getChatSessions);
router.post('/claim', protect, authorizeAdmin, claimChatSession); // NEW Admin route to claim a chat
router.post('/close', protect, authorizeAdmin, closeChatSession); // NEW Admin route to close a chat

module.exports = router;