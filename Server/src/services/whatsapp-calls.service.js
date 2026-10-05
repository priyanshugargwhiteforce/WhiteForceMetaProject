const { pool } = require('../config/db');

/**
 * Process incoming WhatsApp Call Webhook payload item.
 * Upserts call log record into whatsapp_call_logs and updates contact activity.
 */
async function processCallWebhook(callObj, metadata = {}, contacts = []) {
    if (!callObj || !callObj.id) {
        console.warn('[WhatsApp Calls Service] Invalid call object received, skipping.');
        return null;
    }

    try {
        const callId = callObj.id;
        const rawFrom = callObj.from || '';
        const callerPhone = String(rawFrom).replace(/[^0-9]/g, '');
        const receiverPhone = String(callObj.to || metadata.display_phone_number || '').replace(/[^0-9]/g, '');
        const callerUserId = callObj.from_user_id || null;
        const direction = callObj.direction || 'USER_INITIATED';
        const event = callObj.event || 'connect';
        const phoneNumberId = metadata.phone_number_id || null;
        const displayPhoneNumber = metadata.display_phone_number || null;

        // Parse timestamp
        let callTimestamp = new Date();
        if (callObj.timestamp) {
            const parsedEpoch = parseInt(callObj.timestamp, 10);
            if (!isNaN(parsedEpoch) && parsedEpoch > 0) {
                callTimestamp = new Date(parsedEpoch * 1000);
            }
        }

        // Determine Caller Name
        let callerName = null;
        if (Array.isArray(contacts) && contacts.length > 0) {
            const contactMatch = contacts.find(c => c.wa_id === rawFrom || c.wa_id === callerPhone || c.user_id === callerUserId);
            if (contactMatch?.profile?.name) {
                callerName = contactMatch.profile.name;
            }
        }

        // Fallback: search in whatsapp_contacts if callerName is null
        if (!callerName && callerPhone) {
            const [[existingContact]] = await pool.query(
                'SELECT name FROM whatsapp_contacts WHERE phone = ? LIMIT 1',
                [callerPhone]
            );
            if (existingContact?.name) {
                callerName = existingContact.name;
            }
        }

        const sessionData = callObj.session ? JSON.stringify(callObj.session) : null;
        const sdpType = callObj.session?.sdp_type || null;
        const rawPayload = JSON.stringify({ call: callObj, metadata, contacts });

        // Upsert into whatsapp_call_logs
        await pool.query(
            `INSERT INTO whatsapp_call_logs (
                call_id, phone_number_id, display_phone_number, caller_phone, caller_name,
                caller_user_id, receiver_phone, direction, event, sdp_type,
                session_data, raw_payload, call_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                phone_number_id = COALESCE(VALUES(phone_number_id), phone_number_id),
                display_phone_number = COALESCE(VALUES(display_phone_number), display_phone_number),
                caller_phone = COALESCE(VALUES(caller_phone), caller_phone),
                caller_name = COALESCE(VALUES(caller_name), caller_name),
                caller_user_id = COALESCE(VALUES(caller_user_id), caller_user_id),
                receiver_phone = COALESCE(VALUES(receiver_phone), receiver_phone),
                direction = COALESCE(VALUES(direction), direction),
                event = VALUES(event),
                sdp_type = COALESCE(VALUES(sdp_type), sdp_type),
                session_data = COALESCE(VALUES(session_data), session_data),
                raw_payload = VALUES(raw_payload),
                call_timestamp = COALESCE(VALUES(call_timestamp), call_timestamp),
                duration = CASE
                    WHEN VALUES(event) IN ('terminate', 'ended', 'completed') AND call_timestamp IS NOT NULL
                        THEN GREATEST(0, TIMESTAMPDIFF(SECOND, call_timestamp, VALUES(call_timestamp)))
                    ELSE duration
                END`,
            [
                callId, phoneNumberId, displayPhoneNumber, callerPhone, callerName,
                callerUserId, receiverPhone, direction, event, sdpType,
                sessionData, rawPayload, callTimestamp
            ]
        );

        console.log(`[WhatsApp Calls Service] Call event '${event}' logged for Call ID: ${callId} (From: ${callerPhone})`);

        // Manage contact sync & activity logging if callerPhone is present
        if (callerPhone) {
            let contactId = null;
            const [[contact]] = await pool.query(
                'SELECT id FROM whatsapp_contacts WHERE phone = ? LIMIT 1',
                [callerPhone]
            );

            if (contact) {
                contactId = contact.id;
                await pool.query(
                    `UPDATE whatsapp_contacts 
                     SET last_message_at = NOW(), 
                         status = 'active'
                     WHERE id = ?`,
                    [contactId]
                );
            } else {
                const [insertRes] = await pool.query(
                    `INSERT INTO whatsapp_contacts (phone, name, opt_in_status, opt_in_date, last_message_at, status)
                     VALUES (?, ?, TRUE, NOW(), NOW(), 'active')`,
                    [callerPhone, callerName || `Caller ${callerPhone}`]
                );
                contactId = insertRes.insertId;
            }

            // Log call activity event in whatsapp_contact_activity
            if (contactId) {
                try {
                    await pool.query(
                        `INSERT INTO whatsapp_contact_activity (contact_id, event_type, metadata, event_timestamp)
                         VALUES (?, 'call', ?, NOW())`,
                        [contactId, JSON.stringify({ call_id: callId, event, direction, receiver_phone: receiverPhone })]
                    );
                } catch (actErr) {
                    console.warn('[WhatsApp Calls Service] Could not insert contact activity:', actErr.message);
                }
            }
        }

        return { callId, status: 'processed' };
    } catch (err) {
        console.error('[WhatsApp Calls Service] Error processing call webhook:', err);
        throw err;
    }
}

