const metaService = require('../services/meta.service');

// @desc    Get all connected Meta Ad Accounts
// @route   GET /api/meta/accounts
// @access  Private
exports.getAdAccounts = async (req, res) => {
    try {
        const forceSync = req.query.force === 'true';
        const accounts = await metaService.getAdAccounts(forceSync);
        res.status(200).json({
            success: true,
            adaccounts: {
                data: accounts
            }
        });
    } catch (error) {
        console.error('getAdAccounts Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Ad Account details (metadata and connected ads list)
// @route   GET /api/meta/accounts/:accountId
// @access  Private
exports.getAccountDetails = async (req, res) => {
    try {
        const { accountId } = req.params;
        const forceSync = req.query.force === 'true';

        if (!accountId) {
            return res.status(400).json({ success: false, message: 'Ad Account ID is required.' });
        }

        const details = await metaService.getAccountDetails(accountId, forceSync);
        res.status(200).json({
            success: true,
            data: details
        });
    } catch (error) {
        console.error('getAccountDetails Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Ad Account Insights (by specific preset/range)
// @route   GET /api/meta/insights/:accountId
// @access  Private
exports.getAccountInsights = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { preset = 'lifetime', force = 'false' } = req.query;
        const forceSync = force === 'true';

        if (!accountId) {
            return res.status(400).json({ success: false, message: 'Ad Account ID is required.' });
        }

        const insights = await metaService.getAccountInsights(accountId, preset, forceSync);
        res.status(200).json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error('getAccountInsights Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Lead Form metadata & connected Leads
// @route   GET /api/meta/leadforms/:formId
// @access  Private
exports.getLeadFormData = async (req, res) => {
    try {
        const { formId } = req.params;
        const forceSync = req.query.force === 'true';

        if (!formId) {
            return res.status(400).json({ success: false, message: 'Lead Form ID is required.' });
        }

        const data = await metaService.getLeadFormData(formId, forceSync);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('getLeadFormData Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Creative Spec details
// @route   GET /api/meta/creatives/:creativeId
// @access  Private
exports.getCreativeData = async (req, res) => {
    try {
        const { creativeId } = req.params;
        const forceSync = req.query.force === 'true';

        if (!creativeId) {
            return res.status(400).json({ success: false, message: 'Creative ID is required.' });
        }

        const data = await metaService.getCreativeData(creativeId, forceSync);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('getCreativeData Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Single Ad Daily Insights
// @route   GET /api/meta/ads/:adId/insights
// @access  Private
exports.getSingleAdInsights = async (req, res) => {
    try {
        const { adId } = req.params;
        const forceSync = req.query.force === 'true';

        if (!adId) {
            return res.status(400).json({ success: false, message: 'Ad ID is required.' });
        }

        const data = await metaService.getSingleAdInsights(adId, forceSync);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('getSingleAdInsights Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all saved Leads
// @route   GET /api/meta/leads
// @access  Private
exports.getLeads = async (req, res) => {
    try {
        const leads = await metaService.getLeads();
        res.status(200).json({
            success: true,
            count: leads.length,
            data: leads
        });
    } catch (error) {
        console.error('getLeads Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Sync leads for a specific Ad ID from FB Graph API and save them
// @route   POST /api/meta/leads/sync
// @access  Private
exports.syncAdLeads = async (req, res) => {
    try {
        const { adId } = req.body;
        if (!adId) {
            return res.status(400).json({ success: false, message: 'Ad ID is required.' });
        }

        await metaService.syncAdLeads(adId);
        
        // Return all leads after sync so the UI can update
        const updatedLeads = await metaService.getLeads();

        res.status(200).json({
            success: true,
            message: 'Leads synced successfully.',
            data: updatedLeads
        });
    } catch (error) {
        console.error('syncAdLeads Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};