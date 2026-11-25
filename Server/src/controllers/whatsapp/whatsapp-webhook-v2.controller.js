const crypto = require('crypto');
const webhookDispatcher = require('../../services/whatsapp-webhook/webhook-dispatcher.service');

/**
 * WhatsApp Webhook v2 (new Meta account / app)
 *
 *   GET  /api/whatsapp/webhook-v2  -> Meta verification (hub.challenge)
 *   POST /api/whatsapp/webhook-v2  -> Live events (message statuses, incoming messages, templates, calls)
 *
 * Processing is identical to the old webhook (same dispatcher: WFADM processor + local WIRA chatbot).
 * Differences / hardening:
 *   - Verify token comes ONLY from WHATSAPP_WEBHOOK_V2_VERIFY_TOKEN (no hard-coded fallback).
 *   - If WHATSAPP_WEBHOOK_V2_APP_SECRET (the new app's "App Secret") is set, every POST must carry a
 *     valid X-Hub-Signature-256 from Meta, so nobody else can post fake events.
 *   - The challenge is returned as plain text (never rendered as HTML).
 */

const LOG = '[Webhook v2]';

const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a || ''));
    const bufB = Buffer.from(String(b || ''));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

exports.verifyWebhookV2 = (req, res) => {
    const verifyToken = (process.env.WHATSAPP_WEBHOOK_V2_VERIFY_TOKEN || '').trim();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!verifyToken) {
        console.error(`${LOG} WHATSAPP_WEBHOOK_V2_VERIFY_TOKEN is not set in .env - verification refused.`);
        return res.sendStatus(403);
    }
    if (!mode || !token) {
        return res.sendStatus(400);
    }
    if (mode === 'subscribe' && safeEqual(token, verifyToken)) {
        console.log(`${LOG} Webhook verified successfully by Meta.`);
        return res.status(200).type('text/plain').send(String(challenge ?? ''));
    }
    console.warn(`${LOG} Verification failed (wrong verify token or mode).`);
    return res.sendStatus(403);
};

let warnedNoSecret = false;

const hasValidSignature = (req) => {
    const appSecret = (process.env.WHATSAPP_WEBHOOK_V2_APP_SECRET || '').trim();
    if (!appSecret) {
        if (!warnedNoSecret) {
            console.warn(`${LOG} WHATSAPP_WEBHOOK_V2_APP_SECRET is not set - request signatures are NOT being checked.`);
            warnedNoSecret = true;
        }
        return true;
    }
    const header = req.get('x-hub-signature-256') || '';
    if (!header.startsWith('sha256=') || !req.rawBody) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
    return safeEqual(header, expected);
};

exports.receiveWebhookV2 = async (req, res) => {
    try {
        if (!hasValidSignature(req)) {
            console.warn(`${LOG} Rejected request with missing/invalid X-Hub-Signature-256.`);
            return res.sendStatus(401);
        }

        const body = req.body;
        console.log(`${LOG} WhatsApp webhook received`, {
            object: body?.object,
            entryCount: Array.isArray(body?.entry) ? body.entry.length : 0
        });

        if (process.env.WIRA_WEBHOOK_DEBUG === 'true') {
            console.debug(`${LOG} Full Payload:`, JSON.stringify(body, null, 2));
        }

        if (!body || body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        // Same routing & processing as the old webhook
        await webhookDispatcher.dispatch(body);

        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error(`${LOG} Webhook dispatch failed:`, error.message);
        return res.status(500).send('WEBHOOK_PROCESSING_FAILED');
    }
};
