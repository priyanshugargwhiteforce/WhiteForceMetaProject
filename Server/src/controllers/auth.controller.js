const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../services/mail.service');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL ERROR: JWT_SECRET is not defined in .env file');
        throw new Error('Internal server configuration error');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, invite_token } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all fields' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        let assignedManagerId = null;
        let assignedRole = 'user';

        if (invite_token) {
            try {
                const decoded = jwt.verify(invite_token, process.env.JWT_SECRET);
                if (decoded.type === 'team_invite' && decoded.manager_id) {
                    if (decoded.creator_role === 'admin') {
                        // Admin invites create Manager accounts
                        assignedRole = 'manager';
                        assignedManagerId = null;
                    } else {
                        // Manager invites create Team Member accounts linked to that Manager
                        assignedRole = 'user';
                        assignedManagerId = decoded.manager_id;
                    }
                }
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(410).json({
                        success: false,
                        message: 'Invitation link has expired (10-minute limit). Please ask for a new link.'
                    });
                }
                return res.status(400).json({ success: false, message: 'Invalid invitation link.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.create({
            username,
            email,
            password: hashedPassword,
            role: assignedRole,
            manager_id: assignedManagerId
        });

        const token = generateToken(userId);

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, username, email, role: assignedRole, status: 'active', manager_id: assignedManagerId }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Generate a 10-minute Team Invitation Token for Manager/Admin
// @route   POST /api/auth/generate-invite
// @access  Private (Manager or Admin)
exports.generateInviteToken = async (req, res) => {
    try {
        const { id, username, role } = req.user;
        if (role !== 'manager' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Managers or Administrators can generate team invitation links.'
            });
        }

        const inviteToken = jwt.sign(
            { manager_id: id, manager_name: username, creator_role: role, type: 'team_invite' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.status(200).json({
            success: true,
            invite_token: inviteToken,
            expires_in_seconds: 600,
            manager_id: id,
            manager_name: username,
            creator_role: role,
            target_role: role === 'admin' ? 'manager' : 'user'
        });
    } catch (error) {
        console.error('generateInviteToken Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Validate a Team Invitation Token
// @route   GET /api/auth/validate-invite-token
// @access  Public
exports.validateInviteToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Invitation token is required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(410).json({
                    success: false,
                    expired: true,
                    message: 'This invitation link has expired (10-minute validity limit). Please request a new link.'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid invitation link.'
            });
        }

        if (decoded.type !== 'team_invite' || !decoded.manager_id) {
            return res.status(400).json({ success: false, message: 'Invalid team invitation token payload.' });
        }

        res.status(200).json({
            success: true,
            manager_id: decoded.manager_id,
            manager_name: decoded.manager_name || 'Manager',
            creator_role: decoded.creator_role || 'manager',
            target_role: decoded.creator_role === 'admin' ? 'manager' : 'user'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `User account is ${user.status}. Please contact admin.` });
        }

        const token = generateToken(user.id);

        res.status(200).json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email' });
        }

        // Specific condition: admin cannot reset password via email
        if (user.role === 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Password reset via email is disabled for Admin accounts.' 
            });
        }

        // Generate token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Update user
        await User.update(user.id, {
            reset_token: resetToken,
            reset_token_expiry: tokenExpiry
        });

        // Construct reset URL
        const frontendUrl = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        // Send email
        const mailResult = await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            resetUrl,
            username: user.username
        });

        const responseObj = {
            success: true,
            message: 'Password reset email sent successfully.'
        };

        // If in development mode and SMTP not configured, return reset token in response to make testing easier!
        if (process.env.NODE_ENV === 'development' && mailResult.loggedToConsole) {
            responseObj.testResetUrl = resetUrl;
            responseObj.debug = 'SMTP not configured, reset URL printed to server console and sent in this response.';
        }

        res.status(200).json(responseObj);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Please provide a new password' });
        }

        // Find user by token
        const user = await User.findByResetToken(token);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password and clear token fields
        await User.update(user.id, {
            password: hashedPassword,
            reset_token: null,
            reset_token_expiry: null
        });

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now log in.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
