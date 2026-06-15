'use strict';

const express = require('express');
const router = express.Router();
const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');
const adsController = require('../../controllers/linkedin/ads.controller');

// Apply protection & authorization to all ads routes
router.use(protect);
router.use(authorizeLinkedin);

// Draft save/update
router.post('/draft', adsController.saveDraft);

// Publish ad
router.post('/create', adsController.createAd);

// List ads (drafts & published)
router.get('/', adsController.listAds);

// Get ad detail
router.get('/:id', adsController.getAd);

// Pause / Resume placeholders
router.put('/:id/pause', adsController.pauseAd);
router.put('/:id/resume', adsController.resumeAd);

module.exports = router;
