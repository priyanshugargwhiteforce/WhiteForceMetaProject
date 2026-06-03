const { pool } = require('../config/db');
const axios = require('axios');
const { processAndSaveTemplateVariables, resolveWhatsAppConfig } = require('./whatsapp.service');

/**
 * Create a message template in Meta WABA
 */
const createMetaTemplate = async (templateData, configId = null) => {
    const { token, wabaId } = await resolveWhatsAppConfig(configId);

    if (!token || !wabaId) {
        throw new Error('Meta integration credentials (Access Token or WABA ID) are missing.');
    }

    const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates`;

    try {
        console.log(`Creating template "${templateData.name}" on Meta WABA...`);
        const response = await axios.post(url, {
            name: templateData.name.toLowerCase().trim().replace(/\s+/g, '_'),
            category: templateData.category || 'MARKETING',
            language: templateData.language || 'en_US',
            components: templateData.components || []
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Insert/cache newly created template in DB
        const templateId = response.data.id;
        await pool.query(
            `INSERT INTO whatsapp_templates (id, waba_id, name, status, language, category, components)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                components = VALUES(components),
                synced_at = CURRENT_TIMESTAMP`,
            [
                templateId,
                wabaId,
                templateData.name.toLowerCase().trim().replace(/\s+/g, '_'),
                'PENDING', // Default state on submit is PENDING
                templateData.language || 'en_US',
                templateData.category || 'MARKETING',
                JSON.stringify(templateData.components || [])
            ]
        );

        await processAndSaveTemplateVariables(templateId, templateData.components || []);

        return response.data;
    } catch (error) {
        console.error('Error creating template on Meta:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

/**
 * Delete a message template from Meta WABA and local DB cache
 */
const deleteMetaTemplate = async (name, configId = null) => {
    const { token, wabaId } = await resolveWhatsAppConfig(configId);

    if (!token || !wabaId) {
        throw new Error('Meta credentials missing.');
    }

    const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=${name}&access_token=${token}`;

    try {
        console.log(`Deleting template "${name}" on Meta WABA...`);
        await axios.delete(url);

        // Delete from local cache
        await pool.query('DELETE FROM whatsapp_templates WHERE waba_id = ? AND name = ?', [wabaId, name]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting template from Meta:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

/**
 * Update message status in whatsapp_message_logs based on incoming webhooks
 */
const updateMessageStatus = async (messageId, status, errorMessage = null) => {
    try {
        await pool.query(
            `UPDATE whatsapp_message_logs 
             SET status = ?, error_message = COALESCE(?, error_message)
             WHERE message_id = ?`,
            [status, errorMessage, messageId]
        );
        console.log(`Updated WhatsApp message ID ${messageId} status to: ${status}`);
    } catch (error) {
        console.error('Error updating WhatsApp message log status:', error.message);
    }
};

/**
 * Fetch WhatsApp template analytics dashboard data
 */
const getTemplateAnalytics = async () => {
    const phoneId = process.env.PHONE_NUMBER_ID;
    if (!phoneId) throw new Error('PHONE_NUMBER_ID is missing.');

    // Count of messages per status
    const [statusCounts] = await pool.query(
        `SELECT status, COUNT(*) as count 
         FROM whatsapp_message_logs 
         WHERE phone_number_id = ? 
         GROUP BY status`,
        [phoneId]
    );

    // Timeline count of messages sent over the last 15 days
    const [timelineData] = await pool.query(
        `SELECT DATE(sent_at) as date, status, COUNT(*) as count 
         FROM whatsapp_message_logs 
         WHERE phone_number_id = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL 15 DAY)
         GROUP BY DATE(sent_at), status
         ORDER BY DATE(sent_at) ASC`,
        [phoneId]
    );

    // Template specific performance metrics
    const [templatePerformance] = await pool.query(
        `SELECT template_name, status, COUNT(*) as count 
         FROM whatsapp_message_logs 
         WHERE phone_number_id = ?
         GROUP BY template_name, status`,
        [phoneId]
    );

    return {
        statusCounts,
        timelineData,
        templatePerformance
    };
};

/**
 * Sync status of a template from webhook event or direct check
 */
const syncSingleTemplateStatus = async (name, status) => {
    try {
        await pool.query(
            `UPDATE whatsapp_templates 
             SET status = ?, synced_at = CURRENT_TIMESTAMP 
             WHERE name = ?`,
            [status, name]
        );
    } catch (error) {
        console.error('Error syncing single template status:', error.message);
    }
};

const getTemplateVariables = async (templateId) => {
    const [rows] = await pool.query(
        'SELECT variable_name, component_type, variable_position FROM whatsapp_template_variables WHERE template_id = ? ORDER BY id ASC',
        [templateId]
    );
    return rows;
};

const getTemplateMappings = async (templateId) => {
    const [rows] = await pool.query(
        'SELECT id, template_id, mapping_name, mappings, is_default, created_by, updated_by, last_used_at, usage_count, created_at, updated_at FROM whatsapp_template_mappings WHERE template_id = ? ORDER BY created_at DESC',
        [templateId]
    );
    return rows.map(r => ({
        ...r,
        mappings: typeof r.mappings === 'string' ? JSON.parse(r.mappings) : r.mappings,
        is_default: Boolean(r.is_default)
    }));
};

const saveTemplateMappings = async (templateId, mappingName, mappings, isDefault = false, userId = null) => {
    if (!mappingName || String(mappingName).trim().length === 0) {
        throw new Error('Mapping name is required.');
    }
    const cleanName = String(mappingName).trim();
    if (cleanName.length > 255) {
        throw new Error('Mapping name cannot exceed 255 characters.');
    }

    if (!mappings || typeof mappings !== 'object') {
        throw new Error('Mappings configuration is required.');
    }
    if (mappings.version === undefined) {
        throw new Error('Version is required.');
    }
    if (!Number.isInteger(mappings.version)) {
        throw new Error('Version must be an integer.');
    }
    if (!mappings.mappings || typeof mappings.mappings !== 'object') {
        throw new Error('Mappings payload mappings object is required.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [[existing]] = await connection.query(
            'SELECT id FROM whatsapp_template_mappings WHERE template_id = ? AND mapping_name = ?',
            [templateId, cleanName]
        );

        if (existing) {
            const dupErr = new Error('Mapping profile already exists.');
            dupErr.code = 'ER_DUP_MAPPING';
            throw dupErr;
        }

        if (isDefault) {
            await connection.query(
                'UPDATE whatsapp_template_mappings SET is_default = FALSE WHERE template_id = ?',
                [templateId]
            );
        }

        const [result] = await connection.query(
            `INSERT INTO whatsapp_template_mappings (template_id, mapping_name, mappings, is_default, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [templateId, cleanName, JSON.stringify(mappings), isDefault ? 1 : 0, userId, userId]
        );

        await connection.commit();
        return { success: true, mappingId: result.insertId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const deleteTemplateMapping = async (templateId, mappingId) => {
    const [[mapping]] = await pool.query(
        'SELECT is_default FROM whatsapp_template_mappings WHERE template_id = ? AND id = ?',
        [templateId, parseInt(mappingId)]
    );
    if (!mapping) {
        throw new Error('Mapping profile not found.');
    }
    if (mapping.is_default) {
        throw new Error('Cannot delete the default mapping profile. Please set another profile as default first.');
    }
    await pool.query(
        'DELETE FROM whatsapp_template_mappings WHERE template_id = ? AND id = ?',
        [templateId, parseInt(mappingId)]
    );
    return { success: true };
};

const useTemplateMapping = async (templateId, mappingId) => {
    const [result] = await pool.query(
        `UPDATE whatsapp_template_mappings 
         SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP 
         WHERE template_id = ? AND id = ?`,
        [templateId, parseInt(mappingId)]
    );
    return { success: true, affectedRows: result.affectedRows };
};

module.exports = {
    createMetaTemplate,
    deleteMetaTemplate,
    updateMessageStatus,
    getTemplateAnalytics,
    syncSingleTemplateStatus,
    getTemplateVariables,
    getTemplateMappings,
    saveTemplateMappings,
    deleteTemplateMapping,
    useTemplateMapping
};
