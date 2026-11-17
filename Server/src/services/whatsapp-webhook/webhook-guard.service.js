/**
 * WhatsApp Webhook Guard
 *
 * Periodically verifies (via Meta Graph API) that nobody has redirected this project's
 * WhatsApp webhooks to an unknown server:
 *   1. WABA-level `override_callback_uri` on /{waba_id}/subscribed_apps  -> auto-removed + alert
 *   2. Unknown apps subscribed to the WABA                               -> alert
 *   3. Phone-number-level webhook override                               -> alert
 *   4. App callback URL differs from WEBHOOK_GUARD_EXPECTED_APP_URL       -> alert
 *
 * Env (all optional):
 *   WEBHOOK_GUARD_ENABLED=false                  disable the guard
 *   WEBHOOK_GUARD_CRON="*\/10 * * * *"           schedule (default every 10 minutes)
 *   WEBHOOK_GUARD_AUTO_FIX=false                 only alert, do not remove overrides
 *   WEBHOOK_GUARD_ALLOWED_OVERRIDE_URLS=a,b      override URLs that are legitimate
 *   WEBHOOK_GUARD_ALLOWED_APP_IDS=id1,id2        app IDs allowed to be subscribed (default: app of the stored token)
 *   WEBHOOK_GUARD_EXPECTED_APP_URL=https://...   expected app callback URL
 *   WEBHOOK_GUARD_ALERT_EMAILS=a@x.com,b@y.com   alert recipients (default: active admin users)
 */
const cron = require('node-cron');
const axios = require('axios');
const { pool } = require('../../config/db');
const { getMailConfig, isMailConfigured, createMailTransporter, getMailFrom } = require('../../config/mail');
const { resolveWhatsAppConfig } = require('../whatsapp.service');

const GRAPH = 'https://graph.facebook.com/v24.0';
const REQUEST_TIMEOUT_MS = 20000;
const ALERT_THROTTLE_MS = 30 * 60 * 1000;        // same incident: max 1 email / 30 min
const ERROR_ALERT_THROTTLE_MS = 6 * 60 * 60 * 1000; // "guard cannot check": max 1 email / 6 h

const lastAlertAt = new Map();
let isRunning = false;

const listEnv = (name) => (process.env[name] || '').split(',').map((s) => s.trim()).filter(Boolean);
const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '').toLowerCase();
const isAllowedOverride = (uri) =>
    listEnv('WEBHOOK_GUARD_ALLOWED_OVERRIDE_URLS').map(normalizeUrl).includes(normalizeUrl(uri));
const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const metaErrorMessage = (err) => err.response?.data?.error?.message || err.message;

const shouldAlert = (key, throttleMs) => {
    const now = Date.now();
    if (now - (lastAlertAt.get(key) || 0) < throttleMs) return false;
    lastAlertAt.set(key, now);
    return true;
};

const getAlertRecipients = async () => {
    const fromEnv = listEnv('WEBHOOK_GUARD_ALERT_EMAILS');
    if (fromEnv.length) return fromEnv;
    try {
        const [rows] = await pool.query(
            "SELECT email FROM users WHERE role = 'admin' AND status = 'active' AND email IS NOT NULL AND email <> ''"
        );
        const emails = rows.map((r) => r.email);
        if (emails.length) return emails;
    } catch (err) {
        console.error('[Webhook Guard] Could not load admin emails:', err.message);
    }
    const { user } = getMailConfig();
    return user ? [user] : [];
};

