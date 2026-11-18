const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const otpService = require('../services/passwordOtp.service');
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

const INVITE_REQUIRED_MESSAGE = 'Registration is by invitation only. Please ask your Admin or Manager for a registration link.';
const INVITER_INACTIVE_MESSAGE = 'This invitation link is no longer valid. Please ask your Admin or Manager for a new link.';

// The person who created the link must still exist, be active and have the right role
const isInviterActive = async (decoded) => {
    const inviter = await User.findById(decoded.manager_id);
    if (!inviter || inviter.status !== 'active') return false;
    if (decoded.creator_role === 'admin') return inviter.role === 'admin';
    return inviter.role === 'manager' || inviter.role === 'admin';
};

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

        // Invitation only: an account can be created only through a link shared by an Admin or Manager
        if (!invite_token) {
            return res.status(403).json({ success: false, invite_required: true, message: INVITE_REQUIRED_MESSAGE });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        let assignedManagerId = null;
        let assignedRole = 'user';
        let usedInviteJti = null;

        let decoded;
        try {
            decoded = jwt.verify(invite_token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(410).json({
                    success: false,
                    message: 'Invitation link has expired (10-minute limit). Please ask for a new link.'
                });
            }
            return res.status(400).json({ success: false, message: 'Invalid invitation link.' });
        }

        if (decoded.type !== 'team_invite' || !decoded.manager_id) {
            return res.status(400).json({ success: false, message: 'Invalid invitation link.' });
        }
        if (await isInviteRevoked(decoded)) {
            return res.status(410).json({ success: false, message: INVITE_REVOKED_MESSAGE });
        }
        if (!(await isInviterActive(decoded))) {
            return res.status(410).json({ success: false, message: INVITER_INACTIVE_MESSAGE });
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
        if (!(await isInviterActive(decoded))) {
            return res.status(410).json({ success: false, expired: true, message: INVITER_INACTIVE_MESSAGE });
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

/* ------------------------------------------------------------------ */
/* Forgot password (users & managers) - verification code by email     */
/* ------------------------------------------------------------------ */

const RESET_SESSION_MINUTES = 15;

const hashResetToken = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const sendOtpError = (res, error) => {
    if (error instanceof otpService.OtpError) {
        return res.status(error.status).json({ success: false, message: error.message, ...error.extra });
    }
    console.error('[Password OTP] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

// Step 1: request a code. The email must belong to a registered, active user/manager account.
exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim();
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'This email is not registered. Please check the email address and try again.' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Password reset via email is disabled for Admin accounts. Please use Change Password in your Profile.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `This account is ${user.status}. Please contact your Admin.` });
        }

        const otp = await otpService.createOtp({ userId: user.id, purpose: otpService.PURPOSES.FORGOT_PASSWORD, sentTo: user.email });

        try {
            await otpService.sendForgotPasswordCode({ to: user.email, username: user.username, code: otp.code });
        } catch (mailError) {
            await otpService.discardOtp(otp.id).catch(() => {});
            console.error(`[Password OTP] Could not send forgot-password code to user ${user.id}:`, mailError.message);
            return res.status(503).json({ success: false, message: 'Could not send the verification email right now. Please try again later.' });
        }

        return res.status(200).json({
            success: true,
            message: `Verification code sent to ${user.email}. The code is valid for ${otpService.OTP_TTL_MINUTES} minutes.`,
            otp_flow: true,
            expires_in_seconds: otpService.OTP_TTL_MINUTES * 60,
            resend_after_seconds: otpService.OTP_RESEND_COOLDOWN_SECONDS
        });
    } catch (error) {
        return sendOtpError(res, error);
    }
};

// Step 2: verify the code. Returns a short-lived reset token used by /reset-password/:token.
exports.verifyForgotPasswordCode = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim();
        const code = req.body?.code;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Please provide your email and the verification code.' });
        }

        const user = await User.findByEmail(email);
        if (!user || user.role === 'admin' || user.status !== 'active') {
            return res.status(400).json({ success: false, message: 'This code has expired or is no longer valid. Please request a new code.' });
        }

        const result = await otpService.verifyOtp({ userId: user.id, purpose: otpService.PURPOSES.FORGOT_PASSWORD, code });
        if (!result.ok) {
            return res.status(400).json({ success: false, message: result.message, attempts_left: result.attemptsLeft });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        await User.update(user.id, {
            reset_token: hashResetToken(resetToken),
            reset_token_expiry: new Date(Date.now() + RESET_SESSION_MINUTES * 60 * 1000)
        });

        return res.status(200).json({
            success: true,
            message: 'Code verified. Please set your new password.',
            reset_token: resetToken,
            expires_in_seconds: RESET_SESSION_MINUTES * 60
        });
    } catch (error) {
        return sendOtpError(res, error);
    }
};

