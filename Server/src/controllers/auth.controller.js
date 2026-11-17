const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../services/mail.service');
const { pool } = require('../config/db');

const INVITE_REVOKED_MESSAGE = 'This invitation link has been deactivated by the administrator. Please request a new link.';

// Admin "Manager Registration Links" carry a `jti` and have NO time expiry:
// they stay valid until an admin revokes them. Manager team links (no jti) keep the 10-minute JWT expiry.
const isInviteRevoked = async (decoded) => {
    if (!decoded || !decoded.jti) return false;
    const [[invite]] = await pool.query('SELECT status FROM registration_invites WHERE jti = ? LIMIT 1', [decoded.jti]);
    return !invite || invite.status !== 'active';
};

// Re-creates the same signed link for a stored admin invite (deterministic: same payload + same iat)
const buildAdminInviteToken = (invite, managerName) => jwt.sign(
    {
        manager_id: invite.created_by,
        manager_name: managerName,
        creator_role: 'admin',
        type: 'team_invite',
        jti: invite.jti,
        iat: invite.issued_at
    },
    process.env.JWT_SECRET
);

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
        let usedInviteJti = null;

        if (invite_token) {
            try {
                const decoded = jwt.verify(invite_token, process.env.JWT_SECRET);
                if (decoded.type === 'team_invite' && decoded.manager_id) {
                    if (await isInviteRevoked(decoded)) {
                        return res.status(410).json({ success: false, message: INVITE_REVOKED_MESSAGE });
                    }
                    usedInviteJti = decoded.jti || null;
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

        if (usedInviteJti) {
            try {
                await pool.query(
                    'UPDATE registration_invites SET used_count = used_count + 1, last_used_at = NOW() WHERE jti = ?',
                    [usedInviteJti]
                );
            } catch (e) {
                console.error('Failed to update invite usage count:', e.message);
            }
        }

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

        // Admin -> Manager Registration Link: no time expiry, stays active until an admin expires it manually
        if (role === 'admin') {
            const invite = {
                jti: crypto.randomBytes(16).toString('hex'),
                created_by: id,
                issued_at: Math.floor(Date.now() / 1000)
            };
            const [result] = await pool.query(
                'INSERT INTO registration_invites (jti, created_by, creator_role, issued_at) VALUES (?, ?, ?, ?)',
                [invite.jti, invite.created_by, 'admin', invite.issued_at]
            );
            return res.status(200).json({
                success: true,
                invite_id: result.insertId,
                invite_token: buildAdminInviteToken(invite, username),
                expires_in_seconds: null,
                never_expires: true,
                manager_id: id,
                manager_name: username,
                creator_role: role,
                target_role: 'manager'
            });
        }

        // Manager -> Team Registration Link: unchanged 10-minute validity
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

        if (await isInviteRevoked(decoded)) {
            return res.status(410).json({ success: false, expired: true, message: INVITE_REVOKED_MESSAGE });
        }

        res.status(200).json({
            success: true,
            manager_id: decoded.manager_id,
            manager_name: decoded.manager_name || 'Manager',
            creator_role: decoded.creator_role || 'manager',
            target_role: decoded.creator_role === 'admin' ? 'manager' : 'user',
            never_expires: Boolean(decoded.jti)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    List admin Manager Registration Links (active + recently expired)
// @route   GET /api/auth/invites
// @access  Private (Admin)
exports.getAdminInvites = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ri.id, ri.jti, ri.created_by, ri.issued_at, ri.status, ri.used_count, ri.last_used_at,
                   ri.created_at, ri.revoked_at, creator.username AS created_by_name, revoker.username AS revoked_by_name
            FROM registration_invites ri
            LEFT JOIN users creator ON creator.id = ri.created_by
            LEFT JOIN users revoker ON revoker.id = ri.revoked_by
            WHERE ri.creator_role = 'admin'
            ORDER BY (ri.status = 'active') DESC, ri.created_at DESC
            LIMIT 50
        `);

        const invites = rows.map((r) => ({
            id: r.id,
            status: r.status,
            used_count: r.used_count,
            last_used_at: r.last_used_at,
            created_at: r.created_at,
            created_by_name: r.created_by_name,
            revoked_at: r.revoked_at,
            revoked_by_name: r.revoked_by_name,
            // Link is only returned while active
            invite_token: r.status === 'active' ? buildAdminInviteToken(r, r.created_by_name) : null
        }));

        res.status(200).json({ success: true, invites });
    } catch (error) {
        console.error('getAdminInvites Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Manually expire (revoke) an admin Manager Registration Link
// @route   POST /api/auth/invites/:id/revoke
// @access  Private (Admin)
exports.revokeAdminInvite = async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE registration_invites SET status = 'revoked', revoked_by = ?, revoked_at = NOW()
             WHERE id = ? AND creator_role = 'admin' AND status = 'active'`,
            [req.user.id, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Active invitation link not found (it may already be expired).' });
        }
        res.status(200).json({ success: true, message: 'Invitation link expired successfully. It can no longer be used.' });
    } catch (error) {
        console.error('revokeAdminInvite Error:', error.message);
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
