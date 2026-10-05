const templatesController = require('./whatsapp-templates.controller');
const webhookDispatcher = require('../../services/whatsapp-webhook/webhook-dispatcher.service');

/**
 * Webhook Verification (GET /api/whatsapp/webhook)
 * Meta checks this endpoint during configuration setup.
 * Delegates to the existing templates controller to keep behavior unchanged.
 */
exports.verifyWebhook = (req, res) => {
    return templatesController.verifyWebhook(req, res);
};

/**
 * Webhook Notification Receiver (POST /api/whatsapp/webhook)
 * Receives live status updates for sent messages and templates approval.
 * Inspects values, forwards to WIRA chatbot if matches, or delegates to WFADM.
 */
exports.receiveWebhook = async (req, res) => {
    try {
        const body = req.body;
        console.log('[Webhook Controller] WhatsApp webhook received', {
            object: body?.object,
            entryCount: Array.isArray(body?.entry) ? body.entry.length : 0
        });

        if (process.env.WIRA_WEBHOOK_DEBUG === 'true') {
            console.debug('[Webhook Controller] Full Payload:', JSON.stringify(body, null, 2));
        }

        if (!body || body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        // Delegate routing and processing
        await webhookDispatcher.dispatch(body);

        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('[Webhook Controller] Webhook dispatch failed:', error.message);
        return res.status(500).send('WEBHOOK_PROCESSING_FAILED');
    }
};
