const nodemailer = require('nodemailer');

/**
 * Central SMTP configuration.
 * Reads Laravel-style MAIL_* variables first, falls back to legacy SMTP_* variables.
 *
 *   MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
 *   MAIL_ENCRYPTION (tls = STARTTLS on 587, ssl = implicit TLS on 465),
 *   MAIL_FROM_ADDRESS, MAIL_FROM_NAME
 */
const getMailConfig = () => {
    const host = process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587', 10);
    const user = process.env.MAIL_USERNAME || process.env.SMTP_USER;
    let pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;

    // Gmail app passwords are shown with spaces ("abcd efgh ijkl mnop"); spaces are not part of the password
    if (pass && /gmail\.com$/i.test(host)) pass = pass.replace(/\s+/g, '');

    const encryption = String(process.env.MAIL_ENCRYPTION || '').toLowerCase();
    const secure = encryption === 'ssl' || process.env.SMTP_SECURE === 'true' || (!encryption && port === 465);
    const requireTLS = encryption === 'tls' && !secure;

    const fromAddress = process.env.MAIL_FROM_ADDRESS || user;
    const fromName = process.env.MAIL_FROM_NAME;
    let from;
    if (process.env.MAIL_FROM_ADDRESS) {
        from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
    } else if (process.env.SMTP_FROM) {
        from = process.env.SMTP_FROM;
    } else if (fromAddress) {
        from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
    } else {
        from = `"Meta API Project" <noreply@metaapiproject.com>`;
    }

    return { host, port, secure, requireTLS, user, pass, from };
};

const isMailConfigured = () => {
    const { user, pass } = getMailConfig();
    return Boolean(user && pass);
};

const createMailTransporter = () => {
    const { host, port, secure, requireTLS, user, pass } = getMailConfig();
    return nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS,
        auth: { user, pass }
    });
};

const getMailFrom = () => getMailConfig().from;

module.exports = { getMailConfig, isMailConfigured, createMailTransporter, getMailFrom };
