const { pool } = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { processAndSaveTemplateVariables, resolveWhatsAppConfig } = require('./whatsapp.service');
const { formatMetaError } = require('../utils/meta-error');

/**
 * Map named variables like {{first_name}} to sequential numbered variables like {{1}}
 * for Meta template creation compatibility, and construct example payloads.
 */
const mapNameVariablesToNumbers = (components) => {
    const variableMap = {};
    const varNames = [];
    const mappedComponents = JSON.parse(JSON.stringify(components));

    mappedComponents.forEach(comp => {
        const compType = String(comp.type).toLowerCase();
        if ((compType === 'body' || compType === 'header') && comp.text) {
            // Find all matches of {{variable_name}}
            const matches = [...comp.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
            matches.forEach(match => {
                const varName = match[1];
                if (!variableMap[varName]) {
                    varNames.push(varName);
                    variableMap[varName] = varNames.length; // 1-based index
                }
            });

            // Replace in text
            comp.text = comp.text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (fullMatch, varName) => {
                return `{{${variableMap[varName]}}}`;
            });

            // Add examples for Meta validation
            const uniqueMatches = [...comp.text.matchAll(/\{\{(\d+)\}\}/g)];
            if (uniqueMatches.length > 0) {
                if (compType === 'body') {
                    comp.example = {
                        body_text: [uniqueMatches.map((_, i) => `SampleValue${i + 1}`)]
                    };
                } else if (compType === 'header') {
                    comp.example = {
                        header_text: [uniqueMatches.map((_, i) => `SampleValue${i + 1}`)]
                    };
                }
            }
        }

        // Button URL variables
        if (compType === 'buttons' && Array.isArray(comp.buttons)) {
            comp.buttons.forEach(btn => {
                if (btn.type === 'URL' && btn.url) {
                    const matches = [...btn.url.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
                    matches.forEach(match => {
                        const varName = match[1];
                        if (!variableMap[varName]) {
                            varNames.push(varName);
                            variableMap[varName] = varNames.length;
                        }
                    });

                    btn.url = btn.url.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (fullMatch, varName) => {
                        return `{{${variableMap[varName]}}}`;
                    });
                }
            });
        }
    });

    return { mappedComponents, varNames };
};

/**
 * Create a message template in Meta WABA
 */
/**
 * Helper to upload a template header media to Meta WABA Resumable Upload API and return its handle.
 */
const getOrCreateMetaMediaHandle = async (token, component) => {
    let fileBuffer;
    let fileName;
    let fileType;
    let fileSize;

    try {
        // 1. Fetch App ID dynamically using debug_token
        console.log("Retrieving Meta App ID via debug_token...");
        const debugRes = await axios.get(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
        const appId = debugRes.data?.data?.app_id;
        if (!appId) {
            throw new Error("Could not extract Meta App ID from access token.");
        }
        console.log(`Resolved Meta App ID: ${appId}`);

        // 2. Load file data if media_asset_uuid is provided
        if (component.media_asset_uuid) {
            const [[asset]] = await pool.query(
                'SELECT * FROM media_library WHERE uuid = ? AND is_deleted = 0 LIMIT 1',
                [component.media_asset_uuid]
            );
            if (asset && fs.existsSync(asset.local_path)) {
                fileBuffer = fs.readFileSync(asset.local_path);
                fileName = asset.original_filename;
                fileType = asset.mime_type;
                fileSize = asset.file_size;
                console.log(`Using database asset: ${fileName} (${fileSize} bytes)`);
            }
        }

        // 3. Fallback to public dummy assets if local file not found or not provided
        if (!fileBuffer) {
            const fallbackUrl = component.format === 'IMAGE'
                ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
            
            console.log(`Downloading fallback mock file from: ${fallbackUrl}`);
            const downloadRes = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
            fileBuffer = Buffer.from(downloadRes.data);
            fileName = component.format === 'IMAGE' ? 'sample_header.jpg' : 'sample_header.pdf';
            fileType = component.format === 'IMAGE' ? 'image/jpeg' : 'application/pdf';
            fileSize = fileBuffer.length;
            console.log(`Fallback mock file downloaded (${fileSize} bytes)`);
        }

        // 4. Create upload session in Meta WABA
        const uploadSessionUrl = `https://graph.facebook.com/v24.0/${appId}/uploads?file_name=${encodeURIComponent(fileName)}&file_length=${fileSize}&file_type=${fileType}&access_token=${token}`;
        console.log("Creating resumable upload session on Meta WABA...");
        const sessionRes = await axios.post(uploadSessionUrl);
        const uploadSessionId = sessionRes.data?.id;
        if (!uploadSessionId) {
            throw new Error("Failed to create Meta resumable upload session.");
        }
        console.log(`Meta Upload Session ID: ${uploadSessionId}`);

        // 5. Upload binary bytes to Meta session
        console.log("Uploading file bytes to Meta resumable session...");
        const uploadRes = await axios.post(
            `https://graph.facebook.com/v24.0/${uploadSessionId}`,
            fileBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'file_offset': '0',
                    'Content-Type': 'application/octet-stream'
                }
            }
        );
        const handle = uploadRes.data?.h;
        if (!handle) {
            throw new Error("Failed to get file handle from Meta resumable upload.");
        }
        console.log(`Successfully obtained Meta media handle: ${handle}`);
        return handle;

    } catch (err) {
        console.error("Failed to generate WABA media header handle:", err.response?.data || err.message);
        throw err;
    }
};

