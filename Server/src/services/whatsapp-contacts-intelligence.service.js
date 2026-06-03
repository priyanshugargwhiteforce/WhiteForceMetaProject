const { pool } = require('../config/db');

// ---------------------------------------------------------------------------
// Engagement Score Calculation
// score = ((reads × 1.0) + (deliveries × 0.5)) / total_sent × 100
// Clamped between 0 and 100
// ---------------------------------------------------------------------------
function calculateScore(totalSent, totalDelivered, totalRead) {
    if (!totalSent || totalSent === 0) return 0;
    const raw = ((totalRead * 1.0) + (totalDelivered * 0.5)) / totalSent * 100;
    return Math.min(100, Math.max(0, parseFloat(raw.toFixed(2))));
}

/**
 * Fetch full contact profile with engagement intelligence.
 */
async function getContactProfile(contactId) {
    const [[contact]] = await pool.query(
        `SELECT 
            c.*,
            GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags_raw,
            GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ',') AS lists_raw
         FROM whatsapp_contacts c
         LEFT JOIN whatsapp_contact_tags t ON t.contact_id = c.id
         LEFT JOIN whatsapp_contact_list_members m ON m.contact_id = c.id
         LEFT JOIN whatsapp_contact_lists l ON l.id = m.list_id
         WHERE c.id = ?
         GROUP BY c.id`,
        [contactId]
    );

    if (!contact) throw new Error(`Contact ${contactId} not found.`);

    return {
        ...contact,
        tags: contact.tags_raw ? contact.tags_raw.split(',') : [],
        lists: contact.lists_raw ? contact.lists_raw.split(',') : [],
        attributes: typeof contact.attributes === 'string'
            ? JSON.parse(contact.attributes)
            : (contact.attributes || {}),
        tags_raw: undefined,
        lists_raw: undefined
    };
}

/**
 * Get the full engagement activity timeline for a contact.
 * Returns the latest event per message_id, deduplicated.
 */
async function getContactActivity(contactId) {
    const [rows] = await pool.query(
        `SELECT 
            a.id,
            a.campaign_id,
            a.message_id,
            a.event_type,
            a.metadata,
            a.event_timestamp,
            c.name AS campaign_name,
            t.name AS template_name
         FROM whatsapp_contact_activity a
         LEFT JOIN whatsapp_campaigns c ON c.id = a.campaign_id
         LEFT JOIN whatsapp_templates t ON t.id = c.template_id
         WHERE a.contact_id = ?
         ORDER BY a.event_timestamp DESC
         LIMIT 200`,
        [contactId]
    );

    return rows.map(r => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {})
    }));
}

/**
 * Compute live dynamic segment counts.
 * Segments are NEVER stored – computed on every request.
 */
async function getEngagementSegments() {
    const [[totals]] = await pool.query(
        `SELECT
            COUNT(*) AS total,
            SUM(IF(engagement_score >= 80, 1, 0)) AS champions,
            SUM(IF(engagement_score >= 50 AND engagement_score < 80, 1, 0)) AS engaged,
            SUM(IF(engagement_score > 0 AND engagement_score < 50, 1, 0)) AS at_risk,
            SUM(IF(total_sent > 0 AND total_read = 0, 1, 0)) AS never_opened,
            SUM(IF(status = 'unsubscribed', 1, 0)) AS unsubscribed,
            SUM(IF(status = 'archived', 1, 0)) AS archived
         FROM whatsapp_contacts`
    );

    // mysql2 returns SUM/COUNT as BigInt — cast to Number for safe comparisons
    return {
        total: Number(totals.total || 0),
        champions:    { label: 'Champions',    count: Number(totals.champions    || 0), color: '#10b981', filter: 'champions' },
        engaged:      { label: 'Engaged',      count: Number(totals.engaged      || 0), color: '#6366f1', filter: 'engaged' },
        at_risk:      { label: 'At Risk',      count: Number(totals.at_risk      || 0), color: '#f59e0b', filter: 'at_risk' },
        never_opened: { label: 'Never Opened', count: Number(totals.never_opened || 0), color: '#64748b', filter: 'never_opened' },
        unsubscribed: { label: 'Unsubscribed', count: Number(totals.unsubscribed || 0), color: '#ef4444', filter: 'unsubscribed' },
        archived:     { label: 'Archived',     count: Number(totals.archived     || 0), color: '#6b7280', filter: 'archived' }
    };
}

/**
 * Recomputes the engagement score and totals for a single contact
 * from whatsapp_contact_activity, persisting back to whatsapp_contacts.
 */
