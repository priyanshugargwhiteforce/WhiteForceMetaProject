const googleService = require('../services/google.service');

// @desc    Get accessible Google Ads Account list
// @route   GET /api/google/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
    try {
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        if (!refreshToken) {
            return res.status(400).json({ success: false, missingCredentials: true, message: "Missing Refresh Token." });
        }

        const client = googleService.getGoogleAdsClient();
        const customers = await client.listAccessibleCustomers(refreshToken);
        
        res.json({
            success: true,
            accounts: customers.resource_names.map(name => name.split('/')[1])
        });
    } catch (error) {
        console.error('Google Ads List Accounts Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Google Ads dashboard metrics & daily trends
// @route   GET /api/google/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
    try {
        const { range = 'THIS_MONTH', customerId, year, month, force = 'false' } = req.query;
        const targetCustomerId = customerId || process.env.GOOGLE_CUSTOMER_ID;
        const forceSync = force === 'true';

        if (!targetCustomerId) {
             return res.status(400).json({ success: false, missingCustomerId: true, message: "Missing Customer ID." });
        }

        const data = await googleService.getGoogleDashboardData(
            targetCustomerId,
            range,
            year,
            month,
            forceSync
        );

        res.json({
            success: true,
            ...data
        });
    } catch (error) {
        const msg = error.message || "";
        if (msg.includes("can't be accessed") || msg.includes("deactivated") || msg.includes("not yet enabled") || msg.includes("PermissionDenied")) {
            console.warn(`[Google Ads API Warning] Dashboard sync failed for Customer ${customerId || process.env.GOOGLE_CUSTOMER_ID} (Deactivated/Not Enabled).`);
            return res.status(400).json({
                success: false,
                accountDisabled: true,
                message: "The selected Google Ads account is not yet enabled or has been deactivated. Please choose another account."
            });
        }
        console.error('Google Ads Dashboard Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Google Ads ad-level performance list
// @route   GET /api/google/ads
// @access  Private
exports.getAds = async (req, res) => {
    try {
        const { customerId } = req.query;
        const targetCustomerId = customerId || process.env.GOOGLE_CUSTOMER_ID;

        if (!targetCustomerId) {
             return res.status(400).json({ success: false, missingCustomerId: true, message: "Missing Customer ID." });
        }

        const ads = await googleService.getGoogleAds(targetCustomerId);
        res.json({
            success: true,
            ads
        });
    } catch (error) {
        console.error('Google Ads Get Ads Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Google Ads campaigns list
// @route   GET /api/google/campaigns
// @access  Private
exports.getCampaigns = async (req, res) => {
    try {
        const { customerId } = req.query;
        const targetCustomerId = customerId || process.env.GOOGLE_CUSTOMER_ID;

        if (!targetCustomerId) {
             return res.status(400).json({ success: false, missingCustomerId: true, message: "Missing Customer ID." });
        }

        const campaigns = await googleService.getGoogleCampaigns(targetCustomerId);
        res.json({
            success: true,
            campaigns
        });
    } catch (error) {
        console.error('Google Ads Get Campaigns Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Google Ads leads list
// @route   GET /api/google/leads
// @access  Private
exports.getLeads = async (req, res) => {
    try {
        const { customerId } = req.query;
        const targetCustomerId = customerId || process.env.GOOGLE_CUSTOMER_ID;

        if (!targetCustomerId) {
             return res.status(400).json({ success: false, missingCustomerId: true, message: "Missing Customer ID." });
        }

        const leads = await googleService.getGoogleLeadsFromDb(targetCustomerId);
        res.json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error('Google Ads Get Leads Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Force Sync Google Ads leads
// @route   POST /api/google/sync-leads
// @access  Private
exports.syncLeads = async (req, res) => {
    try {
        const { customerId } = req.body;
        const targetCustomerId = customerId || process.env.GOOGLE_CUSTOMER_ID;

        if (!targetCustomerId) {
             return res.status(400).json({ success: false, missingCustomerId: true, message: "Missing Customer ID." });
        }

        const count = await googleService.syncGoogleLeads(targetCustomerId);
        res.json({
            success: true,
            message: `Successfully synchronized ${count} Google Ads leads.`
        });
    } catch (error) {
        console.error('Google Ads Sync Leads Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Google OAuth 2.0 Multi-Account Management ---

const googleAuthService = require('../services/googleAuth.service');
const GoogleAccount = require('../models/googleAccount.model');

// @desc    Initiate Google OAuth login URL generator
// @route   GET /api/google/auth/login
// @access  Private
exports.initiateOAuth = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized. User session required." });
        }

        const state = googleAuthService.generateOAuthState(userId);
        const authUrl = googleAuthService.getAuthUrl(state);

        console.log(`[Google OAuth] Initiating authorization flow for User ID: ${userId}...`);

        if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, authUrl });
        }

        res.redirect(authUrl);
    } catch (error) {
        console.error('Google OAuth Initiate Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Handle Google OAuth callback redirect
// @route   GET /api/google/auth/callback
// @access  Public
exports.handleOAuthCallback = async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const clientRedirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error) {
        console.warn('[Google OAuth] User denied consent or OAuth error:', error_description || error);
        return res.redirect(`${clientRedirectUrl}/google-accounts?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
        console.error('[Google OAuth] Callback missing authorization code or state token.');
        return res.redirect(`${clientRedirectUrl}/google-accounts?error=${encodeURIComponent('Authorization code or state parameter missing.')}`);
    }

    try {
        // 1. Verify CSRF state token
        const decodedState = googleAuthService.verifyOAuthState(state);
        const userId = decodedState.userId;

        console.log(`[Google OAuth] Callback received for User ID: ${userId}. Exchanging code for tokens...`);

        // 2. Exchange authorization code for tokens
        const tokens = await googleAuthService.exchangeCodeForTokens(code);

        // 3. Fetch Google User Profile details
        const profile = await googleAuthService.getGoogleUserInfo(tokens.access_token);

        console.log(`[Google OAuth] Connected account successfully: ${profile.email} (ID: ${profile.sub})`);

        // 4. Calculate token expiration
        const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

        // 5. Upsert into database
        await GoogleAccount.upsertAccount({
            user_id: userId,
            google_account_id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token,
            token_expires_at: expiresAt,
            scopes: tokens.scope || 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
            status: 'active'
        });

        // 6. Redirect to Frontend Google Accounts page with success notification
        res.redirect(`${clientRedirectUrl}/google-accounts?connected=true&email=${encodeURIComponent(profile.email)}`);
    } catch (err) {
        console.error('[Google OAuth] Callback handling error:', err.message);
        res.redirect(`${clientRedirectUrl}/google-accounts?error=${encodeURIComponent(err.message)}`);
    }
};

// @desc    Get all connected Google Accounts for logged-in user
// @route   GET /api/google/accounts/list
// @access  Private
exports.getConnectedAccounts = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const accounts = await GoogleAccount.findAll(userId);

        res.json({
            success: true,
            count: accounts.length,
            data: accounts,
            accounts
        });
    } catch (error) {
        console.error('Get Connected Google Accounts Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get connection status for a specific connected Google Account
// @route   GET /api/google/accounts/:id/status
// @access  Private
exports.getAccountStatus = async (req, res) => {
    try {
        const account = await GoogleAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Connected Google Account not found.' });
        }

        // Admin can access any, normal user can only access own
        if (req.user.role !== 'admin' && account.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden. Account does not belong to you.' });
        }

        res.json({
            success: true,
            account
        });
    } catch (error) {
        console.error('Get Account Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Force refresh access token for a connected Google Account
// @route   POST /api/google/accounts/:id/refresh
// @access  Private
exports.refreshAccountToken = async (req, res) => {
    try {
        const account = await GoogleAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Connected Google Account not found.' });
        }

        if (req.user.role !== 'admin' && account.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden. Account does not belong to you.' });
        }

        const validAccessToken = await googleAuthService.getValidAccessToken(account.id);

        res.json({
            success: true,
            message: `Successfully refreshed access token for ${account.email}`,
            hasValidToken: !!validAccessToken
        });
    } catch (error) {
        console.error('Refresh Account Token Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Disconnect/Delete a connected Google Account
// @route   DELETE /api/google/accounts/:id
// @access  Private
exports.deleteAccount = async (req, res) => {
    try {
        const accountId = req.params.id;
        const userId = req.user.role === 'admin' ? null : req.user.id;

        const affected = await GoogleAccount.delete(accountId, userId);
        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Google Account not found or unauthorized.' });
        }

        console.log(`[Google OAuth] Account ID ${accountId} disconnected by User ID ${req.user.id}`);

        res.json({
            success: true,
            message: 'Google Account disconnected successfully.'
        });
    } catch (error) {
        console.error('Delete Connected Google Account Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

