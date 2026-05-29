const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Route for AI ad analysis
router.post('/analyze', aiController.analyzeAd);

module.exports = router;
