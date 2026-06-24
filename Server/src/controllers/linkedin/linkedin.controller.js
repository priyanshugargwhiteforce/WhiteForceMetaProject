const { pool } = require('../../config/db');
const axios = require('axios');
const { syncLinkedInData, callLinkedInWriteAPI, logLinkedInWriteAction } = require('../../services/linkedin.service');
const { validateCampaign } = require('../../validators/campaignValidator');
const { buildLinkedInCampaignPayload } = require('../../services/linkedinCampaignBuilder.service');

/**
 * GET connected LinkedIn Ad Accounts
 * Retrieves all synced ad accounts from the database.
 * If empty, triggers automatic background bootstrap sync to initialize data cleanly.
 */
exports.getLinkedInAccounts = async (req, res) => {
    try {
        console.log('[LinkedIn Controller] Fetching accounts from MySQL...');
        let [rows] = await pool.query('SELECT * FROM linkedin_accounts ORDER BY name ASC');

        if (rows.length === 0) {
            console.log('[LinkedIn Controller] No accounts found in DB. Triggering auto-bootstrap sync...');
            try {
                const syncResult = await syncLinkedInData();
                console.log(`[LinkedIn Controller] Auto-bootstrap sync completed. Synced ${syncResult.recordsSynced} records.`);
                [rows] = await pool.query('SELECT * FROM linkedin_accounts ORDER BY name ASC');
            } catch (syncErr) {
                console.error('[LinkedIn Controller] Auto-bootstrap sync failed:', syncErr.message);
            }
        }

        res.status(200).json({
            success: true,
            adaccounts: { data: rows }
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInAccounts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn ad accounts' });
    }
};

/**
 * GET Campaigns for a selected LinkedIn Ad Account
 */
exports.getLinkedInCampaigns = async (req, res) => {
    const { accountId } = req.params;
    try {
        console.log(`[LinkedIn Controller] Fetching campaigns for Account ID: ${accountId}...`);
        const [rows] = await pool.query(
            `SELECT c.*, cg.name as campaign_group_name 
             FROM linkedin_campaigns c
             LEFT JOIN linkedin_campaign_groups cg ON c.campaign_group_id = cg.id
             WHERE c.account_id = ? 
             ORDER BY c.name ASC`,
            [accountId]
        );
        
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInCampaigns:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn campaigns' });
    }
};

/**
 * GET Campaign Groups for a selected LinkedIn Ad Account
 */
exports.getLinkedInCampaignGroups = async (req, res) => {
    const { accountId } = req.params;
    try {
        console.log(`[LinkedIn Controller] Fetching campaign groups for Account ID: ${accountId}...`);
        const [rows] = await pool.query('SELECT * FROM linkedin_campaign_groups WHERE account_id = ? ORDER BY name ASC', [accountId]);
        
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInCampaignGroups:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn campaign groups' });
    }
};

/**
 * GET LinkedIn Daily insights trend for an account
 */
exports.getLinkedInInsights = async (req, res) => {
    const { accountId } = req.params;
    try {
        console.log(`[LinkedIn Controller] Fetching daily performance insights for Account ID: ${accountId}...`);
        const [rows] = await pool.query(
            'SELECT * FROM linkedin_insights_trend WHERE account_id = ? ORDER BY date_start DESC',
            [accountId]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInInsights:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn insights' });
    }
};

/**
 * POST Force sync LinkedIn Ads data
 */
exports.syncLinkedInData = async (req, res) => {
    const { accountId } = req.body;
    try {
        console.log(`[LinkedIn Controller] Initiating live API sync request for Account ID: ${accountId || 'all'}`);
        const result = await syncLinkedInData(accountId);
        
        res.status(200).json({
            success: true,
            message: `LinkedIn Marketing API data sync completed successfully! Synced ${result.recordsSynced} performance records into MySQL.`,
            data: result
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Force sync failed:', error);
        res.status(500).json({ success: false, message: 'LinkedIn Ads API Sync failed: ' + error.message });
    }
};

/**
 * GET Initiate LinkedIn OAuth login
 * Public endpoint to redirect browser to LinkedIn authorization URL
 */
exports.initiateOAuth = (req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
        return res.status(500).json({ 
            success: false, 
            message: 'LinkedIn client credentials (ID or Redirect URI) are not configured in Server/.env' 
        });
    }

    const scope = 'r_ads r_ads_reporting rw_ads';
    const state = 'linkedin_oauth_state_' + Math.random().toString(36).substring(2);
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    console.log('[LinkedIn OAuth] Redirecting user to LinkedIn authorization login page...');
    res.redirect(authUrl);
};

/**
 * GET Handle LinkedIn OAuth callback
 * Receives redirect from LinkedIn, processes the authorization code, exchanges it
 * for active access token, seeds/updates the token vault, and redirects back to dashboard.
 */
exports.handleOAuthCallback = async (req, res) => {
    const { code, error, error_description } = req.query;

    if (error) {
        console.error('[LinkedIn OAuth] User rejected or error occurred:', error_description);
        return res.status(400).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
                <h1 style="color: #e11d48;">LinkedIn Authentication Cancelled</h1>
                <p style="color: #64748b;">${error_description || 'Authentication failed.'}</p>
                <a href="http://localhost:5173/linkedin" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Return to Dashboard</a>
            </div>
        `);
    }

    if (!code) {
        return res.status(400).json({ success: false, message: 'Authorization code is missing.' });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    try {
        console.log('[LinkedIn OAuth] Exchanging authorization code for active access tokens...');
        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, expires_in, refresh_token, refresh_token_expires_in } = response.data;
        
        console.log('[LinkedIn OAuth] Exchanged tokens successfully. Saving into database...');
        await pool.query(
            `INSERT INTO linkedin_api_tokens (id, access_token, refresh_token, expires_in, refresh_token_expires_in)
             VALUES (1, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                access_token = VALUES(access_token),
                refresh_token = VALUES(refresh_token),
                expires_in = VALUES(expires_in),
                refresh_token_expires_in = VALUES(refresh_token_expires_in),
                updated_at = CURRENT_TIMESTAMP`,
            [
                access_token,
                refresh_token || null,
                expires_in || 5184000,
                refresh_token_expires_in || 31536000
            ]
        );

        // Bootstrap a quick background sync to populate fresh data for the newly authenticated accounts
        try {
            console.log('[LinkedIn OAuth] Bootstrapping background campaign sync...');
            syncLinkedInData().catch(syncErr => {
                console.error('[LinkedIn OAuth] Auto-sync failed in background, but token is saved:', syncErr.message);
            });
        } catch (syncErr) {
            console.error('[LinkedIn OAuth] Auto-sync failed, but token is saved:', syncErr.message);
        }

        // Redirect user back to Vite frontend client
        res.redirect('http://localhost:5173/linkedin-manager');
    } catch (error) {
        console.error('[LinkedIn OAuth] Code exchange failed:', error.response?.data || error.message);
        res.status(500).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
                <h1 style="color: #dc2626;">LinkedIn Token Exchange Failed</h1>
                <p style="color: #64748b;">${error.response?.data?.error_description || error.message}</p>
                <a href="http://localhost:5173/linkedin-manager" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Return to Dashboard</a>
            </div>
        `);
    }
};

/**
 * GET LinkedIn Leads for an account
 */
exports.getLinkedInLeads = async (req, res) => {
    const { accountId } = req.params;
    try {
        console.log(`[LinkedIn Controller] Fetching leads for Account ID: ${accountId}...`);
        const [rows] = await pool.query(
            `SELECT l.*, ad.name as ad_name, c.name as campaign_name 
             FROM linkedin_leads l
             INNER JOIN linkedin_ads ad ON l.ad_id = ad.id
             INNER JOIN linkedin_campaigns c ON ad.campaign_id = c.id
             WHERE c.account_id = ?
             ORDER BY l.submitted_at DESC`,
            [accountId]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInLeads:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn leads' });
    }
};

/**
 * GET LinkedIn Audience Demographics for an account
 */
exports.getLinkedInAudience = async (req, res) => {
    const { accountId } = req.params;
    try {
        console.log(`[LinkedIn Controller] Fetching demographics for Account ID: ${accountId}...`);
        const [rows] = await pool.query(
            `SELECT category, key_name, percentage 
             FROM linkedin_audience_insights 
             WHERE account_id = ? 
             ORDER BY category, percentage DESC`,
            [accountId]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInAudience:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch LinkedIn audience insights' });
    }
};

/**
 * GET check write readiness status
 */
exports.checkWriteReadiness = async (req, res) => {
    try {
        const readinessReport = {
            tokenExists: false,
            tokenExpired: false,
            refreshTokenExpired: false,
            linkedinApiReachable: false,
            oauthScopesConfigured: ["r_ads", "r_ads_reporting", "rw_ads"],
            rwAdsScopeConfigured: true,
            dbReady: false,
            writeTablesReady: false,
            missingItems: []
        };

        // 1. Check if token exists in DB
        let tokenRow = null;
        try {
            const [[row]] = await pool.query('SELECT * FROM linkedin_api_tokens WHERE id = 1');
            tokenRow = row;
        } catch (dbErr) {
            console.error('[Readiness check] Token DB query failed:', dbErr.message);
            readinessReport.missingItems.push(`Token database query failed: ${dbErr.message}`);
        }

        if (tokenRow && tokenRow.access_token) {
            readinessReport.tokenExists = true;

            // Check token expiration
            const nowMs = Date.now();
            if (tokenRow.expires_in && tokenRow.updated_at) {
                const tokenExpiryMs = new Date(tokenRow.updated_at).getTime() + (tokenRow.expires_in * 1000);
                if (tokenExpiryMs < nowMs) {
                    readinessReport.tokenExpired = true;
                    readinessReport.missingItems.push('Access token is expired.');
                }
            }

            // Check refresh token expiration
            if (tokenRow.refresh_token_expires_in && tokenRow.updated_at) {
                const refreshExpiryMs = new Date(tokenRow.updated_at).getTime() + (tokenRow.refresh_token_expires_in * 1000);
                if (refreshExpiryMs < nowMs) {
                    readinessReport.refreshTokenExpired = true;
                    readinessReport.missingItems.push('Refresh token is expired.');
                }
            }
        } else {
            readinessReport.missingItems.push('No access token seeded in the database (linkedin_api_tokens).');
        }

        // 2. Check if LinkedIn API is reachable by calling adAccounts API
        if (readinessReport.tokenExists && !readinessReport.tokenExpired) {
            try {
                // Import the existing callLinkedInAPI dynamically
                const { callLinkedInAPI } = require('../../services/linkedin.service');
                // Ad accounts endpoint with search query to verify token validity
                const apiRes = await callLinkedInAPI('https://api.linkedin.com/v2/adAccountsV2', {
                    q: 'search'
                });
                if (apiRes && apiRes.elements) {
                    readinessReport.linkedinApiReachable = true;
                } else {
                    readinessReport.missingItems.push('Ad Accounts endpoint returned invalid structure.');
                }
            } catch (apiErr) {
                console.error('[Readiness check] API test call failed:', apiErr.response?.data || apiErr.message);
                const errMsg = apiErr.response?.data?.message || apiErr.message;
                readinessReport.missingItems.push(`LinkedIn Ads API unreachable: ${errMsg}`);
            }
        } else {
            readinessReport.missingItems.push('Skipped API reachability test due to missing/expired access token.');
        }

        // 3. Verify Database Campaigns columns availability
        let dbOk = true;
        try {
            const [columns] = await pool.query('SHOW COLUMNS FROM linkedin_campaigns');
            const colNames = columns.map(c => c.Field);
            const expectedCols = [
                'daily_budget',
                'lifetime_budget',
                'start_time',
                'end_time',
                'unit_cost',
                'cost_type',
                'targeting_criteria',
                'creation_status',
                'linkedin_raw_response'
            ];
            const missingCols = expectedCols.filter(col => !colNames.includes(col));
            if (missingCols.length === 0) {
                readinessReport.dbReady = true;
            } else {
                dbOk = false;
                readinessReport.missingItems.push(`Missing columns in linkedin_campaigns: ${missingCols.join(', ')}`);
            }
        } catch (dbErr) {
            dbOk = false;
            console.error('[Readiness check] Campaigns columns verify failed:', dbErr.message);
            readinessReport.missingItems.push(`Failed to verify columns of linkedin_campaigns: ${dbErr.message}`);
        }

        // 4. Verify Database tables linkedin_assets and linkedin_write_logs exist
        let tablesOk = true;
        try {
            const [tables] = await pool.query("SHOW TABLES LIKE 'linkedin_assets'");
            if (tables.length === 0) {
                tablesOk = false;
                readinessReport.missingItems.push('Missing database table: linkedin_assets');
            }
        } catch (dbErr) {
            tablesOk = false;
            console.error('[Readiness check] Assets table check failed:', dbErr.message);
            readinessReport.missingItems.push(`Failed to check linkedin_assets table: ${dbErr.message}`);
        }

        try {
            const [tables] = await pool.query("SHOW TABLES LIKE 'linkedin_write_logs'");
            if (tables.length === 0) {
                tablesOk = false;
                readinessReport.missingItems.push('Missing database table: linkedin_write_logs');
            }
        } catch (dbErr) {
            tablesOk = false;
            console.error('[Readiness check] Write logs table check failed:', dbErr.message);
            readinessReport.missingItems.push(`Failed to check linkedin_write_logs table: ${dbErr.message}`);
        }

        if (tablesOk) {
            readinessReport.writeTablesReady = true;
        }

        res.status(200).json({
            success: true,
            data: readinessReport
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in checkWriteReadiness:', error);
        res.status(500).json({ success: false, message: 'Failed to verify write readiness: ' + error.message });
    }
};

/**
 * Normalized LinkedIn error mapper utility
 */
const mapLinkedInError = (errObj) => {
    const status = errObj.status || 500;
    const errorData = errObj.error || {};
    
    let message = errorData.message || 'An error occurred during the LinkedIn API call.';
    let code = errorData.code || 'UNKNOWN_ERROR';
    let linkedinError = JSON.stringify(errorData);
    let retryable = false;

    if (status === 429 || status === 500 || status === 503) {
        retryable = true;
    }

    if (status === 401) {
        code = 'UNAUTHORIZED';
        message = 'Authentication failed. Please re-connect your LinkedIn account.';
    } else if (status === 403) {
        code = 'FORBIDDEN';
        message = 'Access denied. Please check your developer application permissions.';
    } else if (status === 404) {
        code = 'NOT_FOUND';
        message = 'The requested resource was not found.';
    } else if (status === 409) {
        code = 'CONFLICT';
        message = 'Conflict occurred. The resource might already exist.';
    } else if (status === 422) {
        code = 'UNPROCESSABLE_ENTITY';
        message = 'Validation failed. The request contains invalid parameters.';
    }

    return {
        success: false,
        code,
        message,
        linkedinError,
        retryable
    };
};

/**
 * POST /api/linkedin/campaign-groups/manage/create
 * Creates a new campaign group on LinkedIn and stores it in the local DB.
 */
exports.createLinkedInCampaignGroup = async (req, res) => {
    const { accountId, name, status = 'ACTIVE', runSchedule } = req.body;
    const startTime = Date.now();

    try {
        // 1. Validations
        if (!accountId) {
            return res.status(400).json({ success: false, message: 'accountId is required' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');

        // Verify account exists in local DB
        const [accRows] = await pool.query('SELECT * FROM linkedin_accounts WHERE id = ?', [cleanAccountId]);
        if (accRows.length === 0) {
            return res.status(400).json({ success: false, message: `Account ID ${cleanAccountId} is not registered or connected` });
        }

        // Validate schedule dates
        let startTimestamp = null;
        let endTimestamp = null;
        if (runSchedule) {
            if (runSchedule.start) {
                startTimestamp = new Date(runSchedule.start);
                if (isNaN(startTimestamp.getTime())) {
                    return res.status(400).json({ success: false, message: 'Invalid start date format' });
                }
            }
            if (runSchedule.end) {
                endTimestamp = new Date(runSchedule.end);
                if (isNaN(endTimestamp.getTime())) {
                    return res.status(400).json({ success: false, message: 'Invalid end date format' });
                }
            }
            if (startTimestamp && endTimestamp && startTimestamp.getTime() >= endTimestamp.getTime()) {
                return res.status(400).json({ success: false, message: 'Start date must be strictly before end date' });
            }
        }

        // 2. Idempotency Check
        const [existingGroups] = await pool.query(
            'SELECT * FROM linkedin_campaign_groups WHERE name = ? AND account_id = ?',
            [name.trim(), cleanAccountId]
        );
        if (existingGroups.length > 0) {
            console.log(`[Idempotency Bypass] Campaign group with name "${name}" already exists for account ${cleanAccountId}.`);
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_GROUP_IDEMPOTENT',
                req.body,
                existingGroups[0],
                'SUCCESS',
                null,
                Date.now() - startTime,
                existingGroups[0].id
            );
            return res.status(200).json({
                success: true,
                message: 'Campaign group already exists (Idempotent bypass).',
                data: existingGroups[0]
            });
        }

        // 3. Compile LinkedIn request payload
        const targetUrn = `urn:li:sponsoredAccount:${cleanAccountId}`;
        const payload = {
            account: targetUrn,
            name: name.trim(),
            status: status.toUpperCase()
        };

        if (runSchedule) {
            payload.runSchedule = {};
            if (runSchedule.start) {
                payload.runSchedule.start = new Date(runSchedule.start).getTime();
            }
            if (runSchedule.end) {
                payload.runSchedule.end = new Date(runSchedule.end).getTime();
            }
        }

        // 4. Call LinkedIn API (outside transaction to avoid blocking connection)
        console.log(`[LinkedIn Campaign Group Create] Forwarding request to API for account ${cleanAccountId}...`);
        const url = 'https://api.linkedin.com/v2/adCampaignGroupsV2';
        
        const apiRes = await callLinkedInWriteAPI('POST', url, payload);
        const executionTime = Date.now() - startTime;

        if (!apiRes.success) {
            const errorReport = mapLinkedInError(apiRes);
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_GROUP_FAILED',
                req.body,
                apiRes.error,
                'FAILED',
                errorReport.message,
                executionTime
            );
            return res.status(apiRes.status || 400).json(errorReport);
        }

        // 5. Extract group numeric ID
        let groupUrn = apiRes.headers?.['x-restli-id'] || apiRes.data?.id;
        if (!groupUrn && apiRes.headers?.['location']) {
            const parts = apiRes.headers['location'].split('/');
            groupUrn = parts[parts.length - 1];
        }

        if (!groupUrn) {
            console.warn('[LinkedIn Sync] Success but URN not found. Generating fallback URN.');
            groupUrn = 'urn:li:sponsoredCampaignGroup:temp_' + Date.now();
        }

        const cleanGroupId = String(groupUrn).replace('urn:li:sponsoredCampaignGroup:', '');

        // 6. DB Update inside transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            await connection.query(
                `INSERT INTO linkedin_campaign_groups (id, account_id, name, status, creation_source, linkedin_raw_response, run_schedule_start, run_schedule_end, synced_at)
                 VALUES (?, ?, ?, ?, 'WEB_APPLICATION', ?, ?, ?, CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    status = VALUES(status), 
                    linkedin_raw_response = VALUES(linkedin_raw_response),
                    run_schedule_start = VALUES(run_schedule_start),
                    run_schedule_end = VALUES(run_schedule_end),
                    synced_at = CURRENT_TIMESTAMP`,
                [
                    cleanGroupId,
                    cleanAccountId,
                    name.trim(),
                    status.toUpperCase(),
                    JSON.stringify(apiRes.data || { createdGroupId: cleanGroupId }),
                    startTimestamp,
                    endTimestamp
                ]
            );

            await connection.commit();
            
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_GROUP',
                req.body,
                apiRes.data || { createdGroupId: cleanGroupId },
                'SUCCESS',
                null,
                executionTime,
                cleanGroupId
            );

            res.status(201).json({
                success: true,
                message: 'Campaign group created successfully.',
                data: {
                    id: cleanGroupId,
                    accountId: cleanAccountId,
                    name: name.trim(),
                    status: status.toUpperCase(),
                    run_schedule_start: startTimestamp,
                    run_schedule_end: endTimestamp,
                    creation_source: 'WEB_APPLICATION'
                }
            });
        } catch (dbErr) {
            await connection.rollback();
            console.error('[LinkedIn Controller] DB write transaction failed:', dbErr.message);
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_GROUP_DB_FAILED',
                req.body,
                apiRes.data || { createdGroupId: cleanGroupId },
                'FAILED',
                dbErr.message,
                executionTime,
                cleanGroupId
            );
            res.status(500).json({ success: false, message: 'Database transaction failed: ' + dbErr.message });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('[LinkedIn Controller] Error in createLinkedInCampaignGroup:', error);
        res.status(500).json({ success: false, message: 'Failed to create campaign group: ' + error.message });
    }
};

/**
 * GET /api/linkedin/campaign-groups/manage/:accountId
 * Returns all campaign groups, their campaign counts and details. Sorted newest first.
 */
exports.getLinkedInCampaignGroupsManage = async (req, res) => {
    const { accountId } = req.params;
    try {
        const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');
        console.log(`[LinkedIn Controller] Fetching campaign groups management for Account ID: ${cleanAccountId}...`);

        const [rows] = await pool.query(
            `SELECT 
                cg.id,
                cg.account_id,
                cg.name,
                cg.status,
                cg.creation_source,
                cg.created_at,
                cg.synced_at,
                COUNT(c.id) AS campaign_count
             FROM linkedin_campaign_groups cg
             LEFT JOIN linkedin_campaigns c ON cg.id = c.campaign_group_id
             WHERE cg.account_id = ?
             GROUP BY cg.id
             ORDER BY cg.created_at DESC`,
            [cleanAccountId]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[LinkedIn Controller] Error in getLinkedInCampaignGroupsManage:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve campaign groups: ' + error.message });
    }
};

/**
 * Shared logic helper to pause/resume campaigns
 */
const updateLinkedInCampaignStatus = async (req, res, targetStatus) => {
    const { id } = req.params;
    const { accountId } = req.body;
    const startTime = Date.now();

    try {
        // 1. Validations
        if (!accountId) {
            return res.status(400).json({ success: false, message: 'accountId is required in request body' });
        }
        if (!id) {
            return res.status(400).json({ success: false, message: 'campaign id is required in path' });
        }

        const cleanCampaignId = String(id).replace('urn:li:sponsoredCampaign:', '');
        const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');

        // Fetch campaign from DB
        const [campRows] = await pool.query('SELECT * FROM linkedin_campaigns WHERE id = ?', [cleanCampaignId]);
        if (campRows.length === 0) {
            return res.status(404).json({ success: false, message: `Campaign ${cleanCampaignId} not found in database` });
        }

        const campaign = campRows[0];
        
        // Verify ownership
        if (String(campaign.account_id) !== cleanAccountId) {
            return res.status(400).json({ success: false, message: `Campaign ${cleanCampaignId} does not belong to Account ${cleanAccountId}` });
        }

        // Check if already in target status
        const currentStatus = String(campaign.status).toUpperCase();
        if (targetStatus === 'PAUSED' && currentStatus === 'PAUSED') {
            return res.status(200).json({
                success: true,
                message: 'Campaign is already paused (Idempotent bypass).',
                data: campaign
            });
        }
        if (targetStatus === 'ACTIVE' && (currentStatus === 'ACTIVE' || currentStatus === 'RUNNING')) {
            return res.status(200).json({
                success: true,
                message: 'Campaign is already active/running (Idempotent bypass).',
                data: campaign
            });
        }

        // 1.5. Safety Mutability Validation
        const isOldOrFinalStatus = ['COMPLETED', 'ARCHIVED', 'CANCELED', 'ENDED'].includes(currentStatus);
        
        let isPastStart = false;
        if (campaign.start_time) {
            isPastStart = new Date(campaign.start_time).getTime() < Date.now();
            if (isPastStart && ['ACTIVE', 'RUNNING'].includes(currentStatus)) {
                // Allow pausing currently active/running campaigns even if start time is in the past
                isPastStart = false;
            }
        } else if (campaign.creation_status === 'SYNCED' && ['DRAFT', 'PAUSED'].includes(currentStatus)) {
            // Synced draft or paused campaigns without a future start_time in DB are treated as having past start dates
            isPastStart = true;
        }

        if (isOldOrFinalStatus || isPastStart) {
            const executionTime = Date.now() - startTime;
            await logLinkedInWriteAction(
                cleanAccountId,
                `CAMPAIGN_${targetStatus}_BLOCKED`,
                req.body,
                null,
                'BLOCKED_VALIDATION',
                `This campaign cannot be updated because its start date is in the past or LinkedIn does not allow updates on this campaign. Please use an active/future campaign or create a new campaign.`,
                executionTime,
                campaign.campaign_group_id,
                cleanCampaignId
            );

            return res.status(400).json({
                success: false,
                code: "CAMPAIGN_NOT_MUTABLE",
                message: "This campaign cannot be updated because its start date is in the past or LinkedIn does not allow updates on this campaign. Please use an active/future campaign or create a new campaign.",
                retryable: false
            });
        }

        // 2. LinkedIn API Call (outside transaction)
        console.log(`[LinkedIn Campaign Status Update] Sending PARTIAL_UPDATE to set status = ${targetStatus} for Campaign ${cleanCampaignId}...`);
        const url = `https://api.linkedin.com/v2/adCampaignsV2/${cleanCampaignId}`;
        const headers = {
            'X-RestLi-Method': 'PARTIAL_UPDATE'
        };
        const patchBody = {
            patch: {
                '$set': {
                    status: targetStatus
                }
            }
        };

        const apiRes = await callLinkedInWriteAPI('POST', url, patchBody, {}, headers);
        const executionTime = Date.now() - startTime;

        if (!apiRes.success) {
            const errorReport = mapLinkedInError(apiRes);
            await logLinkedInWriteAction(
                cleanAccountId,
                `CAMPAIGN_${targetStatus}_FAILED`,
                req.body,
                apiRes.error,
                'FAILED',
                errorReport.message,
                executionTime,
                campaign.campaign_group_id,
                cleanCampaignId
            );
            return res.status(apiRes.status || 400).json(errorReport);
        }

        // 3. Update DB (Transaction block)
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            await connection.query(
                `UPDATE linkedin_campaigns 
                 SET status = ?, last_synced_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [targetStatus === 'ACTIVE' ? 'RUNNING' : 'PAUSED', cleanCampaignId]
            );

            await connection.commit();

            await logLinkedInWriteAction(
                cleanAccountId,
                `CAMPAIGN_${targetStatus}`,
                req.body,
                apiRes.data || { status: targetStatus },
                'SUCCESS',
                null,
                executionTime,
                campaign.campaign_group_id,
                cleanCampaignId
            );

            res.status(200).json({
                success: true,
                message: `Campaign status updated to ${targetStatus} successfully.`,
                data: {
                    id: cleanCampaignId,
                    accountId: cleanAccountId,
                    status: targetStatus === 'ACTIVE' ? 'RUNNING' : 'PAUSED'
                }
            });
        } catch (dbErr) {
            await connection.rollback();
            console.error('[LinkedIn Controller] DB Campaign Status Update Transaction failed:', dbErr.message);
            await logLinkedInWriteAction(
                cleanAccountId,
                `CAMPAIGN_${targetStatus}_DB_FAILED`,
                req.body,
                apiRes.data || { status: targetStatus },
                'FAILED',
                dbErr.message,
                executionTime,
                campaign.campaign_group_id,
                cleanCampaignId
            );
            res.status(500).json({ success: false, message: 'Database status update transaction failed: ' + dbErr.message });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(`[LinkedIn Controller] Error in Campaign status update to ${targetStatus}:`, error);
        res.status(500).json({ success: false, message: `Failed to update campaign status to ${targetStatus}: ` + error.message });
    }
};

/**
 * PUT /api/linkedin/campaigns/manage/:id/pause
 * Pauses a campaign on LinkedIn and updates local DB status.
 */
exports.pauseLinkedInCampaign = async (req, res) => {
    return await updateLinkedInCampaignStatus(req, res, 'PAUSED');
};

/**
 * PUT /api/linkedin/campaigns/manage/:id/resume
 * Resumes a campaign on LinkedIn and updates local DB status.
 */
exports.resumeLinkedInCampaign = async (req, res) => {
    return await updateLinkedInCampaignStatus(req, res, 'ACTIVE');
};

/**
 * POST /api/linkedin/campaigns/manage/draft
 * Upserts a local campaign draft. Never calls LinkedIn API.
 */
exports.saveLinkedInCampaignDraft = async (req, res) => {
    const startTime = Date.now();
    const {
        draftId,
        accountId,
        campaignGroupId,
        campaignName,
        objective,
        language,
        dailyBudget,
        lifetimeBudget,
        bidStrategy,
        optimizationGoal,
        costType,
        timezone,
        startTime: startTimeStr,
        endTime: endTimeStr,
        targeting,
        status = 'DRAFT'
    } = req.body;

    try {
        // Run draft validation
        const valErrors = validateCampaign(req.body, false);
        if (valErrors.length > 0) {
            const executionTime = Date.now() - startTime;
            const cleanAccountId = accountId ? String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '') : null;
            const cleanGroupId = campaignGroupId ? String(campaignGroupId).replace('urn:li:sponsoredCampaignGroup:', '') : null;
            
            await logLinkedInWriteAction(
                cleanAccountId,
                'SAVE_DRAFT_VALIDATION_FAILED',
                req.body,
                { validationErrors: valErrors },
                'VALIDATION_FAILED',
                'Draft validation failed',
                executionTime,
                cleanGroupId
            );

            return res.status(400).json({
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Please fix validation errors.',
                validationErrors: valErrors
            });
        }

        const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');
        const cleanCampaignGroupId = String(campaignGroupId).replace('urn:li:sponsoredCampaignGroup:', '');

        const startTimeDate = startTimeStr ? new Date(startTimeStr) : null;
        const endTimeDate = endTimeStr ? new Date(endTimeStr) : null;

        let campaignId = draftId;
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            if (campaignId) {
                // Check if draft exists
                const [existing] = await connection.query('SELECT id FROM linkedin_campaigns WHERE id = ?', [campaignId]);
                if (existing.length > 0) {
                    // UPDATE
                    await connection.query(
                        `UPDATE linkedin_campaigns 
                         SET account_id = ?, campaign_group_id = ?, name = ?, status = ?, 
                             objective = ?, language = ?, bid_strategy = ?, optimization_goal = ?, cost_type = ?, 
                             timezone = ?, daily_budget = ?, lifetime_budget = ?, start_time = ?, end_time = ?, 
                             draft_data = ?, creation_source = 'LOCAL_DRAFT', last_synced_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [
                            cleanAccountId, cleanCampaignGroupId, campaignName.trim(), status,
                            objective || null, language || null, bidStrategy || null, optimizationGoal || null, costType || null,
                            timezone || null, dailyBudget || null, lifetimeBudget || null, startTimeDate, endTimeDate,
                            JSON.stringify(req.body), campaignId
                        ]
                    );
                } else {
                    // INSERT with custom draftId
                    await connection.query(
                        `INSERT INTO linkedin_campaigns 
                         (id, account_id, campaign_group_id, name, status, type, total_spent, 
                          objective, language, bid_strategy, optimization_goal, cost_type, 
                          timezone, daily_budget, lifetime_budget, start_time, end_time, 
                          draft_data, creation_source)
                         VALUES (?, ?, ?, ?, ?, 'SPONSORED_UPDATES', 0.00, 
                                 ?, ?, ?, ?, ?, 
                                 ?, ?, ?, ?, ?, 
                                 ?, 'LOCAL_DRAFT')`,
                        [
                            campaignId, cleanAccountId, cleanCampaignGroupId, campaignName.trim(), status,
                            objective || null, language || null, bidStrategy || null, optimizationGoal || null, costType || null,
                            timezone || null, dailyBudget || null, lifetimeBudget || null, startTimeDate, endTimeDate,
                            JSON.stringify(req.body)
                        ]
                    );
                }
            } else {
                // INSERT brand new draft
                campaignId = 'temp_' + Date.now();
                await connection.query(
                    `INSERT INTO linkedin_campaigns 
                     (id, account_id, campaign_group_id, name, status, type, total_spent, 
                      objective, language, bid_strategy, optimization_goal, cost_type, 
                      timezone, daily_budget, lifetime_budget, start_time, end_time, 
                      draft_data, creation_source)
                     VALUES (?, ?, ?, ?, ?, 'SPONSORED_UPDATES', 0.00, 
                             ?, ?, ?, ?, ?, 
                             ?, ?, ?, ?, ?, 
                             ?, 'LOCAL_DRAFT')`,
                    [
                        campaignId, cleanAccountId, cleanCampaignGroupId, campaignName.trim(), status,
                        objective || null, language || null, bidStrategy || null, optimizationGoal || null, costType || null,
                        timezone || null, dailyBudget || null, lifetimeBudget || null, startTimeDate, endTimeDate,
                        JSON.stringify(req.body)
                    ]
                );
            }

            await connection.commit();

            const executionTime = Date.now() - startTime;
            await logLinkedInWriteAction(
                cleanAccountId,
                'SAVE_DRAFT',
                req.body,
                { campaignId },
                'SUCCESS',
                null,
                executionTime,
                cleanCampaignGroupId,
                campaignId
            );

            res.status(200).json({
                success: true,
                message: 'Campaign draft saved successfully.',
                data: {
                    draftId: campaignId,
                    accountId: cleanAccountId,
                    campaignGroupId: cleanCampaignGroupId,
                    campaignName: campaignName.trim(),
                    status,
                    creation_source: 'LOCAL_DRAFT'
                }
            });
        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('[LinkedIn Controller] Error in saveLinkedInCampaignDraft:', error);
        res.status(500).json({ success: false, message: 'Failed to save campaign draft: ' + error.message });
    }
};

/**
 * POST /api/linkedin/campaigns/manage/create
 * Validates, checks duplication, calls LinkedIn API, and inserts published campaign.
 */
exports.createLinkedInCampaign = async (req, res) => {
    const startTime = Date.now();
    const {
        draftId,
        accountId,
        campaignGroupId,
        campaignName,
        objective,
        language,
        dailyBudget,
        lifetimeBudget,
        bidStrategy,
        optimizationGoal,
        costType,
        timezone,
        startTime: startTimeStr,
        endTime: endTimeStr,
        targeting,
        status = 'ACTIVE'
    } = req.body;

    try {
        // Run full publish validation
        const valErrors = validateCampaign(req.body, true);
        
        const cleanAccountId = accountId ? String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '') : null;
        const cleanCampaignGroupId = campaignGroupId ? String(campaignGroupId).replace('urn:li:sponsoredCampaignGroup:', '') : null;

        // Duplicate Check Query for idempotency
        if (cleanAccountId && cleanCampaignGroupId && campaignName) {
            const [dups] = await pool.query(
                'SELECT id, name FROM linkedin_campaigns WHERE account_id = ? AND campaign_group_id = ? AND name = ? AND id != ?',
                [cleanAccountId, cleanCampaignGroupId, campaignName.trim(), draftId || '']
            );
            if (dups.length > 0) {
                valErrors.push({
                    field: 'campaignName',
                    message: `A campaign with name "${campaignName.trim()}" already exists in this account and group (Conflict campaign: ${dups[0].id}).`
                });
            }
        }

        if (valErrors.length > 0) {
            const executionTime = Date.now() - startTime;
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_VALIDATION_FAILED',
                req.body,
                { validationErrors: valErrors },
                'VALIDATION_FAILED',
                'Publish validation failed',
                executionTime,
                cleanCampaignGroupId
            );

            return res.status(400).json({
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Please fix validation errors.',
                validationErrors: valErrors
            });
        }

        // Fetch currency code
        let currency = 'USD';
        const [accRows] = await pool.query('SELECT currency FROM linkedin_accounts WHERE id = ?', [cleanAccountId]);
        if (accRows.length > 0 && accRows[0].currency) {
            currency = accRows[0].currency;
        }

        // Build RESTli payload
        const payload = buildLinkedInCampaignPayload(req.body, currency);

        // API call to LinkedIn
        console.log('[LinkedIn Campaign Create] Sending POST payload to LinkedIn campaigns API...');
        const url = 'https://api.linkedin.com/v2/adCampaignsV2';
        const apiRes = await callLinkedInWriteAPI('POST', url, payload);
        const executionTime = Date.now() - startTime;

        if (!apiRes.success) {
            const errorReport = mapLinkedInError(apiRes);
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_FAILED',
                req.body,
                apiRes.error,
                'LINKEDIN_FAILED',
                errorReport.message,
                executionTime,
                cleanCampaignGroupId
            );
            return res.status(apiRes.status || 400).json(errorReport);
        }

        // Extract campaign URN/ID
        let rawCampaignId = apiRes.headers?.['x-restli-id'] || apiRes.data?.id;
        if (!rawCampaignId && apiRes.headers?.['location']) {
            const parts = apiRes.headers['location'].split('/');
            rawCampaignId = parts[parts.length - 1];
        }

        if (!rawCampaignId) {
            rawCampaignId = 'temp_pub_' + Date.now();
        }

        const cleanCampaignId = String(rawCampaignId).replace('urn:li:sponsoredCampaign:', '');
        const campaignUrn = `urn:li:sponsoredCampaign:${cleanCampaignId}`;

        // Transaction block to commit to database
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // Delete draft campaign if it exists
            if (draftId) {
                await connection.query('DELETE FROM linkedin_campaigns WHERE id = ?', [draftId]);
            }

            // Insert new published campaign
            const startTimeDate = startTimeStr ? new Date(startTimeStr) : null;
            const endTimeDate = endTimeStr ? new Date(endTimeStr) : null;

            await connection.query(
                `INSERT INTO linkedin_campaigns 
                 (id, account_id, campaign_group_id, name, status, type, total_spent, 
                  objective, language, bid_strategy, optimization_goal, cost_type, 
                  timezone, daily_budget, lifetime_budget, start_time, end_time, 
                  draft_data, creation_source, linkedin_campaign_urn, last_publish_status, last_synced_at)
                 VALUES (?, ?, ?, ?, ?, 'SPONSORED_UPDATES', 0.00, 
                         ?, ?, ?, ?, ?, 
                         ?, ?, ?, ?, ?, 
                         ?, 'WEB_APPLICATION', ?, 'SUCCESS', CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE 
                    status = VALUES(status),
                    linkedin_campaign_urn = VALUES(linkedin_campaign_urn),
                    last_publish_status = VALUES(last_publish_status),
                    last_synced_at = CURRENT_TIMESTAMP`,
                [
                    cleanCampaignId,
                    cleanAccountId,
                    cleanCampaignGroupId,
                    campaignName.trim(),
                    status.toUpperCase() === 'ACTIVE' ? 'RUNNING' : status.toUpperCase(),
                    objective || null,
                    language || null,
                    bidStrategy || null,
                    optimizationGoal || null,
                    costType || null,
                    timezone || null,
                    dailyBudget || null,
                    lifetimeBudget || null,
                    startTimeDate,
                    endTimeDate,
                    JSON.stringify(req.body),
                    campaignUrn
                ]
            );

            await connection.commit();

            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN',
                req.body,
                apiRes.data || { createdCampaignId: cleanCampaignId },
                'SUCCESS',
                null,
                executionTime,
                cleanCampaignGroupId,
                cleanCampaignId
            );

            res.status(201).json({
                success: true,
                message: 'Campaign created and published successfully.',
                data: {
                    id: cleanCampaignId,
                    accountId: cleanAccountId,
                    campaignGroupId: cleanCampaignGroupId,
                    name: campaignName.trim(),
                    status: status.toUpperCase() === 'ACTIVE' ? 'RUNNING' : status.toUpperCase(),
                    objective,
                    dailyBudget,
                    creation_source: 'WEB_APPLICATION',
                    linkedin_campaign_urn: campaignUrn
                }
            });
        } catch (dbErr) {
            await connection.rollback();
            console.error('[LinkedIn Controller] DB Publish Commit failed:', dbErr.message);
            await logLinkedInWriteAction(
                cleanAccountId,
                'CREATE_CAMPAIGN_DB_FAILED',
                req.body,
                apiRes.data || { createdCampaignId: cleanCampaignId },
                'FAILED',
                dbErr.message,
                executionTime,
                cleanCampaignGroupId,
                cleanCampaignId
            );
            res.status(500).json({ success: false, message: 'Database commit failed: ' + dbErr.message });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('[LinkedIn Controller] Error in createLinkedInCampaign:', error);
        res.status(500).json({ success: false, message: 'Failed to create campaign: ' + error.message });
    }
};


