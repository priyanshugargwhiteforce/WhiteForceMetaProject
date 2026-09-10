const express = require('express');
const router = express.Router();
const googleController = require('../controllers/google.controller');
const { protect, authorizeGoogle } = require('../middlewares/auth.middleware');

// Public OAuth callback route (called by Google redirect)
router.get('/auth/callback', googleController.handleOAuthCallback);

// OAuth 2.0 Multi-Account Management Routes
router.get(['/auth/login', '/auth-url'], protect, authorizeGoogle, googleController.initiateOAuth);
router.get('/connected-accounts', protect, authorizeGoogle, googleController.getConnectedAccounts);
router.get('/accounts/:id/status', protect, authorizeGoogle, googleController.getAccountStatus);
router.post('/accounts/:id/refresh', protect, authorizeGoogle, googleController.refreshAccountToken);
router.delete('/accounts/:id', protect, authorizeGoogle, googleController.deleteAccount);

// Legacy Google Ads endpoints (protected)
router.get('/accounts', protect, authorizeGoogle, googleController.getAccounts);
router.get('/dashboard', protect, authorizeGoogle, googleController.getDashboardData);
router.get('/ads', protect, authorizeGoogle, googleController.getAds);
router.get('/campaigns', protect, authorizeGoogle, googleController.getCampaigns);
router.get('/leads', protect, authorizeGoogle, googleController.getLeads);
router.post('/sync-leads', protect, authorizeGoogle, googleController.syncLeads);

module.exports = router;
