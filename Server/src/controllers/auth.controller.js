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
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all fields' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.create({ username, email, password: hashedPassword });

        const token = generateToken(userId);

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, username, email, role: 'user', status: 'active' }
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
