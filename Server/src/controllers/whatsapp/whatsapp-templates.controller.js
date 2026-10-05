const whatsappTemplatesService = require('../../services/whatsapp-templates.service');
const wfadmWebhookProcessor = require('../../services/whatsapp-webhook/wfadm-webhook-processor.service');


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
        const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'WhiteForceWhatsAppAPIWebhookToken@09062026byPriyanshu';
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WhatsApp Webhook verified successfully.');
                // console.log("line102 check here: ", mode, token, challenge);
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
        console.log('Received legacy WhatsApp Webhook body:', {
            object: body?.object,
            entryCount: Array.isArray(body?.entry) ? body.entry.length : 0
        });

        if (body.object === 'whatsapp_business_account') {
            await wfadmWebhookProcessor.processWebhookBody(body);
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
