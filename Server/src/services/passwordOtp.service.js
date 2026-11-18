const crypto = require('crypto');
const { pool } = require('../config/db');
const { isMailConfigured, createMailTransporter, getMailFrom } = require('../config/mail');
const { emailShell, escapeHtml, formatIST, getBrandName, getEmailLogoAttachments } = require('../utils/emailLayout');

/**
 * One-time verification codes for password flows.
 *
 * - Codes are 8 characters, mixed letters + digits (no look-alike characters such as O/0, I/1).
 * - Only an HMAC of the code is stored (keyed with JWT_SECRET), never the code itself.
 * - Each code is valid for OTP_TTL_MINUTES, allows OTP_MAX_ATTEMPTS wrong tries and is single-use.
 * - A new code can be requested once every OTP_RESEND_COOLDOWN_SECONDS, max OTP_MAX_PER_HOUR per hour.
 * - Codes are never written to logs.
 */

const PURPOSES = {
    FORGOT_PASSWORD: 'forgot_password',
    ADMIN_CHANGE_PASSWORD: 'admin_change_password'
};

const OTP_LENGTH = 8;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L, O
const DIGITS = '23456789'; // no 0, 1
const ALPHABET = LETTERS + DIGITS;

let tableReady = null;
const ensureTable = () => {
    if (!tableReady) {
        tableReady = pool.query(`
            CREATE TABLE IF NOT EXISTS password_otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                purpose VARCHAR(40) NOT NULL,
                code_hash CHAR(64) NOT NULL,
                sent_to VARCHAR(255) NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                expires_at DATETIME NOT NULL,
                consumed_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_password_otps_lookup (user_id, purpose, consumed_at)
            )
        `).catch((err) => {
            tableReady = null;
            throw err;
        });
    }
    return tableReady;
};

const randomFrom = (chars) => chars[crypto.randomInt(chars.length)];

/** 8 characters, at least 2 letters and 2 digits, shuffled with a CSPRNG. */
const generateCode = () => {
    const chars = [randomFrom(LETTERS), randomFrom(LETTERS), randomFrom(DIGITS), randomFrom(DIGITS)];
    while (chars.length < OTP_LENGTH) chars.push(randomFrom(ALPHABET));
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

/** Accepts "k7qm-4x9p", "K7QM 4X9P" etc. */
const normalizeCode = (input) => String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const formatCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

const hashCode = (purpose, userId, code) => crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'password-otp')
    .update(`${purpose}:${userId}:${code}`)
    .digest('hex');

