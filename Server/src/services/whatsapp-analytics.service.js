const { pool } = require('../config/db');
const redisConnection = require('../config/redis');
const { formatMetaError } = require('../utils/meta-error');
const whatsappService = require('./whatsapp.service');
const axios = require('axios');


/**
 * Triggers a live query to calculate statistics using the latest status per unique message_id,
 * and saves the results to the whatsapp_campaign_analytics table.
 * Implements a Redis SETNX lock for stampede protection.
 */
async function refreshCampaignAnalyticsSnapshot(campaignId) {
  const lockKey = `analytics:lock:campaign:${campaignId}`;
  let acquired = false;

  try {
    // Attempt lock acquisition (NX = set if not exist, EX 5 = 5 seconds TTL)
    const res = await redisConnection.set(lockKey, 'locked', 'NX', 'EX', 5);
    acquired = (res === 'OK');
  } catch (e) {
    // If Redis connection is offline/fails, bypass stampede lock to prevent failure
    acquired = true;
  }

  if (!acquired) {
    // Active lock exists. Wait and poll cache to reuse current concurrent computation.
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const [[cached]] = await pool.query(
        'SELECT * FROM whatsapp_campaign_analytics WHERE campaign_id = ?',
        [campaignId]
      );
      if (cached) {
        return cached;
      }
    }
  }

  try {
    // Calculate live statistics using the SQL 5.7+ compatible deduplicated join query
    const [[metrics]] = await pool.query(`
      SELECT
          COUNT(IF(resolved_status = 'sent' OR resolved_status = 'delivered' OR resolved_status = 'read', 1, NULL)) as sent_count,
          COUNT(IF(resolved_status = 'delivered' OR resolved_status = 'read', 1, NULL)) as delivered_count,
          COUNT(IF(resolved_status = 'read', 1, NULL)) as read_count,
          COUNT(IF(resolved_status = 'failed', 1, NULL)) as failed_count
      FROM (
          SELECT r.id, COALESCE(l.status, r.status) as resolved_status
          FROM whatsapp_campaign_recipients r
          LEFT JOIN (
              SELECT ml.message_id, ml.status
              FROM whatsapp_message_logs ml
              INNER JOIN (
                  SELECT message_id, MAX(id) as max_id
                  FROM whatsapp_message_logs
                  WHERE message_id IS NOT NULL
                  GROUP BY message_id
              ) latest ON latest.max_id = ml.id
          ) l ON r.message_id = l.message_id
          WHERE r.campaign_id = ?
      ) t
    `, [campaignId]);

    const sent_count = metrics?.sent_count || 0;
    const delivered_count = metrics?.delivered_count || 0;
    const read_count = metrics?.read_count || 0;
    const failed_count = metrics?.failed_count || 0;

    // Save/Update the Cache Table
    await pool.query(`
      INSERT INTO whatsapp_campaign_analytics (campaign_id, sent_count, delivered_count, read_count, failed_count, last_calculated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        sent_count = VALUES(sent_count),
        delivered_count = VALUES(delivered_count),
        read_count = VALUES(read_count),
        failed_count = VALUES(failed_count),
        last_calculated_at = CURRENT_TIMESTAMP
    `, [campaignId, sent_count, delivered_count, read_count, failed_count]);

    return {
      campaign_id: campaignId,
      sent_count,
      delivered_count,
      read_count,
      failed_count
    };
  } finally {
    if (acquired) {
      try {
        await redisConnection.del(lockKey);
      } catch (e) { }
    }
  }
}

/**
 * Retrieve cached campaign stats, automatically refreshing if the campaign is active 
 * and the cache entry is older than 5 seconds.
 */
async function getOrRefreshCampaignAnalytics(campaignId, status) {
  const [[cached]] = await pool.query(
    'SELECT * FROM whatsapp_campaign_analytics WHERE campaign_id = ?',
    [campaignId]
  );

  const isActive = ['draft', 'queued', 'running', 'paused'].includes(status);

  if (cached) {
    const ageMs = Date.now() - new Date(cached.last_calculated_at).getTime();
    const olderThan5s = ageMs > 5000;

    if (isActive && olderThan5s) {
      return await refreshCampaignAnalyticsSnapshot(campaignId);
    }
    return cached;
  } else {
    return await refreshCampaignAnalyticsSnapshot(campaignId);
  }
}

