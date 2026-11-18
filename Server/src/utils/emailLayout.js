const path = require('path');
const fs = require('fs');

/**
 * Shared branded layout for all system emails (password codes, security alerts, ...).
 *
 * The logo is a pre-rendered square PNG (white rounded box + logo baked into the image,
 * src/assets/email-logo.png) sent as an inline attachment (cid). Mail apps such as Gmail
 * recolour HTML backgrounds in dark mode but never images, so the logo always looks the same.
 * Set MAIL_LOGO_URL to use a hosted image instead; brand name via MAIL_BRAND_NAME.
 */

const LOGO_CID = 'wf-email-logo@whiteforce';
const LOGO_FILE = path.join(__dirname, '..', 'assets', 'email-logo.png');

const getBrandName = () => (process.env.MAIL_BRAND_NAME || 'White Force Manager').trim();

const useHostedLogo = () => Boolean((process.env.MAIL_LOGO_URL || '').trim()) || !fs.existsSync(LOGO_FILE);
const getLogoSrc = () => (useHostedLogo()
    ? (process.env.MAIL_LOGO_URL || 'https://wfadmanager.astro-buddy.in/api/media/ee234768-bd8f-42b9-a811-20eb8a8d3a2a/preview').trim()
    : `cid:${LOGO_CID}`);

/** Attachments to pass to nodemailer's sendMail together with emailShell() HTML. */
const getEmailLogoAttachments = () => (useHostedLogo()
    ? []
    : [{ filename: 'logo.png', path: LOGO_FILE, cid: LOGO_CID, contentDisposition: 'inline' }]);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const formatIST = (date = new Date()) => date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
}) + ' IST';

/**
 * @param {Object} opts
 * @param {string} opts.title      - <title> of the email
 * @param {string} opts.bodyHtml   - inner HTML of the white card
 * @param {string} [opts.subtitle] - small line under the brand name (default "Account Security")
 * @param {string} [opts.accent]   - header colour theme: 'brand' (blue/purple) or 'alert' (red)
 */
const emailShell = ({ title, bodyHtml, subtitle = 'Account Security', accent = 'brand' }) => {
    const brand = escapeHtml(getBrandName());
    const header = accent === 'alert'
        ? 'background:linear-gradient(135deg,#dc2626,#9333ea);background-color:#dc2626;'
        : 'background:linear-gradient(135deg,#2563eb,#7c3aed);background-color:#2563eb;';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="${header}padding:20px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <img src="${escapeHtml(getLogoSrc())}" alt="${brand}" width="48" height="48" style="display:block;width:48px;height:48px;border:0;outline:none;border-radius:12px;">
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:800;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;">${brand}</div>
              <div style="font-size:12px;color:#e0e7ff;margin-top:2px;">${escapeHtml(subtitle)}</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
          This is an automated email from ${brand}. Please do not reply.<br>&copy; ${new Date().getFullYear()} ${brand}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

module.exports = { emailShell, escapeHtml, formatIST, getBrandName, getEmailLogoAttachments };
