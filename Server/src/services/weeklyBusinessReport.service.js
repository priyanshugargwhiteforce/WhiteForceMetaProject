const cron = require('node-cron');
const { pool } = require('../config/db');
const campaignsService = require('./whatsapp-campaigns.service');
const { cleanPhoneNumber } = require('./dailyTaskReminder.service');

/**
 * Format a Date object into "DD MMM YYYY" string (e.g., "27 Aug 2026")
 */
function formatDateShort(dateObj) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = months[dateObj.getMonth()];
    const y = dateObj.getFullYear();
    return `${d} ${m} ${y}`;
}

/**
 * Clean numeric string / number into formatted string (e.g. 12345 -> "12,345" or "12345")
 */
function formatNum(val, decimals = 0) {
    const num = parseFloat(val || 0);
    if (isNaN(num)) return '0';
    if (decimals > 0) {
        return num.toFixed(decimals);
    }
    return Math.round(num).toString();
}

/**
 * Gathers weekly and monthly performance metrics across WhatsApp, Meta Ads, and Google Ads.
 */
async function getWeeklyReportMetrics() {
    const now = new Date();
    
    // 7-day Weekly Period (e.g. 7 days ago to today)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startWeeklyStr = sevenDaysAgo.toISOString().split('T')[0];
    const endWeeklyStr = now.toISOString().split('T')[0];
    const dateRangeLabel = `${formatDateShort(sevenDaysAgo).replace(' ' + now.getFullYear(), '')} - ${formatDateShort(now)}`;

    // Monthly Period (1st of current month to today)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startMonthlyStr = monthStart.toISOString().split('T')[0];

    // ==========================================
    // 1. WHATSAPP METRICS
    // ==========================================
    // Weekly Spend
    const [[waWeeklySpendRow]] = await pool.query(
        `SELECT SUM(cost) AS total_spend 
         FROM whatsapp_waba_pricing_analytics 
         WHERE DATE(FROM_UNIXTIME(start_time)) BETWEEN ? AND ?`,
        [startWeeklyStr, endWeeklyStr]
    );
    const waWeeklySpend = parseFloat(waWeeklySpendRow?.total_spend || 0);

    // Weekly Message Sent, Delivered, Failed, Replies
    const [[waWeeklyMsgRow]] = await pool.query(
        `SELECT 
            COUNT(IF(status IN ('sent', 'delivered', 'read'), 1, NULL)) AS sent_count,
            COUNT(IF(status IN ('delivered', 'read'), 1, NULL)) AS delivered_count,
            COUNT(IF(status = 'failed', 1, NULL)) AS failed_count,
            COUNT(IF(direction = 'inbound', 1, NULL)) AS replies_count
         FROM whatsapp_message_logs
         WHERE DATE(sent_at) BETWEEN ? AND ?`,
        [startWeeklyStr, endWeeklyStr]
    );
    const waWeeklySent = parseInt(waWeeklyMsgRow?.sent_count || 0);
    const waWeeklyDelivered = parseInt(waWeeklyMsgRow?.delivered_count || 0);
    const waWeeklyFailed = parseInt(waWeeklyMsgRow?.failed_count || 0);
    const waWeeklyReplies = parseInt(waWeeklyMsgRow?.replies_count || 0);

    // Overall WhatsApp Summary
    const [[waOverallMsgRow]] = await pool.query(
        `SELECT 
            COUNT(IF(status IN ('sent', 'delivered', 'read'), 1, NULL)) AS sent_count,
            COUNT(IF(status IN ('delivered', 'read'), 1, NULL)) AS delivered_count
         FROM whatsapp_message_logs`
    );
    const waOverallSent = parseInt(waOverallMsgRow?.sent_count || 0);
    const waOverallDelivered = parseInt(waOverallMsgRow?.delivered_count || 0);

    const [[waOverallSpendRow]] = await pool.query('SELECT SUM(cost) AS total_spend FROM whatsapp_waba_pricing_analytics');
    const waOverallSpend = parseFloat(waOverallSpendRow?.total_spend || 0);

    const [[waPaidRow]] = await pool.query('SELECT SUM(amount) AS total_paid FROM whatsapp_waba_payment_history');
    const waPaidAmount = parseFloat(waPaidRow?.total_paid || 0);
    const waNetPaid = waPaidAmount - (waPaidAmount * 0.18);
    const waDueAmount = Math.max(0, waOverallSpend - waNetPaid);

    // ==========================================
    // 2. META ADS METRICS (LIVE GRAPH API + DB FALLBACK)
    // ==========================================
    const axios = require('axios');
    
    function extractLeads(actionsArr) {
        if (!Array.isArray(actionsArr)) return 0;
        const leadAction = actionsArr.find(a => 
            a.action_type === 'lead' || 
            a.action_type === 'onsite_conversion.lead_grouped' || 
            a.action_type === 'offsite_complete_registration_add_meta_leads'
        );
        return leadAction ? parseInt(leadAction.value || 0) : 0;
    }

    const [metaConfigs] = await pool.query('SELECT id, access_token FROM meta_configs');
    const accountMetricsMap = {};

    for (const cfg of metaConfigs) {
        const token = cfg.access_token;
        if (!token) continue;

        const [accs] = await pool.query(
            'SELECT id, name, amount_spent FROM meta_ad_accounts WHERE config_id = ? AND amount_spent > 0 ORDER BY amount_spent DESC',
            [cfg.id]
        );

        for (const acc of accs) {
            if (accountMetricsMap[acc.id]) continue;

            let weeklyData = { spend: 0, impressions: 0, clicks: 0, leads: 0 };
            let monthlyData = { spend: 0, impressions: 0, clicks: 0, leads: 0 };

            // Fetch last_7d live insights
            try {
                const url7d = `https://graph.facebook.com/v24.0/${acc.id}/insights?date_preset=last_7d&fields=spend,impressions,clicks,actions&access_token=${token}`;
                const res7d = await axios.get(url7d);
                if (res7d.data?.data?.[0]) {
                    const d = res7d.data.data[0];
                    weeklyData = {
                        spend: parseFloat(d.spend || 0),
                        impressions: parseInt(d.impressions || 0),
                        clicks: parseInt(d.clicks || 0),
                        leads: extractLeads(d.actions)
                    };
                }
            } catch (e) {
                console.error(`Failed live 7d insights for Meta acc ${acc.id}:`, e.message);
            }

            // Fetch this_month live insights
            try {
                const urlMonth = `https://graph.facebook.com/v24.0/${acc.id}/insights?date_preset=this_month&fields=spend,impressions,clicks,actions&access_token=${token}`;
                const resMonth = await axios.get(urlMonth);
                if (resMonth.data?.data?.[0]) {
                    const d = resMonth.data.data[0];
                    monthlyData = {
                        spend: parseFloat(d.spend || 0),
                        impressions: parseInt(d.impressions || 0),
                        clicks: parseInt(d.clicks || 0),
                        leads: extractLeads(d.actions)
                    };
                }
            } catch (e) {
                console.error(`Failed live month insights for Meta acc ${acc.id}:`, e.message);
            }

            if (weeklyData.spend > 0 || monthlyData.spend > 0 || parseFloat(acc.amount_spent) > 0) {
                accountMetricsMap[acc.id] = {
                    id: acc.id,
                    name: acc.name.replace(/\(Read-Only\)/gi, '').trim(),
                    weekly: weeklyData,
                    monthly: monthlyData
                };
            }
        }
    }

    const activeMetaAccountsList = Object.values(accountMetricsMap).sort((a, b) => b.weekly.spend - a.weekly.spend);

    const metaAcc1Obj = activeMetaAccountsList[0] || { name: 'N/A', weekly: { spend: 0, leads: 0, impressions: 0, clicks: 0 } };
    const metaAcc2Obj = activeMetaAccountsList[1] || { name: 'N/A', weekly: { spend: 0, leads: 0, impressions: 0, clicks: 0 } };

    let rawAcc1Name = metaAcc1Obj.name.replace('Outsourcing', '').replace(/\s+/g, ' ').trim();
    const acc1Name = rawAcc1Name.length > 14 ? rawAcc1Name.substring(0, 12) + '..' : rawAcc1Name;
    const acc1Spend = metaAcc1Obj.weekly.spend;
    const acc1Leads = metaAcc1Obj.weekly.leads;
    const acc1Impressions = metaAcc1Obj.weekly.impressions;
    const acc1Clicks = metaAcc1Obj.weekly.clicks;

    let rawAcc2Name = metaAcc2Obj.name.replace('Outsourcing Services Limited', 'Svcs Ltd').replace(/\s+/g, ' ').trim();
    const acc2Name = rawAcc2Name.length > 12 ? rawAcc2Name.substring(0, 10) + '..' : rawAcc2Name;
    const acc2Spend = metaAcc2Obj.weekly.spend;
    const acc2Leads = metaAcc2Obj.weekly.leads;
    const acc2Impressions = metaAcc2Obj.weekly.impressions;
    const acc2Clicks = metaAcc2Obj.weekly.clicks;

    const metaMonthSpend = activeMetaAccountsList.reduce((sum, a) => sum + a.monthly.spend, 0);
    const metaMonthLeads = activeMetaAccountsList.reduce((sum, a) => sum + a.monthly.leads, 0);
    const metaMonthClicks = activeMetaAccountsList.reduce((sum, a) => sum + a.monthly.clicks, 0);
    const metaMonthImpressions = activeMetaAccountsList.reduce((sum, a) => sum + a.monthly.impressions, 0);

    // ==========================================
    // 3. GOOGLE ADS METRICS
    // ==========================================
    let googleAccountName = process.env.GOOGLE_CUSTOMER_ID || 'Google Ads Account';
    
    // Google Weekly
    const [[googleWeeklyTrend]] = await pool.query(
        `SELECT SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions 
         FROM google_insights_trend 
         WHERE date_start BETWEEN ? AND ?`,
        [startWeeklyStr, endWeeklyStr]
    );
    const googleWeeklySpend = parseFloat(googleWeeklyTrend?.spend || 0);
    const googleWeeklyImpressions = parseInt(googleWeeklyTrend?.impressions || 0);
    const googleWeeklyClicks = parseInt(googleWeeklyTrend?.clicks || 0);
    
    const [[googleWeeklyLeadsRow]] = await pool.query(
        `SELECT COUNT(*) AS leads 
         FROM google_leads 
         WHERE DATE(submitted_at) BETWEEN ? AND ?`,
        [startWeeklyStr, endWeeklyStr]
    );
    const googleWeeklyLeads = parseInt(googleWeeklyLeadsRow?.leads || 0) || Math.round(parseFloat(googleWeeklyTrend?.conversions || 0));

    // Google Monthly
    const [[googleMonthTrend]] = await pool.query(
        `SELECT SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions 
         FROM google_insights_trend 
         WHERE date_start BETWEEN ? AND ?`,
        [startMonthlyStr, endWeeklyStr]
    );
    const googleMonthSpend = parseFloat(googleMonthTrend?.spend || 0);
    const googleMonthImpressions = parseInt(googleMonthTrend?.impressions || 0);
    const googleMonthClicks = parseInt(googleMonthTrend?.clicks || 0);

    const [[googleMonthLeadsRow]] = await pool.query(
        `SELECT COUNT(*) AS leads 
         FROM google_leads 
         WHERE DATE(submitted_at) BETWEEN ? AND ?`,
        [startMonthlyStr, endWeeklyStr]
    );
    const googleMonthLeads = parseInt(googleMonthLeadsRow?.leads || 0) || Math.round(parseFloat(googleMonthTrend?.conversions || 0));

    return {
        dateRangeLabel,
        waWeeklySpend: formatNum(waWeeklySpend, 2),
        waWeeklySent: formatNum(waWeeklySent),
        waWeeklyDelivered: formatNum(waWeeklyDelivered),
        waWeeklyFailed: formatNum(waWeeklyFailed),
        waWeeklyReplies: formatNum(waWeeklyReplies),

        waOverallSent: formatNum(waOverallSent),
        waOverallDelivered: formatNum(waOverallDelivered),
        waOverallSpend: formatNum(waOverallSpend, 2),
        waPaidAmount: formatNum(waPaidAmount, 2),
        waDueAmount: formatNum(waDueAmount, 2),

        acc1Name,
        acc1Spend: formatNum(acc1Spend, 2),
        acc1Leads: formatNum(acc1Leads),
        acc1Impressions: formatNum(acc1Impressions),
        acc1Clicks: formatNum(acc1Clicks),

        acc2Name,
        acc2Spend: formatNum(acc2Spend, 2),
        acc2Leads: formatNum(acc2Leads),
        acc2Impressions: formatNum(acc2Impressions),
        acc2Clicks: formatNum(acc2Clicks),

        metaMonthSpend: formatNum(metaMonthSpend, 2),
        metaMonthLeads: formatNum(metaMonthLeads),
        metaMonthClicks: formatNum(metaMonthClicks),
        metaMonthImpressions: formatNum(metaMonthImpressions),

        googleAccountName,
        googleWeeklySpend: formatNum(googleWeeklySpend, 2),
        googleWeeklyLeads: formatNum(googleWeeklyLeads),
        googleWeeklyImpressions: formatNum(googleWeeklyImpressions),
        googleWeeklyClicks: formatNum(googleWeeklyClicks),

        googleMonthSpend: formatNum(googleMonthSpend, 2),
        googleMonthLeads: formatNum(googleMonthLeads),
        googleMonthClicks: formatNum(googleMonthClicks),
        googleMonthImpressions: formatNum(googleMonthImpressions)
    };
}

