const express = require('express');
const router = express.Router();
const whatsappController = require('../../controllers/whatsapp/whatsapp.controller');
const whatsappChannelsController = require('../../controllers/whatsapp/whatsapp-channels.controller');
const whatsappTemplatesController = require('../../controllers/whatsapp/whatsapp-templates.controller');
const whatsappContactsController = require('../../controllers/whatsapp/whatsapp-contacts.controller');
const whatsappCampaignsController = require('../../controllers/whatsapp/whatsapp-campaigns.controller');
const { protect, authorizeWhatsapp } = require('../../middlewares/auth.middleware');

// Public Webhook endpoints (No protect middleware) - Handled by Webhook Dispatcher
const whatsappWebhookController = require('../../controllers/whatsapp/whatsapp-webhook.controller');
router.get('/webhook', whatsappWebhookController.verifyWebhook);
router.post('/webhook', whatsappWebhookController.receiveWebhook);

// --- External In-House App Tracking APIs (x-internal-api-key) ---
const whatsappExternalController = require('../../controllers/whatsapp/whatsapp-external.controller');

const validateExternalApiKey = (req, res, next) => {
    const apiKey = req.headers['x-internal-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY || 'company_internal_whatsapp_tracking_secret_2026';
    
    if (!apiKey || apiKey !== expectedKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key.' });
    }
    
    const sourceApp = req.body?.source_app || req.query?.source_app;
    if (!sourceApp) {
        return res.status(400).json({ success: false, message: 'Invalid or missing source_app.' });
    }
    
    next();
};

router.post('/track-external-message', validateExternalApiKey, whatsappExternalController.trackExternalMessage);
router.get('/external/messages', validateExternalApiKey, whatsappExternalController.getExternalMessages);
router.get('/external/conversation/:phone', validateExternalApiKey, whatsappExternalController.getExternalConversation);

// Apply protection & authorization to all subsequent routes

router.use(protect);
router.use(authorizeWhatsapp);

// WhatsApp configurations management routes
router.get('/configs', whatsappController.getWhatsAppConfigs);
router.post('/configs', whatsappController.createWhatsAppConfig);
router.put('/configs/:id', whatsappController.updateWhatsAppConfig);
router.delete('/configs/:id', whatsappController.deleteWhatsAppConfig);

// Protected WhatsApp Account and Sender endpoints
router.get('/details', whatsappController.getWhatsAppDetails);
router.get('/templates', whatsappController.getTemplates);
router.get('/templates/:id/variables', whatsappTemplatesController.getTemplateVariables);
router.get('/templates/:templateId/mappings', whatsappTemplatesController.getTemplateMappings);
router.post('/templates/:templateId/mappings', whatsappTemplatesController.saveTemplateMappings);
router.delete('/templates/:templateId/mappings/:mappingId', whatsappTemplatesController.deleteTemplateMapping);
router.post('/templates/:templateId/mappings/:mappingId/use', whatsappTemplatesController.useTemplateMapping);
router.post('/send-template', whatsappController.sendTemplateMessage);

// Protected Template Builder, Deletion & Analytics endpoints
router.post('/templates', whatsappTemplatesController.createTemplate);
router.delete('/templates/:name', whatsappTemplatesController.deleteTemplate);
router.get('/analytics', whatsappTemplatesController.getAnalytics);

// Manual WhatsApp Channel Membership Tracking Routes
router.get('/channels', whatsappChannelsController.getChannels);
router.post('/channels', whatsappChannelsController.createChannel);
router.delete('/channels/:id', whatsappChannelsController.deleteChannel);
router.get('/channels/:id/history', whatsappChannelsController.getChannelHistory);
router.post('/channels/:id/updates', whatsappChannelsController.addOrUpdateDailyCount);
router.delete('/channels/updates/:updateId', whatsappChannelsController.deleteDailyCount);

// Contact Management & Lists CRUD Routes
router.get('/contacts', whatsappContactsController.getContacts);
router.get('/contacts/attribute-keys', whatsappContactsController.getAttributeKeys);


// Chat / Message Window Routes
router.get('/chats/events', whatsappContactsController.getChatEvents);
router.get('/chats', whatsappContactsController.getChatThreads);
router.get('/chats/:contactId/messages', whatsappContactsController.getChatMessages);
router.post('/chats/:contactId/send', whatsappContactsController.sendFreeTextChat);

// Sprint 9: Contact Intelligence Routes — MUST be before /:id param routes
router.get('/contacts/segments', whatsappContactsController.getEngagementSegments);

router.post('/contacts/import', whatsappContactsController.importContacts);
router.get('/lists', whatsappContactsController.getLists);
router.post('/lists', whatsappContactsController.createList);
router.delete('/lists/:id', whatsappContactsController.deleteList);

// Sprint 9: Contact-level intelligence endpoints (parameterised, after static routes)
router.get('/contacts/:id/profile', whatsappContactsController.getContactProfile);
router.get('/contacts/:id/activity', whatsappContactsController.getContactActivity);
router.patch('/contacts/:id/opt-in', whatsappContactsController.toggleOptIn);
router.patch('/contacts/:id/archive', whatsappContactsController.archiveContact);
router.patch('/contacts/:id/restore', whatsappContactsController.restoreContact);


// Campaign Management Routes
router.get('/campaigns', whatsappCampaignsController.getCampaigns);
router.get('/campaigns/schedules', whatsappCampaignsController.getSchedules);
router.post('/campaigns', whatsappCampaignsController.createCampaign);
router.get('/campaigns/:id', whatsappCampaignsController.getCampaignById);
router.post('/campaigns/:id/clone', whatsappCampaignsController.cloneCampaign);
router.post('/campaigns/:id/pause', whatsappCampaignsController.pauseCampaign);
router.post('/campaigns/:id/resume', whatsappCampaignsController.resumeCampaign);

// Bull Board & Queue Health Monitoring routes (Sprint 5)
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { whatsappQueue } = require('../../services/whatsapp-queue.service');
const redisConnection = require('../../config/redis');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/whatsapp/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(whatsappQueue)],
    serverAdapter: serverAdapter
});

