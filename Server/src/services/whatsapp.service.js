const { pool } = require('../config/db');
const axios = require('axios');

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

const isStale = (syncedAt) => {
    if (!syncedAt) return true;
    return (Date.now() - new Date(syncedAt).getTime()) > CACHE_TTL_MS;
};

const resolveWhatsAppConfig = async (configId) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT phone_number_id, waba_id, access_token FROM whatsapp_configs WHERE id = ?', [configIdVal]);
        if (config) {
            return {
                token: config.access_token,
                phoneId: config.phone_number_id,
                wabaId: config.waba_id,
                configId: configIdVal
            };
        }
    }
    return {
        token: process.env.META_ACCESS_TOKEN,
        phoneId: process.env.PHONE_NUMBER_ID,
        wabaId: process.env.WABA_ID,
        configId: 0
    };
};

// Fetch WhatsApp Business Phone details and cache in DB
const syncWabaDetails = async (configId = null) => {
    const { token, phoneId, wabaId, configId: configIdVal } = await resolveWhatsAppConfig(configId);

    if (!token || !phoneId || !wabaId) {
        throw new Error('WhatsApp integration keys (Access Token, Phone ID, WABA ID) are missing.');
    }

    try {
        console.log(`Syncing WABA Details for Phone ID: ${phoneId} and config: ${configIdVal}...`);
        const url = `https://graph.facebook.com/v19.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type,throughput&access_token=${token}`;
        const response = await axios.get(url);
        const data = response.data;

        await pool.query(
            `INSERT INTO whatsapp_phone_details (phone_number_id, config_id, waba_id, display_phone_number, verified_name, quality_rating, name_status, raw_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                display_phone_number = VALUES(display_phone_number),
                verified_name = VALUES(verified_name),
                quality_rating = VALUES(quality_rating),
                name_status = VALUES(name_status),
                raw_data = VALUES(raw_data),
                synced_at = CURRENT_TIMESTAMP`,
            [
                phoneId,
                configIdVal,
                wabaId,
                data.display_phone_number || 'N/A',
                data.verified_name || 'N/A',
                data.quality_rating || 'N/A',
                data.name_status || 'NONE',
                JSON.stringify(data)
            ]
        );

        return data;
    } catch (error) {
        console.error('Error syncing WABA Details:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getWabaDetails = async (forceSync = false, configId = null) => {
    const { phoneId, configId: configIdVal } = await resolveWhatsAppConfig(configId);
    if (!phoneId) throw new Error('WhatsApp Phone Number ID is missing.');

    const [[details]] = await pool.query('SELECT *, synced_at FROM whatsapp_phone_details WHERE phone_number_id = ? AND config_id = ?', [phoneId, configIdVal]);

    if (!details || forceSync || isStale(details.synced_at)) {
        return await syncWabaDetails(configIdVal);
    }

    return typeof details.raw_data === 'string' ? JSON.parse(details.raw_data) : details.raw_data;
};

// Fetch message templates and cache in DB
const syncTemplates = async (configId = null) => {
    const { token, wabaId, configId: configIdVal } = await resolveWhatsAppConfig(configId);

    if (!token || !wabaId) {
        throw new Error('WhatsApp integration keys (Access Token, WABA ID) are missing.');
    }

    try {
        console.log(`Syncing WhatsApp templates for WABA ID: ${wabaId} and config: ${configIdVal}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${wabaId}/message_templates?access_token=${token}`
        );

        const data = response.data.data || [];

        for (const tmpl of data) {
            await pool.query(
                `INSERT INTO whatsapp_templates (id, waba_id, name, status, language, category, components)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    status = VALUES(status),
                    language = VALUES(language),
                    category = VALUES(category),
                    components = VALUES(components),
                    synced_at = CURRENT_TIMESTAMP`,
                [
                    tmpl.id,
                    wabaId,
                    tmpl.name,
                    tmpl.status,
                    tmpl.language,
                    tmpl.category,
                    JSON.stringify(tmpl.components || [])
                ]
            );
        }

        return data;
    } catch (error) {
        console.error('Error syncing WhatsApp templates:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getTemplates = async (forceSync = false, configId = null) => {
    const { wabaId, configId: configIdVal } = await resolveWhatsAppConfig(configId);
    if (!wabaId) throw new Error('WhatsApp WABA ID is missing.');

    const [rows] = await pool.query('SELECT *, synced_at FROM whatsapp_templates WHERE waba_id = ?', [wabaId]);

    if (rows.length === 0 || forceSync || rows.some(row => isStale(row.synced_at))) {
        await syncTemplates(configIdVal);
        const [updatedRows] = await pool.query('SELECT * FROM whatsapp_templates WHERE waba_id = ?', [wabaId]);
        return updatedRows.map(r => ({
            ...r,
            components: typeof r.components === 'string' ? JSON.parse(r.components) : r.components
        }));
    }

    return rows.map(r => ({
        ...r,
        components: typeof r.components === 'string' ? JSON.parse(r.components) : r.components
    }));
};

// Log a sent template message in the database for audits/logs
const logSentMessage = async (phoneId, recipient, templateName, status, messageId, sentBy, errorMessage = null) => {
    try {
        await pool.query(
            `INSERT INTO whatsapp_message_logs (phone_number_id, recipient_number, template_name, status, message_id, sent_by, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [phoneId, recipient, templateName, status, messageId, sentBy, errorMessage]
        );
    } catch (error) {
        console.error('Error logging sent WhatsApp message:', error.message);
    }
};

module.exports = {
    getWabaDetails,
    getTemplates,
    logSentMessage
};
