const express = require('express');
const router = express.Router();
const linkedinController = require('../../controllers/linkedin/linkedin.controller');
const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');

// Public LinkedIn OAuth endpoints
router.get('/auth/login', linkedinController.initiateOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);

// Apply protection & authorization to all subsequent routes
router.use(protect);
router.use(authorizeLinkedin);

// Protected LinkedIn marketing analytics endpoints
router.get('/accounts', linkedinController.getLinkedInAccounts);
router.get('/campaigns/:accountId', linkedinController.getLinkedInCampaigns);
router.get('/campaign-groups/:accountId', linkedinController.getLinkedInCampaignGroups);
router.get('/insights/:accountId', linkedinController.getLinkedInInsights);
router.get('/leads/:accountId', linkedinController.getLinkedInLeads);
router.get('/audience/:accountId', linkedinController.getLinkedInAudience);
router.post('/sync', linkedinController.syncLinkedInData);

module.exports = router;