// Secured Bull Board router mount
router.use('/admin/queues', (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
}, serverAdapter.getRouter());

// Secured Queue Health metrics endpoint
router.get('/admin/queue-health', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const counts = await whatsappQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        res.json({
            success: true,
            counts,
            redisConnected: redisConnection.status
        });
    } catch (error) {
        console.error('Queue Health Endpoint Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Sprint 8: Analytics Dashboard & Reporting Routes ---
const whatsappAnalyticsController = require('../../controllers/whatsapp/whatsapp-analytics.controller');

router.get('/analytics/executive', whatsappAnalyticsController.getExecutiveDashboard);
router.get('/analytics/campaigns', whatsappAnalyticsController.getCampaignsPerformance);
router.get('/analytics/templates', whatsappAnalyticsController.getTemplatesPerformance);
router.get('/analytics/schedules', whatsappAnalyticsController.getSchedulesPerformance);
router.get('/analytics/trends', whatsappAnalyticsController.getTrendsData);
router.get('/analytics/compare', whatsappAnalyticsController.getCampaignsComparison);
router.get('/analytics/export/campaigns', whatsappAnalyticsController.exportCampaigns);
router.get('/analytics/export/templates', whatsappAnalyticsController.exportTemplates);
router.get('/analytics/live', whatsappAnalyticsController.getLiveWabaAnalytics);
router.get('/analytics/pricing', whatsappAnalyticsController.getWabaPricingAnalytics);
router.post('/analytics/pricing/sync', whatsappAnalyticsController.syncWabaPricingAnalytics);

// --- Dashboard UI External Tracker routes (Requires JWT Auth protect) ---
router.get('/dashboard/external-messages', whatsappExternalController.getDashboardExternalMessages);
router.get('/dashboard/external-conversation/:phone', whatsappExternalController.getDashboardExternalConversation);
router.get('/dashboard/external-apps', whatsappExternalController.getDashboardExternalApps);
router.get('/dashboard/external-templates', whatsappExternalController.getDashboardExternalTemplates);

module.exports = router;