/**
 * Retrieve aggregate Executive dashboard KPIs.
 */
async function getExecutiveKPIs(configId) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);

  // First, find all active campaigns and force updates if cached records are stale
  const [activeCampaigns] = await pool.query(
    "SELECT id, status FROM whatsapp_campaigns WHERE config_id = ? AND status IN ('draft', 'queued', 'running', 'paused')",
    [configIdVal]
  );
  for (const c of activeCampaigns) {
    await getOrRefreshCampaignAnalytics(c.id, c.status);
  }

  // Sum everything from the cache table (which contains completed + updated active metrics) scoped to configIdVal
  const [[totals]] = await pool.query(`
    SELECT 
      SUM(a.sent_count) as sent_count,
      SUM(a.delivered_count) as delivered_count,
      SUM(a.read_count) as read_count,
      SUM(a.failed_count) as failed_count
    FROM whatsapp_campaign_analytics a
    INNER JOIN whatsapp_campaigns c ON a.campaign_id = c.id
    WHERE c.config_id = ?
  `, [configIdVal]);

  const sent = parseInt(totals?.sent_count || 0);
  const delivered = parseInt(totals?.delivered_count || 0);
  const read = parseInt(totals?.read_count || 0);
  const failed = parseInt(totals?.failed_count || 0);

  const successRate = sent > 0 ? (delivered / sent) * 100 : 0;
  const readRate = sent > 0 ? (read / sent) * 100 : 0;
  const failureRate = (sent + failed) > 0 ? (failed / (sent + failed)) * 100 : 0;

  // Total campaigns count scoped to configIdVal
  const [[{ totalCampaigns }]] = await pool.query(
    'SELECT COUNT(*) as totalCampaigns FROM whatsapp_campaigns WHERE config_id = ?',
    [configIdVal]
  );

  // Sum total WABA spend from pricing analytics scoped to configIdVal
  const [[spendRow]] = await pool.query(
    'SELECT SUM(cost) as total_spend FROM whatsapp_waba_pricing_analytics WHERE config_id = ?',
    [configIdVal]
  );
  const totalSpend = parseFloat(spendRow?.total_spend || 0);

  // Sum total WABA paid from manual payments table scoped to configIdVal
  const [[paidRow]] = await pool.query(
    'SELECT SUM(amount) as total_paid FROM whatsapp_waba_payment_history WHERE config_id = ?',
    [configIdVal]
  );
  const totalPaid = parseFloat(paidRow?.total_paid || 0);
  const netPaid = totalPaid - (totalPaid * 0.18);
  const totalDue = Math.max(0, totalSpend - netPaid);
  console.log(totalPaid, netPaid, totalDue, "totla dhu")

  return {
    totalCampaigns: totalCampaigns || 0,
    totalSent: sent,
    totalDelivered: delivered,
    totalRead: read,
    totalFailed: failed,
    successRate,
    readRate,
    failureRate,
    totalSpend,
    totalPaid,
    totalDue
  };
}

/**
 * Fetch list of campaigns with filtered performance analytics
 */
async function getCampaignPerformance({ startDate, endDate, campaignType, status, configId }) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);

  let query = `
    SELECT c.id, c.name, c.campaign_type, c.status, c.created_at,
           COALESCE(a.sent_count, 0) as sent_count,
           COALESCE(a.delivered_count, 0) as delivered_count,
           COALESCE(a.read_count, 0) as read_count,
           COALESCE(a.failed_count, 0) as failed_count
    FROM whatsapp_campaigns c
    LEFT JOIN whatsapp_campaign_analytics a ON c.id = a.campaign_id
    WHERE c.config_id = ?
  `;
  const params = [configIdVal];

  if (startDate) {
    query += " AND c.created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND c.created_at <= ?";
    params.push(endDate);
  }
  if (campaignType) {
    query += " AND c.campaign_type = ?";
    params.push(campaignType);
  }
  if (status) {
    query += " AND c.status = ?";
    params.push(status);
  }

  query += " ORDER BY c.created_at DESC";

  const [rows] = await pool.query(query, params);

  const results = [];
  for (const row of rows) {
    const stats = await getOrRefreshCampaignAnalytics(row.id, row.status);
    results.push({
      ...row,
      sent_count: stats.sent_count,
      delivered_count: stats.delivered_count,
      read_count: stats.read_count,
      failed_count: stats.failed_count,
      delivery_rate: stats.sent_count > 0 ? (stats.delivered_count / stats.sent_count) * 100 : 0,
      read_rate: stats.sent_count > 0 ? (stats.read_count / stats.sent_count) * 100 : 0
    });
  }

  return results;
}

