const { pool } = require('../config/db');
const axios = require('axios');
const metaService = require('./meta.service');
const linkedinService = require('./linkedin.service');
const googleService = require('./google.service');
const whatsappAnalyticsService = require('./whatsapp-analytics.service');
const whatsappService = require('./whatsapp.service');
const { decrypt } = require('../utils/crypto');

/**
 * Get aggregated spends across Meta, LinkedIn, Google, and WhatsApp for a date range.
 */
exports.getSpendReportData = async (startStr, endStr) => {
    // 1. Meta Ads Spends
    const metaRows = await pool.query(`
        SELECT 
            DATE_FORMAT(t.date_start, '%Y-%m-%d') AS date, 
            t.spend AS spend, 
            t.impressions AS impressions,
            t.clicks AS clicks,
            a.name AS account_name, 
            a.currency,
            'Meta' AS platform
        FROM meta_insights_trend t
        JOIN meta_ad_accounts a ON t.account_id = a.id
        WHERE t.date_start BETWEEN ? AND ?
    `, [startStr, endStr]).then(([rows]) => rows.map(r => ({
        ...r,
        spend: parseFloat(r.spend || 0),
        impressions: parseInt(r.impressions || 0),
        clicks: parseInt(r.clicks || 0)
    }))).catch(err => {
        console.error('Error fetching Meta spend data:', err);
        return [];
    });

    // 2. LinkedIn Ads Spends
    const linkedinRows = await pool.query(`
        SELECT 
            DATE_FORMAT(t.date_start, '%Y-%m-%d') AS date, 
            t.spend AS spend, 
            t.impressions AS impressions,
            t.clicks AS clicks,
            a.name AS account_name, 
            a.currency,
            'LinkedIn' AS platform
        FROM linkedin_insights_trend t
        JOIN linkedin_accounts a ON t.account_id = a.id
        WHERE t.date_start BETWEEN ? AND ?
    `, [startStr, endStr]).then(([rows]) => rows.map(r => ({
        ...r,
        spend: parseFloat(r.spend || 0),
        impressions: parseInt(r.impressions || 0),
        clicks: parseInt(r.clicks || 0)
    }))).catch(err => {
        console.error('Error fetching LinkedIn spend data:', err);
        return [];
    });

    // 3. Google Ads Spends
    const googleRows = await pool.query(`
        SELECT 
            DATE_FORMAT(t.date_start, '%Y-%m-%d') AS date, 
            t.spend AS spend, 
            t.impressions AS impressions,
            t.clicks AS clicks,
            t.customer_id AS account_name,
            'INR' AS currency,
            'Google' AS platform
        FROM google_insights_trend t
        WHERE t.date_start BETWEEN ? AND ?
    `, [startStr, endStr]).then(([rows]) => rows.map(r => ({
        ...r,
        spend: parseFloat(r.spend || 0),
        impressions: parseInt(r.impressions || 0),
        clicks: parseInt(r.clicks || 0)
    }))).catch(err => {
        console.error('Error fetching Google spend data:', err);
        return [];
    });

    // 4. WhatsApp WABA Spends
    const whatsappRows = await pool.query(`
        SELECT 
            DATE_FORMAT(FROM_UNIXTIME(start_time), '%Y-%m-%d') AS date, 
            SUM(cost) AS spend, 
            SUM(volume) AS volume,
            waba_id AS account_name, 
            'INR' AS currency,
            'WhatsApp' AS platform
        FROM whatsapp_waba_pricing_analytics
        WHERE DATE_FORMAT(FROM_UNIXTIME(start_time), '%Y-%m-%d') BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(FROM_UNIXTIME(start_time), '%Y-%m-%d'), waba_id
    `, [startStr, endStr]).then(([rows]) => rows.map(r => ({
        ...r,
        spend: parseFloat(r.spend || 0),
        volume: parseInt(r.volume || 0),
        impressions: 0,
        clicks: 0
    }))).catch(err => {
        console.error('Error fetching WhatsApp spend data:', err);
        return [];
    });

    return {
        meta: metaRows,
        linkedin: linkedinRows,
        google: googleRows,
        whatsapp: whatsappRows
    };
};

