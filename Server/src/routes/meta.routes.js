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
    getTeamMembers
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
router.get('/accounts', getAdAccounts);
router.get('/accounts/:accountId', getAccountDetails);
router.get('/insights/:accountId', getAccountInsights);
router.get('/leadforms/:formId', getLeadFormData);
router.get('/creatives/:creativeId', getCreativeData);
router.get('/ads/:adId/insights', getSingleAdInsights);
router.get('/leads', getLeads);
router.post('/leads/sync', syncAdLeads);

module.exports = router;
