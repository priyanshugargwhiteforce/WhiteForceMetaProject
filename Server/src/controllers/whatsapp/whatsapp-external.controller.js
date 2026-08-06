const { pool } = require('../../config/db');
const { recalculateContactEngagement } = require('../../services/whatsapp-contacts-intelligence.service');

// Normalize phone digits
function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^0-9]/g, '');
}

/**
 * POST /api/whatsapp/track-external-message
 * Secured with x-internal-api-key & source_app validation
 */
exports.trackExternalMessage = async (req, res) => {
    try {
        const {
            source_app,
            source_user_id,
            source_user_name,
            source_reference_id,
            phone_number_id,
            recipient_number,
            template_name,
            template_language,
            template_params,
            message_id,
            meta_response
        } = req.body;

        // 1. Validation
        if (!source_app || !phone_number_id || !recipient_number || !message_id || !template_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: source_app, phone_number_id, recipient_number, message_id, template_name are required.'
            });
        }

        const normalizedPhone = normalizePhone(recipient_number);
        if (!normalizedPhone || normalizedPhone.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipient_number format.'
            });
        }

        // 2. Check duplicate message_id
        const [[existingMsg]] = await pool.query(
            'SELECT id FROM whatsapp_message_logs WHERE message_id = ? LIMIT 1',
            [message_id]
        );
        if (existingMsg) {
            return res.status(200).json({
                success: true,
                message: 'Message already tracked (duplicate message_id skipped).'
            });
        }

        // 3. Find or create Contact in CRM
        let contactId;
        const [[contact]] = await pool.query(
            'SELECT id FROM whatsapp_contacts WHERE phone = ?',
            [normalizedPhone]
        );

        const candidateName = req.body.recipient_name || req.body.contact_name || req.body.candidate_name || req.body.name || null;

        if (contact) {
            contactId = contact.id;
            await pool.query(
                `UPDATE whatsapp_contacts 
                 SET last_message_at = NOW(), 
                     status = 'active', 
                     opt_in_status = TRUE, 
                     opt_in_date = COALESCE(opt_in_date, NOW()),
                     name = COALESCE(?, name)
                 WHERE id = ?`,
                [candidateName, contactId]
            );
        } else {
            const [insertRes] = await pool.query(
                `INSERT INTO whatsapp_contacts (phone, name, opt_in_status, opt_in_date, last_message_at, status)
                 VALUES (?, ?, TRUE, NOW(), NOW(), 'active')`,
                [normalizedPhone, candidateName]
            );
            contactId = insertRes.insertId;
        }

        // 4. Save record in whatsapp_message_logs
        await pool.query(
            `INSERT INTO whatsapp_message_logs 
                (phone_number_id, recipient_number, template_name, status, message_id, sent_by, error_message,
                 source_app, source_user_id, source_user_name, source_reference_id, message_type, direction,
                 template_language, template_params_json, meta_response_json)
             VALUES (?, ?, ?, 'sent', ?, NULL, NULL, ?, ?, ?, ?, 'template', 'outgoing', ?, ?, ?)`,
            [
                phone_number_id,
                normalizedPhone,
                template_name,
                message_id,
                source_app,
                source_user_id || null,
                source_user_name || null,
                source_reference_id || null,
                template_language || null,
                template_params ? JSON.stringify(template_params) : null,
                meta_response ? JSON.stringify(meta_response) : null
            ]
        );

        // 5. Add activity in whatsapp_contact_activity
        const activityMetadata = {
            template_name,
            source_app,
            source_user_id,
            source_reference_id,
            template_params: template_params || null
        };
        await pool.query(
            `INSERT INTO whatsapp_contact_activity (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
             VALUES (?, NULL, ?, 'sent', ?, NOW())`,
            [
                contactId,
                message_id,
                JSON.stringify(activityMetadata)
            ]
        );

        // 6. Recalculate engagement score
        await recalculateContactEngagement(contactId);

        return res.status(201).json({
            success: true,
            message: 'External WhatsApp message tracked successfully.',
            message_id
        });

    } catch (error) {
        console.error('Error tracking external message:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/external/messages
 * Secured with x-internal-api-key & source_app query matching validation
 */
exports.getExternalMessages = async (req, res) => {
    try {
        const {
            source_app,
            source_user_id,
            direction,
            status,
            template_name,
            recipient_number,
            source_reference_id,
            date_from,
            date_to,
            page = 1,
            limit = 20
        } = req.query;

        // Build SQL query
        let query = 'SELECT * FROM whatsapp_message_logs WHERE source_app = ?';
        const params = [source_app];

        if (source_user_id) {
            query += ' AND source_user_id = ?';
            params.push(source_user_id);
        }
        if (direction) {
            query += ' AND direction = ?';
            params.push(direction);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (template_name) {
            query += ' AND template_name = ?';
            params.push(template_name);
        }
        if (recipient_number) {
            query += ' AND recipient_number = ?';
            params.push(normalizePhone(recipient_number));
        }
        if (source_reference_id) {
            query += ' AND source_reference_id = ?';
            params.push(source_reference_id);
        }
        if (date_from) {
            query += ' AND sent_at >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND sent_at <= ?';
            params.push(date_to);
        }

        // Pagination setup
        const limitVal = parseInt(limit);
        const offsetVal = (parseInt(page) - 1) * limitVal;

        // Fetch counts
        let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [[{ total }]] = await pool.query(countQuery, params);

        query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
        params.push(limitVal, offsetVal);

        const [rows] = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: limitVal,
            totalPages: Math.ceil(total / limitVal),
            messages: rows.map(r => ({
                ...r,
                template_params_json: typeof r.template_params_json === 'string' ? JSON.parse(r.template_params_json) : r.template_params_json,
                meta_response_json: typeof r.meta_response_json === 'string' ? JSON.parse(r.meta_response_json) : r.meta_response_json
            }))
        });

    } catch (error) {
        console.error('Error fetching external messages:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/external/conversation/:phone
 * Secured with x-internal-api-key & source_app validation
 */
exports.getExternalConversation = async (req, res) => {
    try {
        const { phone } = req.params;
        const { source_app } = req.query; // Validated in middleware

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number parameter.' });
        }

        const [[contact]] = await pool.query(
            'SELECT id FROM whatsapp_contacts WHERE phone = ? LIMIT 1',
            [normalizedPhone]
        );

        let activityMap = {};
        if (contact) {
            const [activities] = await pool.query(
                'SELECT message_id, event_type, metadata FROM whatsapp_contact_activity WHERE contact_id = ?',
                [contact.id]
            );
            activities.forEach(act => {
                const meta = typeof act.metadata === 'string' ? JSON.parse(act.metadata) : (act.metadata || {});
                if (act.message_id) {
                    activityMap[act.message_id] = meta;
                }
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM whatsapp_message_logs 
             WHERE recipient_number = ? 
             ORDER BY sent_at ASC, id ASC`,
            [normalizedPhone]
        );

        return res.status(200).json({
            success: true,
            phone: normalizedPhone,
            source_app,
            conversation: rows.map(r => {
                const meta = (r.message_id && activityMap[r.message_id]) ? activityMap[r.message_id] : {};
                return {
                    ...r,
                    template_params_json: typeof r.template_params_json === 'string' ? JSON.parse(r.template_params_json) : r.template_params_json,
                    meta_response_json: typeof r.meta_response_json === 'string' ? JSON.parse(r.meta_response_json) : r.meta_response_json,
                    type: meta.type || (r.direction === 'incoming' ? 'text' : 'template'),
                    location: meta.location || null,
                    media_id: meta.media_id || null,
                    audio_url: meta.audio_url || null,
                    mime_type: meta.mime_type || null,
                    caption: meta.caption || null,
                    filename: meta.filename || null,
                    interactive: meta.interactive || null,
                    emoji: meta.emoji || null,
                    contacts: meta.contacts || null,
                    order: meta.order || null
                };
            })
        });

    } catch (error) {
        console.error('Error fetching external conversation:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/dashboard/external-messages
 * Secured with JWT protect session. For dashboard users to view all tracked logs.
 */
exports.getDashboardExternalMessages = async (req, res) => {
    try {
        const {
            source_app,
            source_user_id,
            direction,
            status,
            template_name,
            recipient_number,
            source_reference_id,
            date_from,
            date_to,
            page = 1,
            limit = 20
        } = req.query;

        let query = 'SELECT * FROM whatsapp_message_logs WHERE (source_app IS NOT NULL)';
        const params = [];

        if (source_app) {
            query += ' AND source_app = ?';
            params.push(source_app);
        }
        if (source_user_id) {
            query += ' AND source_user_id = ?';
            params.push(source_user_id);
        }
        if (direction) {
            query += ' AND direction = ?';
            params.push(direction);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (template_name) {
            query += ' AND template_name = ?';
            params.push(template_name);
        }
        if (recipient_number) {
            query += ' AND recipient_number = ?';
            params.push(normalizePhone(recipient_number));
        }
        if (source_reference_id) {
            query += ' AND source_reference_id = ?';
            params.push(source_reference_id);
        }
        if (date_from) {
            query += ' AND sent_at >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND sent_at <= ?';
            params.push(date_to);
        }

        const limitVal = parseInt(limit);
        const offsetVal = (parseInt(page) - 1) * limitVal;

        let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [[{ total }]] = await pool.query(countQuery, params);

        // Fetch counts grouped by status matching current filter
        let statusCountsQuery = 'SELECT status, COUNT(*) as count FROM whatsapp_message_logs WHERE (source_app IS NOT NULL)';
        const statusCountsParams = [];
        if (source_app) {
            statusCountsQuery += ' AND source_app = ?';
            statusCountsParams.push(source_app);
        }
        if (source_user_id) {
            statusCountsQuery += ' AND source_user_id = ?';
            statusCountsParams.push(source_user_id);
        }
        if (direction) {
            statusCountsQuery += ' AND direction = ?';
            statusCountsParams.push(direction);
        }
        if (status) {
            statusCountsQuery += ' AND status = ?';
            statusCountsParams.push(status);
        }
        if (template_name) {
            statusCountsQuery += ' AND template_name = ?';
            statusCountsParams.push(template_name);
        }
        if (recipient_number) {
            statusCountsQuery += ' AND recipient_number = ?';
            statusCountsParams.push(normalizePhone(recipient_number));
        }
        if (source_reference_id) {
            statusCountsQuery += ' AND source_reference_id = ?';
            statusCountsParams.push(source_reference_id);
        }
        if (date_from) {
            statusCountsQuery += ' AND sent_at >= ?';
            statusCountsParams.push(date_from);
        }
        if (date_to) {
            statusCountsQuery += ' AND sent_at <= ?';
            statusCountsParams.push(date_to);
        }
        statusCountsQuery += ' GROUP BY status';
        const [statusCountsRows] = await pool.query(statusCountsQuery, statusCountsParams);

        query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
        params.push(limitVal, offsetVal);

        const [rows] = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: limitVal,
            totalPages: Math.ceil(total / limitVal),
            statusCounts: statusCountsRows,
            messages: rows.map(r => ({
                ...r,
                template_params_json: typeof r.template_params_json === 'string' ? JSON.parse(r.template_params_json) : r.template_params_json,
                meta_response_json: typeof r.meta_response_json === 'string' ? JSON.parse(r.meta_response_json) : r.meta_response_json
            }))
        });

    } catch (error) {
        console.error('Error fetching dashboard external messages:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/dashboard/external-conversation/:phone
 * Secured with JWT protect session. For dashboard users to view chat logs.
 */
exports.getDashboardExternalConversation = async (req, res) => {
    try {
        const { phone } = req.params;
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number parameter.' });
        }

        const [[contact]] = await pool.query(
            'SELECT id FROM whatsapp_contacts WHERE phone = ? LIMIT 1',
            [normalizedPhone]
        );

        let activityMap = {};
        if (contact) {
            const [activities] = await pool.query(
                'SELECT message_id, event_type, metadata FROM whatsapp_contact_activity WHERE contact_id = ?',
                [contact.id]
            );
            activities.forEach(act => {
                const meta = typeof act.metadata === 'string' ? JSON.parse(act.metadata) : (act.metadata || {});
                if (act.message_id) {
                    activityMap[act.message_id] = meta;
                }
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM whatsapp_message_logs 
             WHERE recipient_number = ? 
             ORDER BY sent_at ASC, id ASC`,
            [normalizedPhone]
        );

        const templateNames = [...new Set(rows.map(r => r.template_name).filter(Boolean))];
        const templatesMap = {};
        if (templateNames.length > 0) {
            const [templates] = await pool.query(
                `SELECT name, components FROM whatsapp_templates WHERE name IN (?)`,
                [templateNames]
            );
            templates.forEach(t => {
                templatesMap[t.name] = typeof t.components === 'string' ? JSON.parse(t.components) : t.components;
            });
        }

        return res.status(200).json({
            success: true,
            phone: normalizedPhone,
            conversation: rows.map(r => {
                const meta = (r.message_id && activityMap[r.message_id]) ? activityMap[r.message_id] : {};
                return {
                    ...r,
                    template_params_json: typeof r.template_params_json === 'string' ? JSON.parse(r.template_params_json) : r.template_params_json,
                    meta_response_json: typeof r.meta_response_json === 'string' ? JSON.parse(r.meta_response_json) : r.meta_response_json,
                    template_components: templatesMap[r.template_name] || null,
                    type: meta.type || (r.direction === 'incoming' ? 'text' : 'template'),
                    location: meta.location || null,
                    media_id: meta.media_id || null,
                    audio_url: meta.audio_url || null,
                    mime_type: meta.mime_type || null,
                    caption: meta.caption || null,
                    filename: meta.filename || null,
                    interactive: meta.interactive || null,
                    emoji: meta.emoji || null,
                    contacts: meta.contacts || null,
                    order: meta.order || null
                };
            })
        });

    } catch (error) {
        console.error('Error fetching dashboard conversation details:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/dashboard/external-apps
 * Secured with JWT protect session. For dashboard users to fetch all distinct source_apps in logs.
 */
exports.getDashboardExternalApps = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT source_app FROM whatsapp_message_logs 
             WHERE source_app IS NOT NULL AND source_app != '' 
             ORDER BY source_app ASC`
        );
        const apps = rows.map(r => r.source_app);
        return res.status(200).json({
            success: true,
            apps
        });
    } catch (error) {
        console.error('Error fetching dashboard external apps:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/dashboard/external-templates
 * Secured with JWT protect session. For dashboard users to fetch all distinct template_names in logs.
 */
exports.getDashboardExternalTemplates = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT template_name FROM whatsapp_message_logs 
             WHERE template_name IS NOT NULL AND template_name != '' 
             ORDER BY template_name ASC`
        );
        const templates = rows.map(r => r.template_name);
        return res.status(200).json({
            success: true,
            templates
        });
    } catch (error) {
        console.error('Error fetching dashboard external templates:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/whatsapp/dashboard/external-users
 * Secured with JWT protect session. For dashboard users to fetch all distinct source_users (id & name) in logs.
 */
exports.getDashboardExternalUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT source_user_id, source_user_name FROM whatsapp_message_logs 
             WHERE source_user_id IS NOT NULL AND source_user_id != '' 
             ORDER BY source_user_name ASC`
        );
        const users = rows.map(r => ({
            id: r.source_user_id,
            name: r.source_user_name || 'N/A'
        }));
        return res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching dashboard external users:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

