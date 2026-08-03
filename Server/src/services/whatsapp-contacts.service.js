const { pool } = require('../config/db');

/**
 * Normalizes phone number to contain only digits.
 */
function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^0-9]/g, '');
}

/**
 * Imports a batch of contacts, optionally assigning them to a contact list and adding tags.
 */
const importContacts = async (contactsList, listName = null, listId = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let targetListId = listId ? parseInt(listId) : null;

        // 1. Resolve or create list if listName is provided and targetListId is not
        if (!targetListId && listName && String(listName).trim() !== '') {
            const trimmedListName = String(listName).trim();
            // Check if list exists
            const [[existingList]] = await connection.query(
                'SELECT id FROM whatsapp_contact_lists WHERE name = ?',
                [trimmedListName]
            );
            if (existingList) {
                targetListId = existingList.id;
            } else {
                const [insertListRes] = await connection.query(
                    'INSERT INTO whatsapp_contact_lists (name) VALUES (?)',
                    [trimmedListName]
                );
                targetListId = insertListRes.insertId;
            }
        }

        const results = {
            processed: 0,
            inserted: 0,
            updated: 0,
            failed: 0
        };

        for (const item of contactsList) {
            const rawPhone = item.phone || item.number || item.phone_number;
            const phone = normalizePhone(rawPhone);
            if (!phone || phone.length < 10) {
                results.failed++;
                continue;
            }

            const name = item.name || null;
            const email = item.email || null;
            const company = item.company || null;
            const optInStatus = item.opt_in_status !== undefined ? Boolean(item.opt_in_status) : true;
            const optInDate = optInStatus ? new Date() : null;
            const attributes = item.attributes ? JSON.stringify(item.attributes) : null;

            // 2. Insert or update contact details
            const [contactRes] = await connection.query(
                `INSERT INTO whatsapp_contacts (phone, name, email, company, opt_in_status, opt_in_date, attributes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    name = COALESCE(VALUES(name), name),
                    email = COALESCE(VALUES(email), email),
                    company = COALESCE(VALUES(company), company),
                    opt_in_status = VALUES(opt_in_status),
                    attributes = COALESCE(VALUES(attributes), attributes)`,
                [phone, name, email, company, optInStatus, optInDate, attributes]
            );

            // Fetch the contact ID
            let contactId = contactRes.insertId;
            if (!contactId) {
                const [[existingContact]] = await connection.query(
                    'SELECT id FROM whatsapp_contacts WHERE phone = ?',
                    [phone]
                );
                contactId = existingContact.id;
            }

            if (contactRes.affectedRows === 1) {
                results.inserted++;
            } else {
                results.updated++;
            }

            results.processed++;

            // 3. Add members to contact list if list is specified
            if (targetListId) {
                await connection.query(
                    `INSERT IGNORE INTO whatsapp_contact_list_members (list_id, contact_id)
                     VALUES (?, ?)`,
                    [targetListId, contactId]
                );
            }

            // 4. Add contact tags if present
            let tags = item.tags || [];
            if (typeof tags === 'string') {
                tags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            }
            if (Array.isArray(tags) && tags.length > 0) {
                for (const tag of tags) {
                    const cleanTag = String(tag).trim();
                    if (cleanTag) {
                        await connection.query(
                            `INSERT IGNORE INTO whatsapp_contact_tags (contact_id, tag_name)
                             VALUES (?, ?)`,
                            [contactId, cleanTag]
                        );
                    }
                }
            }
        }

        await connection.commit();
        return { success: true, listId: targetListId, ...results };
    } catch (error) {
        await connection.rollback();
        console.error('Error importing contacts:', error.message);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Retrieves a list of contacts with pagination, search, tags, list, and segment filtering.
 */
const getContacts = async ({ page = 1, limit = 20, search = '', listId = null, tag = null, segment = null }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    let query = `
        SELECT c.*, 
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               GROUP_CONCAT(DISTINCT l.name) AS lists
        FROM whatsapp_contacts c
        LEFT JOIN whatsapp_contact_tags t ON c.id = t.contact_id
        LEFT JOIN whatsapp_contact_list_members lm ON c.id = lm.contact_id
        LEFT JOIN whatsapp_contact_lists l ON lm.list_id = l.id
    `;

    const whereClauses = [];
    const queryParams = [];

    if (search && search.trim() !== '') {
        const searchTerm = `%${search.trim()}%`;
        whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.company LIKE ?)');
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (listId) {
        whereClauses.push('lm.list_id = ?');
        queryParams.push(parseInt(listId));
    }

    if (tag && tag.trim() !== '') {
        whereClauses.push('c.id IN (SELECT contact_id FROM whatsapp_contact_tags WHERE tag_name = ?)');
        queryParams.push(tag.trim());
    }

    // Sprint 9: Dynamic segment filtering
    if (segment) {
        switch (segment) {
            case 'champions':
                whereClauses.push('c.engagement_score >= 80');
                break;
            case 'engaged':
                whereClauses.push('c.engagement_score >= 50 AND c.engagement_score < 80');
                break;
            case 'at_risk':
                whereClauses.push('c.engagement_score > 0 AND c.engagement_score < 50');
                break;
            case 'never_opened':
                whereClauses.push('c.total_sent > 0 AND c.total_read = 0');
                break;
            case 'unsubscribed':
                whereClauses.push("c.status = 'unsubscribed'");
                break;
            case 'archived':
                whereClauses.push("c.status = 'archived'");
                break;
            default:
                break;
        }
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY c.id ORDER BY c.engagement_score DESC, c.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limitVal, offset);

    // Get count query
    let countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM whatsapp_contacts c
        LEFT JOIN whatsapp_contact_list_members lm ON c.id = lm.contact_id
    `;
    const countParams = [];
    if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
        // slice limit/offset params
        countParams.push(...queryParams.slice(0, queryParams.length - 2));
    }

    const [rows] = await pool.query(query, queryParams);
    const [[{ total }]] = await pool.query(countQuery, countParams);

    const formattedRows = rows.map(row => ({
        ...row,
        tags: row.tags ? row.tags.split(',') : [],
        lists: row.lists ? row.lists.split(',') : [],
        attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {})
    }));

    return {
        contacts: formattedRows,
        pagination: {
            total,
            page: parseInt(page),
            limit: limitVal,
            totalPages: Math.ceil(total / limitVal)
        }
    };
};


/**
 * Creates a new contact list.
 */
const createContactList = async (name) => {
    if (!name || name.trim() === '') {
        throw new Error('List name is required');
    }
    const [result] = await pool.query(
        'INSERT INTO whatsapp_contact_lists (name) VALUES (?)',
        [name.trim()]
    );
    return { id: result.insertId, name: name.trim() };
};

/**
 * Fetches all contact lists.
 */
const getContactLists = async () => {
    const [rows] = await pool.query(
        `SELECT l.*, COUNT(lm.contact_id) as member_count 
         FROM whatsapp_contact_lists l
         LEFT JOIN whatsapp_contact_list_members lm ON l.id = lm.list_id
         GROUP BY l.id
         ORDER BY l.name ASC`
    );
    return rows;
};

/**
 * Deletes a contact list.
 */
const deleteContactList = async (listId) => {
    await pool.query('DELETE FROM whatsapp_contact_lists WHERE id = ?', [listId]);
    return { success: true };
};

const getAttributeKeys = async (listId = null) => {
    let query = 'SELECT attributes FROM whatsapp_contacts';
    const params = [];
    if (listId) {
        query = `
            SELECT c.attributes 
            FROM whatsapp_contacts c
            JOIN whatsapp_contact_list_members m ON m.contact_id = c.id
            WHERE m.list_id = ? AND c.attributes IS NOT NULL
        `;
        params.push(parseInt(listId));
    } else {
        query += ' WHERE attributes IS NOT NULL';
    }

    const [rows] = await pool.query(query, params);
    const keys = new Set();
    rows.forEach(row => {
        const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
        if (attrs && typeof attrs === 'object') {
            Object.keys(attrs).forEach(k => keys.add(k));
        }
    });
    return Array.from(keys);
};

const getChatThreads = async (page = 1, limit = 20, search = '') => {
    const limitVal = parseInt(limit) || 20;
    const pageVal = parseInt(page) || 1;
    const offset = (pageVal - 1) * limitVal;
    const params = [];
    
    let searchCondition = '';
    if (search && search.trim() !== '') {
        const searchLike = `%${search.trim()}%`;
        searchCondition = ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
        params.push(searchLike, searchLike);
    }
    
    const query = `
        SELECT c.id, c.phone, c.name, c.last_message_at, c.status, c.engagement_score,
               a.event_type, a.metadata, a.event_timestamp
        FROM whatsapp_contacts c
        LEFT JOIN (
            SELECT ca.*
            FROM whatsapp_contact_activity ca
            INNER JOIN (
                SELECT contact_id, MAX(id) as max_id
                FROM whatsapp_contact_activity
                GROUP BY contact_id
            ) latest ON latest.max_id = ca.id
        ) a ON a.contact_id = c.id
        WHERE c.last_message_at IS NOT NULL ${searchCondition}
        ORDER BY c.last_message_at DESC
        LIMIT ? OFFSET ?
    `;
    
    params.push(limitVal + 1, offset);
    
    const [rows] = await pool.query(query, params);
    
    const hasMore = rows.length > limitVal;
    const resultRows = hasMore ? rows.slice(0, limitVal) : rows;
    
    const threads = resultRows.map(r => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {})
    }));
    
    return { threads, hasMore };
};

const getChatMessages = async (contactId) => {
    const query = `
        SELECT id, campaign_id, message_id, event_type, metadata, event_timestamp
        FROM whatsapp_contact_activity
        WHERE contact_id = ?
        ORDER BY event_timestamp ASC, id ASC
    `;
    const [rows] = await pool.query(query, [contactId]);

    const messages = [];
    const messageMap = {};
    let lastIncomingTimestamp = null;

    for (const act of rows) {
        const metadata = typeof act.metadata === 'string' ? JSON.parse(act.metadata) : (act.metadata || {});
        const msgId = act.message_id;
        const isOutgoing = act.event_type !== 'replied';

        if (act.event_type === 'replied' && act.event_timestamp) {
            lastIncomingTimestamp = act.event_timestamp;
        }

        if (msgId) {
            if (messageMap[msgId]) {
                const msg = messageMap[msgId];
                msg.status = act.event_type;
                if (metadata.error) msg.error = metadata.error;
            } else {
                const msg = {
                    id: act.id,
                    message_id: msgId,
                    campaign_id: act.campaign_id,
                    type: metadata.type || (isOutgoing ? 'template' : 'text'),
                    body: metadata.body || (isOutgoing ? `Template: ${metadata.template_name || 'Campaign Template'}` : ''),
                    location: metadata.location || null,
                    media_id: metadata.media_id || null,
                    audio_url: metadata.audio_url || null,
                    mime_type: metadata.mime_type || null,
                    caption: metadata.caption || null,
                    filename: metadata.filename || null,
                    interactive: metadata.interactive || null,
                    emoji: metadata.emoji || null,
                    contacts: metadata.contacts || null,
                    status: act.event_type,
                    isOutgoing,
                    timestamp: act.event_timestamp,
                    template_name: metadata.template_name || null
                };
                messageMap[msgId] = msg;
                messages.push(msg);
            }
        } else {
            messages.push({
                id: act.id,
                message_id: null,
                campaign_id: act.campaign_id,
                type: act.event_type === 'unsubscribed' ? 'system' : (metadata.type || 'text'),
                body: act.event_type === 'unsubscribed' ? 'User unsubscribed' : (metadata.body || `Event: ${act.event_type}`),
                location: metadata.location || null,
                media_id: metadata.media_id || null,
                audio_url: metadata.audio_url || null,
                mime_type: metadata.mime_type || null,
                caption: metadata.caption || null,
                filename: metadata.filename || null,
                interactive: metadata.interactive || null,
                emoji: metadata.emoji || null,
                contacts: metadata.contacts || null,
                status: act.event_type,
                isOutgoing,
                timestamp: act.event_timestamp
            });
        }
    }

    // Calculate 24-Hour Customer Service Window Status
    let window24h = {
        isOpen: false,
        lastIncomingAt: null,
        expiresAt: null,
        remainingMinutes: 0,
        remainingFormatted: 'Expired'
    };

    if (lastIncomingTimestamp) {
        const lastTime = new Date(lastIncomingTimestamp).getTime();
        if (!isNaN(lastTime)) {
            const expiresTime = lastTime + (24 * 60 * 60 * 1000);
            const nowTime = Date.now();
            const diffMs = expiresTime - nowTime;

            if (diffMs > 0) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                window24h = {
                    isOpen: true,
                    lastIncomingAt: new Date(lastTime).toISOString(),
                    expiresAt: new Date(expiresTime).toISOString(),
                    remainingMinutes: Math.floor(diffMs / (1000 * 60)),
                    remainingFormatted: `${hours}h ${mins}m remaining`
                };
            } else {
                window24h = {
                    isOpen: false,
                    lastIncomingAt: new Date(lastTime).toISOString(),
                    expiresAt: new Date(expiresTime).toISOString(),
                    remainingMinutes: 0,
                    remainingFormatted: 'Expired'
                };
            }
        }
    }

    return { messages, window24h };
};

module.exports = {
    importContacts,
    getContacts,
    createContactList,
    getContactLists,
    deleteContactList,
    getAttributeKeys,
    getChatThreads,
    getChatMessages
};