/**
 * Create a message template in Meta WABA
 */
const createMetaTemplate = async (templateData, configId = null) => {
    const { token, wabaId } = await resolveWhatsAppConfig(configId);

    if (!token || !wabaId) {
        throw new Error('Meta integration credentials (Access Token or WABA ID) are missing.');
    }

    const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates`;

    // Process and resolve handles for media headers (IMAGE / DOCUMENT) before sequential variables mapping
    const components = templateData.components || [];
    for (const comp of components) {
        if (comp.type === 'HEADER' && (comp.format === 'IMAGE' || comp.format === 'DOCUMENT')) {
            try {
                const handle = await getOrCreateMetaMediaHandle(token, comp);
                comp.example = {
                    header_handle: [handle]
                };
            } catch (err) {
                console.error("Failed to dynamically obtain WABA media handle. Falling back to default URL example parameter.", err.message);
                comp.example = {
                    header_handle: [
                        comp.format === 'IMAGE'
                            ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                            : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                    ]
                };
            }
            // Clear temp media selector variables so they are not sent to WABA API
            delete comp.media_asset_uuid;
        }
    }

    // Map named variables to sequential numbers (e.g. {{name}} -> {{1}}) for Meta template submit
    const { mappedComponents, varNames } = mapNameVariablesToNumbers(components);

    try {
        console.log(`Creating template "${templateData.name}" on Meta WABA...`);
        const response = await axios.post(url, {
            name: templateData.name.toLowerCase().trim().replace(/\s+/g, '_'),
            category: templateData.category || 'MARKETING',
            language: templateData.language || 'en',
            components: mappedComponents
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Insert/cache newly created template in DB
        const templateId = response.data.id;
        await pool.query(
            `INSERT INTO whatsapp_templates (id, waba_id, name, status, language, category, components, variables)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                components = VALUES(components),
                variables = VALUES(variables),
                synced_at = CURRENT_TIMESTAMP`,
            [
                templateId,
                wabaId,
                templateData.name.toLowerCase().trim().replace(/\s+/g, '_'),
                'PENDING', // Default state on submit is PENDING
                templateData.language || 'en',
                templateData.category || 'MARKETING',
                JSON.stringify(mappedComponents),
                JSON.stringify(varNames)
            ]
        );

        await processAndSaveTemplateVariables(templateId, mappedComponents, components);

        return response.data;
    } catch (error) {
        console.error('Error creating template on Meta:', error.response?.data || error.message);
        throw formatMetaError(error);
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
        throw formatMetaError(error);
    }
};

/**
 * Update message status in whatsapp_message_logs based on incoming webhooks
 */
const updateMessageStatus = async (messageId, status, errorMessage = null) => {
    try {
        // 0. Prevent duplicate and out-of-order webhook status updates
        const [[existingLog]] = await pool.query(
            'SELECT status FROM whatsapp_message_logs WHERE message_id = ? LIMIT 1',
            [messageId]
        );

        if (existingLog) {
            const statusPriority = {
                'failed': 99,
                'replied': 4,
                'read': 3,
                'delivered': 2,
                'sent': 1,
                'queued': 0
            };
            const currentPriority = statusPriority[String(existingLog.status).toLowerCase()] || 0;
            const newPriority = statusPriority[String(status).toLowerCase()] || 0;

            if (currentPriority >= newPriority && newPriority !== 99) {
                console.log(`[Webhook Status] Message ID ${messageId} is already at status "${existingLog.status}" (priority ${currentPriority}). Skipping duplicate or late update to "${status}" (priority ${newPriority}).`);
                return;
            }
        }

        // 1. Update the message status in the main logs table
        await pool.query(
            `UPDATE whatsapp_message_logs 
             SET status = ?, error_message = COALESCE(?, error_message)
             WHERE message_id = ?`,
            [status, errorMessage, messageId]
        );
        console.log(`Updated WhatsApp message ID ${messageId} status to: ${status}`);

        // 2. Query whatsapp_campaign_recipients to see if this message belongs to a campaign
        const [[recipient]] = await pool.query(
            'SELECT id, campaign_id, phone FROM whatsapp_campaign_recipients WHERE message_id = ?',
            [messageId]
        );

        if (recipient) {
            const { campaign_id: campaignId, phone } = recipient;

            // 3. Update the campaign recipient status
            await pool.query(
                `UPDATE whatsapp_campaign_recipients 
                 SET status = ?, error_message = COALESCE(?, error_message)
                 WHERE message_id = ?`,
                [status, errorMessage, messageId]
            );
            console.log(`Updated recipient status in Campaign ID ${campaignId} to: ${status}`);

            // 4. Update the campaign stats and recalculate completion
            const { updateCampaignStatsAndCheckCompletion } = require('./whatsapp-queue.service');
            await updateCampaignStatsAndCheckCompletion(campaignId);

            // 5. Check if contact exists to log activity and recalculate engagement score
            const normalizedPhone = String(phone).replace(/[^0-9]/g, '');
            const [[contact]] = await pool.query(
                'SELECT id FROM whatsapp_contacts WHERE phone = ?',
                [normalizedPhone]
            );

            if (contact) {
                const contactId = contact.id;

                // Log the status activity (delivered, read, failed, etc.)
                let eventType = 'sent';
                if (status === 'delivered') eventType = 'delivered';
                else if (status === 'read') eventType = 'read';
                else if (status === 'failed') eventType = 'failed';

                // Insert into contact activity
                await pool.query(
                    `INSERT INTO whatsapp_contact_activity (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [
                        contactId,
                        campaignId,
                        messageId,
                        eventType,
                        JSON.stringify({ status, error: errorMessage })
                    ]
                );

                // Recalculate engagement score
                const { recalculateContactEngagement } = require('./whatsapp-contacts-intelligence.service');
                await recalculateContactEngagement(contactId);
                console.log(`[Webhook Status] Updated contact ID ${contactId} engagement score due to status event: ${status}`);

                // Broadcast status update via SSE
                try {
                    const eventService = require('./whatsapp-events.service');
                    eventService.broadcast('status', {
                        contactId,
                        messageId,
                        status: eventType,
                        error: errorMessage
                    });
                } catch (sseErr) {
                    console.error('[SSE] Failed to broadcast status update:', sseErr.message);
                }
            }
        } else {
            // Message is not from a campaign recipient. It could be a direct chat message.
            // 1. Search whatsapp_contact_activity for the sent event of this messageId to get contactId.
            const [[activityRecord]] = await pool.query(
                'SELECT contact_id, campaign_id FROM whatsapp_contact_activity WHERE message_id = ? LIMIT 1',
                [messageId]
            );

            let contactId = null;
            let campaignId = null;

            if (activityRecord) {
                contactId = activityRecord.contact_id;
                campaignId = activityRecord.campaign_id;
            } else {
                // Fallback: search whatsapp_message_logs to find recipient_number
                const [[messageLog]] = await pool.query(
                    'SELECT recipient_number FROM whatsapp_message_logs WHERE message_id = ? LIMIT 1',
                    [messageId]
                );
                if (messageLog) {
                    const normalizedPhone = String(messageLog.recipient_number).replace(/[^0-9]/g, '');
                    const [[contact]] = await pool.query(
                        'SELECT id FROM whatsapp_contacts WHERE phone = ?',
                        [normalizedPhone]
                    );
                    if (contact) {
                        contactId = contact.id;
                    }
                }
            }

            if (contactId) {
                let eventType = 'sent';
                if (status === 'delivered') eventType = 'delivered';
                else if (status === 'read') eventType = 'read';
                else if (status === 'failed') eventType = 'failed';

                // Check if this status event is already logged to prevent duplicates
                const [[alreadyLogged]] = await pool.query(
                    'SELECT id FROM whatsapp_contact_activity WHERE message_id = ? AND event_type = ?',
                    [messageId, eventType]
                );

                if (!alreadyLogged) {
                    await pool.query(
                        `INSERT INTO whatsapp_contact_activity (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
                         VALUES (?, ?, ?, ?, ?, NOW())`,
                        [
                            contactId,
                            campaignId, // will be null for direct chats
                            messageId,
                            eventType,
                            JSON.stringify({ status, error: errorMessage })
                        ]
                    );

                    // Recalculate engagement score
                    const { recalculateContactEngagement } = require('./whatsapp-contacts-intelligence.service');
                    await recalculateContactEngagement(contactId);
                    console.log(`[Webhook Status] Updated direct contact ID ${contactId} engagement score due to status event: ${status}`);

                    // Broadcast the status update via SSE
                    try {
                        const eventService = require('./whatsapp-events.service');
                        eventService.broadcast('status', {
                            contactId,
                            messageId,
                            status: eventType,
                            error: errorMessage
                        });
                    } catch (sseErr) {
                        console.error('[SSE] Failed to broadcast status update:', sseErr.message);
                    }
                }
            }
        }
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