/**
 * Resolves the Boss / Admin mobile number from ENV or DB.
 */
async function resolveAdminPhoneNumber() {
    let envPhone = process.env.ADMIN_WHATSAPP_NUMBER || process.env.BOSS_WHATSAPP_NUMBER;
    if (envPhone) {
        return { name: 'Admin', phone: cleanPhoneNumber(envPhone) };
    }

    // Lookup active user with admin role
    const [[adminUser]] = await pool.query(
        `SELECT username, phone FROM users 
         WHERE role = 'admin' AND status = 'active' AND phone IS NOT NULL AND phone != '' 
         LIMIT 1`
    );

    if (adminUser && adminUser.phone) {
        return { name: adminUser.username || 'Admin', phone: cleanPhoneNumber(adminUser.phone) };
    }

    // Fallback: any active user with valid phone
    const [[anyUser]] = await pool.query(
        `SELECT username, phone FROM users 
         WHERE status = 'active' AND phone IS NOT NULL AND phone != '' 
         ORDER BY id ASC LIMIT 1`
    );

    if (anyUser && anyUser.phone) {
        return { name: anyUser.username || 'Admin', phone: cleanPhoneNumber(anyUser.phone) };
    }

    return { name: 'Admin', phone: null };
}

/**
 * Compiles weekly performance metrics and dispatches WhatsApp template message to Admin/Boss.
 */
