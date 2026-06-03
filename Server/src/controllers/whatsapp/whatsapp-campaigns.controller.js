const campaignsService = require('../../services/whatsapp-campaigns.service');

exports.createCampaign = async (req, res) => {
    try {
        const { configId, name, templateId, contactListId, campaignType, scheduledTime, timezone, cronExpression, status, recipients } = req.body;
        
        if (!name || !templateId || !contactListId) {
            return res.status(400).json({ success: false, message: 'Campaign name, template ID, and contact list ID are required.' });
        }

        const result = await campaignsService.createCampaign({
            configId: configId ? parseInt(configId) : 0,
            name,
            templateId,
            contactListId: parseInt(contactListId),
            campaignType,
            scheduledTime,
            timezone: timezone || 'UTC',
            cronExpression,
            status: status || 'draft',
            recipients: recipients || []
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create campaign controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const result = await campaignsService.getCampaigns({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search
        });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Get campaigns controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientPage, recipientLimit } = req.query;
        
        const result = await campaignsService.getCampaignById(
            id,
            recipientPage ? parseInt(recipientPage) : 1,
            recipientLimit ? parseInt(recipientLimit) : 50
        );

        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Get campaign by id controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.cloneCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await campaignsService.cloneCampaign(id);
        res.status(250).json(result);
    } catch (error) {
        console.error('Clone campaign controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.pauseCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await campaignsService.pauseCampaign(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error('Pause campaign controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resumeCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await campaignsService.resumeCampaign(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error('Resume campaign controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSchedules = async (req, res) => {
    try {
        const result = await campaignsService.getSchedules();
        res.status(200).json({ success: true, schedules: result });
    } catch (error) {
        console.error('Get schedules controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