const handleIncomingMessage = async (msgData) => {
    const { fromPhone, messageId, timestamp, type, body, senderName, phoneId, replyToMessageId } = msgData;

    try {
        // 1. Normalize the phone number
        const normalized = String(fromPhone).replace(/[^0-9]/g, '');
        if (!normalized || normalized.length < 10) {
            console.warn(`[Webhook] Invalid phone number received: ${fromPhone}`);
            return;
        }

        // 1b. Prevent duplicate incoming reply processing
        const [[existingLog]] = await pool.query(
            'SELECT id FROM whatsapp_message_logs WHERE message_id = ? LIMIT 1',
            [messageId]
        );
        if (existingLog) {
            console.log(`[Webhook] Duplicate incoming reply message detected (Message ID: ${messageId}). Skipping processing.`);
            return;
        }

        // 2. Find or create the contact in whatsapp_contacts
        let contactId;
        const [[contact]] = await pool.query(
            'SELECT id FROM whatsapp_contacts WHERE phone = ?',
            [normalized]
        );

        if (contact) {
            contactId = contact.id;
            // Update last_message_at and ensure opt_in_status is true if they messaged us
            await pool.query(
                `UPDATE whatsapp_contacts 
                 SET last_message_at = NOW(), 
                     opt_in_status = TRUE, 
                     status = 'active',
                     opt_in_date = COALESCE(opt_in_date, NOW())
                 WHERE id = ?`,
                [contactId]
            );
        } else {
            // Create a new contact
            const [insertRes] = await pool.query(
                `INSERT INTO whatsapp_contacts (phone, name, opt_in_status, opt_in_date, last_message_at, status)
                 VALUES (?, ?, TRUE, NOW(), NOW(), 'active')`,
                [normalized, senderName || `WhatsApp User ${normalized.slice(-4)}`]
            );
            contactId = insertRes.insertId;
            console.log(`[Webhook] Created new contact ID ${contactId} for phone ${normalized}`);
        }

        // 3. Find the most recent campaign sent to this contact to associate this reply (if any)
        const [[lastCampaign]] = await pool.query(
            `SELECT campaign_id FROM whatsapp_campaign_recipients
             WHERE phone = ? AND status IN ('sent', 'delivered', 'read')
             ORDER BY sent_at DESC LIMIT 1`,
            [normalized]
        );
        const campaignId = lastCampaign ? lastCampaign.campaign_id : null;

        // 3b. Reply Linking Rule: Match to latest outgoing message within a 7-day time window
        let linkedMsg = null;
        if (replyToMessageId) {
            const [[matchedMsg]] = await pool.query(
                'SELECT source_app, source_user_id, source_user_name, source_reference_id FROM whatsapp_message_logs WHERE message_id = ? LIMIT 1',
                [replyToMessageId]
            );
            if (matchedMsg) {
                linkedMsg = matchedMsg;
            }
        }

        if (!linkedMsg) {
            const [[matchedMsg]] = await pool.query(
                `SELECT source_app, source_user_id, source_user_name, source_reference_id 
                 FROM whatsapp_message_logs 
                 WHERE recipient_number = ? AND direction = 'outgoing' AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 ORDER BY sent_at DESC LIMIT 1`,
                [normalized]
            );
            if (matchedMsg) {
                linkedMsg = matchedMsg;
            }
        }

        // 3c. Save reply to whatsapp_message_logs
        await pool.query(
            `INSERT INTO whatsapp_message_logs 
                (phone_number_id, recipient_number, template_name, status, message_id, sent_by, error_message,
                 source_app, source_user_id, source_user_name, source_reference_id, message_type, direction,
                 received_message_text, reply_to_message_id)
             VALUES (?, ?, ?, 'replied', ?, NULL, NULL, ?, ?, ?, ?, 'reply', 'incoming', ?, ?)`,
            [
                phoneId || 'N/A',
                normalized,
                'Customer Reply',
                messageId,
                linkedMsg?.source_app || null,
                linkedMsg?.source_user_id || null,
                linkedMsg?.source_user_name || null,
                linkedMsg?.source_reference_id || null,
                body || '',
                replyToMessageId || null
            ]
        );

        // 4. Log the reply in whatsapp_contact_activity
        const eventTimestamp = timestamp
            ? new Date(timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const activityMetadata = {
            body,
            type,
            raw_phone: fromPhone,
            waba_phone_id: phoneId,
            source_app: linkedMsg?.source_app || null,
            source_user_id: linkedMsg?.source_user_id || null,
            source_reference_id: linkedMsg?.source_reference_id || null
        };

        const [activityRes] = await pool.query(
            `INSERT INTO whatsapp_contact_activity (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
             VALUES (?, ?, ?, 'replied', ?, ?)`,
            [
                contactId,
                campaignId,
                messageId,
                JSON.stringify(activityMetadata),
                eventTimestamp
            ]
        );
        const activityId = activityRes.insertId;


        // 5. If there is a campaign associated, update its recipient record to 'replied'
        if (campaignId) {
            await pool.query(
                `UPDATE whatsapp_campaign_recipients 
                 SET status = 'replied' 
                 WHERE campaign_id = ? AND phone = ?`,
                [campaignId, normalized]
            );
        }

        // Broadcast the incoming message via SSE
        try {
            const eventService = require('./whatsapp-events.service');
            eventService.broadcast('message', {
                contactId,
                message: {
                    id: activityId,
                    message_id: messageId,
                    campaign_id: campaignId,
                    type: type || 'text',
                    body: body,
                    status: 'replied',
                    isOutgoing: false,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (sseErr) {
            console.error('[SSE] Failed to broadcast incoming message:', sseErr.message);
        }

        // 6. Recalculate engagement score for the contact
        const whatsappContactsIntelligenceService = require('./whatsapp-contacts-intelligence.service');
        await whatsappContactsIntelligenceService.recalculateContactEngagement(contactId);

        console.log(`[Webhook] Successfully processed incoming message from ${normalized} for contact ID ${contactId}`);
    } catch (error) {
        console.error('[Webhook] Error handling incoming message:', error.message);
    }
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
    useTemplateMapping,
    handleIncomingMessage
};

