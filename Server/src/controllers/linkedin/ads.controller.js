'use strict';

const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');
const adsService = require('../../services/linkedinAdBuilder.service');

// POST /draft - Save or update draft
async function saveDraft(req, res) {
  try {
    const userId = req.user.id;
    const result = await adsService.saveDraft(req.body, userId);
    res.json({ success: true, draftId: result.draftId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /create - Publish ad draft
async function createAd(req, res) {
  try {
    const userId = req.user.id;
    const { draftId } = req.body;
    const result = await adsService.publishAd(draftId, userId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET / - List ads (drafts & published)
async function listAds(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const ads = await adsService.listAds(page, limit);
    res.json({ success: true, ads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /:id - Get ad detail
async function getAd(req, res) {
  try {
    const ad = await adsService.getAdDetail(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    res.json({ success: true, ad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /:id/pause
async function pauseAd(req, res) {
  try {
    const result = await adsService.pauseAd(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /:id/resume
async function resumeAd(req, res) {
  try {
    const result = await adsService.resumeAd(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { protect, authorizeLinkedin, saveDraft, createAd, listAds, getAd, pauseAd, resumeAd };
