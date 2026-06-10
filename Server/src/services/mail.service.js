const nodemailer = require('nodemailer');

/**
 * Send an email using Nodemailer
 * @param {Object} options - Mail options { email, subject, resetUrl, username }
 */
const sendEmail = async (options) => {
    const { email, subject, resetUrl, username } = options;

    const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;

    // Premium HTML email template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #020617;
                color: #f8fafc;
            }
            .wrapper {
                width: 100%;
                table-layout: fixed;
                background-color: #020617;
                padding: 40px 0;
            }
            .content-table {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #0f172a;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
                overflow: hidden;
            }
            .header {
                padding: 40px 40px 20px 40px;
                text-align: center;
            }
            .logo-text {
                font-size: 24px;
                font-weight: 800;
                background: linear-gradient(to right, #60a5fa, #a855f7);
                color: #3b82f6;
                text-decoration: none;
                letter-spacing: -0.5px;
            }
            .body-section {
                padding: 0 40px 40px 40px;
            }
            h1 {
                font-size: 22px;
                font-weight: 700;
                color: #f8fafc;
                margin-top: 0;
                margin-bottom: 16px;
            }
            p {
                font-size: 15px;
                line-height: 1.6;
                color: #94a3b8;
                margin-top: 0;
                margin-bottom: 24px;
            }
            .button-container {
                text-align: center;
                margin-bottom: 30px;
                margin-top: 30px;
            }
            .btn-gradient {
                display: inline-block;
                padding: 14px 30px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: #ffffff !important;
                font-size: 15px;
                font-weight: 600;
                text-decoration: none;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .divider {
                border: 0;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                margin: 30px 0;
            }
            .footer {
                padding: 0 40px 40px 40px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
            }
            .footer a {
                color: #60a5fa;
                text-decoration: none;
            }
            .fallback-link {
                word-break: break-all;
                font-size: 13px;
                color: #3b82f6;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <table class="content-table" role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                    <td>
                        <div class="header">
                            <span class="logo-text">META API PROJECT</span>
                        </div>
                        <div class="body-section">
                            <h1>Hello ${username || 'User'},</h1>
                            <p>We received a request to reset your password. Click the button below to set up a new password for your account. This link will expire in 1 hour.</p>
                            
                            <div class="button-container">
                                <a href="${resetUrl}" class="btn-gradient" target="_blank">Reset Password</a>
                            </div>
                            
                            <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                            <p class="fallback-link"><a href="${resetUrl}" style="color: #60a5fa;">${resetUrl}</a></p>
                            
                            <hr class="divider">
                            
                            <p style="font-size: 13px; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Meta API Project. All rights reserved.</p>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    `;

    if (!hasSmtpConfig) {
        console.log('\n==================================================');
        console.log('📧 EMAIL NOTIFICATION FALLBACK (SMTP not configured)');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('==================================================\n');
        return { success: true, loggedToConsole: true };
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || `"Meta API Project" <noreply@metaapiproject.com>`,
        to: email,
        subject: subject,
        html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
};

module.exports = sendEmail;
