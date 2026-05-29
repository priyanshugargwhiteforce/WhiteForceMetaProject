const express = require('express');
const router = express.Router();
const whatsappController = require('../../controllers/whatsapp/whatsapp.controller');
const whatsappChannelsController = require('../../controllers/whatsapp/whatsapp-channels.controller');
const whatsappTemplatesController = require('../../controllers/whatsapp/whatsapp-templates.controller');
const { protect, authorizeWhatsapp } = require('../../middlewares/auth.middleware');

// Public Webhook endpoints (No protect middleware)
router.get('/webhook', whatsappTemplatesController.verifyWebhook);
router.post('/webhook', whatsappTemplatesController.receiveWebhook);

// Apply protection & authorization to all subsequent routes
router.use(protect);
router.use(authorizeWhatsapp);

// Protected WhatsApp Account and Sender endpoints
router.get('/details', whatsappController.getWhatsAppDetails);
router.get('/templates', whatsappController.getTemplates);
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

module.exports = router;

