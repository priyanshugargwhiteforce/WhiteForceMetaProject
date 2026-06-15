const express = require('express');
const { getAds, getAdDetails, getAdShorts, getShortDetails, getChannels } = require('../controllers/youtubeAd.controller');

const { authorizeGoogle } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authorizeGoogle);

router.route('/').get(getAds);
router.route('/channels').get(getChannels);
router.route('/channel-shorts').get(getAdShorts);
router.route('/shorts/:videoId').get(getShortDetails);
router.route('/:id').get(getAdDetails);

module.exports = router;
