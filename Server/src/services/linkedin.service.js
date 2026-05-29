const { pool } = require('../config/db');
const axios = require('axios');

// Get active access token from database (ID = 1)
const getAccessToken = async () => {
    const [[tokenRow]] = await pool.query('SELECT * FROM linkedin_api_tokens WHERE id = 1');
    if (!tokenRow) {
        throw new Error('No LinkedIn access token found in database. Please run OAuth flow or check server seeding.');
    }
    return tokenRow.access_token;
};

// Refresh access token using Client Secret and the stored refresh token
const refreshAccessToken = async () => {
    console.log('[LinkedIn Auth] Attempting to refresh access token...');
    const [[tokenRow]] = await pool.query('SELECT * FROM linkedin_api_tokens WHERE id = 1');
    if (!tokenRow || !tokenRow.refresh_token) {
        throw new Error('No refresh token available in database for LinkedIn.');
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET is missing in environment variables.');
    }

    try {
        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: tokenRow.refresh_token,
                client_id: clientId,
                client_secret: clientSecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, expires_in, refresh_token, refresh_token_expires_in } = response.data;

        await pool.query(
            `UPDATE linkedin_api_tokens
             SET access_token = ?, refresh_token = ?, expires_in = ?, refresh_token_expires_in = ?
             WHERE id = 1`,
            [
                access_token,
                refresh_token || tokenRow.refresh_token,
                expires_in,
                refresh_token_expires_in || tokenRow.refresh_token_expires_in
            ]
        );

        console.log('[LinkedIn Auth] Token refreshed successfully.');
        return access_token;
    } catch (error) {
        console.error('[LinkedIn Auth] Failed to refresh access token:', error.response?.data || error.message);
        throw new Error('Failed to refresh LinkedIn token: ' + (error.response?.data?.error_description || error.message));
    }
};

// Generic LinkedIn API GET requester with automatic token retry on 401
const callLinkedInAPI = async (url, params = {}, headers = {}) => {
    let token = await getAccessToken();
    
    const getHeaders = (tokenVal) => {
        const reqHeaders = {
            'Authorization': `Bearer ${tokenVal}`,
            'X-Restli-Protocol-Version': '2.0.0',
            ...headers
        };
        // Omit version header for legacy /v2/ endpoints
        if (!url.includes('/v2/')) {
            reqHeaders['LinkedIn-Version'] = '202605';
        }
        return reqHeaders;
    };

    const buildUrl = (baseUrl, queryParams) => {
        const queryParts = [];
        for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined && value !== null) {
                queryParts.push(`${key}=${value}`);
            }
        }
        return baseUrl + (queryParts.length ? '?' + queryParts.join('&') : '');
    };

    try {
        const response = await axios.get(buildUrl(url, params), {
            headers: getHeaders(token)
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('[LinkedIn API] 401 Unauthorized. Attempting token refresh...');
            try {
                token = await refreshAccessToken();
                // Retry request once with the new token
                const response = await axios.get(buildUrl(url, params), {
                    headers: getHeaders(token)
                });
                return response.data;
            } catch (refreshErr) {
                console.error('[LinkedIn API] Retry failed after refresh:', refreshErr.message);
                throw error;
            }
        }
        throw error;
    }
};

/**
 * Perform a full real-time database sync from LinkedIn.
 * If actual API calls fail (e.g. sandbox, permission limits, or invalid token),
 * we gracefully fall back to high-fidelity mock sync to keep UI operational.
 */