/**
 * Fetch paginated WhatsApp Call logs with filters and summary statistics.
 */
async function getCallLogs({
    page = 1,
    limit = 20,
    search = '',
    event = '',
    direction = '',
    startDate = '',
    endDate = '',
    phoneId = ''
} = {}) {
    try {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        const whereConditions = [];
        const queryParams = [];

        if (search && search.trim() !== '') {
            const searchPattern = `%${search.trim()}%`;
            whereConditions.push('(caller_name LIKE ? OR caller_phone LIKE ? OR receiver_phone LIKE ? OR call_id LIKE ?)');
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (event && event.trim() !== '' && event !== 'all') {
            whereConditions.push('event = ?');
            queryParams.push(event.trim());
        }

        if (direction && direction.trim() !== '' && direction !== 'all') {
            whereConditions.push('direction = ?');
            queryParams.push(direction.trim());
        }

        if (phoneId && phoneId.trim() !== '') {
            whereConditions.push('phone_number_id = ?');
            queryParams.push(phoneId.trim());
        }

        if (startDate && startDate.trim() !== '') {
            whereConditions.push('call_timestamp >= ?');
            queryParams.push(`${startDate.trim()} 00:00:00`);
        }

        if (endDate && endDate.trim() !== '') {
            whereConditions.push('call_timestamp <= ?');
            queryParams.push(`${endDate.trim()} 23:59:59`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Total matching records count
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM whatsapp_call_logs ${whereClause}`,
            queryParams
        );

        // Call logs list
        const [calls] = await pool.query(
            `SELECT 
                id, call_id, phone_number_id, display_phone_number,
                caller_phone, caller_name, caller_user_id, receiver_phone,
                direction, event, sdp_type, session_data, duration,
                call_timestamp, created_at, updated_at
             FROM whatsapp_call_logs
             ${whereClause}
             ORDER BY call_timestamp DESC, id DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, limitNum, offset]
        );

        // Aggregate KPI Summary
        const [[summary]] = await pool.query(
            `SELECT 
                COUNT(*) AS totalCalls,
                SUM(CASE WHEN LOWER(event) IN ('connect', 'connected', 'terminate', 'completed', 'ended') OR duration > 0 THEN 1 ELSE 0 END) AS connectedCalls,
                SUM(CASE WHEN LOWER(event) IN ('missed', 'reject', 'rejected', 'failed', 'no_answer') THEN 1 ELSE 0 END) AS missedCalls,
                SUM(CASE WHEN direction = 'USER_INITIATED' THEN 1 ELSE 0 END) AS userInitiated,
                SUM(CASE WHEN direction = 'BUSINESS_INITIATED' THEN 1 ELSE 0 END) AS businessInitiated
             FROM whatsapp_call_logs ${whereClause}`,
            queryParams
        );

        return {
            calls: calls || [],
            pagination: {
                total: Number(total || 0),
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(Number(total || 0) / limitNum)
            },
            summary: {
                totalCalls: Number(summary?.totalCalls || 0),
                connectedCalls: Number(summary?.connectedCalls || 0),
                missedCalls: Number(summary?.missedCalls || 0),
                userInitiated: Number(summary?.userInitiated || 0),
                businessInitiated: Number(summary?.businessInitiated || 0)
            }
        };
    } catch (err) {
        console.error('[WhatsApp Calls Service] Error fetching call logs:', err);
        throw err;
    }
}

/**
 * Get details of a single WhatsApp call by ID.
 */
async function getCallDetails(id) {
    try {
        const [[call]] = await pool.query(
            'SELECT * FROM whatsapp_call_logs WHERE id = ? OR call_id = ? LIMIT 1',
            [id, id]
        );
        return call || null;
    } catch (err) {
        console.error('[WhatsApp Calls Service] Error fetching call details:', err);
        throw err;
    }
}

/**
 * Delete a call log record by ID.
 */
async function deleteCallLog(id) {
    try {
        const [result] = await pool.query(
            'DELETE FROM whatsapp_call_logs WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error('[WhatsApp Calls Service] Error deleting call log:', err);
        throw err;
    }
}

module.exports = {
    processCallWebhook,
    getCallLogs,
    getCallDetails,
    deleteCallLog
};
