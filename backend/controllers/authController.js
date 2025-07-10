const UserAuth = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { mojangService } = require('../services/mojangService');
const axios = require('axios');

// Helper to create a consistent user object for API responses
const toUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  isAdmin: user.is_admin === 1,
  isVerified: user.is_verified,
  minecraft_uuid: user.minecraft_uuid
});

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

// @desc    Send verification code to player in-game
// @route   POST /api/v1/auth/send-verification-code
exports.sendVerificationCode = async (req, res) => {
    const { username } = req.body;
    try {
        const spigotWebhookUrl = process.env.SPIGOT_WEBHOOK_URL;
        const spigotSecret = process.env.SPIGOT_SECRET_KEY;
        if (!spigotWebhookUrl || !spigotSecret) {
            return res.status(500).json({ success: false, message: 'Spigot webhook not configured.' });
        }

        const response = await axios.post(`${spigotWebhookUrl}/generate-and-send-code`, 
            { username },
            { headers: { Authorization: `Bearer ${spigotSecret}` } }
        );

        if (response.data.success) {
            res.status(200).json({ success: true, message: 'Verification code sent.' });
        } else {
            res.status(400).json({ success: false, message: response.data.message || 'Failed to send code.' });
        }
    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({ success: false, message: 'Server error sending verification code.' });
    }
};


// @desc    Link Minecraft account
// @route   POST /api/v1/auth/link-minecraft
exports.linkMinecraft = async (req, res) => {
    const { username, verificationCode } = req.body;
    const userId = req.user.id;
    try {
        if (!username || !verificationCode) {
            return res.status(400).json({ success: false, message: 'Minecraft username and verification code are required.' });
        }

        const spigotWebhookUrl = process.env.SPIGOT_WEBHOOK_URL;
        const spigotSecret = process.env.SPIGOT_SECRET_KEY;
        if (!spigotWebhookUrl || !spigotSecret) {
            return res.status(500).json({ success: false, message: 'Spigot webhook not configured.' });
        }

        const response = await axios.post(`${spigotWebhookUrl}/verify-code`, 
            { username, code: verificationCode },
            { headers: { Authorization: `Bearer ${spigotSecret}` } }
        );

        if (response.data.success) {
            const user = await UserAuth.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
            await user.update({ minecraft_uuid: response.data.uuid, is_verified: true });
            res.status(200).json({ success: true, message: 'Minecraft account linked successfully.', user: toUserResponse(user) });
        } else {
            res.status(400).json({ success: false, message: response.data.message || 'Invalid verification code.' });
        }
    } catch (error) {
        console.error('Error in linkMinecraft:', error);
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
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

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