const syncLinkedInData = async (accountId = null) => {
    const startedAt = new Date();
    let logId = null;
    let recordsSynced = 0;
    const targetAccountId = accountId || 'li_acc_001';

    try {
        // 1. Create a Sync Log entry
        const [logResult] = await pool.query(
            `INSERT INTO linkedin_sync_logs (account_id, sync_type, status, records_synced)
             VALUES (?, 'MANUAL', 'RUNNING', 0)`,
            [targetAccountId]
        );
        logId = logResult.insertId;
        console.log(`[LinkedIn Sync] Log started (ID: ${logId}) for Account ID: ${targetAccountId}`);

        let rawAccounts = [];
        let apiSucceeded = false;
        let apiErrorMsg = null;

        // Try hitting the live LinkedIn API for Ad Accounts (using v2 API as verified by user)
        try {
            console.log('[LinkedIn Sync] Fetching live Ad Accounts from LinkedIn API (v2)...');
            const apiRes = await callLinkedInAPI('https://api.linkedin.com/v2/adAccountsV2', {
                q: 'search'
            });
            
            if (apiRes && apiRes.elements) {
                rawAccounts = apiRes.elements;
                apiSucceeded = true;
                console.log(`[LinkedIn Sync] Successfully retrieved ${rawAccounts.length} live accounts from v2 API.`);
            }
        } catch (apiError) {
            apiErrorMsg = apiError.response?.data ? JSON.stringify(apiError.response.data) : apiError.message;
            console.warn('[LinkedIn Sync] Live v2 API query failed:', apiErrorMsg);
            throw new Error(`LinkedIn Ads API Request Failed: ${apiErrorMsg}`);
        }

        if (!apiSucceeded || rawAccounts.length === 0) {
            throw new Error('No LinkedIn Ad Accounts returned by the API. Make sure your account is connected and has campaigns.');
        } else {
            console.log(`[LinkedIn Sync] Processing ${rawAccounts.length} real accounts from API...`);
            
            for (const acc of rawAccounts) {
                // In v2, ID might be formatted directly or as URN
                const numericId = String(acc.id).replace('urn:lia:adAccount:', '').replace('urn:li:sponsoredAccount:', '');
                
                // 1. Sync Ad Accounts
                await pool.query(
                    `INSERT INTO linkedin_ad_accounts (id, name, status, currency, total_spent)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), total_spent=VALUES(total_spent)`,
                    [numericId, acc.name, acc.status, acc.currency || 'USD', acc.totalSpent || 0.00]
                );

                await pool.query(
                    `INSERT INTO linkedin_accounts (id, name, status, currency, total_spent)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), total_spent=VALUES(total_spent)`,
                    [numericId, acc.name, acc.status, acc.currency || 'USD', acc.totalSpent || 0.00]
                );
                recordsSynced++;

                // 2. Sync Campaign Groups
                try {
                    console.log(`[LinkedIn Sync] Fetching Campaign Groups for account ${numericId}...`);
                    const groupsRes = await callLinkedInAPI('https://api.linkedin.com/v2/adCampaignGroupsV2', {
                        q: 'search',
                        search: `(account:(values:List(urn%3Ali%3AsponsoredAccount%3A${numericId})))`
                    });
                    
                    if (groupsRes && groupsRes.elements) {
                        for (const grp of groupsRes.elements) {
                            const grpId = grp.id || grp.reference;
                            const cleanGrpId = String(grpId).replace('urn:li:sponsoredCampaignGroup:', '');
                            await pool.query(
                                `INSERT INTO linkedin_campaign_groups (id, account_id, name, status)
                                 VALUES (?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)`,
                                [cleanGrpId, numericId, grp.name || 'Unnamed Group', grp.status || 'ACTIVE']
                            );
                            recordsSynced++;
                        }
                    }
                } catch (grpErr) {
                    console.warn(`[LinkedIn Sync] Failed to fetch Campaign Groups for ${numericId}:`, grpErr.response?.data ? JSON.stringify(grpErr.response.data) : grpErr.message);
                }

                // 3. Sync Campaigns
                let campaignIds = [];
                try {
                    console.log(`[LinkedIn Sync] Fetching Campaigns for account ${numericId}...`);
                    const campRes = await callLinkedInAPI('https://api.linkedin.com/v2/adCampaignsV2', {
                        q: 'search',
                        search: `(account:(values:List(urn%3Ali%3AsponsoredAccount%3A${numericId})))`
                    });
                    
                    if (campRes && campRes.elements) {
                        for (const camp of campRes.elements) {
                            const cleanCampId = String(camp.id).replace('urn:li:sponsoredCampaign:', '');
                            const cleanGrpId = String(camp.campaignGroup).replace('urn:li:sponsoredCampaignGroup:', '');
                            campaignIds.push(cleanCampId);
                            
                            await pool.query(
                                `INSERT INTO linkedin_campaigns (id, account_id, campaign_group_id, name, status, type, total_spent)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), total_spent=VALUES(total_spent), campaign_group_id=VALUES(campaign_group_id)`,
                                [cleanCampId, numericId, cleanGrpId, camp.name || 'Unnamed Campaign', camp.status || 'ACTIVE', camp.type || 'SPONSORED_UPDATES', 0.00]
                            );
                            recordsSynced++;
                        }
                    }
                } catch (campErr) {
                    console.warn(`[LinkedIn Sync] Failed to fetch Campaigns for ${numericId}:`, campErr.response?.data ? JSON.stringify(campErr.response.data) : campErr.message);
                }

                // 4. Sync Ads (Creatives)
                try {
                    console.log(`[LinkedIn Sync] Fetching Ads for account ${numericId}...`);
                    const adsRes = await callLinkedInAPI('https://api.linkedin.com/v2/adCreativesV2', {
                        q: 'search',
                        search: `(account:(values:List(urn%3Ali%3AsponsoredAccount%3A${numericId})))`
                    });
                    
                    if (adsRes && adsRes.elements) {
                        for (const ad of adsRes.elements) {
                            const cleanAdId = String(ad.id).replace('urn:lia:adCreative:', '').replace('urn:li:sponsoredCreative:', '');
                            const cleanCampId = String(ad.campaign).replace('urn:li:sponsoredCampaign:', '');
                            
                            await pool.query(
                                    `INSERT INTO linkedin_ads (id, campaign_id, name, status, type)
                                 VALUES (?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), type=VALUES(type)`,
                                [cleanAdId, cleanCampId, ad.name || `Creative ${cleanAdId}`, ad.status || 'ACTIVE', ad.type || 'SPONSORED_IMAGE']
                            );
                            recordsSynced++;
                        }
                    }
                } catch (adsErr) {
                    console.warn(`[LinkedIn Sync] Failed to fetch Ads for ${numericId}:`, adsErr.response?.data ? JSON.stringify(adsErr.response.data) : adsErr.message);
                }

                // 5. Sync Ad Analytics (Last 30 Days)
                try {
                    console.log(`[LinkedIn Sync] Fetching Analytics for account ${numericId}...`);
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - 30);
                    
                    const startStr = `(day:${startDate.getDate()},month:${startDate.getMonth() + 1},year:${startDate.getFullYear()})`;
                    const endStr = `(day:${endDate.getDate()},month:${endDate.getMonth() + 1},year:${endDate.getFullYear()})`;

                    const analyticsRes = await callLinkedInAPI('https://api.linkedin.com/v2/adAnalyticsV2', {
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
                            
                            const spend = row.costInLocalCurrency || 0;
                            const impressions = row.impressions || 0;
                            const clicks = row.clicks || 0;
                            const conversions = row.externalWebsiteConversions || 0;
                            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                            const cpc = clicks > 0 ? spend / clicks : 0;
                            const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                            const cleanCampId = String(row.pivotValue).replace('urn:li:sponsoredCampaign:', '');

                            await pool.query(
                                `INSERT INTO linkedin_ad_analytics_daily (ad_id, account_id, date_start, spend, impressions, clicks, conversions, ctr, cpc, cpm)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE spend=VALUES(spend), impressions=VALUES(impressions), clicks=VALUES(clicks), conversions=VALUES(conversions), ctr=VALUES(ctr), cpc=VALUES(cpc), cpm=VALUES(cpm)`,
                                [cleanCampId, numericId, dateStr, spend, impressions, clicks, conversions, ctr, cpc, cpm]
                            );
                            
                            await pool.query(
                                `INSERT INTO linkedin_insights_trend (account_id, date_start, spend, impressions, clicks, conversions, ctr, cpc, cpm)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE spend=VALUES(spend), impressions=VALUES(impressions), clicks=VALUES(clicks), conversions=VALUES(conversions), ctr=VALUES(ctr), cpc=VALUES(cpc), cpm=VALUES(cpm)`,
                                [numericId, dateStr, spend, impressions, clicks, conversions, ctr, cpc, cpm]
                            );
                            recordsSynced++;
                        }
                    }
                } catch (analyticsErr) {
                    console.warn(`[LinkedIn Sync] Failed to fetch Analytics for ${numericId}:`, analyticsErr.response?.data ? JSON.stringify(analyticsErr.response.data) : analyticsErr.message);
                }
            }
        }

        // Update log with success status
        await pool.query(
            `UPDATE linkedin_sync_logs
             SET status = 'SUCCESS', records_synced = ?, completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [recordsSynced, logId]
        );

        console.log(`[LinkedIn Sync] Sync successfully finished for log ID: ${logId}. Synced ${recordsSynced} records.`);
        return { success: true, recordsSynced, logId };

    } catch (error) {
        console.error(`[LinkedIn Sync] Synchronization failed:`, error.response?.data ? JSON.stringify(error.response.data) : error.message);
        if (logId) {
            await pool.query(
                `UPDATE linkedin_sync_logs
                 SET status = 'FAILED', error_message = ?, completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [error.message, logId]
            );
        }
        throw error;
    }
};

module.exports = {
    getAccessToken,
    refreshAccessToken,
    syncLinkedInData
};
