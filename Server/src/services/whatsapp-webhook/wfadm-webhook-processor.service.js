const whatsappTemplatesService = require('../whatsapp-templates.service');
const whatsappCallsService = require('../whatsapp-calls.service');

/**
 * Core processing function for WFADM WhatsApp webhook body.
 * Expects the standard Meta payload structure.
 */
async function processWebhookBody(body) {
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        // 1. Check for template status updates
        if (value?.event && value?.message_template_name) {
            const name = value.message_template_name;
            const status = value.event; // e.g. APPROVED, REJECTED, PENDING
            console.log(`Webhook Trigger: Template "${name}" status updated to: ${status}`);
            await whatsappTemplatesService.syncSingleTemplateStatus(name, status);
        }

        // 2. Check for message status updates (sent, delivered, read, failed)
        if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
                const messageId = statusObj.id;
                const status = statusObj.status; // sent, delivered, read, failed
                let errorMessage = null;

                if (statusObj.errors && statusObj.errors.length > 0) {
                    errorMessage = statusObj.errors[0].message;
                }

                console.log(`Webhook Trigger: Message ID ${messageId} status update to: ${status}`);
                await whatsappTemplatesService.updateMessageStatus(messageId, status, errorMessage);
            }
        }

        // 3. Check for incoming customer messages/replies
        if (value?.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
                const fromPhone = msg.from; // Sender phone number
                const messageId = msg.id; // Unique WhatsApp message ID
                const timestamp = msg.timestamp; // Epoch timestamp
                const type = msg.type; // text, interactive, button, etc.

                let bodyText = '';
                if (type === 'text' && msg.text?.body) {
                    bodyText = msg.text.body;
                } else if (type === 'interactive') {
                    bodyText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive Reply]';
                } else if (type === 'button') {
                    bodyText = msg.button?.text || '[Button Click]';
                } else {
                    bodyText = `[${type} message]`;
                }

                // Sender profile name if present
                let senderName = null;
                if (value.contacts && Array.isArray(value.contacts)) {
                    const contactObj = value.contacts.find(c => c.wa_id === fromPhone);
                    if (contactObj?.profile?.name) {
                        senderName = contactObj.profile.name;
                    }
                }

                console.log(`Webhook Trigger: Incoming message from ${fromPhone} (Name: ${senderName}): "${bodyText}"`);

                const replyToMessageId = msg.context?.id || null;

                await whatsappTemplatesService.handleIncomingMessage({
                    fromPhone,
                    messageId,
                    timestamp,
                    type,
                    body: bodyText,
                    senderName,
                    phoneId: value.metadata?.phone_number_id,
                    replyToMessageId
                });
            }
        }

        // 4. Check for incoming WhatsApp Calls events
        if (value?.calls && Array.isArray(value.calls)) {
            const metadata = value.metadata || {};
            const contacts = value.contacts || [];
            for (const callObj of value.calls) {
                console.log(`Webhook Trigger: Incoming WhatsApp Call event '${callObj.event}' for Call ID: ${callObj.id} (From: ${callObj.from})`);
                await whatsappCallsService.processCallWebhook(callObj, metadata, contacts);
            }
        }
    }
}

module.exports = { processWebhookBody };
