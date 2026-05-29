const express = require('express');
const { getAds, getAdDetails } = require('../controllers/youtubeAd.controller');

const { authorizeGoogle } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authorizeGoogle);

router.route('/').get(getAds);
router.route('/:id').get(getAdDetails);

module.exports = router;