// Step 3: set the new password (also still accepts reset links emailed before this update)
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Please provide a new password' });
        }

        const passwordError = otpService.validateNewPassword(password);
        if (passwordError) {
            return res.status(400).json({ success: false, message: passwordError });
        }

        // New tokens are stored hashed; older emailed links stored the raw token
        const user = (await User.findByResetToken(hashResetToken(token))) || (await User.findByResetToken(token));
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset session. Please start again.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.update(user.id, {
            password: hashedPassword,
            reset_token: null,
            reset_token_expiry: null
        });
        await otpService.invalidateOtps(user.id, otpService.PURPOSES.FORGOT_PASSWORD).catch(() => {});

        otpService.sendPasswordChangedNotice({ to: user.email, username: user.username, context: 'your account' })
            .catch((err) => console.error(`[Password OTP] Could not send password-changed notice to user ${user.id}:`, err.message));

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now log in.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ------------------------------------------------------------------ */
/* Admin change password - OTP goes to IT support                      */
/* ------------------------------------------------------------------ */

const getAdminOtpEmail = () => (process.env.ADMIN_PASSWORD_OTP_EMAIL || 'itsupport@white-force.in').trim();

// Slows down guessing of the current password with a stolen session
const CURRENT_PASSWORD_MAX_FAILS = 5;
const CURRENT_PASSWORD_LOCK_MS = 15 * 60 * 1000;
const currentPasswordFails = new Map(); // userId -> { count, until }

const checkCurrentPassword = async (userId, email, currentPassword) => {
    const entry = currentPasswordFails.get(userId);
    if (entry && entry.until > Date.now() && entry.count >= CURRENT_PASSWORD_MAX_FAILS) {
        throw new otpService.OtpError('Too many wrong current-password attempts. Please try again after 15 minutes.', 429);
    }

    const fullUser = await User.findByEmail(email);
    const ok = Boolean(fullUser && currentPassword && await bcrypt.compare(String(currentPassword), fullUser.password));
    if (!ok) {
        const fresh = entry && entry.until > Date.now() ? entry : { count: 0, until: Date.now() + CURRENT_PASSWORD_LOCK_MS };
        fresh.count += 1;
        currentPasswordFails.set(userId, fresh);
        throw new otpService.OtpError('Current password is incorrect.', 400);
    }
    currentPasswordFails.delete(userId);
    return fullUser;
};

// Step 1: verify current password and email a code to IT support
exports.requestAdminPasswordChangeOtp = async (req, res) => {
    try {
        const { currentPassword } = req.body || {};
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Please enter your current password.' });
        }

        const admin = await checkCurrentPassword(req.user.id, req.user.email, currentPassword);
        const sendTo = getAdminOtpEmail();

        const otp = await otpService.createOtp({ userId: admin.id, purpose: otpService.PURPOSES.ADMIN_CHANGE_PASSWORD, sentTo: sendTo });
        try {
            await otpService.sendAdminChangeCode({ to: sendTo, adminName: admin.username, adminEmail: admin.email, code: otp.code });
        } catch (mailError) {
            await otpService.discardOtp(otp.id).catch(() => {});
            console.error(`[Password OTP] Could not send admin change-password code for user ${admin.id}:`, mailError.message);
            if (mailError instanceof otpService.OtpError) throw mailError;
            return res.status(503).json({ success: false, message: 'Could not send the verification email right now. Please try again later.' });
        }

        return res.status(200).json({
            success: true,
            message: `Verification code sent to ${otpService.maskEmail(sendTo)}. Ask IT support for the code.`,
            sent_to: otpService.maskEmail(sendTo),
            expires_in_seconds: otpService.OTP_TTL_MINUTES * 60,
            resend_after_seconds: otpService.OTP_RESEND_COOLDOWN_SECONDS
        });
    } catch (error) {
        return sendOtpError(res, error);
    }
};

// Step 2: verify code + current password, then change the password
exports.confirmAdminPasswordChange = async (req, res) => {
    try {
        const { currentPassword, newPassword, code } = req.body || {};
        if (!currentPassword || !newPassword || !code) {
            return res.status(400).json({ success: false, message: 'Please enter the current password, new password and verification code.' });
        }

        const passwordError = otpService.validateNewPassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ success: false, message: passwordError });
        }

        const admin = await checkCurrentPassword(req.user.id, req.user.email, currentPassword);
        if (await bcrypt.compare(String(newPassword), admin.password)) {
            return res.status(400).json({ success: false, message: 'New password must be different from the current password.' });
        }

        const result = await otpService.verifyOtp({ userId: admin.id, purpose: otpService.PURPOSES.ADMIN_CHANGE_PASSWORD, code });
        if (!result.ok) {
            return res.status(400).json({ success: false, message: result.message, attempts_left: result.attemptsLeft });
        }

        await User.update(admin.id, {
            password: await bcrypt.hash(String(newPassword), 10),
            reset_token: null,
            reset_token_expiry: null
        });
        console.log(`[Password OTP] Admin password changed for user ${admin.id}.`);

        otpService.sendPasswordChangedNotice({ to: getAdminOtpEmail(), username: 'IT Support', context: `admin account ${admin.username} (${admin.email})` })
            .catch((err) => console.error('[Password OTP] Could not send admin password-changed notice:', err.message));

        return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        return sendOtpError(res, error);
    }
};
