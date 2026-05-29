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
    syncAdLeads
} = require('../controllers/meta.controller');

const { authorizeMeta } = require('../middlewares/auth.middleware');

router.use(authorizeMeta);

router.get('/accounts', getAdAccounts);
router.get('/accounts/:accountId', getAccountDetails);
router.get('/insights/:accountId', getAccountInsights);
router.get('/leadforms/:formId', getLeadFormData);
router.get('/creatives/:creativeId', getCreativeData);
router.get('/ads/:adId/insights', getSingleAdInsights);
router.get('/leads', getLeads);
router.post('/leads/sync', syncAdLeads);

module.exports = router;
