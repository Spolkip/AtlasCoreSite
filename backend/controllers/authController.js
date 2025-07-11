// backend/controllers/authController.js
const UserAuth = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios'); // Ensure axios is imported
const { mojangService } = require('../services/mojangService'); // Keep this, might be used in other places or future
const { collection, getDocs, query, where } = require('firebase/firestore'); // Import necessary Firestore functions
const { FIREBASE_DB } = require('../config/firebase'); // Import Firebase DB instance

// Helper to create a consistent user object for API responses
const toUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  isAdmin: user.is_admin === 1,
  isVerified: user.is_verified,
  minecraft_uuid: user.minecraft_uuid
});

// Function to call the Minecraft plugin's webhook
const callMinecraftPlugin = async (endpoint, payload) => {
    try {
        // Use environment variables for the plugin's URL and secret for better security and configurability
        const pluginUrl = `http://localhost:${process.env.WEBHOOK_PORT || 4567}${endpoint}`;
        const secret = process.env.WEBHOOK_SECRET; 

        if (!secret) {
            throw new Error('WEBHOOK_SECRET is not defined in backend .env');
        }

        const response = await axios.post(pluginUrl, payload, {
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 seconds timeout
        });
        return response.data;
    } catch (error) {
        console.error(`Error calling Minecraft plugin endpoint ${endpoint}:`, error.response?.data || error.message);
        // Extract status and message from plugin's error response if available
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || `Failed to communicate with Minecraft server: ${error.message}`;
        // Re-throw an error with a custom status property to be caught by the route handler
        throw Object.assign(new Error(message), { status });
    }
};


// @desc    Register a new user
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide a username, email, and password.' });
    }
    if (await UserAuth.findByEmail(email)) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    if (await UserAuth.findByUsername(username)) {
      return res.status(400).json({ success: false, message: 'An account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user instance. The model's constructor handles defaults.
    const newUser = new UserAuth({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser.id, isAdmin: newUser.is_admin === 1 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: toUserResponse(newUser),
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};
// @desc    Login a user
exports.loginUser = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an identifier and password.' });
    }

    const user = identifier.includes('@')
      ? await UserAuth.findByEmail(identifier)
      : await UserAuth.findByUsername(identifier);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, isAdmin: user.is_admin === 1 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/v1/auth/me
exports.getUserProfile = async (req, res) => {
    try {
        // req.user is attached by the 'protect' middleware
        const user = await UserAuth.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user: toUserResponse(user) });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error fetching profile.' });
    }
};

// @desc    Request verification code from Minecraft server
// @route   POST /api/v1/auth/send-verification-code
exports.sendVerificationCode = async (req, res) => {
    const { username } = req.body;
    try {
        if (!username) {
            return res.status(400).json({ success: false, message: 'Minecraft username is required.' });
        }
        // Call Minecraft plugin to generate and send code
        const pluginResponse = await callMinecraftPlugin('/generate-and-send-code', { username });

        if (!pluginResponse.success) {
            // The plugin might return status and message on failure
            return res.status(pluginResponse.status || 500).json({ success: false, message: pluginResponse.message || 'Failed to send verification code in-game.' });
        }
        res.status(200).json({ success: true, message: 'Verification code sent to player in-game.' });
    } catch (error) {
        console.error('Error in sendVerificationCode:', error);
        // Use the status from the thrown error (if it has one) or default to 500
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error requesting verification code.' });
    }
};

// @desc    Verify code and link Minecraft account
// @route   POST /api/v1/auth/verify-minecraft-link
exports.verifyMinecraftLink = async (req, res) => {
    const { username, code } = req.body;
    const userId = req.user.id; // from 'protect' middleware
    try {
        if (!username || !code) {
            return res.status(400).json({ success: false, message: 'Minecraft username and verification code are required.' });
        }

        // Call Minecraft plugin to verify code
        const pluginResponse = await callMinecraftPlugin('/verify-code', { username, code });

        if (!pluginResponse.success) {
            return res.status(pluginResponse.status || 400).json({ success: false, message: pluginResponse.message || 'Invalid or expired verification code.' });
        }

        const minecraftUUID = pluginResponse.uuid; // Get UUID from plugin response

        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in web database.' });
        }

        // Update user in web database
        await user.update({ minecraft_uuid: minecraftUUID, is_verified: true });
        
        // Respond with updated user data
        res.status(200).json({ success: true, message: 'Minecraft account linked successfully.', user: toUserResponse(user) });

    } catch (error) {
        console.error('Error in verifyMinecraftLink:', error);
        // Use the status from the thrown error (if it has one) or default to 500
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error linking Minecraft account.' });
    }
};

