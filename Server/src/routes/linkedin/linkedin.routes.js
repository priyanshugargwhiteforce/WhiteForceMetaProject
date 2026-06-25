const express = require('express');
const router = express.Router();
const linkedinController = require('../../controllers/linkedin/linkedin.controller');
const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');

// Public LinkedIn OAuth endpoints
router.get('/auth/login', linkedinController.initiateOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);

// Protected Readiness Check
router.get('/write-readiness', protect, authorizeLinkedin, linkedinController.checkWriteReadiness);

// Protected Write Manage endpoints (Registered BEFORE dynamic route params)
router.post('/campaign-groups/manage/create', protect, authorizeLinkedin, linkedinController.createLinkedInCampaignGroup);
router.get('/campaign-groups/manage/:accountId', protect, authorizeLinkedin, linkedinController.getLinkedInCampaignGroupsManage);
router.put('/campaigns/manage/:id/pause', protect, authorizeLinkedin, linkedinController.pauseLinkedInCampaign);
router.put('/campaigns/manage/:id/resume', protect, authorizeLinkedin, linkedinController.resumeLinkedInCampaign);
router.post('/campaigns/manage/draft', protect, authorizeLinkedin, linkedinController.saveLinkedInCampaignDraft);
router.post('/campaigns/manage/create', protect, authorizeLinkedin, linkedinController.createLinkedInCampaign);

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
router.get('/targeting/search', linkedinController.searchTargetingFacets);

module.exports = router;

