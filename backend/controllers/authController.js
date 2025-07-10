let serverStats = {
    onlinePlayers: 0,
    maxPlayers: 0,
    serverStatus: 'offline',
    newPlayersToday: 0
};

/**
 * Receives and updates server stats from the Minecraft plugin.
 */
exports.updateStats = (req, res) => {
    const { onlinePlayers, maxPlayers, serverStatus, newPlayersToday } = req.body;
    
    // Basic validation
    if (onlinePlayers === undefined || maxPlayers === undefined || serverStatus === undefined) {
        return res.status(400).json({ success: false, message: 'Invalid stats payload.' });
    }

    serverStats = { onlinePlayers, maxPlayers, serverStatus, newPlayersToday };
    console.log('Received server stats update:', serverStats);
    res.status(200).json({ success: true, message: 'Stats updated successfully.' });
};

/**
 * Provides the latest server stats to the frontend.
 */
exports.getStats = (req, res) => {
    res.status(200).json({ success: true, stats: serverStats });
};


// =================================================================
// backend/controllers/authController.js
// =================================================================
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');


const toUserResponse = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.is_admin === 1,
    isVerified: user.is_verified,
    minecraft_uuid: user.minecraft_uuid
});

exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide a username, email, and password.' });
    }
    if (await User.findByEmail(email)) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    if (await User.findByUsername(username)) {
      return res.status(400).json({ success: false, message: 'An account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
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

exports.loginUser = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an identifier and password.' });
    }

    const user = identifier.includes('@')
      ? await User.findByEmail(identifier)
      : await User.findByUsername(identifier);

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

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user: toUserResponse(user) });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error fetching profile.' });
    }
};

exports.linkMinecraft = async (req, res) => {
    const { minecraftUsername, verificationCode } = req.body;
    const userId = req.user.id;

    try {
        if (!minecraftUsername || !verificationCode) {
            return res.status(400).json({ success: false, message: 'Minecraft username and verification code are required.' });
        }

        const pluginUrl = process.env.PLUGIN_API_URL;
        const pluginSecret = process.env.PLUGIN_WEBHOOK_SECRET;

        if (!pluginUrl || !pluginSecret) {
            console.error("Plugin connection details are not set in the backend .env file.");
            return res.status(500).json({ success: false, message: 'Server configuration error.' });
        }
        
        const verificationResponse = await axios.post(
            `${pluginUrl}/verify-code`,
            { username: minecraftUsername, code: verificationCode },
            { headers: { 'Authorization': `Bearer ${pluginSecret}` } }
        );

        const { success, uuid } = verificationResponse.data;

        if (!success || !uuid) {
            return res.status(400).json({ success: false, message: verificationResponse.data.message || 'Verification failed.' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Website user not found.' });
        }

        await user.update({ minecraft_uuid: uuid, is_verified: true });
        
        const updatedUser = await User.findById(userId);

        res.status(200).json({ 
            success: true, 
            message: 'Minecraft account linked successfully!', 
            user: toUserResponse(updatedUser) 
        });

    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || 'An error occurred during verification with the game server.'
            });
        }
        console.error('Error in linkMinecraft:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(200).json({ success: true, message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await user.update({
            reset_password_token: hashedToken,
            reset_password_expire: resetExpire,
        });
        
        console.log(`Password reset token for ${email}: ${resetToken}`);
        res.status(200).json({ success: true, message: `If a user with that email exists, a password reset link has been sent.` });

    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Please provide a token and a new password.' });
        }
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const q = query(collection(FIREBASE_DB, 'users'), where('reset_password_token', '==', hashedToken), where('reset_password_expire', '>', new Date()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        const userDoc = querySnapshot.docs[0];
        const user = new User({ id: userDoc.id, ...userDoc.data() });

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