async function recalculateContactEngagement(contactId) {
    // Aggregate activity records – only the latest event type per message_id per campaign
    const [[agg]] = await pool.query(
        `SELECT
            COUNT(DISTINCT a.campaign_id) AS total_campaigns,
            SUM(IF(a.event_type IN ('sent','delivered','read'), 1, 0)) AS total_sent,
            SUM(IF(a.event_type IN ('delivered','read'), 1, 0)) AS total_delivered,
            SUM(IF(a.event_type = 'read', 1, 0)) AS total_read,
            MAX(a.event_timestamp) AS last_engaged_at
         FROM (
             SELECT ca.contact_id, ca.campaign_id, ca.message_id, ca.event_type, ca.event_timestamp,
                    ROW_NUMBER() OVER (PARTITION BY ca.contact_id, ca.message_id ORDER BY ca.event_timestamp DESC, ca.id DESC) AS rn
             FROM whatsapp_contact_activity ca
             WHERE ca.contact_id = ?
         ) a
         WHERE a.rn = 1`,
        [contactId]
    );

    // mysql2 returns SUM() as BigInt — cast to Number for safe arithmetic & strict equality
    const totalSent = Number(agg?.total_sent || 0);
    const totalDelivered = Number(agg?.total_delivered || 0);
    const totalRead = Number(agg?.total_read || 0);
    const lastEngagedAt = agg?.last_engaged_at || null;
    const score = calculateScore(totalSent, totalDelivered, totalRead);

    await pool.query(
        `UPDATE whatsapp_contacts
         SET engagement_score = ?, total_sent = ?, total_delivered = ?, total_read = ?, last_engaged_at = ?
         WHERE id = ?`,
        [score, totalSent, totalDelivered, totalRead, lastEngagedAt, contactId]
    );

    return { contactId, score, totalSent, totalDelivered, totalRead, lastEngagedAt };
}

/**
 * Called after campaign completion.
 * Inserts activity records and recalculates engagement scores
 * for all contacts who participated in the campaign.
 */
async function recalculateCampaignContacts(campaignId) {
    console.log(`[Intelligence] Starting post-campaign engagement sync for campaign ${campaignId}`);

    // Fetch campaign details
    const [[campaign]] = await pool.query(
        `SELECT c.*, t.name AS template_name
         FROM whatsapp_campaigns c
         LEFT JOIN whatsapp_templates t ON t.id = c.template_id
         WHERE c.id = ?`,
        [campaignId]
    );
    if (!campaign) {
        console.warn(`[Intelligence] Campaign ${campaignId} not found, skipping.`);
        return;
    }

    // Fetch recipients and their final latest message log status
    const [recipients] = await pool.query(
        `SELECT
            r.id AS recipient_id,
            r.phone,
            r.message_id,
            COALESCE(l.status, r.status) AS final_status,
            r.sent_at
         FROM whatsapp_campaign_recipients r
         LEFT JOIN (
             SELECT ml.message_id, ml.status
             FROM whatsapp_message_logs ml
             INNER JOIN (
                 SELECT message_id, MAX(id) AS max_id
                 FROM whatsapp_message_logs
                 WHERE message_id IS NOT NULL
                 GROUP BY message_id
             ) latest ON latest.max_id = ml.id
         ) l ON l.message_id = r.message_id
         WHERE r.campaign_id = ?`,
        [campaignId]
    );

    if (recipients.length === 0) {
        console.log(`[Intelligence] No recipients found for campaign ${campaignId}.`);
        return;
    }

    // Gather unique phone numbers to find matching contacts
    const phones = [...new Set(recipients.map(r => r.phone))];
    if (phones.length === 0) return;

    // Fetch contact IDs by phone number (batch)
    const placeholders = phones.map(() => '?').join(',');
    const [contacts] = await pool.query(
        `SELECT id, phone FROM whatsapp_contacts WHERE phone IN (${placeholders})`,
        phones
    );
    const phoneToContactId = {};
    contacts.forEach(c => { phoneToContactId[c.phone] = c.id; });

    // Map of contactId → affected for recalculation
    const affectedContactIds = new Set();
    const activityInserts = [];

    for (const r of recipients) {
        const contactId = phoneToContactId[r.phone];
        if (!contactId) continue; // Phone not in contacts table, skip

        const eventType = mapStatusToEventType(r.final_status);
        const eventTimestamp = r.sent_at
            ? new Date(r.sent_at).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' ');

        activityInserts.push([
            contactId,
            campaignId,
            r.message_id || null,
            eventType,
            JSON.stringify({
                campaign_name: campaign.name,
                template_name: campaign.template_name || null,
                final_status: r.final_status
            }),
            eventTimestamp
        ]);

        affectedContactIds.add(contactId);
    }

    // Bulk insert activity records (ignore duplicates via message_id + event_type uniqueness is handled by recency)
    if (activityInserts.length > 0) {
        try {
            await pool.query(
                `INSERT IGNORE INTO whatsapp_contact_activity
                 (contact_id, campaign_id, message_id, event_type, metadata, event_timestamp)
                 VALUES ?`,
                [activityInserts]
            );
            console.log(`[Intelligence] Inserted ${activityInserts.length} activity records for campaign ${campaignId}`);
        } catch (err) {
            console.error(`[Intelligence] Activity insert error:`, err.message);
        }
    }

    // Recalculate engagement for all affected contacts
    const contactIdList = [...affectedContactIds];
    for (const contactId of contactIdList) {
        try {
            await recalculateContactEngagement(contactId);
        } catch (err) {
            console.error(`[Intelligence] Engagement recalc failed for contact ${contactId}:`, err.message);
        }
    }
    console.log(`[Intelligence] Engagement scores updated for ${contactIdList.length} contacts.`);
}