/**
 * Fetch metrics grouped by template name.
 */
async function getTemplatePerformance(configId) {
  const { phoneId } = await whatsappService.resolveWhatsAppConfig(configId);

  const [rows] = await pool.query(`
    SELECT 
      ml.template_name,
      COUNT(IF(ml.status = 'sent' OR ml.status = 'delivered' OR ml.status = 'read', 1, NULL)) as sent_count,
      COUNT(IF(ml.status = 'delivered' OR ml.status = 'read', 1, NULL)) as delivered_count,
      COUNT(IF(ml.status = 'read', 1, NULL)) as read_count,
      COUNT(IF(ml.status = 'failed', 1, NULL)) as failed_count
    FROM whatsapp_message_logs ml
    INNER JOIN (
      SELECT message_id, MAX(id) as max_id
      FROM whatsapp_message_logs
      WHERE message_id IS NOT NULL AND phone_number_id = ?
      GROUP BY message_id
    ) latest ON latest.max_id = ml.id
    WHERE ml.phone_number_id = ?
    GROUP BY ml.template_name
    ORDER BY sent_count DESC
  `, [phoneId, phoneId]);

  return rows.map(r => {
    const sent = parseInt(r.sent_count || 0);
    const delivered = parseInt(r.delivered_count || 0);
    const read = parseInt(r.read_count || 0);
    const failed = parseInt(r.failed_count || 0);

    return {
      template_name: r.template_name,
      sent_count: sent,
      delivered_count: delivered,
      read_count: read,
      failed_count: failed,
      delivery_rate: sent > 0 ? (delivered / sent) * 100 : 0,
      read_rate: sent > 0 ? (read / sent) * 100 : 0
    };
  });
}

/**
 * Retrieve execution analytics from recurring campaigns
 */
async function getSchedulingAnalytics(configId) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);

  // Update child execution caches if running
  const [activeChildren] = await pool.query(
    `SELECT id, status FROM whatsapp_campaigns 
     WHERE parent_campaign_id IS NOT NULL AND config_id = ? AND status IN ('draft', 'queued', 'running', 'paused')`,
     [configIdVal]
  );
  for (const child of activeChildren) {
    await getOrRefreshCampaignAnalytics(child.id, child.status);
  }

  const [schedules] = await pool.query(`
    SELECT 
        parent.id as parent_campaign_id,
        parent.name as name,
        parent.cron_expression,
        parent.timezone,
        parent.status,
        COUNT(child.id) as execution_count,
        COALESCE(SUM(analytics.sent_count), 0) as sent_count,
        COALESCE(SUM(analytics.delivered_count), 0) as delivered_count,
        COALESCE(SUM(analytics.read_count), 0) as read_count,
        COALESCE(SUM(analytics.failed_count), 0) as failed_count
    FROM whatsapp_campaigns parent
    LEFT JOIN whatsapp_campaigns child ON child.parent_campaign_id = parent.id
    LEFT JOIN whatsapp_campaign_analytics analytics ON child.id = analytics.campaign_id
    WHERE parent.campaign_type = 'recurring' AND parent.config_id = ?
    GROUP BY parent.id
    ORDER BY parent.created_at DESC
  `, [configIdVal]);

  return schedules;
}

/**
 * Trends data with interval date buckets and JS gap filling
 */
