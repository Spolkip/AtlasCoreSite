// backend/controllers/authController.js
const UserAuth = require('../models/User');
const CreatorCode = require('../models/CreatorCode');
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { collection, getDocs, query, where } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to create a consistent user object for API responses
const toUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  isAdmin: user.is_admin === 1,
  isVerified: user.is_verified,
  minecraft_uuid: user.minecraft_uuid,
  minecraft_username: user.minecraft_username,
  is_profile_public: user.is_profile_public,
  profile_theme: user.profile_theme,
  creatorCode: user.creatorCode,
  points: user.points,
  appliedCreatorCode: user.appliedCreatorCode, // ADDED: Include appliedCreatorCode
});

// Function to call the Minecraft plugin's webhook
const callMinecraftPlugin = async (endpoint, payload) => {
    try {
        const pluginUrl = `http://localhost:${process.env.PLUGIN_PORT || 4567}${endpoint}`;
        const secret = process.env.WEBHOOK_SECRET; 

        if (!secret) {
            throw new Error('WEBHOOK_SECRET is not defined in backend .env');
        }

        const response = await axios.post(pluginUrl, payload, {
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error(`Error calling Minecraft plugin endpoint ${endpoint}:`, error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || `Failed to communicate with Minecraft server: ${error.message}`;
        throw Object.assign(new Error(message), { status });
    }
};

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

exports.googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await UserAuth.findByEmail(email);

        if (!user) {
            // User does not exist, create a new one
            const username = name.replace(/\s/g, '') + Math.random().toString(36).substring(2, 6);
            const newUser = new UserAuth({
                username,
                email,
                // No password for Google-based accounts
            });
            await newUser.save();
            user = newUser;
        }

        const token = jwt.sign({ id: user.id, isAdmin: user.is_admin === 1 }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.status(200).json({
            success: true,
            token,
            user: toUserResponse(user),
        });

    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(401).json({ success: false, message: 'Google authentication failed.' });
    }
};

exports.updateUserDetails = async (req, res) => {
    const { email, is_profile_public, profile_theme } = req.body; 
    try {
        const user = await UserAuth.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updates = {};
        if (email && email !== user.email) {
            updates.email = email;
        }
        if (typeof is_profile_public === 'boolean') {
            updates.is_profile_public = is_profile_public;
        }
        if (profile_theme !== undefined) {
            updates.profile_theme = profile_theme;
        }

        if (Object.keys(updates).length > 0) {
            await user.update(updates);
        }
        
        const updatedUser = await UserAuth.findById(req.user.id);
        res.status(200).json({ success: true, message: 'Details updated successfully', user: toUserResponse(updatedUser) });

    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ success: false, message: 'Server error while updating details.' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
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

exports.sendVerificationCode = async (req, res) => {
    const { username } = req.body;
    try {
        if (!username) {
            return res.status(400).json({ success: false, message: 'Minecraft username is required.' });
        }
        const pluginResponse = await callMinecraftPlugin('/generate-and-send-code', { username });

        if (!pluginResponse.success) {
            return res.status(pluginResponse.status || 500).json({ success: false, message: pluginResponse.message || 'Failed to send verification code in-game.' });
        }
        res.status(200).json({ success: true, message: 'Verification code sent to player in-game.' });
    } catch (error) {
        console.error('Error in sendVerificationCode:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Server error requesting verification code.' });
    }
};

exports.verifyMinecraftLink = async (req, res) => {
    const { username, code } = req.body;
    const userId = req.user.id;
    try {
        if (!username || !code) {
            return res.status(400).json({ success: false, message: 'Minecraft username and verification code are required.' });
        }

        const pluginResponse = await callMinecraftPlugin('/verify-code', { username, code });

        if (!pluginResponse.success) {
            return res.status(pluginResponse.status || 400).json({ success: false, message: pluginResponse.message || 'Invalid or expired verification code.' });
        }

        const minecraftUUID = pluginResponse.uuid;

        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in web database.' });
        }

        await user.update({ 
            minecraft_uuid: minecraftUUID, 
            minecraft_username: username,
            is_verified: true 
        });
        
        const updatedUser = await UserAuth.findById(userId); // Re-fetch the user to get the latest data
        res.status(200).json({ success: true, message: 'Minecraft account linked successfully.', user: toUserResponse(updatedUser) });

    } catch (error) {
        console.error('Error in verifyMinecraftLink:', error);
        res.status(error.status || 500).json({ success: false, message: 'Server error linking Minecraft account.' });
    }
};

exports.unlinkMinecraft = async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await user.update({ 
            minecraft_uuid: '', 
            minecraft_username: '',
            is_verified: false 
        });
        
        const updatedUser = await UserAuth.findById(userId); // Re-fetch the user to get the latest data
        res.status(200).json({ success: true, message: 'Minecraft account unlinked successfully.', user: toUserResponse(updatedUser) });
    } catch (error) {
        console.error('Error in unlinkMinecraft:', error);
        res.status(500).json({ success: false, message: 'Server error unlinking Minecraft account.' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await UserAuth.findByEmail(email);
        if (!user) {
            return res.status(200).json({ success: true, message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpire = new Date(Date.now() + 15 * 60 * 1000);

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
        
        const hashedToken = crypto.createHash('sha512').update(token).digest('hex');

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

// ADDED: New function to generate and assign a creator code to a user
exports.generateCreatorCode = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.creatorCode) {
            return res.status(400).json({ success: false, message: `You already have a creator code: ${user.creatorCode}.` });
        }

        // Generate a unique 8-character alphanumeric code
        let newCode;
        let isCodeUnique = false;
        while (!isCodeUnique) {
            newCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // Generates 8 hex characters
            const existingCreatorCode = await CreatorCode.findByCode(newCode);
            if (!existingCreatorCode) {
                isCodeUnique = true;
            }
        }

        // Create the CreatorCode entry
        const creatorCodeEntry = new CreatorCode({
            code: newCode,
            creatorId: userId,
            discountType: 'percentage', // Default discount type
            discountValue: 10,          // Default 10% discount
            isActive: true,
            maxUses: null,              // Infinite uses by default
            expiryDate: null,           // No expiry by default
            referralCount: 0            // Initial referral count
        });
        await creatorCodeEntry.save();

        // Assign the code to the user
        await user.update({ creatorCode: newCode });
        
        const updatedUser = await UserAuth.findById(userId); // Re-fetch the user to get the latest data
        res.status(200).json({ success: true, message: `Your new creator code is: ${newCode}`, code: newCode, user: toUserResponse(updatedUser) });

    } catch (error) {
        console.error('Error generating creator code:', error);
        res.status(500).json({ success: false, message: 'Server error generating creator code.' });
    }
};

// ADDED: New function to update a user's applied creator code from settings
exports.updateUserAppliedCreatorCode = async (req, res) => {
    const userId = req.user.id;
    const { code } = req.body; // The code the user wants to apply

    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const trimmedCode = code ? code.trim().toUpperCase() : null;

        // Validation for the entered code
        if (trimmedCode && (trimmedCode.length < 4 || trimmedCode.length > 16 || !/^[A-Z0-9]+$/.test(trimmedCode))) {
            return res.status(400).json({ success: false, message: 'Creator code must be 4-16 alphanumeric characters.' });
        }

        // Check if the user is trying to apply their own creator code
        if (user.creatorCode && trimmedCode === user.creatorCode) {
            return res.status(400).json({ success: false, message: 'You cannot apply your own creator code.' });
        }
        
        // Validate if the applied code exists and is active
        let creatorCodeEntry = null;
        if (trimmedCode) {
            creatorCodeEntry = await CreatorCode.findByCode(trimmedCode);
            if (!creatorCodeEntry || !creatorCodeEntry.isActive) {
                return res.status(400).json({ success: false, message: 'The creator code you entered is invalid or inactive.' });
            }
        }

        // Update the user's appliedCreatorCode field
        await user.update({ appliedCreatorCode: trimmedCode });

        const updatedUser = await UserAuth.findById(userId);
        let message = trimmedCode ? `Creator code "${trimmedCode}" applied successfully.` : 'Creator code removed successfully.';
        res.status(200).json({ success: true, message, user: toUserResponse(updatedUser) });

    } catch (error) {
        console.error('Error updating user applied creator code:', error);
        res.status(500).json({ success: false, message: 'Server error updating applied creator code.' });
    }
};