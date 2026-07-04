const express = require('express');
const router = express.Router();
const metaPostingController = require('../controllers/meta-posting.controller');
const { protect, authorizeMetaPublish } = require('../middlewares/auth.middleware');

router.get('/targets', protect, authorizeMetaPublish, metaPostingController.getSanitizedTargets);
router.post('/publish', protect, authorizeMetaPublish, metaPostingController.publishPost);
router.get('/jobs/:jobId', protect, authorizeMetaPublish, metaPostingController.getJobDetails);
router.get('/progress', protect, metaPostingController.getPostingProgressEvents);

module.exports = router;
