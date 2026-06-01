const { pool } = require('../config/db');
const axios = require('axios');

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache lifetime

// Helper to check if a DB row is stale
const isStale = (lastSyncedAt) => {
    if (!lastSyncedAt) return true;
    return (Date.now() - new Date(lastSyncedAt).getTime()) > CACHE_TTL_MS;
};

// Fetch Ad Accounts list from Facebook and cache in DB
const syncAdAccounts = async (configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) {
            token = config.access_token;
        } else {
            throw new Error(`Meta configuration with ID ${configIdVal} not found.`);
        }
    }

    if (!token) {
        throw new Error('Meta Access Token is missing in server environment.');
    }

    try {
        console.log('Syncing Meta Ad Accounts from FB Graph API...');
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/me?fields=adaccounts{name,account_status,account_id,amount_spent,currency,timezone_name,insights}&access_token=${token}`
        );

        const data = response.data;
        if (data.adaccounts && data.adaccounts.data) {
            const accounts = data.adaccounts.data;

            for (const acc of accounts) {
                // Upsert Ad Account details
                await pool.query(
                    `INSERT INTO meta_ad_accounts (id, config_id, name, account_status, currency, timezone_name, amount_spent)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        account_status = VALUES(account_status),
                        currency = VALUES(currency),
                        timezone_name = VALUES(timezone_name),
                        amount_spent = VALUES(amount_spent),
                        last_synced_at = CURRENT_TIMESTAMP`,
                    [
                        `act_${acc.account_id}`,
                        configIdVal,
                        acc.name,
                        acc.account_status,
                        acc.currency,
                        acc.timezone_name,
                        acc.amount_spent || 0
                    ]
                );

                // If insights are present, cache summary insights as 'lifetime' preset (which matches the query fields)
                if (acc.insights && acc.insights.data && acc.insights.data[0]) {
                    const insight = acc.insights.data[0];
                    await pool.query(
                        `INSERT INTO meta_account_insights (account_id, date_preset, spend, impressions, clicks, ctr)
                         VALUES (?, 'lifetime', ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                            spend = VALUES(spend),
                            impressions = VALUES(impressions),
                            clicks = VALUES(clicks),
                            ctr = VALUES(ctr),
                            synced_at = CURRENT_TIMESTAMP`,
                        [
                            `act_${acc.account_id}`,
                            insight.spend || 0,
                            insight.impressions || 0,
                            insight.clicks || 0,
                            insight.ctr || 0
                        ]
                    );
                }
            }
            return accounts;
        }
        return [];
    } catch (error) {
        console.error('Error syncing Meta Ad Accounts:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getAdAccounts = async (forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    // Check if we have active/recent sync cache
    const [rows] = await pool.query('SELECT *, last_synced_at FROM meta_ad_accounts WHERE config_id = ?', [configIdVal]);
    
    if (rows.length === 0 || forceSync || rows.some(row => isStale(row.last_synced_at))) {
        await syncAdAccounts(configIdVal);
        const [updatedRows] = await pool.query('SELECT * FROM meta_ad_accounts WHERE config_id = ?', [configIdVal]);
        
        // Re-attach insights
        for (const row of updatedRows) {
            const [insights] = await pool.query(
                'SELECT * FROM meta_account_insights WHERE account_id = ? AND date_preset = ?',
                [row.id, 'lifetime']
            );
            if (insights.length > 0) {
                row.insights = { data: [insights[0]] };
            }
        }
        return updatedRows;
    }

    // Attach cached insights
    for (const row of rows) {
        const [insights] = await pool.query(
            'SELECT * FROM meta_account_insights WHERE account_id = ? AND date_preset = ?',
            [row.id, 'lifetime']
        );
        if (insights.length > 0) {
            row.insights = { data: [insights[0]] };
        }
    }
    return rows;
};

// Fetch insights for specific preset/range from FB Graph API and cache in DB
const syncAccountInsights = async (accountId, datePreset = 'lifetime', configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing insights for ${accountId} with preset ${datePreset}...`);
        
        // If daily breakdown trend is needed, we query insights with time_increment=1
        const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,date_start,account_name,date_stop,clicks,cost_per_action_type,cpc,cpm,cpp,ctr,impressions&limit=1000&time_increment=1&access_token=${token}`;
        const response = await axios.get(url);
        const data = response.data.data || [];

        // Save daily insights into meta_insights_trend
        for (const day of data) {
            await pool.query(
                `INSERT INTO meta_insights_trend (account_id, date_preset, date_start, spend, impressions, clicks, ctr, cpc, cpm, cost_per_action_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    spend = VALUES(spend),
                    impressions = VALUES(impressions),
                    clicks = VALUES(clicks),
                    ctr = VALUES(ctr),
                    cpc = VALUES(cpc),
                    cpm = VALUES(cpm),
                    cost_per_action_type = VALUES(cost_per_action_type),
                    synced_at = CURRENT_TIMESTAMP`,
                [
                    accountId,
                    datePreset,
                    day.date_start,
                    day.spend || 0,
                    day.impressions || 0,
                    day.clicks || 0,
                    day.ctr || 0,
                    day.cpc || 0,
                    day.cpm || 0,
                    JSON.stringify(day.cost_per_action_type || [])
                ]
            );
        }

        return data;
    } catch (error) {
        console.error(`Error syncing insights for ${accountId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getAccountInsights = async (accountId, datePreset = 'lifetime', forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    // Check if we have trend data in cache
    const [rows] = await pool.query(
        'SELECT * FROM meta_insights_trend WHERE account_id = ? AND date_preset = ? ORDER BY date_start ASC',
        [accountId, datePreset]
    );

    if (rows.length === 0 || forceSync || rows.some(row => isStale(row.synced_at))) {
        await syncAccountInsights(accountId, datePreset, configIdVal);
        const [updatedRows] = await pool.query(
            'SELECT * FROM meta_insights_trend WHERE account_id = ? AND date_preset = ? ORDER BY date_start ASC',
            [accountId, datePreset]
        );
        return updatedRows.map(r => ({
            ...r,
            cost_per_action_type: typeof r.cost_per_action_type === 'string' ? JSON.parse(r.cost_per_action_type) : r.cost_per_action_type
        }));
    }

    return rows.map(r => ({
        ...r,
        cost_per_action_type: typeof r.cost_per_action_type === 'string' ? JSON.parse(r.cost_per_action_type) : r.cost_per_action_type
    }));
};

// Fetch Ad Account Details & its Ads list from FB Graph API and cache in DB
const syncAccountDetails = async (accountId, configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing details for Ad Account ${accountId}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${accountId}?fields=account_id,account_status,amount_spent,balance,created_time,ads{name,account_id,status,created_time,adset{name,start_time,end_time,targeting},campaign,campaign_id,creative,insights}&access_token=${token}`
        );

        const data = response.data;
        
        // Update account metrics
        await pool.query(
            `INSERT INTO meta_ad_accounts (id, config_id, name, account_status, amount_spent, balance, created_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                account_status = VALUES(account_status),
                amount_spent = VALUES(amount_spent),
                balance = VALUES(balance),
                last_synced_at = CURRENT_TIMESTAMP`,
            [
                accountId,
                configIdVal,
                data.name || `act_${data.account_id}`,
                data.account_status,
                data.amount_spent || 0,
                data.balance || 0,
                data.created_time ? new Date(data.created_time) : null
            ]
        );

        // Parse and Cache Ads
        if (data.ads && data.ads.data) {
            for (const ad of data.ads.data) {
                const impressions = ad.insights?.data?.[0]?.impressions || 0;
                const spend = ad.insights?.data?.[0]?.spend || 0.00;

                await pool.query(
                    `INSERT INTO meta_ads (id, account_id, name, status, campaign_id, campaign_name, adset_id, adset_name, creative_id, ad_active_time, insights_impressions, insights_spend, raw_data)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        status = VALUES(status),
                        campaign_id = VALUES(campaign_id),
                        campaign_name = VALUES(campaign_name),
                        adset_id = VALUES(adset_id),
                        adset_name = VALUES(adset_name),
                        creative_id = VALUES(creative_id),
                        ad_active_time = VALUES(ad_active_time),
                        insights_impressions = VALUES(insights_impressions),
                        insights_spend = VALUES(insights_spend),
                        raw_data = VALUES(raw_data),
                        synced_at = CURRENT_TIMESTAMP`,
                    [
                        ad.id,
                        accountId,
                        ad.name,
                        ad.status,
                        ad.campaign?.id || ad.campaign_id,
                        ad.campaign?.name || null,
                        ad.adset?.id || null,
                        ad.adset?.name || null,
                        ad.creative?.id || null,
                        ad.ad_active_time || 0,
                        impressions,
                        spend,
                        JSON.stringify(ad)
                    ]
                );
            }
        }

        return data;
    } catch (error) {
        console.error(`Error syncing details for ${accountId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getAccountDetails = async (accountId, forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    // Check if account details exist and are fresh
    const [[account]] = await pool.query('SELECT *, last_synced_at FROM meta_ad_accounts WHERE id = ? AND config_id = ?', [accountId, configIdVal]);
    const [ads] = await pool.query('SELECT * FROM meta_ads WHERE account_id = ?', [accountId]);

    if (!account || ads.length === 0 || forceSync || isStale(account.last_synced_at)) {
        await syncAccountDetails(accountId, configIdVal);
        
        // Fetch freshly synced data
        const [[updatedAccount]] = await pool.query('SELECT * FROM meta_ad_accounts WHERE id = ? AND config_id = ?', [accountId, configIdVal]);
        const [updatedAds] = await pool.query('SELECT * FROM meta_ads WHERE account_id = ?', [accountId]);

        return formatAccountDetailsResponse(updatedAccount, updatedAds);
    }

    return formatAccountDetailsResponse(account, ads);
};

// Reconstruct standard Facebook Graph API response format for account details
const formatAccountDetailsResponse = (account, ads) => {
    return {
        id: account.id,
        account_id: account.id.replace('act_', ''),
        name: account.name,
        account_status: account.account_status,
        amount_spent: account.amount_spent,
        balance: account.balance,
        created_time: account.created_time,
        ads: {
            data: ads.map(ad => {
                const parsed = typeof ad.raw_data === 'string' ? JSON.parse(ad.raw_data) : ad.raw_data;
                return {
                    ...parsed,
                    id: ad.id,
                    name: ad.name,
                    status: ad.status,
                    campaign_id: ad.campaign_id,
                    adset_id: ad.adset_id,
                    creative: ad.creative_id ? { id: ad.creative_id } : null,
                    owner_name: ad.owner_name || null,
                    launch_date: ad.launch_date || null,
                    owner_updated_at: ad.owner_updated_at || null
                };
            })
        }
    };
};

// Fetch Lead Form Data & Leads list from Facebook Graph API and cache in DB
const syncLeadFormData = async (formId, configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing lead form details for ${formId}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${formId}?fields=name,id,locale,status,leads_count,created_time,leads{created_time,id,field_data}&access_token=${token}`
        );

        const data = response.data;

        // Upsert Lead Form Info
        await pool.query(
            `INSERT INTO meta_lead_forms (id, name, status, leads_count, locale, created_time)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                status = VALUES(status),
                leads_count = VALUES(leads_count),
                locale = VALUES(locale),
                synced_at = CURRENT_TIMESTAMP`,
            [
                data.id,
                data.name,
                data.status,
                data.leads_count || 0,
                data.locale,
                data.created_time ? new Date(data.created_time) : null
            ]
        );

        // Cache Leads list
        if (data.leads && data.leads.data) {
            for (const lead of data.leads.data) {
                // Find contact fields in field_data
                const getField = (name) => {
                    const field = lead.field_data?.find(f => f.name === name || f.name === name.replace('_', ' ') || f.name === name.replace(' ', '_'));
                    return field?.values?.[0] || null;
                };

                await pool.query(
                    `INSERT INTO meta_leads (lead_id, form_id, created_time, full_name, email, phone, city, street_address, job_title, field_data)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        full_name = VALUES(full_name),
                        email = VALUES(email),
                        phone = VALUES(phone),
                        city = VALUES(city),
                        street_address = VALUES(street_address),
                        job_title = VALUES(job_title),
                        field_data = VALUES(field_data),
                        synced_at = CURRENT_TIMESTAMP`,
                    [
                        lead.id,
                        data.id,
                        lead.created_time ? new Date(lead.created_time) : null,
                        getField('full_name') || getField('full name') || getField('name') || 'N/A',
                        getField('email') || 'N/A',
                        getField('phone_number') || getField('phone number') || getField('phone') || getField('whatsapp_number') || 'N/A',
                        getField('city') || 'N/A',
                        getField('street_address') || 'N/A',
                        getField('job_title') || 'N/A',
                        JSON.stringify(lead.field_data || [])
                    ]
                );
            }
        }

        return data;
    } catch (error) {
        console.error(`Error syncing lead form ${formId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getLeadFormData = async (formId, forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    const [[form]] = await pool.query('SELECT *, synced_at FROM meta_lead_forms WHERE id = ?', [formId]);
    const [leads] = await pool.query('SELECT * FROM meta_leads WHERE form_id = ? ORDER BY created_time DESC', [formId]);

    if (!form || forceSync || isStale(form.synced_at)) {
        await syncLeadFormData(formId, configIdVal);

        const [[updatedForm]] = await pool.query('SELECT * FROM meta_lead_forms WHERE id = ?', [formId]);
        const [updatedLeads] = await pool.query('SELECT * FROM meta_leads WHERE form_id = ? ORDER BY created_time DESC', [formId]);

        return formatLeadFormResponse(updatedForm, updatedLeads);
    }

    return formatLeadFormResponse(form, leads);
};

// Reconstruct standard Facebook Graph API response format for lead forms
const formatLeadFormResponse = (form, leads) => {
    return {
        id: form.id,
        name: form.name,
        status: form.status,
        leads_count: form.leads_count,
        locale: form.locale,
        created_time: form.created_time,
        leads: {
            data: leads.map(l => ({
                id: l.lead_id,
                created_time: l.created_time,
                field_data: typeof l.field_data === 'string' ? JSON.parse(l.field_data) : l.field_data
            }))
        }
    };
};

// Fetch and cache specific Ad Creative spec
const syncCreativeData = async (creativeId, configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing creative details for ${creativeId}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${creativeId}?fields=id,name,title,body,image_url,video_id,object_story_spec,thumbnail_url,asset_feed_spec,url_tags,call_to_action&access_token=${token}`
        );

        const data = response.data;
        
        await pool.query(
            `INSERT INTO meta_creatives (id, raw_data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
                raw_data = VALUES(raw_data),
                synced_at = CURRENT_TIMESTAMP`,
            [creativeId, JSON.stringify(data)]
        );

        return data;
    } catch (error) {
        console.error(`Error syncing creative ${creativeId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getCreativeData = async (creativeId, forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    const [[creative]] = await pool.query('SELECT *, synced_at FROM meta_creatives WHERE id = ?', [creativeId]);

    if (!creative || forceSync || isStale(creative.synced_at)) {
        await syncCreativeData(creativeId, configIdVal);
        const [[updatedCreative]] = await pool.query('SELECT * FROM meta_creatives WHERE id = ?', [creativeId]);
        return typeof updatedCreative.raw_data === 'string' ? JSON.parse(updatedCreative.raw_data) : updatedCreative.raw_data;
    }

    return typeof creative.raw_data === 'string' ? JSON.parse(creative.raw_data) : creative.raw_data;
};

// Fetch and cache single ad insights (daily breakdown)
const syncSingleAdInsights = async (adId, configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing daily insights for Ad: ${adId}...`);
        const until = new Date().toISOString().split('T')[0];
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 30);
        const since = sinceDate.toISOString().split('T')[0];

        const url = `https://graph.facebook.com/v19.0/${adId}/insights?fields=ad_id,ad_name,campaign_name,adset_name,spend,impressions,reach,clicks,ctr,cpc,actions,cost_per_action_type&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${token}`;
        
        const response = await axios.get(url);
        const data = response.data.data || [];

        for (const day of data) {
            await pool.query(
                `INSERT INTO meta_ad_insights_trend (ad_id, date_start, spend, impressions, clicks, ctr, cpc, reach, actions)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    spend = VALUES(spend),
                    impressions = VALUES(impressions),
                    clicks = VALUES(clicks),
                    ctr = VALUES(ctr),
                    cpc = VALUES(cpc),
                    reach = VALUES(reach),
                    actions = VALUES(actions),
                    synced_at = CURRENT_TIMESTAMP`,
                [
                    adId,
                    day.date_start,
                    day.spend || 0,
                    day.impressions || 0,
                    day.clicks || 0,
                    day.ctr || 0,
                    day.cpc || 0,
                    day.reach || 0,
                    JSON.stringify(day.actions || [])
                ]
            );
        }

        return data;
    } catch (error) {
        console.error(`Error syncing daily insights for Ad ${adId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getSingleAdInsights = async (adId, forceSync = false, configId = null) => {
    const configIdVal = configId ? parseInt(configId) : 0;
    const [rows] = await pool.query(
        'SELECT * FROM meta_ad_insights_trend WHERE ad_id = ? ORDER BY date_start ASC',
        [adId]
    );

    if (rows.length === 0 || forceSync || rows.some(row => isStale(row.synced_at))) {
        await syncSingleAdInsights(adId, configIdVal);
        const [updatedRows] = await pool.query(
            'SELECT * FROM meta_ad_insights_trend WHERE ad_id = ? ORDER BY date_start ASC',
            [adId]
        );
        return formatSingleAdInsightsResponse(updatedRows);
    }

    return formatSingleAdInsightsResponse(rows);
};

const formatSingleAdInsightsResponse = (rows) => {
    return rows.map(r => ({
        date_start: r.date_start instanceof Date ? r.date_start.toISOString().split('T')[0] : r.date_start,
        spend: parseFloat(r.spend),
        impressions: parseInt(r.impressions),
        clicks: parseInt(r.clicks),
        ctr: parseFloat(r.ctr),
        cpc: parseFloat(r.cpc),
        reach: parseInt(r.reach),
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions
    }));
};

const getLeads = async () => {
    const [rows] = await pool.query('SELECT * FROM meta_leads ORDER BY synced_at DESC, created_time DESC');
    return rows.map(r => ({
        ...r,
        field_data: typeof r.field_data === 'string' ? JSON.parse(r.field_data) : r.field_data
    }));
};

const syncAdLeads = async (adId, configId = null) => {
    let token = process.env.META_ACCESS_TOKEN;
    const configIdVal = configId ? parseInt(configId) : 0;
    if (configIdVal > 0) {
        const [[config]] = await pool.query('SELECT access_token FROM meta_configs WHERE id = ?', [configIdVal]);
        if (config) token = config.access_token;
    }
    if (!token) throw new Error('Meta Access Token is missing.');

    try {
        console.log(`Syncing leads for Ad: ${adId}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${adId}/leads?fields=ad_id,ad_name,adset_id,adset_name,form_id,platform,field_data,created_time&limit=1000&access_token=${token}`
        );

        const data = response.data.data || [];
        console.log(`Successfully fetched ${data.length} leads for Ad ${adId} from Facebook API.`);

        for (const lead of data) {
            const getField = (name) => {
                const field = lead.field_data?.find(f => f.name === name || f.name === name.replace('_', ' ') || f.name === name.replace(' ', '_'));
                return field?.values?.[0] || null;
            };

            await pool.query(
                `INSERT INTO meta_leads (
                    lead_id, form_id, ad_id, ad_name, adset_id, adset_name, platform, 
                    created_time, full_name, email, phone, city, street_address, job_title, field_data
                )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    form_id = VALUES(form_id),
                    ad_name = VALUES(ad_name),
                    adset_id = VALUES(adset_id),
                    adset_name = VALUES(adset_name),
                    platform = VALUES(platform),
                    created_time = VALUES(created_time),
                    full_name = VALUES(full_name),
                    email = VALUES(email),
                    phone = VALUES(phone),
                    city = VALUES(city),
                    street_address = VALUES(street_address),
                    job_title = VALUES(job_title),
                    field_data = VALUES(field_data),
                    synced_at = CURRENT_TIMESTAMP`,
                [
                    lead.id,
                    lead.form_id || 'N/A',
                    lead.ad_id || adId,
                    lead.ad_name || 'N/A',
                    lead.adset_id || 'N/A',
                    lead.adset_name || 'N/A',
                    lead.platform || 'N/A',
                    lead.created_time ? new Date(lead.created_time) : null,
                    getField('full_name') || getField('full name') || getField('name') || 'N/A',
                    getField('email') || 'N/A',
                    getField('phone_number') || getField('phone number') || getField('phone') || getField('whatsapp_number') || 'N/A',
                    getField('city') || 'N/A',
                    getField('street_address') || 'N/A',
                    getField('job_title') || 'N/A',
                    JSON.stringify(lead.field_data || [])
                ]
            );
        }

        return data;
    } catch (error) {
        console.error(`Error syncing leads for Ad ${adId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

module.exports = {
    getAdAccounts,
    getAccountInsights,
    getAccountDetails,
    getLeadFormData,
    getCreativeData,
    getSingleAdInsights,
    getLeads,
    syncAdLeads
};