/**
 * Trigger dynamic API sync across all platforms.
 */
exports.syncAllSpendData = async (startStr, endStr) => {
    const results = {
        meta: { success: true, synced: 0, errors: [] },
        linkedin: { success: true, synced: 0, errors: [] },
        google: { success: true, synced: 0, errors: [] },
        whatsapp: { success: true, synced: 0, errors: [] }
    };

    // 1. Sync Meta Ads Spends
    try {
        const [metaAccounts] = await pool.query('SELECT id, config_id FROM meta_ad_accounts');
        for (const account of metaAccounts) {
            try {
                const configIdVal = account.config_id ? parseInt(account.config_id) : 0;
                const token = await metaService.getDecryptedAccessToken(configIdVal);
                const url = `https://graph.facebook.com/v24.0/${account.id}/insights?fields=spend,date_start,clicks,ctr,impressions,cpc,cpm,cost_per_action_type&time_range={"since":"${startStr}","until":"${endStr}"}&time_increment=1&limit=1000&access_token=${token}`;
                
                const response = await axios.get(url);
                const data = response.data.data || [];

                for (const day of data) {
                    await pool.query(`
                        INSERT INTO meta_insights_trend (account_id, date_preset, date_start, spend, impressions, clicks, ctr, cpc, cpm, cost_per_action_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            spend = VALUES(spend),
                            impressions = VALUES(impressions),
                            clicks = VALUES(clicks),
                            ctr = VALUES(ctr),
                            cpc = VALUES(cpc),
                            cpm = VALUES(cpm),
                            cost_per_action_type = VALUES(cost_per_action_type),
                            synced_at = CURRENT_TIMESTAMP
                    `, [
                        account.id,
                        'CUSTOM',
                        day.date_start,
                        parseFloat(day.spend || 0),
                        parseInt(day.impressions || 0),
                        parseInt(day.clicks || 0),
                        parseFloat(day.ctr || 0),
                        parseFloat(day.cpc || 0),
                        parseFloat(day.cpm || 0),
                        JSON.stringify(day.cost_per_action_type || [])
                    ]);
                }
                results.meta.synced += data.length;
            } catch (err) {
                console.error(`Meta Ads Sync Failed for account ${account.id}:`, err.message);
                results.meta.errors.push(`Account ${account.id}: ${err.message}`);
            }
        }
    } catch (err) {
        results.meta.success = false;
        results.meta.errors.push(err.message);
    }

    // 2. Sync LinkedIn Ads Spends
    try {
        const [linkedinAccounts] = await pool.query('SELECT id, name FROM linkedin_accounts');
        for (const account of linkedinAccounts) {
            try {
                const numericId = account.id;
                const analyticsRes = await linkedinService.callLinkedInAPI('https://api.linkedin.com/v2/adAnalyticsV2', {
                    q: 'analytics',
                    pivot: 'CAMPAIGN',
                    dateRange: `(start:${startStr},end:${endStr})`,
                    timeGranularity: 'DAILY',
                    accounts: `List(urn%3Ali%3AsponsoredAccount%3A${numericId})`,
                    fields: 'costInLocalCurrency,impressions,clicks,externalWebsiteConversions,pivotValue,dateRange'
                });

                if (analyticsRes && analyticsRes.elements) {
                    for (const row of analyticsRes.elements) {
                        if (!row.dateRange || !row.dateRange.start) continue;
                        const d = row.dateRange.start;
                        const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                        
                        const spend = parseFloat(row.costInLocalCurrency || 0);
                        const impressions = parseInt(row.impressions || 0);
                        const clicks = parseInt(row.clicks || 0);
                        const conversions = parseFloat(row.externalWebsiteConversions || 0);
                        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                        const cpc = clicks > 0 ? spend / clicks : 0;
                        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

                        await pool.query(`
                            INSERT INTO linkedin_insights_trend (account_id, date_start, spend, impressions, clicks, conversions, ctr, cpc, cpm)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                                spend = VALUES(spend), 
                                impressions = VALUES(impressions), 
                                clicks = VALUES(clicks), 
                                conversions = VALUES(conversions), 
                                ctr = VALUES(ctr), 
                                cpc = VALUES(cpc), 
                                cpm = VALUES(cpm)
                        `, [numericId, dateStr, spend, impressions, clicks, conversions, ctr, cpc, cpm]);
                        results.linkedin.synced++;
                    }
                }
            } catch (err) {
                console.error(`LinkedIn Ads Sync Failed for account ${account.id}:`, err.message);
                results.linkedin.errors.push(`Account ${account.id}: ${err.message}`);
            }
        }
    } catch (err) {
        results.linkedin.success = false;
        results.linkedin.errors.push(err.message);
    }

    // 3. Sync Google Ads Spends
    try {
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        let googleCustomerIds = [];
        if (process.env.GOOGLE_CUSTOMER_ID) {
            googleCustomerIds = process.env.GOOGLE_CUSTOMER_ID.split(',').map(id => id.trim());
        }

        if (refreshToken && googleCustomerIds.length > 0) {
            const client = googleService.getGoogleAdsClient();
            for (const customerId of googleCustomerIds) {
                try {
                    const customer = client.Customer({
                        customer_id: customerId,
                        refresh_token: refreshToken
                    });

                    const query = `
                        SELECT 
                            segments.date,
                            metrics.cost_micros, 
                            metrics.impressions, 
                            metrics.clicks,
                            metrics.conversions
                        FROM customer 
                        WHERE segments.date BETWEEN '${startStr}' AND '${endStr}'
                        ORDER BY segments.date ASC
                    `;
                    const response = await customer.query(query);

                    for (const row of response) {
                        const dateStr = row.segments.date;
                        const spend = (parseInt(row.metrics.cost_micros) || 0) / 1000000;
                        const impressions = parseInt(row.metrics.impressions) || 0;
                        const clicks = parseInt(row.metrics.clicks) || 0;
                        const conversions = parseFloat(row.metrics.conversions) || 0;

                        await pool.query(`
                            INSERT INTO google_insights_trend (customer_id, date_start, spend, impressions, clicks, conversions)
                            VALUES (?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                spend = VALUES(spend),
                                impressions = VALUES(impressions),
                                clicks = VALUES(clicks),
                                conversions = VALUES(conversions),
                                synced_at = CURRENT_TIMESTAMP
                        `, [customerId, dateStr, spend, impressions, clicks, conversions]);
                        results.google.synced++;
                    }
                } catch (err) {
                    console.error(`Google Ads Sync Failed for customer ${customerId}:`, err.message);
                    results.google.errors.push(`Customer ${customerId}: ${err.message}`);
                }
            }
        } else {
            results.google.errors.push("Google Ads credentials/customer configuration missing.");
        }
    } catch (err) {
        results.google.success = false;
        results.google.errors.push(err.message);
    }

    // 4. Sync WhatsApp WABA Spends
    try {
        const [wabaConfigs] = await pool.query('SELECT id, waba_id FROM whatsapp_configs');
        const startUnix = Math.floor(new Date(startStr + 'T00:00:00Z').getTime() / 1000);
        const endUnix = Math.floor(new Date(endStr + 'T23:59:59Z').getTime() / 1000);

        for (const config of wabaConfigs) {
            try {
                await whatsappAnalyticsService.syncLiveWabaPricing({
                    configId: config.id,
                    start: startUnix,
                    end: endUnix
                });
                results.whatsapp.synced++;
            } catch (err) {
                console.error(`WhatsApp pricing sync failed for config ${config.id}:`, err.message);
                results.whatsapp.errors.push(`Config ${config.id}: ${err.message}`);
            }
        }
    } catch (err) {
        results.whatsapp.success = false;
        results.whatsapp.errors.push(err.message);
    }

    return results;
};
