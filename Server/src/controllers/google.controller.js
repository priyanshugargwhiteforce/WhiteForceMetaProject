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
