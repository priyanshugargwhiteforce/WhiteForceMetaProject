const whatsappService = require('../whatsapp.service');
const wiraForwarder = require('./wira-webhook-forwarder.service');
const wfadmProcessor = require('./wfadm-webhook-processor.service');

/**
 * Dispatch Meta webhook payload based on phone_number_id.
 */
async function dispatch(body) {
    if (!body || body.object !== 'whatsapp_business_account') {
        return;
    }

    const entries = body.entry;
    if (!entries || !Array.isArray(entries)) {
        return;
    }

    const wiraRoutingEnabled = process.env.WIRA_WEBHOOK_ROUTING_ENABLED === 'true';
    const wiraPhoneId = process.env.WIRA_CHATBOT_PHONE_NUMBER_ID;

    const wiraEntriesMap = {};
    const wfadmChanges = [];
    let hasError = false;
    let errorMsg = '';

    for (const entry of entries) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
            const value = change?.value;
            const phoneNumberId = value?.metadata?.phone_number_id;
            const isTemplateEvent = !!(value?.event && value?.message_template_name);
            const isCallEvent = change?.field === 'calls' || !!(value?.calls && Array.isArray(value.calls));

            // 1. WIRA phone ID check
            if (phoneNumberId && phoneNumberId === wiraPhoneId) {
                if (!wiraRoutingEnabled) {
                    console.warn('[Webhook Dispatcher] WIRA routing disabled. Ignoring WIRA event.');
                    continue;
                }
                if (!wiraEntriesMap[entry.id]) {
                    wiraEntriesMap[entry.id] = [];
                }
                wiraEntriesMap[entry.id].push(change);
                continue;
            }

            // 2. Known WFADM phone ID check
            if (await whatsappService.isKnownWfadmPhoneNumber(phoneNumberId)) {
                wfadmChanges.push({ entryId: entry.id, change });
                continue;
            }

            // 3. WFADM Template event check
            if (isTemplateEvent) {
                wfadmChanges.push({ entryId: entry.id, change });
                continue;
            }

            // 4. WFADM Call event check
            if (isCallEvent) {
                wfadmChanges.push({ entryId: entry.id, change });
                continue;
            }

            // 5. Unknown event
            console.warn(`[Webhook Dispatcher] Unknown event or missing phone ID: ${phoneNumberId}. Ignoring.`);
        }
    }

    // 1. Forward WIRA events
    if (Object.keys(wiraEntriesMap).length > 0) {
        const wiraPayload = {
            object: 'whatsapp_business_account',
            entry: Object.keys(wiraEntriesMap).map(entryId => ({
                id: entryId,
                changes: wiraEntriesMap[entryId]
            }))
        };
        try {
            await wiraForwarder.forwardToWira(wiraPayload);
        } catch (err) {
            hasError = true;
            errorMsg += `WIRA Forward failed: ${err.message}. `;
        }
    }

    // 2. Process WFADM events
    for (const item of wfadmChanges) {
        const singleWfadmPayload = {
            object: 'whatsapp_business_account',
            entry: [{ id: item.entryId, changes: [item.change] }]
        };
        try {
            await wfadmProcessor.processWebhookBody(singleWfadmPayload);
        } catch (err) {
            hasError = true;
            errorMsg += `WFADM processing failed: ${err.message}. `;
        }
    }

    if (hasError) {
        throw new Error(errorMsg);
    }
}

module.exports = { dispatch };