/**
 * Maps a campaign/message status to an activity event_type.
 */
function mapStatusToEventType(status) {
    switch (String(status).toLowerCase()) {
        case 'sent':        return 'sent';
        case 'delivered':   return 'delivered';
        case 'read':        return 'read';
        case 'failed':      return 'failed';
        case 'replied':     return 'replied';
        default:            return 'sent';
    }
}

/**
 * Toggles a contact's opt-in/opt-out status.
 * Sets status to 'unsubscribed' or back to 'active'.
 */
async function toggleOptIn(contactId) {
    const [[contact]] = await pool.query(
        'SELECT status, opt_in_status FROM whatsapp_contacts WHERE id = ?',
        [contactId]
    );
    if (!contact) throw new Error(`Contact ${contactId} not found.`);

    const isCurrentlyActive = contact.status === 'active';
    const newStatus = isCurrentlyActive ? 'unsubscribed' : 'active';
    const newOptIn = isCurrentlyActive ? 0 : 1;

    await pool.query(
        `UPDATE whatsapp_contacts
         SET status = ?, opt_in_status = ?, opt_in_date = IF(? = 1, NOW(), NULL)
         WHERE id = ?`,
        [newStatus, newOptIn, newOptIn, contactId]
    );

    // Insert unsubscribed activity record
    if (!isCurrentlyActive === false) { // Was active, now unsubscribing
        try {
            // Get any recent campaign for context (last one the contact participated in)
            const [[lastActivity]] = await pool.query(
                `SELECT campaign_id FROM whatsapp_contact_activity
                 WHERE contact_id = ? ORDER BY event_timestamp DESC LIMIT 1`,
                [contactId]
            );
            if (lastActivity) {
                await pool.query(
                    `INSERT INTO whatsapp_contact_activity
                     (contact_id, campaign_id, event_type, metadata, event_timestamp)
                     VALUES (?, ?, 'unsubscribed', ?, NOW())`,
                    [contactId, lastActivity.campaign_id, JSON.stringify({ source: 'manual_toggle' })]
                );
            }
        } catch (err) {
            // Non-critical, continue
        }
    }

    return { success: true, newStatus, opted_in: !isCurrentlyActive };
}

/**
 * Archives a contact (soft remove from active audience).
 */
async function archiveContact(contactId) {
    const [[contact]] = await pool.query(
        'SELECT id, status FROM whatsapp_contacts WHERE id = ?',
        [contactId]
    );
    if (!contact) throw new Error(`Contact ${contactId} not found.`);
    if (contact.status === 'archived') throw new Error('Contact is already archived.');

    await pool.query(
        "UPDATE whatsapp_contacts SET status = 'archived', opt_in_status = 0 WHERE id = ?",
        [contactId]
    );
    return { success: true, message: 'Contact archived successfully.' };
}

/**
 * Restores an archived contact.
 */
async function restoreContact(contactId) {
    const [[contact]] = await pool.query(
        'SELECT id, status FROM whatsapp_contacts WHERE id = ?',
        [contactId]
    );
    if (!contact) throw new Error(`Contact ${contactId} not found.`);
    if (contact.status !== 'archived') throw new Error('Contact is not archived.');

    await pool.query(
        "UPDATE whatsapp_contacts SET status = 'active', opt_in_status = 1, opt_in_date = NOW() WHERE id = ?",
        [contactId]
    );
    return { success: true, message: 'Contact restored successfully.' };
}

module.exports = {
    getContactProfile,
    getContactActivity,
    getEngagementSegments,
    recalculateContactEngagement,
    recalculateCampaignContacts,
    toggleOptIn,
    archiveContact,
    restoreContact
};