const sendAlert = async (subject, lines) => {
    console.error(`[Webhook Guard] ALERT: ${subject}\n  - ${lines.join('\n  - ')}`);

    if (!isMailConfigured()) {
        console.warn('[Webhook Guard] SMTP not configured; alert written to logs only.');
        return;
    }
    try {
        const to = await getAlertRecipients();
        if (!to.length) {
            console.warn('[Webhook Guard] No alert recipients found; alert written to logs only.');
            return;
        }
        const transporter = createMailTransporter();
        await transporter.sendMail({
            from: getMailFrom(),
            to: to.join(','),
            subject: `[SECURITY] ${subject}`,
            text: `${subject}\n\n- ${lines.join('\n- ')}\n\nTime: ${new Date().toISOString()}`,
            html: `<h3 style="color:#b91c1c">${escapeHtml(subject)}</h3>`
                + `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
                + `<p style="color:#64748b">Time: ${new Date().toISOString()}</p>`
        });
        console.log(`[Webhook Guard] Alert email sent to ${to.length} recipient(s).`);
    } catch (err) {
        console.error('[Webhook Guard] Failed to send alert email:', err.message);
    }
};

const getSuspiciousOverrides = (subscriptions) =>
    subscriptions.filter((s) => s.override_callback_uri && !isAllowedOverride(s.override_callback_uri));

const getAllowedAppIds = async (token, auth) => {
    const fromEnv = listEnv('WEBHOOK_GUARD_ALLOWED_APP_IDS');
    if (fromEnv.length) return fromEnv;
    const { data } = await axios.get('https://graph.facebook.com/debug_token', {
        ...auth,
        params: { input_token: token }
    });
    return data?.data?.app_id ? [String(data.data.app_id)] : [];
};

const checkWaba = async (wabaId, configId, phoneIds) => {
    const { token } = await resolveWhatsAppConfig(configId);
    if (!token) throw new Error(`No access token available for config ${configId}`);
    const auth = { headers: { Authorization: `Bearer ${token}` }, timeout: REQUEST_TIMEOUT_MS };
    const issues = [];

    // 1. WABA-level override callback URL
    const { data: subsRes } = await axios.get(`${GRAPH}/${wabaId}/subscribed_apps`, auth);
    const subscriptions = subsRes?.data || [];
    const suspicious = getSuspiciousOverrides(subscriptions);

    if (suspicious.length) {
        const uris = [...new Set(suspicious.map((s) => s.override_callback_uri))];
        let fixed = false;
        let fixError = null;

        if (process.env.WEBHOOK_GUARD_AUTO_FIX !== 'false') {
            try {
                // POST without override params resets this app's subscription to the app's default callback URL
                await axios.post(`${GRAPH}/${wabaId}/subscribed_apps`, null, auth);
                const { data: afterRes } = await axios.get(`${GRAPH}/${wabaId}/subscribed_apps`, auth);
                fixed = getSuspiciousOverrides(afterRes?.data || []).length === 0;
                if (!fixed) fixError = 'Override still present after reset (it may belong to another app subscription).';
            } catch (err) {
                fixError = metaErrorMessage(err);
            }
        } else {
            fixError = 'Auto-fix disabled (WEBHOOK_GUARD_AUTO_FIX=false).';
        }

        const subject = fixed
            ? `Unauthorized WhatsApp webhook override REMOVED (WABA ${wabaId})`
            : `Unauthorized WhatsApp webhook override DETECTED (WABA ${wabaId}) - NOT removed`;
        if (shouldAlert(`override:${wabaId}:${uris.join('|')}:${fixed}`, ALERT_THROTTLE_MS)) {
            await sendAlert(subject, [
                `WABA ID: ${wabaId}`,
                `Override URL(s) found: ${uris.join(', ')}`,
                fixed ? 'Action: override removed automatically; webhooks restored to the app callback URL.'
                      : `Action failed: ${fixError}`,
                'Someone with access to an access token or the Business Manager set this. Revoke/rotate tokens and audit Business Manager access.'
            ]);
        } else {
            console.warn(`[Webhook Guard] ${subject} (alert throttled)`);
        }
        issues.push('override');
    }

    // 2. Unknown apps subscribed to the WABA
    try {
        const allowedAppIds = await getAllowedAppIds(token, auth);
        if (allowedAppIds.length) {
            const unknownApps = subscriptions
                .map((s) => s.whatsapp_business_api_data || {})
                .filter((app) => app.id && !allowedAppIds.includes(String(app.id)));
            if (unknownApps.length) {
                const desc = unknownApps.map((a) => `${a.name || 'unknown'} (${a.id})`).join(', ');
                if (shouldAlert(`apps:${wabaId}:${desc}`, ALERT_THROTTLE_MS)) {
                    await sendAlert(`Unknown app subscribed to WhatsApp WABA ${wabaId}`, [
                        `WABA ID: ${wabaId}`,
                        `Unknown subscribed app(s): ${desc}`,
                        'Unknown apps receive this WABA\'s webhooks. Remove them in Business Settings > WhatsApp Accounts if not yours,',
                        'or add their IDs to WEBHOOK_GUARD_ALLOWED_APP_IDS if they are legitimate.'
                    ]);
                }
                issues.push('unknown-app');
            }
        }
    } catch (err) {
        console.warn(`[Webhook Guard] Could not verify subscribed app IDs for WABA ${wabaId}:`, metaErrorMessage(err));
    }

    // 3 & 4. Phone-number-level override and app callback URL
    const expectedAppUrl = process.env.WEBHOOK_GUARD_EXPECTED_APP_URL;
    for (const phoneId of phoneIds) {
        try {
            const { data: phone } = await axios.get(`${GRAPH}/${phoneId}`, {
                ...auth,
                params: { fields: 'webhook_configuration' }
            });
            const wc = phone?.webhook_configuration || {};

            if (wc.phone_number && !isAllowedOverride(wc.phone_number)) {
                if (shouldAlert(`phone:${phoneId}:${wc.phone_number}`, ALERT_THROTTLE_MS)) {
                    await sendAlert(`Unauthorized webhook override on WhatsApp phone number ${phoneId}`, [
                        `Phone Number ID: ${phoneId}`,
                        `Override URL: ${wc.phone_number}`,
                        'Not removed automatically. Remove it via Graph API / WhatsApp Manager and rotate tokens.'
                    ]);
                }
                issues.push('phone-override');
            }

            if (expectedAppUrl && wc.application && normalizeUrl(wc.application) !== normalizeUrl(expectedAppUrl)) {
                if (shouldAlert(`appurl:${phoneId}:${wc.application}`, ALERT_THROTTLE_MS)) {
                    await sendAlert('WhatsApp app webhook callback URL changed', [
                        `Phone Number ID: ${phoneId}`,
                        `Current app callback URL: ${wc.application}`,
                        `Expected: ${expectedAppUrl}`,
                        'Check the Webhooks settings of the Meta app in developers.facebook.com.'
                    ]);
                }
                issues.push('app-url');
            }
        } catch (err) {
            console.warn(`[Webhook Guard] Could not check phone ${phoneId}:`, metaErrorMessage(err));
        }
    }

    return issues;
};

const runWebhookGuard = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
        const [configs] = await pool.query('SELECT id, waba_id, phone_number_id FROM whatsapp_configs ORDER BY id ASC');
        const byWaba = new Map();
        for (const cfg of configs) {
            if (!cfg.waba_id) continue;
            if (!byWaba.has(cfg.waba_id)) byWaba.set(cfg.waba_id, { configId: cfg.id, phoneIds: new Set() });
            if (cfg.phone_number_id) byWaba.get(cfg.waba_id).phoneIds.add(cfg.phone_number_id);
        }

        let issueCount = 0;
        let failedCount = 0;
        for (const [wabaId, { configId, phoneIds }] of byWaba) {
            try {
                const issues = await checkWaba(wabaId, configId, [...phoneIds]);
                issueCount += issues.length;
                if (issues.length === 0) {
                    console.log(`[Webhook Guard] WABA ${wabaId} (config ${configId}) OK - no webhook overrides.`);
                }
            } catch (err) {
                failedCount++;
                const msg = metaErrorMessage(err);
                console.error(`[Webhook Guard] Could not check WABA ${wabaId}:`, msg);
                if (shouldAlert(`error:${wabaId}`, ERROR_ALERT_THROTTLE_MS)) {
                    await sendAlert(`Webhook guard cannot verify WhatsApp WABA ${wabaId}`, [
                        `WABA ID: ${wabaId} (config ${configId})`,
                        `Error: ${msg}`,
                        'Webhook hijacking cannot be detected until this is fixed (e.g. update the access token in WhatsApp Settings).'
                    ]);
                }
            }
        }

        if (issueCount === 0 && failedCount === 0) {
            console.log(`[Webhook Guard] OK - ${byWaba.size} WABA(s) checked, no webhook overrides found.`);
        }
    } catch (err) {
        console.error('[Webhook Guard] Run failed:', err.message);
    } finally {
        isRunning = false;
    }
};

const initWebhookGuardCron = () => {
    if (process.env.WEBHOOK_GUARD_ENABLED === 'false') {
        console.log('[Webhook Guard] Disabled via WEBHOOK_GUARD_ENABLED=false');
        return;
    }
    let schedule = process.env.WEBHOOK_GUARD_CRON || '*/10 * * * *';
    if (!cron.validate(schedule)) {
        console.warn(`[Webhook Guard] Invalid WEBHOOK_GUARD_CRON "${schedule}", using every 10 minutes.`);
        schedule = '*/10 * * * *';
    }
    cron.schedule(schedule, runWebhookGuard);
    setTimeout(runWebhookGuard, 30 * 1000); // first check shortly after startup
    console.log(`[Webhook Guard] Scheduled (${schedule}); first check in 30s.`);
};

module.exports = { initWebhookGuardCron, runWebhookGuard, checkWaba, sendAlert };
