const axios = require('axios');
const whatsappService = require('../../services/whatsapp.service');

// @desc    Get WhatsApp Phone and Account details
// @route   GET /api/whatsapp/details
// @access  Private
exports.getWhatsAppDetails = async (req, res) => {
    try {
        const forceSync = req.query.force === 'true';
        const details = await whatsappService.getWabaDetails(forceSync);

        // Fetch WABA Details as a secondary spec to match previous response contract
        const accessToken = process.env.META_ACCESS_TOKEN;
        const wabaId = process.env.WABA_ID;
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
        const templates = await whatsappService.getTemplates(forceSync);

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
        const accessToken = process.env.META_ACCESS_TOKEN;
        const phoneNumberId = process.env.PHONE_NUMBER_ID;
        const { numbers, templateName, languageCode } = req.body;
        const sentByUserId = req.user ? req.user.id : null;

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({ success: false, message: "Recipient numbers are required as an array." });
        }

        const results = [];
        for (const number of numbers) {
            try {
                const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
                const response = await axios.post(url, {
                    messaging_product: "whatsapp",
                    to: number.trim(),
                    type: "template",
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode || "en_US"
                        }
                    }
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
