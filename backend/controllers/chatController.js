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
    // FIX: Changed req.user.isAdmin to req.user.is_admin === 1 to correctly identify admin users
    if (req.user && req.user.is_admin === 1) { // Correctly check admin status based on User model field
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

// @desc    Get all active chat sessions for admins
// @route   GET /api/v1/chat/sessions
// @access  Private/Admin
exports.getChatSessions = async (req, res) => {
    try {
        const activeSessions = await Chat.findActiveSessions();
        const sessionsWithUserDetails = [];

        for (const session of activeSessions) {
            const user = await User.findById(session.userId);
            sessionsWithUserDetails.push({
                userId: session.userId,
                username: user ? user.username : `Guest (${session.userId.substring(0, 6)})`,
                lastMessage: session.lastMessage,
                lastMessageTimestamp: session.lastMessageTimestamp, 
                isGuest: !user,
                status: session.status, // Include status
                claimedBy: session.claimedBy, // Include claimedBy
                claimedByUsername: session.claimedByUsername, // Include claimedByUsername
            });
        }
        
        res.status(200).json({ success: true, sessions: sessionsWithUserDetails });
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ success: false, message: 'Server error fetching chat sessions.' });
    }
};

// NEW: @desc Admin claims a chat session
// @route POST /api/v1/chat/claim
// @access Private/Admin
exports.claimChatSession = async (req, res) => {
    const { userId: sessionUserId } = req.body; // The user ID whose chat is being claimed
    const adminId = req.user.id; // The admin's own user ID
    const adminUsername = req.user.username; // The admin's username

    if (!sessionUserId) {
        return res.status(400).json({ success: false, message: 'Session user ID is required to claim a chat.' });
    }

    try {
        // Find the latest message for this session to get its current state (claimedBy, status)
        const latestMessage = await Chat.findLatestMessageByUserId(sessionUserId);

        if (!latestMessage) {
            // If no messages exist for this session, create a new one to initiate it as claimed
            const initialClaimMessage = new Chat({
                userId: sessionUserId,
                message: `${adminUsername} has initiated and claimed this chat.`,
                sender: 'system',
                status: 'claimed',
                claimedBy: adminId,
                claimedByUsername: adminUsername
            });
            await initialClaimMessage.save();
            return res.status(200).json({ success: true, message: 'Chat session initiated and claimed successfully.', claimedBy: adminId, status: 'claimed' });
        }

        // Prevent claiming if already claimed by another admin
        if (latestMessage.status === 'claimed' && latestMessage.claimedBy !== adminId) {
            const currentClaimerUsername = latestMessage.claimedByUsername || 'another admin';
            return res.status(409).json({ success: false, message: `Chat already claimed by ${currentClaimerUsername}.` });
        }
        
        // Create a new system message to indicate claim
        const claimMessageContent = `${adminUsername} has claimed this chat.`;
        const claimMessage = new Chat({
            userId: sessionUserId,
            message: claimMessageContent,
            sender: 'system', // Use 'system' sender for automated messages
            status: 'claimed', // Update status to 'claimed'
            claimedBy: adminId, // Set claimedBy to the admin's ID
            claimedByUsername: adminUsername // Set claimedByUsername
        });

        await claimMessage.save();

        res.status(200).json({ success: true, message: 'Chat session claimed successfully.', claimedBy: adminId, status: 'claimed' });

    } catch (error) {
        console.error('Error claiming chat session:', error);
        res.status(500).json({ success: false, message: 'Server error claiming chat session.' });
    }
};

// NEW: @desc Admin closes a chat session
// @route POST /api/v1/chat/close
// @access Private/Admin
exports.closeChatSession = async (req, res) => {
    const { userId: sessionUserId } = req.body; // The user ID whose chat is being closed
    const adminId = req.user.id; // The admin's own user ID
    const adminUsername = req.user.username; // The admin's username

    if (!sessionUserId) {
        return res.status(400).json({ success: false, message: 'Session user ID is required to close a chat.' });
    }

    try {
        const latestMessage = await Chat.findLatestMessageByUserId(sessionUserId);

        if (!latestMessage) {
            return res.status(404).json({ success: false, message: 'Chat session not found.' });
        }

        // Only allow claiming admin or any admin if not claimed, to close
        if (latestMessage.status === 'claimed' && latestMessage.claimedBy !== adminId) {
            const currentClaimerUsername = latestMessage.claimedByUsername || 'another admin';
            return res.status(403).json({ success: false, message: `This chat is claimed by ${currentClaimerUsername}. Only the claiming admin can close it.` });
        }
        
        // Create a new system message to indicate closure
        const closeMessageContent = `${adminUsername} has closed this chat.`;
        const closeMessage = new Chat({
            userId: sessionUserId,
            message: closeMessageContent,
            sender: 'system', // Use 'system' sender for automated messages
            status: 'closed', // Update status to 'closed'
            claimedBy: null, // Unclaim when closed
            claimedByUsername: null // Clear claimedByUsername
        });

        await closeMessage.save();

        res.status(200).json({ success: true, message: 'Chat session closed successfully.', status: 'closed' });

    } catch (error) {
        console.error('Error closing chat session:', error);
        res.status(500).json({ success: false, message: 'Server error closing chat session.' });
    }
};
