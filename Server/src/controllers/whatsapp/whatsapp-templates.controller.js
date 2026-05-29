const whatsappTemplatesService = require('../../services/whatsapp-templates.service');

/**
 * Handle template creation
 */
exports.createTemplate = async (req, res) => {
    try {
        const { name, category, language, components } = req.body;

        if (!name || !category || !components) {
            return res.status(400).json({
                success: false,
                message: 'Name, Category, and Components are required.'
            });
        }

        const result = await whatsappTemplatesService.createMetaTemplate({
            name,
            category,
            language,
            components
        });

        res.status(201).json({
            success: true,
            message: 'WhatsApp Template submitted to Meta successfully.',
            data: result
        });
    } catch (error) {
        console.error('Create Template Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Handle template deletion
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { name } = req.params;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Template name parameter is required.'
            });
        }

        await whatsappTemplatesService.deleteMetaTemplate(name);

        res.json({
            success: true,
            message: `Template "${name}" deleted successfully.`
        });
    } catch (error) {
        console.error('Delete Template Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get Template Analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        const analytics = await whatsappTemplatesService.getTemplateAnalytics();
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get Analytics Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Webhook Verification (GET /api/whatsapp/webhook)
 * Meta checks this endpoint during configuration setup.
 */
exports.verifyWebhook = (req, res) => {
    try {
        const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'whiteforce_whatsapp_token';
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WhatsApp Webhook verified successfully.');
                return res.status(200).send(challenge);
            } else {
                return res.sendStatus(403);
            }
        }
        res.sendStatus(400);
    } catch (error) {
        console.error('Webhook Verification Error:', error.message);
        res.status(500).send(error.message);
    }
};

/**
 * Webhook Notification Receiver (POST /api/whatsapp/webhook)
 * Receives live status updates for sent messages and templates approval.
 */
exports.receiveWebhook = async (req, res) => {
    try {
        const body = req.body;
        console.log('Received WhatsApp Webhook body:', JSON.stringify(body, null, 2));

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

            return res.status(200).send('EVENT_RECEIVED');
        }

        res.sendStatus(404);
    } catch (error) {
        console.error('Webhook Receiver Error:', error.message);
        res.status(500).send(error.message);
    }
};
