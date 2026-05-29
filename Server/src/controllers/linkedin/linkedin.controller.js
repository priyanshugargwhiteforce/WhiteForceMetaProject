const { pool } = require('../../config/db');
const axios = require('axios');
const { syncLinkedInData } = require('../../services/linkedin.service');

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
            console.log('[LinkedIn Controller] No accounts found in DB. Returning empty array (user must manually sync).');
            return res.status(200).json({
                success: true,
                adaccounts: { data: [] }
            });
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

