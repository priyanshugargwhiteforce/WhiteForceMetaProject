const whatsappTemplatesService = require('../../services/whatsapp-templates.service');

/**
 * Handle template creation
 */
exports.createTemplate = async (req, res) => {
    try {
        const { name, category, language, components } = req.body;
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;

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
        }, configId);

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
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Template name parameter is required.'
            });
        }

        await whatsappTemplatesService.deleteMetaTemplate(name, configId);

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

exports.getTemplateVariables = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Template ID is required.' });
        }
        const variables = await whatsappTemplatesService.getTemplateVariables(id);
        res.status(200).json({ success: true, variables });
    } catch (error) {
        console.error('Get template variables controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTemplateMappings = async (req, res) => {
    try {
        const { templateId } = req.params;
        if (!templateId) {
            return res.status(400).json({ success: false, message: 'Template ID is required.' });
        }
        const mappings = await whatsappTemplatesService.getTemplateMappings(templateId);
        res.status(200).json({ success: true, mappings });
    } catch (error) {
        console.error('Get template mappings controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveTemplateMappings = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { mappingName, mappings, isDefault } = req.body;
        
        if (!templateId) {
            return res.status(400).json({ success: false, message: 'Template ID is required.' });
        }
        if (!mappingName || String(mappingName).trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Mapping profile name is required.' });
        }
        if (!mappings) {
            return res.status(400).json({ success: false, message: 'Mappings configuration is required.' });
        }

        const userId = req.user?.id || null;
        const result = await whatsappTemplatesService.saveTemplateMappings(templateId, mappingName, mappings, isDefault, userId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Save template mappings controller error:', error.message);
        if (error.code === 'ER_DUP_MAPPING' || error.message.includes('already exists')) {
            return res.status(400).json({ success: false, message: 'Mapping profile already exists.' });
        }
        if (error.message.includes('Version') || error.message.includes('required') || error.message.includes('integer')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteTemplateMapping = async (req, res) => {
    try {
        const { templateId, mappingId } = req.params;
        if (!templateId || !mappingId) {
            return res.status(400).json({ success: false, message: 'Template ID and Mapping ID are required.' });
        }
        await whatsappTemplatesService.deleteTemplateMapping(templateId, mappingId);
        res.status(200).json({ success: true, message: 'Mapping profile deleted successfully.' });
    } catch (error) {
        console.error('Delete template mapping controller error:', error.message);
        if (error.message.includes('Cannot delete the default')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.useTemplateMapping = async (req, res) => {
    try {
        const { templateId, mappingId } = req.params;
        if (!templateId || !mappingId) {
            return res.status(400).json({ success: false, message: 'Template ID and Mapping ID are required.' });
        }
        const result = await whatsappTemplatesService.useTemplateMapping(templateId, mappingId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Use template mapping controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