// @desc    Unlink Minecraft account
// @route   PUT /api/v1/auth/unlink-minecraft
exports.unlinkMinecraft = async (req, res) => {
    const userId = req.user.id; // from 'protect' middleware
    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Clear Minecraft UUID and set is_verified to false
        await user.update({ minecraft_uuid: '', is_verified: false });

        res.status(200).json({ success: true, message: 'Minecraft account unlinked successfully.', user: toUserResponse(user) });
    } catch (error) {
        console.error('Error in unlinkMinecraft:', error);
        res.status(500).json({ success: false, message: 'Server error unlinking Minecraft account.' });
    }
};

// @desc    Get real-time server statistics from Minecraft plugin
// @route   GET /api/v1/auth/server-stats
exports.getServerStats = async (req, res) => {
    try {
        // Call Minecraft plugin to get server stats
        // The stats endpoint in the plugin is a GET request, but it expects a secret in the body
        // We'll simulate a POST request with the secret for consistency with how the plugin is set up.
        // The plugin's StatsTask.java sends a POST request to /api/v1/server/stats.
        // So, we need to make a POST request here to match.
        const pluginResponse = await axios.post(
            `http://localhost:${process.env.WEBHOOK_PORT || 4567}/server-stats`, // Assuming the plugin exposes this endpoint
            { secret: process.env.WEBHOOK_SECRET }, // Send the secret in the body
            { timeout: 5000 } // Shorter timeout for stats
        );

        if (!pluginResponse.data.success) {
            return res.status(pluginResponse.data.status || 500).json({ success: false, message: pluginResponse.data.message || 'Failed to retrieve server stats from plugin.' });
        }

        res.status(200).json({ success: true, stats: pluginResponse.data });
    } catch (error) {
        console.error('Error in getServerStats:', error.message);
        // Check if the error is due to connection refusal (plugin not running or wrong port)
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({ success: false, message: 'Minecraft server is currently offline or unreachable.' });
        }
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching Minecraft server stats.' });
    }
};

// NEW ENDPOINT: Get player-specific stats from Minecraft plugin
// @route   GET /api/v1/auth/player-stats
// @access  Private (requires user to be logged in and linked)
exports.getPlayerStats = async (req, res) => {
    const userId = req.user.id; // From protect middleware
    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (!user.minecraft_uuid) {
            return res.status(400).json({ success: false, message: 'Minecraft account not linked.' });
        }

        // Call Minecraft plugin to get player stats using their UUID
        const pluginResponse = await callMinecraftPlugin('/player-stats', { uuid: user.minecraft_uuid });

        if (!pluginResponse.success) {
            return res.status(pluginResponse.status || 500).json({ success: false, message: pluginResponse.message || 'Failed to retrieve player stats from plugin.' });
        }

        res.status(200).json({ success: true, stats: pluginResponse.stats });
    } catch (error) {
        console.error('Error in getPlayerStats:', error.message);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching player stats.' });
    }
};


// @desc    Link Minecraft account (direct UUID linking - existing, kept for compatibility/admin use if needed)
// @route   POST /api/v1/auth/link-minecraft
exports.linkMinecraft = async (req, res) => {
    const { minecraftUUID } = req.body;
    const userId = req.user.id; // from 'protect' middleware
    try {
        if (!minecraftUUID) {
            return res.status(400).json({ success: false, message: 'Minecraft UUID is required.' });
        }
        // Optional: Verify UUID with Mojang API if you want to ensure it's a real UUID
        // const mojangUsername = await mojangService.getUsernameFromUUID(minecraftUUID);
        // if (!mojangUsername) {
        //     return res.status(400).json({ success: false, message: 'Invalid Minecraft UUID provided.' });
        // }

        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        await user.update({ minecraft_uuid: minecraftUUID, is_verified: true }); // Also mark as verified
        res.status(200).json({ success: true, message: 'Minecraft account linked successfully.', user: toUserResponse(user) });
    } catch (error) {
        console.error('Error in linkMinecraft (direct UUID):', error);
        res.status(500).json({ success: false, message: 'Server error linking Minecraft account.' });
    }
};

// @desc    Forgot password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await UserAuth.findByEmail(email);
        if (!user) {
            // We send a success response even if the user doesn't exist
            // to prevent email enumeration attacks.
            return res.status(200).json({ success: true, message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await user.update({
            reset_password_token: hashedToken,
            reset_password_expire: resetExpire,
        });
        
        // In a real app, you would email this token to the user.
        console.log(`Password reset token for ${email}: ${resetToken}`);
        res.status(200).json({ success: true, message: `If a user with that email exists, a password reset link has been sent.` });

    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reset password
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Please provide a token and a new password.' });
        }
        
        const hashedToken = crypto.createHash('sha512').update(token).digest('hex'); // Changed to SHA512 for consistency

        const q = query(collection(FIREBASE_DB, 'users'), where('reset_password_token', '==', hashedToken), where('reset_password_expire', '>', new Date()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        const userDoc = querySnapshot.docs[0];
        const user = new UserAuth({ id: userDoc.id, ...userDoc.data() });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await user.update({
            password: hashedPassword,
            reset_password_token: null,
            reset_password_expire: null,
        });

        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
