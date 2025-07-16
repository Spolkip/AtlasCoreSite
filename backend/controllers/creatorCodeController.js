// backend/controllers/creatorCodeController.js
const CreatorCode = require('../models/CreatorCode');
const User = require('../models/User'); // Import User model to link codes to users

// @desc    Get all creator codes
// @route   GET /api/v1/creatorcodes
// @access  Private/Admin
exports.getAllCreatorCodes = async (req, res) => {
    try {
        const codes = await CreatorCode.findAll();
        res.status(200).json({ success: true, codes });
    } catch (error) {
        console.error("Error fetching creator codes:", error);
        res.status(500).json({ success: false, message: 'Server error fetching creator codes.' });
    }
};

// @desc    Create a new creator code
// @route   POST /api/v1/creatorcodes
// @access  Private/Admin
exports.createCreatorCode = async (req, res) => {
    try {
        const { code, creatorId, discountType, discountValue, isActive, maxUses, expiryDate } = req.body;

        if (!code || !creatorId) {
            return res.status(400).json({ success: false, message: 'Code and Creator ID are required.' });
        }

        const existingCode = await CreatorCode.findByCode(code);
        if (existingCode) {
            return res.status(400).json({ success: false, message: 'This creator code already exists.' });
        }

        const creatorUser = await User.findById(creatorId);
        if (!creatorUser) {
            return res.status(404).json({ success: false, message: 'Creator user not found.' });
        }
        // Check if the user already has a creator code
        if (creatorUser.creatorCode && creatorUser.creatorCode !== code) { // Allow updating their existing code
            return res.status(400).json({ success: false, message: `This user already has a creator code assigned: ${creatorUser.creatorCode}.` });
        }

        const newCode = new CreatorCode({
            code,
            creatorId,
            discountType,
            discountValue,
            isActive: isActive !== undefined ? isActive : true,
            maxUses,
            expiryDate,
            referralCount: 0 // Initialize to 0
        });
        await newCode.save();

        // Assign this code to the creator user
        await creatorUser.update({ creatorCode: code.toUpperCase() });

        res.status(201).json({ success: true, code: newCode });
    } catch (error) {
        console.error("Error creating creator code:", error);
        res.status(500).json({ success: false, message: 'Server error creating creator code.' });
    }
};

// @desc    Update a creator code
// @route   PUT /api/v1/creatorcodes/:id
// @access  Private/Admin
exports.updateCreatorCode = async (req, res) => {
    try {
        const codeId = req.params.id;
        const updates = req.body;

        const creatorCode = await CreatorCode.findById(codeId);
        if (!creatorCode) {
            return res.status(404).json({ success: false, message: 'Creator code not found.' });
        }

        // Handle creatorId change (if any) to ensure uniqueness
        if (updates.creatorId && updates.creatorId !== creatorCode.creatorId) {
            const newCreatorUser = await User.findById(updates.creatorId);
            if (!newCreatorUser) {
                return res.status(404).json({ success: false, message: 'New creator user not found.' });
            }
            if (newCreatorUser.creatorCode) {
                return res.status(400).json({ success: false, message: `The new creator user already has a code assigned: ${newCreatorUser.creatorCode}.` });
            }
            // Clear old creator's code and set new creator's code
            if (creatorCode.creatorId) {
                const oldCreatorUser = await User.findById(creatorCode.creatorId);
                if (oldCreatorUser) {
                    await oldCreatorUser.update({ creatorCode: null });
                }
            }
            await newCreatorUser.update({ creatorCode: creatorCode.code.toUpperCase() });
        }

        await creatorCode.update(updates);
        res.status(200).json({ success: true, code: creatorCode });
    } catch (error) {
        console.error("Error updating creator code:", error);
        res.status(500).json({ success: false, message: 'Server error updating creator code.' });
    }
};

// @desc    Delete a creator code
// @route   DELETE /api/v1/creatorcodes/:id
// @access  Private/Admin
exports.deleteCreatorCode = async (req, res) => {
    try {
        const codeId = req.params.id;
        const creatorCode = await CreatorCode.findById(codeId);
        if (!creatorCode) {
            return res.status(404).json({ success: false, message: 'Creator code not found.' });
        }

        // Remove the code from the associated creator user
        if (creatorCode.creatorId) {
            const creatorUser = await User.findById(creatorCode.creatorId);
            if (creatorUser) {
                await creatorUser.update({ creatorCode: null });
            }
        }
        await CreatorCode.delete(codeId);
        res.status(200).json({ success: true, message: 'Creator code deleted.' });
    } catch (error) {
        console.error("Error deleting creator code:", error);
        res.status(500).json({ success: false, message: 'Server error deleting creator code.' });
    }
};

// @desc    Apply a creator code (for discounts)
// @route   POST /api/v1/creatorcodes/apply
// @access  Public (applied by any user during checkout)
exports.applyCreatorCode = async (req, res) => {
    const { code, totalAmount } = req.body;
    try {
        const creatorCode = await CreatorCode.findByCode(code);

        if (!creatorCode || !creatorCode.isActive) {
            return res.status(404).json({ success: false, message: 'Creator code not found or is invalid.' });
        }
        if (creatorCode.expiryDate && new Date(creatorCode.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'This code has expired.' });
        }
        if (creatorCode.maxUses !== null && creatorCode.referralCount >= creatorCode.maxUses) { // Use referralCount for maxUses
            return res.status(400).json({ success: false, message: 'This code has reached its usage limit.' });
        }
        // No "already used by user" check here, as creator codes can typically be used by many unique customers.

        let discountAmount = 0;
        if (creatorCode.discountType === 'percentage') {
            discountAmount = (totalAmount * creatorCode.discountValue) / 100;
        } else if (creatorCode.discountType === 'fixed') {
            discountAmount = creatorCode.discountValue;
        }

        const newTotal = Math.max(0, totalAmount - discountAmount);
        
        res.status(200).json({
            success: true,
            discountAmount,
            newTotal,
            codeId: creatorCode.id, // Return ID for order tracking
            message: 'Creator code applied successfully.'
        });

    } catch (error) {
        console.error("Error applying creator code:", error);
        res.status(500).json({ success: false, message: 'Server error applying creator code.' });
    }
};

// @desc    Get a creator code by creatorId
// @route   GET /api/v1/creatorcodes/user/:userId
// @access  Private (accessible by user themselves or admin)
exports.getCreatorCodeByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        // Ensure only the owner or an admin can view this
        if (req.user.id !== userId && req.user.is_admin !== 1) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this creator code.' });
        }

        const creatorUser = await User.findById(userId);
        if (!creatorUser || !creatorUser.creatorCode) {
            return res.status(404).json({ success: false, message: 'No creator code found for this user.' });
        }

        const creatorCode = await CreatorCode.findByCode(creatorUser.creatorCode);
        if (!creatorCode) { // Should not happen if data is consistent, but for safety
            return res.status(404).json({ success: false, message: 'Creator code found for user, but code details missing.' });
        }

        res.status(200).json({ success: true, code: creatorCode });
    } catch (error) {
        console.error("Error fetching creator code by user ID:", error);
        res.status(500).json({ success: false, message: 'Server error fetching creator code.' });
    }
};