async function getTrendsData({ interval, startDate, endDate, configId }) {
  const { phoneId } = await whatsappService.resolveWhatsAppConfig(configId);
  let dateField;
  if (interval === 'monthly') {
    dateField = "DATE_FORMAT(ml.sent_at, '%Y-%m-01')";
  } else if (interval === 'weekly') {
    dateField = "DATE_FORMAT(DATE_SUB(ml.sent_at, INTERVAL WEEKDAY(ml.sent_at) DAY), '%Y-%m-%d')";
  } else {
    dateField = "DATE_FORMAT(ml.sent_at, '%Y-%m-%d')"; // Daily default
  }

  // Retrieve metrics inside date bounds and scoped to phoneId
  const [rows] = await pool.query(`
    SELECT 
        t.date_bucket,
        COUNT(IF(t.status = 'sent' OR t.status = 'delivered' OR t.status = 'read', 1, NULL)) as sent_count,
        COUNT(IF(t.status = 'delivered' OR t.status = 'read', 1, NULL)) as delivered_count,
        COUNT(IF(t.status = 'read', 1, NULL)) as read_count,
        COUNT(IF(t.status = 'failed', 1, NULL)) as failed_count
    FROM (
        SELECT 
            ml.status,
            ml.sent_at,
            ${dateField} as date_bucket
        FROM whatsapp_message_logs ml
        INNER JOIN (
            SELECT message_id, MAX(id) as max_id
            FROM whatsapp_message_logs
            WHERE message_id IS NOT NULL AND sent_at >= ? AND sent_at <= ? AND phone_number_id = ?
            GROUP BY message_id
        ) latest ON latest.max_id = ml.id
        WHERE ml.phone_number_id = ?
    ) t
    GROUP BY t.date_bucket
    ORDER BY t.date_bucket ASC
  `, [startDate, endDate, phoneId, phoneId]);

  // Construct map of values returned from DB
  const dbDataMap = {};
  for (const r of rows) {
    dbDataMap[r.date_bucket] = {
      date: r.date_bucket,
      sent_count: parseInt(r.sent_count || 0),
      delivered_count: parseInt(r.delivered_count || 0),
      read_count: parseInt(r.read_count || 0),
      failed_count: parseInt(r.failed_count || 0)
    };
  }

  // Gap-filler loop
  const start = new Date(startDate);
  const end = new Date(endDate);
  const filledArray = [];

  let current = new Date(start);

  if (interval === 'monthly') {
    current = new Date(current.getUTCFullYear(), current.getUTCMonth(), 1);
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      filledArray.push(dbDataMap[key] || {
        date: key,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0
      });
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  } else if (interval === 'weekly') {
    // Align to Monday
    const day = current.getUTCDay();
    const diff = current.getUTCDate() - day + (day === 0 ? -6 : 1);
    current.setUTCDate(diff);

    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      filledArray.push(dbDataMap[key] || {
        date: key,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0
      });
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else {
    // Daily gap filling
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      filledArray.push(dbDataMap[key] || {
        date: key,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return filledArray;
}

/**
 * Compare details of up to 5 campaigns side-by-side
 */
async function getCampaignsComparison(campaignIds) {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    throw new Error('Campaign IDs must be a non-empty array');
  }
  if (campaignIds.length > 5) {
    const err = new Error('You can compare a maximum of 5 campaigns');
    err.status = 400;
    throw err;
  }

  const [campaigns] = await pool.query(
    'SELECT id, name, campaign_type, status, created_at FROM whatsapp_campaigns WHERE id IN (?)',
    [campaignIds]
  );

  const results = [];
  for (const c of campaigns) {
    const stats = await getOrRefreshCampaignAnalytics(c.id, c.status);
    const sent = stats.sent_count || 0;
    const delivered = stats.delivered_count || 0;
    const read = stats.read_count || 0;
    const failed = stats.failed_count || 0;

    results.push({
      id: c.id,
      name: c.name,
      campaign_type: c.campaign_type,
      status: c.status,
      created_at: c.created_at,
      sent_count: sent,
      delivered_count: delivered,
      read_count: read,
      failed_count: failed,
      delivery_rate: sent > 0 ? (delivered / sent) * 100 : 0,
      read_rate: sent > 0 ? (read / sent) * 100 : 0,
      failure_rate: (sent + failed) > 0 ? (failed / (sent + failed)) * 100 : 0
    });
  }

  return results;
}

/**
 * Stream filtered campaign data in chunks up to 50,000 rows.
 */
async function exportCampaignsCSV(filters, res) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(filters.configId);

  try {
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="campaigns_analytics.csv"',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    let lastId = 0;
    let totalWritten = 0;
    const chunkSize = 1000;
    const maxRows = 50000;

    res.write('Campaign ID,Name,Type,Status,Created At,Sent,Delivered,Read,Failed,Delivery Rate (%),Read Rate (%)\n');

    while (totalWritten < maxRows) {
      const limit = Math.min(chunkSize, maxRows - totalWritten);

      let query = `
        SELECT c.id, c.name, c.campaign_type, c.status, c.created_at,
               COALESCE(a.sent_count, 0) as sent_count,
               COALESCE(a.delivered_count, 0) as delivered_count,
               COALESCE(a.read_count, 0) as read_count,
               COALESCE(a.failed_count, 0) as failed_count
        FROM whatsapp_campaigns c
        LEFT JOIN whatsapp_campaign_analytics a ON c.id = a.campaign_id
        WHERE c.id > ? AND c.config_id = ?
      `;
      const params = [lastId, configIdVal];

      if (filters.startDate) {
        query += " AND c.created_at >= ?";
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += " AND c.created_at <= ?";
        params.push(filters.endDate);
      }
      if (filters.campaignType) {
        query += " AND c.campaign_type = ?";
        params.push(filters.campaignType);
      }
      if (filters.status) {
        query += " AND c.status = ?";
        params.push(filters.status);
      }

      query += " ORDER BY c.id ASC LIMIT ?";
      params.push(limit);

      const [rows] = await pool.query(query, params);
      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const stats = await getOrRefreshCampaignAnalytics(row.id, row.status);
        const sent = stats.sent_count || 0;
        const delivered = stats.delivered_count || 0;
        const read = stats.read_count || 0;
        const failed = stats.failed_count || 0;
        const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(2) : '0.00';
        const readRate = sent > 0 ? ((read / sent) * 100).toFixed(2) : '0.00';

        const csvRow = [
          row.id,
          `"${row.name.replace(/"/g, '""')}"`,
          row.campaign_type,
          row.status,
          row.created_at ? new Date(row.created_at).toISOString() : '',
          sent,
          delivered,
          read,
          failed,
          deliveryRate,
          readRate
        ].join(',') + '\n';

        res.write(csvRow);
        lastId = row.id;
        totalWritten++;
      }
    }
  } finally {
    res.end();
  }
}

/**
 * Stream template metrics in CSV format.
 */
async function exportTemplatesCSV(configId, res) {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="templates_analytics.csv"',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    res.write('Template Name,Sent,Delivered,Read,Failed,Delivery Rate (%),Read Rate (%)\n');

    const templates = await getTemplatePerformance(configId);
    for (const t of templates) {
      const csvRow = [
        `"${t.template_name.replace(/"/g, '""')}"`,
        t.sent_count,
        t.delivered_count,
        t.read_count,
        t.failed_count,
        t.delivery_rate.toFixed(2),
        t.read_rate.toFixed(2)
      ].join(',') + '\n';

      res.write(csvRow);
    }
  } finally {
    res.end();
  }
}


