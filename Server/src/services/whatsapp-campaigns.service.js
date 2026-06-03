const { pool } = require('../config/db');
const { resolveWhatsAppConfig } = require('./whatsapp.service');
const axios = require('axios');

/**
 * Creates a new campaign, saving details, stats, and recipients list.
 */
/**
 * Creates a new campaign, saving details, stats, and recipients list.
 */
const createCampaign = async ({ configId = 0, name, templateId, contactListId, campaignType = 'broadcast', scheduledTime = null, timezone = 'UTC', cronExpression = null, status = 'draft', recipients = [] }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const formattedScheduledTime = scheduledTime ? new Date(scheduledTime).toISOString().slice(0, 19).replace('T', ' ') : null;

        // 1. Insert Campaign record
        const [campaignRes] = await connection.query(
            `INSERT INTO whatsapp_campaigns (config_id, name, template_id, contact_list_id, campaign_type, status, scheduled_time, timezone, cron_expression)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [configId, name, templateId, contactListId, campaignType, status, formattedScheduledTime, timezone, cronExpression]
        );
        const campaignId = campaignRes.insertId;

        // 2. Insert Recipients
        if (recipients && recipients.length > 0) {
            const insertValues = recipients.map(r => [
                campaignId,
                r.phone || r.number,
                JSON.stringify(r.parameters || [])
            ]);
            await connection.query(
                `INSERT INTO whatsapp_campaign_recipients (campaign_id, phone, parameters)
                 VALUES ?`,
                [insertValues]
            );
        }

        // 3. Initialize Stats
        await connection.query(
            `INSERT INTO whatsapp_campaign_stats (campaign_id, total_count)
             VALUES (?, ?)`,
            [campaignId, recipients.length]
        );

        await connection.commit();

        // 4. If status is queued, schedule job in background
        if (status === 'queued') {
            const { whatsappQueue } = require('./whatsapp-queue.service');
            const jobId = `trigger-campaign-${campaignId}`;

            if (campaignType === 'broadcast') {
                executeCampaignDirect(campaignId).catch(err => {
                    console.error(`Error running campaign ID ${campaignId}:`, err.message);
                });
            } else if (campaignType === 'scheduled') {
                const delay = Math.max(0, new Date(scheduledTime).getTime() - Date.now());
                await whatsappQueue.add(
                    'trigger-campaign',
                    { campaignId },
                    { jobId, delay, removeOnComplete: true, removeOnFail: true }
                );
                await pool.query('UPDATE whatsapp_campaigns SET job_id = ? WHERE id = ?', [jobId, campaignId]);
                console.log(`[Campaign ${campaignId}] Scheduled one-time trigger-campaign job in ${delay}ms`);
            } else if (campaignType === 'recurring') {
                await whatsappQueue.add(
                    'trigger-campaign',
                    { campaignId },
                    {
                        jobId,
                        repeat: { pattern: cronExpression, tz: timezone },
                        removeOnComplete: true,
                        removeOnFail: true
                    }
                );
                await pool.query('UPDATE whatsapp_campaigns SET job_id = ? WHERE id = ?', [jobId, campaignId]);
                console.log(`[Campaign ${campaignId}] Scheduled recurring repeatable job with pattern: ${cronExpression}`);
            }
        }

        return { success: true, campaignId };
    } catch (error) {
        await connection.rollback();
        console.error('Error creating campaign:', error.message);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Pauses a campaign and cancels active delayed/repeatable schedules.
 */
const pauseCampaign = async (campaignId) => {
    const [[campaign]] = await pool.query(
        'SELECT status, campaign_type, cron_expression, timezone, job_id FROM whatsapp_campaigns WHERE id = ?',
        [campaignId]
    );

    if (!campaign) throw new Error('Campaign not found.');
    if (campaign.status === 'paused') throw new Error('Campaign is already paused.');

    const { whatsappQueue } = require('./whatsapp-queue.service');

    if (campaign.campaign_type === 'scheduled' && campaign.job_id) {
        const job = await whatsappQueue.getJob(campaign.job_id);
        if (job) await job.remove();
        console.log(`[Campaign ${campaignId}] Removed delayed schedule job: ${campaign.job_id}`);
    } else if (campaign.campaign_type === 'recurring' && campaign.job_id) {
        await whatsappQueue.removeRepeatable('trigger-campaign', {
            pattern: campaign.cron_expression,
            tz: campaign.timezone
        }, campaign.job_id);
        console.log(`[Campaign ${campaignId}] Removed repeatable schedule job: ${campaign.job_id}`);
    }

    await pool.query('UPDATE whatsapp_campaigns SET status = "paused" WHERE id = ?', [campaignId]);
    return { success: true };
};

/**
 * Resumes a campaign and re-registers its BullMQ delayed/repeatable schedules.
 */
const resumeCampaign = async (campaignId) => {
    const [[campaign]] = await pool.query(
        'SELECT status, campaign_type, scheduled_time, timezone, cron_expression, job_id FROM whatsapp_campaigns WHERE id = ?',
        [campaignId]
    );

    if (!campaign) throw new Error('Campaign not found.');
    if (campaign.status !== 'paused' && campaign.status !== 'draft') {
        throw new Error('Campaign must be paused or in draft status to resume/activate.');
    }

    const { whatsappQueue } = require('./whatsapp-queue.service');
    const jobId = `trigger-campaign-${campaignId}`;

    if (campaign.campaign_type === 'broadcast') {
        await pool.query('UPDATE whatsapp_campaigns SET status = "queued" WHERE id = ?', [campaignId]);
        executeCampaignDirect(campaignId).catch(err => {
            console.error(`Error running campaign ID ${campaignId}:`, err.message);
        });
    } else if (campaign.campaign_type === 'scheduled') {
        const delay = Math.max(0, new Date(campaign.scheduled_time).getTime() - Date.now());
        await whatsappQueue.add(
            'trigger-campaign',
            { campaignId },
            { jobId, delay, removeOnComplete: true, removeOnFail: true }
        );
        await pool.query('UPDATE whatsapp_campaigns SET status = "queued", job_id = ? WHERE id = ?', [jobId, campaignId]);
        console.log(`[Campaign ${campaignId}] Resumed scheduled campaign with delay ${delay}ms`);
    } else if (campaign.campaign_type === 'recurring') {
        await whatsappQueue.add(
            'trigger-campaign',
            { campaignId },
            {
                jobId,
                repeat: { pattern: campaign.cron_expression, tz: campaign.timezone },
                removeOnComplete: true,
                removeOnFail: true
            }
        );
        await pool.query('UPDATE whatsapp_campaigns SET status = "queued", job_id = ? WHERE id = ?', [jobId, campaignId]);
        console.log(`[Campaign ${campaignId}] Resumed recurring campaign with pattern: ${campaign.cron_expression}`);
    }

    return { success: true };
};

/**
 * Lists all active repeatable/delayed campaign schedules.
 */
const getSchedules = async () => {
    // 1. Fetch campaigns that are scheduled or recurring and not deleted/completed/failed
    const [campaigns] = await pool.query(
        `SELECT c.*, 
                t.name as template_name,
                l.name as list_name
         FROM whatsapp_campaigns c
         LEFT JOIN whatsapp_templates t ON c.template_id = t.id
         LEFT JOIN whatsapp_contact_lists l ON c.contact_list_id = l.id
         WHERE c.campaign_type IN ('scheduled', 'recurring') AND c.status NOT IN ('completed', 'failed')
         ORDER BY c.created_at DESC`
    );

    // 2. Fetch repeatable jobs from BullMQ to check if they are actively registered
    const { whatsappQueue } = require('./whatsapp-queue.service');
    let repeatableJobs = [];
    try {
        repeatableJobs = await whatsappQueue.getRepeatableJobs();
    } catch (e) {
        console.error('Failed to fetch repeatable jobs from BullMQ:', e.message);
    }

    // Map campaigns to include BullMQ status/info
    const schedules = campaigns.map(c => {
        let isRegistered = false;
        let nextRun = null;

        if (c.campaign_type === 'recurring') {
            // Check if repeatable job is registered in BullMQ using MD5 hash correlation
            const crypto = require('crypto');
            const keyString = `trigger-campaign:${c.job_id}::${c.timezone || 'UTC'}:${c.cron_expression}`;
            const expectedKey = crypto.createHash('md5').update(keyString).digest('hex');

            const repJob = repeatableJobs.find(rj => rj.key === expectedKey);
            if (repJob) {
                isRegistered = true;
                nextRun = repJob.next ? new Date(repJob.next).toISOString() : null;
            }
        } else if (c.campaign_type === 'scheduled') {
            // For scheduled one-time campaigns, check if the job is in BullMQ delayed/waiting status
            isRegistered = c.status === 'queued';
            if (c.status === 'queued' && c.scheduled_time) {
                nextRun = new Date(c.scheduled_time).toISOString();
            }
        }

        return {
            ...c,
            isRegistered,
            nextRun
        };
    });

    return schedules;
};

/**
 * Lists all campaigns with pagination, template info, and stats.
 */
const getCampaigns = async ({ page = 1, limit = 20, search = '' }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    let query = `
        SELECT c.*, 
               t.name as template_name,
               l.name as list_name,
               s.total_count, s.sent_count, s.delivered_count, s.read_count, s.failed_count,
               s.delivery_rate, s.read_rate
        FROM whatsapp_campaigns c
        LEFT JOIN whatsapp_templates t ON c.template_id = t.id
        LEFT JOIN whatsapp_contact_lists l ON c.contact_list_id = l.id
        LEFT JOIN whatsapp_campaign_stats s ON c.id = s.campaign_id
    `;

    const whereClauses = [];
    const queryParams = [];

    if (search && search.trim() !== '') {
        whereClauses.push('(c.name LIKE ?)');
        queryParams.push(`%${search.trim()}%`);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limitVal, offset);

    let countQuery = 'SELECT COUNT(*) as total FROM whatsapp_campaigns c';
    const countParams = [];
    if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
        countParams.push(...queryParams.slice(0, queryParams.length - 2));
    }

    const [rows] = await pool.query(query, queryParams);
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return {
        campaigns: rows,
        pagination: {
            total,
            page: parseInt(page),
            limit: limitVal,
            totalPages: Math.ceil(total / limitVal)
        }
    };
};

/**
 * Retrieves details for a specific campaign, including stats and paginated recipients list.
 */
const getCampaignById = async (campaignId, recipientPage = 1, recipientLimit = 50) => {
    const [[campaign]] = await pool.query(
        `SELECT c.*, 
                t.name as template_name,
                l.name as list_name,
                s.total_count, s.sent_count, s.delivered_count, s.read_count, s.failed_count,
                s.delivery_rate, s.read_rate
         FROM whatsapp_campaigns c
         LEFT JOIN whatsapp_templates t ON c.template_id = t.id
         LEFT JOIN whatsapp_contact_lists l ON c.contact_list_id = l.id
         LEFT JOIN whatsapp_campaign_stats s ON c.id = s.campaign_id
         WHERE c.id = ?`,
        [campaignId]
    );

    if (!campaign) {
        throw new Error('Campaign not found');
    }

    const offset = (parseInt(recipientPage) - 1) * parseInt(recipientLimit);
    const limitVal = parseInt(recipientLimit);

    const [recipients] = await pool.query(
        `SELECT * FROM whatsapp_campaign_recipients 
         WHERE campaign_id = ? 
         ORDER BY id ASC LIMIT ? OFFSET ?`,
        [campaignId, limitVal, offset]
    );

    const [[{ totalRecipients }]] = await pool.query(
        `SELECT COUNT(*) as totalRecipients FROM whatsapp_campaign_recipients WHERE campaign_id = ?`,
        [campaignId]
    );

    return {
        campaign,
        recipients,
        pagination: {
            total: totalRecipients,
            page: parseInt(recipientPage),
            limit: limitVal,
            totalPages: Math.ceil(totalRecipients / limitVal)
        }
    };
};

/**
 * Clones a campaign by copying configuration settings into a new draft campaign record.
 */
const cloneCampaign = async (campaignId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [[orig]] = await connection.query('SELECT * FROM whatsapp_campaigns WHERE id = ?', [campaignId]);
        if (!orig) throw new Error('Campaign to clone not found');

        // Create new cloned record
        const [clonedRes] = await connection.query(
            `INSERT INTO whatsapp_campaigns (config_id, name, template_id, contact_list_id, campaign_type, status, scheduled_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orig.config_id, `${orig.name} (Copy)`, orig.template_id, orig.contact_list_id, orig.campaign_type, 'draft', null]
        );
        const clonedId = clonedRes.insertId;

        // Copy recipients
        const [recipients] = await connection.query('SELECT phone, parameters FROM whatsapp_campaign_recipients WHERE campaign_id = ?', [campaignId]);
        if (recipients.length > 0) {
            const insertValues = recipients.map(r => [
                clonedId,
                r.phone,
                JSON.stringify(typeof r.parameters === 'string' ? JSON.parse(r.parameters) : r.parameters)
            ]);
            await connection.query(
                `INSERT INTO whatsapp_campaign_recipients (campaign_id, phone, parameters)
                 VALUES ?`,
                [insertValues]
            );
        }

        // Initialize Stats
        await connection.query(
            `INSERT INTO whatsapp_campaign_stats (campaign_id, total_count)
             VALUES (?, ?)`,
            [clonedId, recipients.length]
        );

        await connection.commit();
        return { success: true, campaignId: clonedId };
    } catch (error) {
        await connection.rollback();
        console.error('Error cloning campaign:', error.message);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Direct Campaign Execution Sender Loop (Sprint 4 Direct Send Mode)
 */
async function executeCampaignDirect(campaignId) {
    console.log(`[Campaign ${campaignId}] Enqueueing recipients to BullMQ...`);
    
    // 1. Mark Campaign as Running
    await pool.query('UPDATE whatsapp_campaigns SET status = "running" WHERE id = ?', [campaignId]);

    // 2. Fetch campaign details
    const [[campaign]] = await pool.query('SELECT * FROM whatsapp_campaigns WHERE id = ?', [campaignId]);
    if (!campaign) {
        console.error(`[Campaign ${campaignId}] Not found in DB.`);
        return;
    }

    // 3. Fetch all queued recipients
    const [recipients] = await pool.query(
        'SELECT id, phone, parameters FROM whatsapp_campaign_recipients WHERE campaign_id = ? AND status = "queued"',
        [campaignId]
    );

    const { whatsappQueue } = require('./whatsapp-queue.service');
    const redisConnection = require('../config/redis');

    const jobs = recipients.map(r => ({
        name: 'send-recipient-message',
        data: {
            campaignId,
            recipientId: r.id,
            phone: r.phone,
            parameters: typeof r.parameters === 'string' ? JSON.parse(r.parameters) : (r.parameters || []),
            configId: campaign.config_id,
            templateId: campaign.template_id
        },
        opts: {
            attempts: parseInt(process.env.QUEUE_JOB_ATTEMPTS || '3'),
            backoff: {
                type: 'exponential',
                delay: parseInt(process.env.QUEUE_JOB_BACKOFF_DELAY || '2000')
            }
        }
    }));

    try {
        if (redisConnection.status !== 'ready') {
            throw new Error('Queue service is currently unavailable (Redis connection down).');
        }

        if (jobs.length > 0) {
            await whatsappQueue.addBulk(jobs);
            console.log(`[Campaign ${campaignId}] Enqueued ${jobs.length} recipient jobs to BullMQ.`);
        } else {
            console.log(`[Campaign ${campaignId}] No queued recipients found to enqueue.`);
            // If no recipients, mark campaign completed/failed directly
            await pool.query('UPDATE whatsapp_campaigns SET status = "completed" WHERE id = ?', [campaignId]);
            try {
                const { refreshCampaignAnalyticsSnapshot } = require('./whatsapp-analytics.service');
                await refreshCampaignAnalyticsSnapshot(campaignId);
            } catch (e) {}
        }
    } catch (queueErr) {
        console.error(`[Campaign ${campaignId}] Enqueue failed:`, queueErr.message);
        // Mark campaign status to failed
        await pool.query('UPDATE whatsapp_campaigns SET status = "failed" WHERE id = ?', [campaignId]);
        try {
            const { refreshCampaignAnalyticsSnapshot } = require('./whatsapp-analytics.service');
            await refreshCampaignAnalyticsSnapshot(campaignId);
        } catch (e) {}
        await pool.query('UPDATE whatsapp_campaign_recipients SET status = "failed", error_message = ? WHERE campaign_id = ? AND status = "queued"', [queueErr.message, campaignId]);
        throw queueErr;
    }
}

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    cloneCampaign,
    executeCampaignDirect,
    pauseCampaign,
    resumeCampaign,
    getSchedules
};
