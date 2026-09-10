const express = require('express');
const router = express.Router();
const youtubeChannelController = require('../controllers/youtubeChannel.controller');
const { protect, authorizeGoogle } = require('../middlewares/auth.middleware');

router.use(protect);
router.use(authorizeGoogle);

// Channel listing & full sync
router.get(['/', '/channels'], youtubeChannelController.getChannels);
router.post(['/sync', '/channels/sync'], youtubeChannelController.syncChannels);

// Video routes (must precede /:id to prevent route collision)
router.get(['/videos', '/videos/all'], youtubeChannelController.getVideos);
router.post(['/videos/sync-all', '/videos/sync'], youtubeChannelController.syncAllChannelsVideos);
router.get(['/videos/detail/:videoId', '/videos/:videoId'], youtubeChannelController.getVideoById);

// Channel-specific video routes
router.get('/channels/:channelId/videos', youtubeChannelController.getVideos);
router.post('/channels/:channelId/videos/sync', youtubeChannelController.syncChannelVideos);

// Single channel routes
router.get(['/:id', '/channels/:id'], youtubeChannelController.getChannelById);
router.post(['/:id/sync', '/channels/:id/sync'], youtubeChannelController.syncSingleChannel);
router.get('/:channelId/videos', youtubeChannelController.getVideos);
router.post('/:channelId/videos/sync', youtubeChannelController.syncChannelVideos);

module.exports = router;
