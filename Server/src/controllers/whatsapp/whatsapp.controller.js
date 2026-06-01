const axios = require('axios');
const whatsappService = require('../../services/whatsapp.service');
const { pool } = require('../../config/db');

// WhatsApp Configs CRUD
exports.getWhatsAppConfigs = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, phone_number_id, waba_id, created_at FROM whatsapp_configs ORDER BY created_at DESC');
        res.json({ success: true, configs: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createWhatsAppConfig = async (req, res) => {
    try {
        const { name, phoneId, wabaId, accessToken } = req.body;
        if (!name || !phoneId || !wabaId || !accessToken) {
            return res.status(400).json({ success: false, message: 'Name, Phone Number ID, WABA ID, and Access Token are required.' });
        }
        const [result] = await pool.query('INSERT INTO whatsapp_configs (name, phone_number_id, waba_id, access_token) VALUES (?, ?, ?, ?)', [name, phoneId, wabaId, accessToken]);
        res.status(201).json({ success: true, message: 'WhatsApp Account Config created.', configId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateWhatsAppConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phoneId, wabaId, accessToken } = req.body;
        await pool.query('UPDATE whatsapp_configs SET name = ?, phone_number_id = ?, waba_id = ?, access_token = ? WHERE id = ?', [name, phoneId, wabaId, accessToken, id]);
        res.json({ success: true, message: 'WhatsApp Account Config updated.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteWhatsAppConfig = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM whatsapp_configs WHERE id = ?', [id]);
        await pool.query('DELETE FROM whatsapp_phone_details WHERE config_id = ?', [id]);
        res.json({ success: true, message: 'WhatsApp Account Config deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get WhatsApp Phone and Account details
// @route   GET /api/whatsapp/details
// @access  Private
exports.getWhatsAppDetails = async (req, res) => {
    try {
        const forceSync = req.query.force === 'true';
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
        const details = await whatsappService.getWabaDetails(forceSync, configId);

        // Fetch WABA Details as a secondary spec to match previous response contract
        const configIdVal = configId ? parseInt(configId) : 0;
        let accessToken = process.env.META_ACCESS_TOKEN;
        let wabaId = process.env.WABA_ID;
        if (configIdVal > 0) {
            const [[config]] = await pool.query('SELECT waba_id, access_token FROM whatsapp_configs WHERE id = ?', [configIdVal]);
            if (config) {
                accessToken = config.access_token;
                wabaId = config.waba_id;
            }
        }

        const wabaUrl = `https://graph.facebook.com/v19.0/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status&access_token=${accessToken}`;
        const wabaResponse = await axios.get(wabaUrl);

        res.json({
            success: true,
            data: {
                phoneNumber: details,
                waba: wabaResponse.data
            }
        });
    } catch (error) {
        console.error("WhatsApp Controller Details Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all WhatsApp Templates list
// @route   GET /api/whatsapp/templates
// @access  Private
exports.getTemplates = async (req, res) => {
    try {
        const forceSync = req.query.force === 'true';
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
        const templates = await whatsappService.getTemplates(forceSync, configId);

        res.json({
            success: true,
            templates
        });
    } catch (error) {
        console.error("WhatsApp Controller Templates Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Send Template message to list of recipients & Log in DB
// @route   POST /api/whatsapp/send
// @access  Private
exports.sendTemplateMessage = async (req, res) => {
    try {
        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
        const { numbers, recipients, templateName, languageCode } = req.body;
        const sentByUserId = req.user ? req.user.id : null;

        let recipientsList = [];
        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
            recipientsList = recipients;
        } else if (numbers && Array.isArray(numbers) && numbers.length > 0) {
            recipientsList = numbers.map(num => ({ number: num, parameters: [] }));
        }

        if (recipientsList.length === 0) {
            return res.status(400).json({ success: false, message: "Recipient list is required." });
        }

        // Resolve config keys
        const configIdVal = configId ? parseInt(configId) : 0;
        let accessToken = process.env.META_ACCESS_TOKEN;
        let phoneNumberId = process.env.PHONE_NUMBER_ID;
        if (configIdVal > 0) {
            const [[config]] = await pool.query('SELECT phone_number_id, access_token FROM whatsapp_configs WHERE id = ?', [configIdVal]);
            if (config) {
                accessToken = config.access_token;
                phoneNumberId = config.phone_number_id;
            }
        }

        const results = [];
        for (const recipient of recipientsList) {
            const number = recipient.number;
            const parameters = recipient.parameters || [];

            if (!number) continue;

            try {
                const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

                const templatePayload = {
                    name: templateName,
                    language: {
                        code: languageCode || "en_US"
                    }
                };

                if (parameters.length > 0) {
                    templatePayload.components = [
                        {
                            type: "body",
                            parameters: parameters.map(p => ({
                                type: "text",
                                text: String(p)
                            }))
                        }
                    ];
                }

                const response = await axios.post(url, {
                    messaging_product: "whatsapp",
                    to: number.trim(),
                    type: "template",
                    template: templatePayload
                }, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                const messageId = response.data.messages[0].id;
                results.push({ number, success: true, messageId });

                // Log successfully sent message
                await whatsappService.logSentMessage(
                    phoneNumberId,
                    number.trim(),
                    templateName,
                    'sent',
                    messageId,
                    sentByUserId
                );
            } catch (err) {
                const errorMsg = err.response?.data?.error?.message || err.message;
                results.push({ number, success: false, error: errorMsg });

                // Log failed sent message
                await whatsappService.logSentMessage(
                    phoneNumberId,
                    number.trim(),
                    templateName,
                    'failed',
                    null,
                    sentByUserId,
                    errorMsg
                );
            }
        }

        res.json({
            success: true,
            results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
