const express = require('express');
const router = express.Router();
const {
    getAdAccounts,
    getAccountDetails,
    getAccountInsights,
    getLeadFormData,
    getCreativeData,
    getSingleAdInsights,
    getLeads,
    syncAdLeads,
    getMetaConfigs,
    createMetaConfig,
    updateMetaConfig,
    deleteMetaConfig,
    updateAdOwner,
    getTeamMembers,
    getFacebookPages,
    getPageTrackerHistory,
    syncPageTracker,
    addOrUpdateMonthlyMetric,
    deleteMonthlyMetric
} = require('../controllers/meta.controller');

const { authorizeMeta } = require('../middlewares/auth.middleware');

router.use(authorizeMeta);

// Meta configurations management routes
router.get('/configs', getMetaConfigs);
router.post('/configs', createMetaConfig);
router.put('/configs/:id', updateMetaConfig);
router.delete('/configs/:id', deleteMetaConfig);

// Team and Owner metadata routes
router.get('/team', getTeamMembers);
router.post('/ads/owner', updateAdOwner);

// Ad account and analytics routes
router.get('/fb-pages', getFacebookPages);
router.get('/page-tracker/history', getPageTrackerHistory);
router.post('/page-tracker/sync', syncPageTracker);
router.post('/page-tracker/updates', addOrUpdateMonthlyMetric);
router.delete('/page-tracker/entry/:id', deleteMonthlyMetric);

router.get('/accounts', getAdAccounts);
router.get('/accounts/:accountId', getAccountDetails);
router.get('/insights/:accountId', getAccountInsights);
router.get('/leadforms/:formId', getLeadFormData);
router.get('/creatives/:creativeId', getCreativeData);
router.get('/ads/:adId/insights', getSingleAdInsights);
router.get('/leads', getLeads);
router.post('/leads/sync', syncAdLeads);

module.exports = router;
