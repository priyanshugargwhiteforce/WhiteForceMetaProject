const analyticsService = require('../../services/whatsapp-analytics.service');

exports.getExecutiveDashboard = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const kpis = await analyticsService.getExecutiveKPIs(configId);
    res.status(200).json({ success: true, ...kpis });
  } catch (error) {
    console.error('getExecutiveDashboard controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCampaignsPerformance = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { startDate, endDate, campaignType, status } = req.query;
    const campaigns = await analyticsService.getCampaignPerformance({
      startDate,
      endDate,
      campaignType,
      status,
      configId
    });
    res.status(200).json({ success: true, campaigns });
  } catch (error) {
    console.error('getCampaignsPerformance controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTemplatesPerformance = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const templates = await analyticsService.getTemplatePerformance(configId);
    res.status(200).json({ success: true, templates });
  } catch (error) {
    console.error('getTemplatesPerformance controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSchedulesPerformance = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const schedules = await analyticsService.getSchedulingAnalytics(configId);
    res.status(200).json({ success: true, schedules });
  } catch (error) {
    console.error('getSchedulesPerformance controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrendsData = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { interval, startDate, endDate } = req.query;
    
    // Default to last 30 days if bounds are not provided
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);

    const start = startDate ? startDate : thirtyDaysAgo.toISOString().split('T')[0] + ' 00:00:00';
    const end = endDate ? endDate : today.toISOString().split('T')[0] + ' 23:59:59';
    
    const trends = await analyticsService.getTrendsData({
      interval: interval || 'daily',
      startDate: start,
      endDate: end,
      configId
    });
    
    res.status(200).json({ success: true, trends });
  } catch (error) {
    console.error('getTrendsData controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCampaignsComparison = async (req, res) => {
  try {
    const { campaignIds } = req.query;
    if (!campaignIds) {
      return res.status(400).json({ success: false, message: 'Campaign IDs parameter is required.' });
    }

    const ids = String(campaignIds).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign IDs provided.' });
    }

    if (ids.length > 5) {
      return res.status(400).json({ success: false, message: 'You can compare a maximum of 5 campaigns.' });
    }

    const comparison = await analyticsService.getCampaignsComparison(ids);
    res.status(200).json({ success: true, comparison });
  } catch (error) {
    console.error('getCampaignsComparison controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportCampaigns = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { startDate, endDate, campaignType, status } = req.query;
    await analyticsService.exportCampaignsCSV({
      startDate,
      endDate,
      campaignType,
      status,
      configId
    }, res);
  } catch (error) {
    console.error('exportCampaigns controller error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.exportTemplates = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    await analyticsService.exportTemplatesCSV(configId, res);
  } catch (error) {
    console.error('exportTemplates controller error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.getLiveWabaAnalytics = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate) {
      start = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      start = Math.floor(thirtyDaysAgo.getTime() / 1000);
    }

    if (endDate) {
      end = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);
    } else {
      end = Math.floor(Date.now() / 1000);
    }

    const data = await analyticsService.getLiveWabaAnalytics({ configId, start, end });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getLiveWabaAnalytics controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWabaPricingAnalytics = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate) {
      start = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      start = Math.floor(thirtyDaysAgo.getTime() / 1000);
    }

    if (endDate) {
      end = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);
    } else {
      end = Math.floor(Date.now() / 1000);
    }

    const rows = await analyticsService.getWabaPricingAnalytics({ configId, start, end });
    res.status(200).json({ success: true, pricing: rows });
  } catch (error) {
    console.error('getWabaPricingAnalytics controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.syncWabaPricingAnalytics = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate) {
      start = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      start = Math.floor(thirtyDaysAgo.getTime() / 1000);
    }

    if (endDate) {
      end = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);
    } else {
      end = Math.floor(Date.now() / 1000);
    }

    const result = await analyticsService.syncLiveWabaPricing({ configId, start, end });
    const rows = await analyticsService.getWabaPricingAnalytics({ configId, start, end });
    
    res.status(200).json({ success: true, result, pricing: rows });
  } catch (error) {
    console.error('syncWabaPricingAnalytics controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWabaPayments = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const data = await analyticsService.getWabaPayments(configId);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('getWabaPayments controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addWabaPayment = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const { paymentDate, amount, transactionId, notes } = req.body;
    
    if (!paymentDate || !amount) {
      return res.status(400).json({ success: false, message: 'Payment date and amount are required.' });
    }

    const data = await analyticsService.addWabaPayment(configId, {
      paymentDate,
      amount: parseFloat(amount),
      transactionId,
      notes
    });
    
    res.status(201).json({ success: true, message: 'Payment transaction logged successfully.', ...data });
  } catch (error) {
    console.error('addWabaPayment controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteWabaPayment = async (req, res) => {
  try {
    const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;
    const paymentId = parseInt(req.params.id);
    
    if (isNaN(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    }

    await analyticsService.deleteWabaPayment(configId, paymentId);
    res.status(200).json({ success: true, message: 'Payment log deleted successfully.' });
  } catch (error) {
    console.error('deleteWabaPayment controller error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};


