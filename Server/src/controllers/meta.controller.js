const metaService = require('../services/meta.service');
const { pool } = require('../config/db');

// Configs CRUD
exports.getMetaConfigs = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM meta_configs ORDER BY created_at DESC');
        res.json({ success: true, configs: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMetaConfig = async (req, res) => {
    try {
        const { name, accessToken } = req.body;
        if (!name || !accessToken) {
            return res.status(400).json({ success: false, message: 'Name and Access Token are required.' });
        }
        const [result] = await pool.query('INSERT INTO meta_configs (name, access_token) VALUES (?, ?)', [name, accessToken]);
        res.status(201).json({ success: true, message: 'Meta Account Config created.', configId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateMetaConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, accessToken } = req.body;
        await pool.query('UPDATE meta_configs SET name = ?, access_token = ? WHERE id = ?', [name, accessToken, id]);
        res.json({ success: true, message: 'Meta Account Config updated.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMetaConfig = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM meta_configs WHERE id = ?', [id]);
        await pool.query('DELETE FROM meta_ad_accounts WHERE config_id = ?', [id]);
        res.json({ success: true, message: 'Meta Account Config deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all connected Meta Ad Accounts
// @route   GET /api/meta/accounts
// @access  Private
exports.getAdAccounts = async (req, res) => {
    try {
        const forceSync = req.query.force === 'true';
        const configId = req.headers['x-meta-config-id'] || req.query.configId;
        const accounts = await metaService.getAdAccounts(forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;

        if (!accountId) {
            return res.status(400).json({ success: false, message: 'Ad Account ID is required.' });
        }

        const details = await metaService.getAccountDetails(accountId, forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;

        if (!accountId) {
            return res.status(400).json({ success: false, message: 'Ad Account ID is required.' });
        }

        const insights = await metaService.getAccountInsights(accountId, preset, forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;

        if (!formId) {
            return res.status(400).json({ success: false, message: 'Lead Form ID is required.' });
        }

        const data = await metaService.getLeadFormData(formId, forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;

        if (!creativeId) {
            return res.status(400).json({ success: false, message: 'Creative ID is required.' });
        }

        const data = await metaService.getCreativeData(creativeId, forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;

        if (!adId) {
            return res.status(400).json({ success: false, message: 'Ad ID is required.' });
        }

        const data = await metaService.getSingleAdInsights(adId, forceSync, configId);
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
        const configId = req.headers['x-meta-config-id'] || req.query.configId;
        if (!adId) {
            return res.status(400).json({ success: false, message: 'Ad ID is required.' });
        }

        await metaService.syncAdLeads(adId, configId);
        
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

// @desc    Update Ad Owner and Launch Date for a specific Ad ID
// @route   POST /api/meta/ads/owner
// @access  Private
exports.updateAdOwner = async (req, res) => {
    try {
        const { adId, ownerName, launchDate } = req.body;
        if (!adId) {
            return res.status(400).json({ success: false, message: 'Ad ID is required.' });
        }

        await pool.query(
            'UPDATE meta_ads SET owner_name = ?, launch_date = ?, owner_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [ownerName || null, launchDate || null, adId]
        );

        res.status(200).json({
            success: true,
            message: 'Ad Owner details updated successfully.'
        });
    } catch (error) {
        console.error('updateAdOwner Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all team members (system users) for dropdown selections
// @route   GET /api/meta/team
// @access  Private
exports.getTeamMembers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, role FROM users ORDER BY username ASC');
        res.status(200).json({
            success: true,
            team: rows
        });
    } catch (error) {
        console.error('getTeamMembers Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get Facebook Pages connected to current config
// @route   GET /api/meta/fb-pages
// @access  Private
exports.getFacebookPages = async (req, res) => {
    try {
        const configId = req.headers['x-meta-config-id'] || req.query.configId;
        const pages = await metaService.getFacebookPages(configId);
        res.status(200).json({
            success: true,
            data: pages.data || []
        });
    } catch (error) {
        console.error('getFacebookPages Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};