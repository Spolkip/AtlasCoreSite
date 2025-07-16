// backend/controllers/chatController.js
const Chat = require('../models/Chat');
const User = require('../models/User'); // Ensure User model is imported

// @desc    Get chat history for a user or guest
// @route   GET /api/v1/chat/history
// @access  Public/Private
exports.getChatHistory = async (req, res) => {
  try {
    // FIX: Changed req.user.isAdmin to req.user.is_admin === 1 to correctly identify admin users
    // This ensures an admin viewing another user's chat history uses the correct sessionId.
    const sessionId = (req.user && req.user.is_admin === 1 && req.query.userId)
                     ? req.query.userId
                     : (req.user ? req.user.id : req.query.guestId);
    
    if (!sessionId) {
        // Log explicitly if sessionId is missing for debugging purposes
        console.error('getChatHistory Error: sessionId is missing. user:', req.user, 'query:', req.query);
        return res.status(400).json({ success: false, message: 'User or guest ID is required.' });
    }

    const messages = await Chat.findByUserId(sessionId);
    
    res.status(200).json({ success: true, messages });
  } catch (error) {
    // Detailed error logging for debugging purposes
    console.error('--- DETAILED ERROR in getChatHistory ---');
    console.error('Error object:', error);
    if (error.code) console.error('Firebase Error Code:', error.code);
    if (error.message) console.error('Error Message:', error.message);
    if (error.stack) console.error('Error Stack:', error.stack);
    console.error('--- END DETAILED ERROR ---');
    res.status(500).json({ success: false, message: 'Server error fetching chat history.' });
  }
};

// @desc    Send a message
// @route   POST /api/v1/chat/send
// @access  Public/Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, userId: targetUserId, guestId } = req.body;
    let sender;
    let chatSessionId;
    let adminUsername = null; // Initialize adminUsername to null

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    // Determine sender and session ID
    // MODIFIED: Check for 'admin' role instead of is_admin === 1 here for consistency
    if (req.user && req.user.roles.includes('admin')) { 
        sender = 'admin';
        chatSessionId = targetUserId; 
        adminUsername = req.user.username; // Get admin username
        if (!chatSessionId) {
            return res.status(400).json({ success: false, message: 'Target user ID is required for admin replies.' });
        }
    } else if (req.user) {
        sender = 'user';
        chatSessionId = req.user.id;
    } else {
        sender = 'user';
        chatSessionId = guestId;
        if (!chatSessionId) {
            return res.status(400).json({ success: false, message: 'Guest ID is required for unauthenticated users.' });
        }
    }

    // Check current session status before sending a new message if it's not a new session
    let latestMessageForSession = await Chat.findLatestMessageByUserId(chatSessionId);
    let sessionStatus = latestMessageForSession ? latestMessageForSession.status : 'active';
    let claimedBy = latestMessageForSession ? latestMessageForSession.claimedBy : null;
    let claimedByUsername = latestMessageForSession ? latestMessageForSession.claimedByUsername : null;


    // If a user sends a message to a closed session, reactivate it (e.g., re-open a support ticket)
    if (sender === 'user' && sessionStatus === 'closed') {
        sessionStatus = 'active';
        claimedBy = null; // Unclaim if user re-opens it
        claimedByUsername = null;
    }

    // Create and save the new message
    const newMessage = new Chat({
      userId: chatSessionId, 
      message,
      sender,
      status: sessionStatus, // Inherit or update status
      claimedBy: claimedBy, // Inherit or update claimedBy
      claimedByUsername: claimedByUsername // Inherit or update claimedByUsername
    });

    await newMessage.save();
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
};