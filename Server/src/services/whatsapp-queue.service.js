const { Queue, Worker } = require('bullmq');
const { pool } = require('../config/db');
const redisConnection = require('../config/redis');
const { resolveWhatsAppConfig } = require('./whatsapp.service');
const axios = require('axios');

// Initialize BullMQ Queue
const whatsappQueue = new Queue('whatsapp-campaigns', {
  connection: redisConnection
});

console.log('✓ BullMQ Queue "whatsapp-campaigns" initialized.');

// Setup Worker Limiter configurations via env variables
const limitMax = parseInt(process.env.QUEUE_RATE_LIMIT_MAX || '10');
const limitDuration = parseInt(process.env.QUEUE_RATE_LIMIT_DURATION || '1000');

// Campaign Manager Trigger Handler
async function handleTriggerCampaign(job) {
  const { campaignId } = job.data;
  console.log(`[Queue Worker] Triggering campaign ID: ${campaignId}`);

  // Fetch campaign details
  const [[campaign]] = await pool.query(
    'SELECT * FROM whatsapp_campaigns WHERE id = ?',
    [campaignId]
  );

  if (!campaign) {
    console.error(`[Queue Worker] Campaign ${campaignId} not found.`);
    return { success: false, error: 'Campaign not found' };
  }

  // If paused, completed, or failed, skip trigger
  if (campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'failed') {
    console.log(`[Queue Worker] Campaign ${campaignId} is ${campaign.status}. Skipping execution.`);
    return { success: true, skipped: true, status: campaign.status };
  }

  let executionCampaignId = campaignId;

  if (campaign.campaign_type === 'recurring') {
    // For recurring campaign, create a child campaign execution log
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const runTimeStr = new Date().toLocaleString();
      const childName = `${campaign.name} (Recurring Run - ${runTimeStr})`;

      const [childRes] = await connection.query(
        `INSERT INTO whatsapp_campaigns (config_id, name, template_id, contact_list_id, campaign_type, status, parent_campaign_id)
         VALUES (?, ?, ?, ?, 'broadcast', 'running', ?)`,
        [campaign.config_id, childName, campaign.template_id, campaign.contact_list_id, campaign.id]
      );
      executionCampaignId = childRes.insertId;

      // Copy recipients from parent
      const [parentRecipients] = await connection.query(
        'SELECT phone, parameters FROM whatsapp_campaign_recipients WHERE campaign_id = ?',
        [campaign.id]
      );

      if (parentRecipients.length > 0) {
        const insertValues = parentRecipients.map(r => [
          executionCampaignId,
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
        [executionCampaignId, parentRecipients.length]
      );

      await connection.commit();
      console.log(`[Queue Worker] Created child campaign ${executionCampaignId} for recurring campaign ${campaign.id}`);
    } catch (err) {
      await connection.rollback();
      console.error(`[Queue Worker] Failed to create child campaign execution:`, err.message);
      throw err;
    } finally {
      connection.release();
    }
  } else {
    // For one-time scheduled campaign, update status to running
    await pool.query('UPDATE whatsapp_campaigns SET status = "running" WHERE id = ?', [campaignId]);
  }

  // Now, fetch all recipients of executionCampaignId that are queued
  const [recipients] = await pool.query(
    'SELECT id, phone, parameters FROM whatsapp_campaign_recipients WHERE campaign_id = ? AND status = "queued"',
    [executionCampaignId]
  );

  const jobs = recipients.map(r => ({
    name: 'send-recipient-message',
    data: {
      campaignId: executionCampaignId,
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

  if (jobs.length > 0) {
    await whatsappQueue.addBulk(jobs);
    console.log(`[Queue Worker] Enqueued ${jobs.length} recipient jobs for execution Campaign ${executionCampaignId}`);
  } else {
    console.log(`[Queue Worker] Campaign ${executionCampaignId} has no queued recipients.`);
    // Update stats to completed/failed directly
    const [[stats]] = await pool.query('SELECT total_count FROM whatsapp_campaign_stats WHERE campaign_id = ?', [executionCampaignId]);
    await pool.query('UPDATE whatsapp_campaigns SET status = ? WHERE id = ?', [finalStatus, executionCampaignId]);
    try {
      const { refreshCampaignAnalyticsSnapshot } = require('./whatsapp-analytics.service');
      await refreshCampaignAnalyticsSnapshot(executionCampaignId);
    } catch (err) {
      console.error(`[Queue Worker] Error caching campaign analytics:`, err.message);
    }
  }

  return { success: true, executionCampaignId };
}

// Initialize BullMQ Worker
const whatsappWorker = new Worker('whatsapp-campaigns', async (job) => {
  if (job.name === 'trigger-campaign') {
    return handleTriggerCampaign(job);
  }

  const { campaignId, recipientId, phone, parameters, configId, templateId } = job.data;
  console.log(`[Queue Worker] Processing job ${job.id} for Recipient ${recipientId} (${phone}) in Campaign ${campaignId}`);

  // Pre-send status check: check if the campaign is paused
  const [[campaign]] = await pool.query(
    'SELECT status FROM whatsapp_campaigns WHERE id = ?',
    [campaignId]
  );
  if (campaign && campaign.status === 'paused') {
    console.log(`[Queue Worker] Campaign ${campaignId} is paused. Resetting recipient ${recipientId} status to queued.`);
    await pool.query('UPDATE whatsapp_campaign_recipients SET status = "queued" WHERE id = ?', [recipientId]);
    throw new Error('Campaign is paused');
  }

  // 0. Check if already processed to prevent duplicate sends on retry
  const [[recipient]] = await pool.query(
    'SELECT status, message_id FROM whatsapp_campaign_recipients WHERE id = ?',
    [recipientId]
  );
  if (recipient && recipient.status !== 'queued') {
    console.log(`[Queue Worker] Recipient ${recipientId} status is ${recipient.status}. Skipping send to prevent duplicate.`);
    return { success: true, messageId: recipient.message_id, skipped: true };
  }

  // Update recipient status to 'processing'
  await pool.query('UPDATE whatsapp_campaign_recipients SET status = "processing" WHERE id = ?', [recipientId]);

  try {
    // 1. Resolve configuration credentials
    const { token, phoneId } = await resolveWhatsAppConfig(configId);
    if (!token || !phoneId) {
      throw new Error('Missing WhatsApp configuration credentials.');
    }

    // 2. Fetch template details
    const [[templateObj]] = await pool.query(
      'SELECT id, name, language, components FROM whatsapp_templates WHERE id = ?',
      [templateId]
    );
    if (!templateObj) {
      throw new Error(`Template ${templateId} not found in DB.`);
    }

    // 3. Fetch template variables position metadata
    const [variablesMetadata] = await pool.query(
      'SELECT variable_name, component_type, variable_position FROM whatsapp_template_variables WHERE template_id = ? ORDER BY id ASC',
      [templateId]
    );

    // 4. Construct components payload
    let componentsPayload = [];
    if (variablesMetadata.length > 0 && parameters.length > 0) {
      const headerParams = [];
      const bodyParams = [];
      const buttonParamsMap = {};

      parameters.forEach((paramVal, idx) => {
        const meta = variablesMetadata[idx];
        if (!meta) return;

        if (meta.component_type === 'header') {
          headerParams.push({ val: paramVal, pos: meta.variable_position, name: meta.variable_name });
        } else if (meta.component_type === 'body') {
          bodyParams.push({ val: paramVal, pos: meta.variable_position, name: meta.variable_name });
        } else if (meta.component_type === 'button') {
          const btnIdx = meta.variable_position - 1;
          if (!buttonParamsMap[btnIdx]) {
            buttonParamsMap[btnIdx] = [];
          }
          buttonParamsMap[btnIdx].push({ val: paramVal, name: meta.variable_name });
        }
      });

      headerParams.sort((a, b) => a.pos - b.pos);
      bodyParams.sort((a, b) => a.pos - b.pos);

      // Build Header component
      if (headerParams.length > 0) {
        const comps = typeof templateObj.components === 'string' ? JSON.parse(templateObj.components) : (templateObj.components || []);
        const headerComp = comps.find(c => String(c.type).toUpperCase() === 'HEADER');
        const format = String(headerComp?.format || 'TEXT').toUpperCase();

        let metaHeaderParam;
        if (format === 'TEXT') {
          metaHeaderParam = {
            type: "text",
            parameter_name: headerParams[0].name,
            text: String(headerParams[0].val)
          };
        } else if (format === 'IMAGE') {
          metaHeaderParam = {
            type: "image",
            image: {
              link: String(headerParams[0].val)
            }
          };
        } else if (format === 'DOCUMENT') {
          const urlStr = String(headerParams[0].val);
          let filename = 'document.pdf';
          try {
            const urlPath = new URL(urlStr).pathname;
            const lastPart = urlPath.substring(urlPath.lastIndexOf('/') + 1);
            if (lastPart && lastPart.includes('.')) {
              filename = lastPart;
            }
          } catch (e) { }
          metaHeaderParam = {
            type: "document",
            document: {
              link: urlStr,
              filename: filename
            }
          };
        } else if (format === 'VIDEO') {
          metaHeaderParam = {
            type: "video",
            video: {
              link: String(headerParams[0].val)
            }
          };
        }

        if (metaHeaderParam) {
          componentsPayload.push({
            type: "header",
            parameters: [metaHeaderParam]
          });
        }
      }

      // Build Body component
      if (bodyParams.length > 0) {
        componentsPayload.push({
          type: "body",
          parameters: bodyParams.map(p => ({
            type: "text",
            parameter_name: p.name,
            text: String(p.val)
          }))
        });
      }

      // Build Buttons components
      Object.keys(buttonParamsMap).forEach(btnIdxStr => {
        const btnIdx = parseInt(btnIdxStr);
        const paramsList = buttonParamsMap[btnIdx];
        componentsPayload.push({
          type: "button",
          sub_type: "url",
          index: String(btnIdx),
          parameters: paramsList.map(p => ({
            type: "text",
            parameter_name: p.name,
            text: String(p.val)
          }))
        });
      });
    } else if (parameters.length > 0) {
      componentsPayload = [
        {
          type: "body",
          parameters: parameters.map(p => ({
            type: "text",
            text: String(p)
          }))
        }
      ];
    }

    const templatePayload = {
      name: templateObj.name,
      language: {
        code: templateObj.language || "en_US"
      }
    };
    if (componentsPayload.length > 0) {
      templatePayload.components = componentsPayload;
    }

    // 5. Send message to Meta
    const url = `https://graph.facebook.com/v24.0/${phoneId}/messages`;
    const response = await axios.post(url, {
      messaging_product: "whatsapp",
      to: phone.trim(),
      type: "template",
      template: templatePayload
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const messageId = response.data.messages[0].id;

    // 6. Update recipient row as sent
    await pool.query(
      `UPDATE whatsapp_campaign_recipients 
       SET status = "sent", message_id = ?, error_message = NULL, sent_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [messageId, recipientId]
    );

    // 6b. Log to legacy message logs
    try {
      const { logSentMessage } = require('./whatsapp.service');
      await logSentMessage(phoneId, phone.trim(), templateObj.name, 'sent', messageId, null);
    } catch (logErr) {
      console.error('[Queue Worker] Legacy log write failed:', logErr.message);
    }

    // 7. Recalculate stats and check campaign completion
    await updateCampaignStatsAndCheckCompletion(campaignId);
    console.log(`[Queue Worker] Recipient ${recipientId} (${phone}) sent successfully.`);
    return { success: true, messageId };

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error(`[Queue Worker Error] Recipient ${recipientId} (${phone}) failed:`, errorMsg);

    if (errorMsg === 'Campaign is paused') {
      throw err;
    }

    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 1;
    const isLastAttempt = attemptsMade >= maxAttempts - 1;

    // Fast-fail on non-retryable Meta validation errors or configuration issues
    const isValidationOrConfigError =
      errorMsg.includes("schema") ||
      errorMsg.includes("does not exist") ||
      errorMsg.includes("permissions") ||
      errorMsg.includes("validation") ||
      errorMsg.includes("Missing WhatsApp configuration credentials");

    if (isLastAttempt || isValidationOrConfigError) {
      // Mark final failure
      await pool.query(
        `UPDATE whatsapp_campaign_recipients 
         SET status = "failed", error_message = ?, sent_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [errorMsg, recipientId]
      );

      // Log final failure to legacy message logs
      try {
        const { logSentMessage } = require('./whatsapp.service');
        const resolvedPhoneId = (typeof phoneId !== 'undefined' && phoneId) ? phoneId : (await resolveWhatsAppConfig(configId)).phoneId;

        let templateName = templateId;
        if (typeof templateObj !== 'undefined' && templateObj?.name) {
          templateName = templateObj.name;
        } else {
          const [[tmpl]] = await pool.query('SELECT name FROM whatsapp_templates WHERE id = ?', [templateId]);
          if (tmpl) templateName = tmpl.name;
        }
        await logSentMessage(resolvedPhoneId, phone.trim(), templateName, 'failed', null, null, errorMsg);
      } catch (logErr) {
        console.error('[Queue Worker] Legacy failure log write failed:', logErr.message);
      }

      await updateCampaignStatsAndCheckCompletion(campaignId);
      return { success: false, error: errorMsg };
    } else {
      // Restore status to queued for retry and throw error to trigger BullMQ retry loop
      await pool.query('UPDATE whatsapp_campaign_recipients SET status = "queued" WHERE id = ?', [recipientId]);
      throw err;
    }
  }
}, {
  connection: redisConnection,
  limiter: {
    max: limitMax,
    duration: limitDuration
  }
});

// Update stats metrics and trigger campaign completion status changes
async function updateCampaignStatsAndCheckCompletion(campaignId) {
  // Update stats counters
  const [[counts]] = await pool.query(
    `SELECT 
        COUNT(IF(status = 'sent' OR status = 'delivered' OR status = 'read', 1, NULL)) as sent,
        COUNT(IF(status = 'delivered', 1, NULL)) as delivered,
        COUNT(IF(status = 'read', 1, NULL)) as read_count,
        COUNT(IF(status = 'failed', 1, NULL)) as failed,
        COUNT(IF(status = 'queued' OR status = 'processing', 1, NULL)) as active
     FROM whatsapp_campaign_recipients WHERE campaign_id = ?`,
    [campaignId]
  );

  const sentCount = counts.sent || 0;
  const failedCount = counts.failed || 0;
  const deliveredCount = counts.delivered || 0;
  const readCount = counts.read_count || 0;
  const activeCount = counts.active || 0;

  const total = sentCount + failedCount + activeCount;
  const deliveryRate = (sentCount + failedCount) > 0 ? (sentCount / (sentCount + failedCount)) * 100 : 0;

  await pool.query(
    `UPDATE whatsapp_campaign_stats 
     SET sent_count = ?, failed_count = ?, delivered_count = ?, read_count = ?, delivery_rate = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE campaign_id = ?`,
    [sentCount, failedCount, deliveredCount, readCount, deliveryRate, campaignId]
  );

  // If there are no more active/queued recipients, transition Campaign Status
  if (activeCount === 0) {
    const [[{ totalCount }]] = await pool.query('SELECT total_count FROM whatsapp_campaign_stats WHERE campaign_id = ?', [campaignId]);
    const finalStatus = failedCount === totalCount ? 'failed' : 'completed';
    await pool.query('UPDATE whatsapp_campaigns SET status = ? WHERE id = ?', [finalStatus, campaignId]);
    console.log(`[Queue Worker] Campaign ${campaignId} execution finalized with status "${finalStatus}".`);

    // Sprint 8: Write the finalized analytics cache immediately to the table
    try {
      const { refreshCampaignAnalyticsSnapshot } = require('./whatsapp-analytics.service');
      await refreshCampaignAnalyticsSnapshot(campaignId);
      console.log(`[Queue Worker] Final analytics cache written for campaign ${campaignId}.`);
    } catch (err) {
      console.error(`[Queue Worker] Error caching campaign analytics:`, err.message);
    }

    // Sprint 9: Sync contact activity records + recalculate engagement scores
    try {
      const { recalculateCampaignContacts } = require('./whatsapp-contacts-intelligence.service');
      recalculateCampaignContacts(campaignId).catch(err => {
        console.error(`[Queue Worker] Contact intelligence sync error for campaign ${campaignId}:`, err.message);
      });
    } catch (err) {
      console.error(`[Queue Worker] Failed to initiate contact intelligence sync:`, err.message);
    }
  }
}

module.exports = {
  whatsappQueue,
  whatsappWorker,
  updateCampaignStatsAndCheckCompletion
};