async function getLiveWabaAnalytics({ configId, start, end }) {
  const { token, wabaId } = await whatsappService.resolveWhatsAppConfig(configId);
  if (!token || !wabaId) {
    throw new Error('WhatsApp integration keys (Access Token, WABA ID) are missing.');
  }

  const url = `https://graph.facebook.com/v24.0/${wabaId}?fields=analytics.start(${start}).end(${end}).granularity(DAY)&access_token=${token}`;

  console.log(`Fetching live WABA analytics from Meta API: ${url}`);
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Meta API Live Analytics Error:', error.response?.data || error.message);
    throw formatMetaError(error);
  }
}

async function syncLiveWabaPricing({ configId, start, end }) {
  const { token, wabaId, configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);
  if (!token || !wabaId) {
    throw new Error('WhatsApp integration keys (Access Token, WABA ID) are missing.');
  }

  const url = `https://graph.facebook.com/v24.0/${wabaId}?fields=pricing_analytics.start(${start}).end(${end}).granularity(DAILY).dimensions(["COUNTRY","PRICING_CATEGORY"])&access_token=${token}`;

  console.log(`Syncing WABA pricing analytics from Meta API: ${url}`);
  try {
    const response = await axios.get(url);
    const dataPoints = response.data?.pricing_analytics?.data?.[0]?.data_points || [];
    console.log(`Meta API returned ${dataPoints.length} pricing data points. Saving to database...`);

    if (dataPoints.length > 0) {
      for (const dp of dataPoints) {
        await pool.query(`
          INSERT INTO whatsapp_waba_pricing_analytics 
            (config_id, waba_id, start_time, end_time, country, pricing_category, volume, cost)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            volume = VALUES(volume),
            cost = VALUES(cost),
            end_time = VALUES(end_time),
            synced_at = CURRENT_TIMESTAMP
        `, [
          configIdVal,
          wabaId,
          dp.start,
          dp.end,
          dp.country || 'N/A',
          dp.pricing_category || 'N/A',
          dp.volume || 0,
          dp.cost || 0
        ]);
      }
    }

    return { success: true, count: dataPoints.length };
  } catch (error) {
    console.error('Meta API Pricing Analytics Sync Error:', error.response?.data || error.message);
    throw formatMetaError(error);
  }
}