async function sendWeeklyBusinessReport(overridePhone = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`\n[Weekly Business Report] Generating report for Date: ${todayStr}...`);

    try {
        let recipientName = 'Admin';
        let targetPhone = overridePhone ? cleanPhoneNumber(overridePhone) : null;

        if (!targetPhone) {
            const adminInfo = await resolveAdminPhoneNumber();
            recipientName = adminInfo.name;
            targetPhone = adminInfo.phone;
        }

        if (!targetPhone) {
            throw new Error('No valid Boss/Admin mobile number found. Please set ADMIN_WHATSAPP_NUMBER in .env or update Admin phone in profile.');
        }

        // Fetch template 'weekly_business_report' from DB
        let [[templateObj]] = await pool.query(
            'SELECT id, name, language FROM whatsapp_templates WHERE name = "weekly_business_report" LIMIT 1'
        );

        if (!templateObj) {
            console.warn('[Weekly Business Report] Template "weekly_business_report" not found in DB. Auto-syncing from Meta...');
            const { getTemplates } = require('./whatsapp.service');
            await getTemplates(true);
            const [[syncedTmpl]] = await pool.query(
                'SELECT id, name, language FROM whatsapp_templates WHERE name = "weekly_business_report" LIMIT 1'
            );
            templateObj = syncedTmpl;
        }

        if (!templateObj) {
            throw new Error('Template "weekly_business_report" is not available on Meta WhatsApp Account.');
        }

        // Check/Create Default Contact List for campaign tracking
        let [[defaultList]] = await pool.query('SELECT id FROM whatsapp_contact_lists WHERE name = "Weekly Business Reports List" LIMIT 1');
        let defaultListId;
        if (!defaultList) {
            const [insertRes] = await pool.query('INSERT INTO whatsapp_contact_lists (name) VALUES ("Weekly Business Reports List")');
            defaultListId = insertRes.insertId;
        } else {
            defaultListId = defaultList.id;
        }

        // Gather all performance metrics
        const metrics = await getWeeklyReportMetrics();

        // Construct 35 parameters payload
        const parameters = [
            recipientName,                // {{1}}
            metrics.dateRangeLabel,       // {{2}}
            metrics.waWeeklySpend,        // {{3}}
            metrics.waWeeklySent,         // {{4}}
            metrics.waWeeklyDelivered,    // {{5}}
            metrics.waWeeklyFailed,       // {{6}}
            metrics.waWeeklyReplies,      // {{7}}
            metrics.waOverallSent,        // {{8}}
            metrics.waOverallDelivered,   // {{9}}
            metrics.waOverallSpend,       // {{10}}
            metrics.waPaidAmount,         // {{11}}
            metrics.waDueAmount,          // {{12}}
            metrics.acc1Name,             // {{13}}
            metrics.acc1Spend,            // {{14}}
            metrics.acc1Leads,            // {{15}}
            metrics.acc1Impressions,      // {{16}}
            metrics.acc1Clicks,           // {{17}}
            metrics.acc2Name,             // {{18}}
            metrics.acc2Spend,            // {{19}}
            metrics.acc2Leads,            // {{20}}
            metrics.acc2Impressions,      // {{21}}
            metrics.acc2Clicks,           // {{22}}
            metrics.metaMonthSpend,       // {{23}}
            metrics.metaMonthLeads,       // {{24}}
            metrics.metaMonthClicks,      // {{25}}
            metrics.metaMonthImpressions, // {{26}}
            metrics.googleAccountName,    // {{27}}
            metrics.googleWeeklySpend,    // {{28}}
            metrics.googleWeeklyLeads,    // {{29}}
            metrics.googleWeeklyImpressions, // {{30}}
            metrics.googleWeeklyClicks,   // {{31}}
            metrics.googleMonthSpend,     // {{32}}
            metrics.googleMonthLeads,     // {{33}}
            metrics.googleMonthClicks,    // {{34}}
            metrics.googleMonthImpressions // {{35}}
        ];

        const campaignName = `Weekly Business Report - ${recipientName} - ${todayStr}`;
        const recipients = [
            {
                number: targetPhone,
                parameters
            }
        ];

        const campaignRes = await campaignsService.createCampaign({
            configId: 0,
            name: campaignName,
            templateId: templateObj.id,
            contactListId: defaultListId,
            campaignType: 'broadcast',
            status: 'queued',
            recipients
        });

        console.log(`✅ [Weekly Business Report] WhatsApp report queued successfully for Boss "${recipientName}" (${targetPhone}). Campaign ID: ${campaignRes.campaignId}`);

        return {
            success: true,
            date: todayStr,
            recipientName,
            recipientPhone: targetPhone,
            campaignId: campaignRes.campaignId,
            metrics
        };

    } catch (err) {
        console.error('[Weekly Business Report Error] Failed to execute sendWeeklyBusinessReport:', err.message);
        throw err;
    }
}

/**
 * Initializes Cron Job scheduled for every Saturday at 08:30 PM (20:30 IST)
 * Cron Expression: '30 20 * * 6'
 */
function initWeeklyBusinessReportCron() {
    // Schedule cron for 08:30 PM IST on Saturdays
    cron.schedule('30 20 * * 6', async () => {
        console.log('⏰ [Cron Job Triggered] Weekly Business Report Saturday 08:30 PM execution starting...');
        try {
            await sendWeeklyBusinessReport();
        } catch (err) {
            console.error('❌ [Cron Job Error] Failed to send Saturday 08:30 PM Weekly Business Report:', err.message);
        }
    });

    console.log('✓ Weekly Business Report Saturday 08:30 PM Cron Job initialized (Schedule: 30 20 * * 6).');
}

module.exports = {
    getWeeklyReportMetrics,
    resolveAdminPhoneNumber,
    sendWeeklyBusinessReport,
    initWeeklyBusinessReportCron
};