const maskEmail = (email) => {
    const [local, domain] = String(email || '').split('@');
    if (!domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
};

class OtpError extends Error {
    constructor(message, status = 400, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

/**
 * Creates a new code (invalidating older unused ones for the same user + purpose).
 * Throws OtpError(429) when requested too soon / too often.
 */
const createOtp = async ({ userId, purpose, sentTo }) => {
    await ensureTable();

    const [[recent]] = await pool.query(
        `SELECT
            SUM(created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)) AS last_hour,
            MAX(TIMESTAMPDIFF(SECOND, created_at, NOW()) < ?) AS in_cooldown,
            MIN(TIMESTAMPDIFF(SECOND, created_at, NOW())) AS seconds_since_last
         FROM password_otps
         WHERE user_id = ? AND purpose = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [OTP_RESEND_COOLDOWN_SECONDS, userId, purpose]
    );

    if (Number(recent?.in_cooldown) === 1) {
        const retryAfter = Math.max(1, OTP_RESEND_COOLDOWN_SECONDS - Number(recent.seconds_since_last || 0));
        throw new OtpError(`Please wait ${retryAfter} seconds before requesting a new code.`, 429, { retry_after_seconds: retryAfter });
    }
    if (Number(recent?.last_hour || 0) >= OTP_MAX_PER_HOUR) {
        throw new OtpError('Too many code requests. Please try again after some time.', 429, { retry_after_seconds: 3600 });
    }

    await pool.query(
        'UPDATE password_otps SET consumed_at = NOW() WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL',
        [userId, purpose]
    );

    const code = generateCode();
    const [result] = await pool.query(
        `INSERT INTO password_otps (user_id, purpose, code_hash, sent_to, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [userId, purpose, hashCode(purpose, userId, code), sentTo, OTP_TTL_MINUTES]
    );

    return { id: result.insertId, code };
};

/** Removes a code that could not be delivered, so it neither works nor blocks a retry. */
const discardOtp = async (otpId) => {
    await pool.query('DELETE FROM password_otps WHERE id = ?', [otpId]);
};

/**
 * Verifies and consumes the latest active code.
 * Returns { ok: true } or { ok: false, message, attemptsLeft }.
 */
const verifyOtp = async ({ userId, purpose, code }) => {
    await ensureTable();

    const [[otp]] = await pool.query(
        `SELECT id, code_hash, attempts FROM password_otps
         WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > NOW()
         ORDER BY id DESC LIMIT 1`,
        [userId, purpose]
    );

    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) {
        return { ok: false, message: 'This code has expired or is no longer valid. Please request a new code.', attemptsLeft: 0 };
    }

    const normalized = normalizeCode(code);
    const expected = Buffer.from(otp.code_hash, 'hex');
    const actual = Buffer.from(hashCode(purpose, userId, normalized), 'hex');
    const matches = normalized.length === OTP_LENGTH && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
        await pool.query('UPDATE password_otps SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
        const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - otp.attempts - 1);
        if (attemptsLeft === 0) {
            await pool.query('UPDATE password_otps SET consumed_at = NOW() WHERE id = ?', [otp.id]);
            return { ok: false, message: 'Too many wrong attempts. Please request a new code.', attemptsLeft: 0 };
        }
        return { ok: false, message: `Invalid code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`, attemptsLeft };
    }

    // Single use: only one concurrent request can consume it
    const [consumed] = await pool.query(
        'UPDATE password_otps SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL',
        [otp.id]
    );
    if (consumed.affectedRows !== 1) {
        return { ok: false, message: 'This code has already been used. Please request a new code.', attemptsLeft: 0 };
    }
    return { ok: true };
};

const invalidateOtps = async (userId, purpose) => {
    await ensureTable();
    await pool.query(
        'UPDATE password_otps SET consumed_at = NOW() WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL',
        [userId, purpose]
    );
};

/** Password rules for any newly chosen password. Returns an error message or null. */
const validateNewPassword = (password) => {
    if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters long.';
    if (password.length > 128) return 'Password must be at most 128 characters long.';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must contain at least one letter and one number.';
    return null;
};

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

const codeBlock = (code) => `
  <div style="margin:22px 0;text-align:center;">
    <div style="display:inline-block;padding:16px 26px;border-radius:12px;background:#eef2ff;border:1px dashed #6366f1;">
      <span style="font-family:'Courier New',Consolas,monospace;font-size:30px;font-weight:800;letter-spacing:6px;color:#1e1b4b;">${escapeHtml(formatCode(code))}</span>
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:10px;">Valid for <b>${OTP_TTL_MINUTES} minutes</b> &middot; can be used only once</div>
  </div>`;

const sendMail = async ({ to, subject, html, text }) => {
    if (!isMailConfigured()) {
        throw new OtpError('Email service is not configured on the server. Please contact the administrator.', 503);
    }
    const transporter = createMailTransporter();
    await transporter.sendMail({ from: getMailFrom(), to, subject, html, text, attachments: getEmailLogoAttachments() });
};

const sendForgotPasswordCode = ({ to, username, code }) => sendMail({
    to,
    subject: `${formatCode(code)} is your ${getBrandName()} password reset code`,
    text: `Hi ${username || ''},\n\nYour password reset code is: ${formatCode(code)}\nIt is valid for ${OTP_TTL_MINUTES} minutes and can be used only once.\n\nIf you did not request this, ignore this email - your password will not change. Never share this code with anyone.\n\n${getBrandName()}`,
    html: emailShell({
        title: 'Password reset code',
        bodyHtml: `
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Reset your password</h2>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Hi <b>${escapeHtml(username || 'there')}</b>, we received a request to reset the password of your ${escapeHtml(getBrandName())} account. Enter this verification code on the reset page:</p>
          ${codeBlock(code)}
          <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#334155;">Requested on ${escapeHtml(formatIST())}.</p>
          <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;line-height:1.6;color:#9a3412;">
            <b>Never share this code</b> with anyone, including ${escapeHtml(getBrandName())} staff. If you did not request a password reset, you can ignore this email &mdash; your password will stay the same.
          </div>`
    })
});

const sendAdminChangeCode = ({ to, adminName, adminEmail, code }) => sendMail({
    to,
    subject: `${formatCode(code)} - Admin password change verification (${getBrandName()})`,
    text: `An admin password change was requested.\n\nAdmin: ${adminName} (${adminEmail})\nRequested: ${formatIST()}\n\nVerification code: ${formatCode(code)}\nValid for ${OTP_TTL_MINUTES} minutes, single use.\n\nOnly share this code with the admin if you approve this change. If this was not expected, do not share it and secure the admin account.`,
    html: emailShell({
        title: 'Admin password change verification',
        bodyHtml: `
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Admin password change request</h2>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">A request was made to change the password of an <b>Administrator</b> account. The change will happen only after this code is entered.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0;font-size:13px;color:#334155;">
            <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Admin</td><td style="padding:3px 0;"><b>${escapeHtml(adminName)}</b></td></tr>
            <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Email</td><td style="padding:3px 0;">${escapeHtml(adminEmail)}</td></tr>
            <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Requested</td><td style="padding:3px 0;">${escapeHtml(formatIST())}</td></tr>
          </table>
          ${codeBlock(code)}
          <div style="padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;line-height:1.6;color:#991b1b;">
            Share this code with the admin <b>only if you approve this change</b>. If this request was not expected, do not share the code and secure the admin account immediately.
          </div>`
    })
});

const sendPasswordChangedNotice = ({ to, username, context }) => sendMail({
    to,
    subject: `Your ${getBrandName()} password was changed`,
    text: `Hi ${username || ''},\n\nThe password for ${context} was changed on ${formatIST()}.\nIf you did not do this, contact the administrator immediately.\n\n${getBrandName()}`,
    html: emailShell({
        title: 'Password changed',
        bodyHtml: `
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Password changed</h2>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Hi <b>${escapeHtml(username || 'there')}</b>, the password for <b>${escapeHtml(context)}</b> was changed successfully on ${escapeHtml(formatIST())}.</p>
          <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;line-height:1.6;color:#991b1b;">
            If you did not make this change, contact the administrator immediately.
          </div>`
    })
});

module.exports = {
    PURPOSES,
    OTP_TTL_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS,
    OtpError,
    generateCode,
    normalizeCode,
    maskEmail,
    createOtp,
    discardOtp,
    verifyOtp,
    invalidateOtps,
    validateNewPassword,
    sendForgotPasswordCode,
    sendAdminChangeCode,
    sendPasswordChangedNotice
};