async function getWabaPricingAnalytics({ configId, start, end }) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);

  const [rows] = await pool.query(`
    SELECT start_time, end_time, country, pricing_category, volume, cost, synced_at
    FROM whatsapp_waba_pricing_analytics
    WHERE config_id = ? AND start_time >= ? AND start_time <= ?
    ORDER BY start_time DESC, country ASC, pricing_category ASC
  `, [configIdVal, start, end]);

  return rows;
}

async function getWabaPayments(configId) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);

  // Fetch total spend
  const [[spendRow]] = await pool.query(
    'SELECT SUM(cost) as total_spend FROM whatsapp_waba_pricing_analytics WHERE config_id = ?',
    [configIdVal]
  );
  const totalSpend = parseFloat(spendRow?.total_spend || 0);

  // Fetch payments list
  const [rows] = await pool.query(
    'SELECT id, payment_date, amount, transaction_id, notes, created_at FROM whatsapp_waba_payment_history WHERE config_id = ? ORDER BY payment_date DESC, id DESC',
    [configIdVal]
  );

  const totalPaid = rows.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const netPaid = totalPaid - (totalPaid * 0.18);
  const totalDue = Math.max(0, totalSpend - netPaid);

  return {
    totalSpend,
    totalPaid,
    totalDue,
    payments: rows
  };
}

async function addWabaPayment(configId, { paymentDate, amount, transactionId, notes }) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);
  const [result] = await pool.query(
    `INSERT INTO whatsapp_waba_payment_history (config_id, payment_date, amount, transaction_id, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [configIdVal, paymentDate, amount, transactionId || null, notes || null]
  );
  return { id: result.insertId };
}

async function deleteWabaPayment(configId, paymentId) {
  const { configId: configIdVal } = await whatsappService.resolveWhatsAppConfig(configId);
  const [result] = await pool.query(
    'DELETE FROM whatsapp_waba_payment_history WHERE id = ? AND config_id = ?',
    [paymentId, configIdVal]
  );
  return { affectedRows: result.affectedRows };
}

module.exports = {
  refreshCampaignAnalyticsSnapshot,
  getOrRefreshCampaignAnalytics,
  getExecutiveKPIs,
  getCampaignPerformance,
  getTemplatePerformance,
  getSchedulingAnalytics,
  getTrendsData,
  getCampaignsComparison,
  exportCampaignsCSV,
  exportTemplatesCSV,
  getLiveWabaAnalytics,
  syncLiveWabaPricing,
  getWabaPricingAnalytics,
  getWabaPayments,
  addWabaPayment,
  deleteWabaPayment
};
