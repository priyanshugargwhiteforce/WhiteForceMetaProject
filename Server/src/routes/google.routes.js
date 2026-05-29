const express = require('express');
const router = express.Router();
const googleController = require('../controllers/google.controller');

const { authorizeGoogle } = require('../middlewares/auth.middleware');

router.use(authorizeGoogle);

router.get('/accounts', googleController.getAccounts);
router.get('/dashboard', googleController.getDashboardData);
router.get('/ads', googleController.getAds);
router.get('/campaigns', googleController.getCampaigns);

module.exports = router;
