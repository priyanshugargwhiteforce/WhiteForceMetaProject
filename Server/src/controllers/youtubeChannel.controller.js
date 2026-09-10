const YoutubeChannel = require('../models/youtubeChannel.model');
const youtubeService = require('../services/youtube.service');

// @desc    Get all connected YouTube channels for the logged-in user
// @route   GET /api/youtube/channels
// @access  Private
exports.getChannels = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const channels = await YoutubeChannel.findAllForUser(userId);

        // Map and format channels cleanly with google_account object
        const formattedChannels = channels.map(ch => ({
            id: ch.id,
            channel_id: ch.channel_id,
            title: ch.title,
            description: ch.description,
            custom_url: ch.custom_url,
            thumbnail: ch.thumbnail,
            banner_url: ch.banner_url,
            subscriber_count: parseInt(ch.subscriber_count) || 0,
            video_count: parseInt(ch.video_count) || 0,
            view_count: parseInt(ch.view_count) || 0,
            uploads_playlist_id: ch.uploads_playlist_id,
            published_at: ch.published_at,
            status: ch.status,
            last_synced_at: ch.last_synced_at,
            created_at: ch.created_at,
            google_account: {
                id: ch.google_account_id,
                email: ch.google_email,
                name: ch.google_account_name,
                picture: ch.google_account_picture,
                status: ch.google_account_status
            }
        }));

        res.json({
            success: true,
            count: formattedChannels.length,
            data: formattedChannels
        });
    } catch (error) {
        console.error('Get YouTube Channels Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single YouTube channel details by ID or channel_id
// @route   GET /api/youtube/channels/:id
// @access  Private
exports.getChannelById = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const channel = await YoutubeChannel.findById(req.params.id, userId);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'YouTube Channel not found or unauthorized.'
            });
        }

        const formattedChannel = {
            id: channel.id,
            channel_id: channel.channel_id,
            title: channel.title,
            description: channel.description,
            custom_url: channel.custom_url,
            thumbnail: channel.thumbnail,
            banner_url: channel.banner_url,
            subscriber_count: parseInt(channel.subscriber_count) || 0,
            video_count: parseInt(channel.video_count) || 0,
            view_count: parseInt(channel.view_count) || 0,
            uploads_playlist_id: channel.uploads_playlist_id,
            published_at: channel.published_at,
            status: channel.status,
            last_synced_at: channel.last_synced_at,
            created_at: channel.created_at,
            google_account: {
                id: channel.google_account_id,
                email: channel.google_email,
                name: channel.google_account_name,
                picture: channel.google_account_picture,
                status: channel.google_account_status
            }
        };

        res.json({
            success: true,
            data: formattedChannel
        });
    } catch (error) {
        console.error('Get YouTube Channel Details Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Discover and sync YouTube channels across all connected Google Accounts
// @route   POST /api/youtube/channels/sync
// @access  Private
exports.syncChannels = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const result = await youtubeService.syncAllUserChannels(userId);

        res.json({
            success: true,
            message: `Discovered ${result.summary.channelsDiscovered} channels across ${result.summary.accountsProcessed} Google accounts.`,
            summary: result.summary,
            accountResults: result.accountResults,
            data: result.channels
        });
    } catch (error) {
        console.error('Sync YouTube Channels Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Force-sync single channel by ID
// @route   POST /api/youtube/channels/:id/sync
// @access  Private
exports.syncSingleChannel = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const channel = await YoutubeChannel.findById(req.params.id, userId);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'YouTube Channel not found or unauthorized.'
            });
        }

        const result = await youtubeService.discoverChannelsForGoogleAccount(channel.google_account_id);
        const updatedChannel = await YoutubeChannel.findById(channel.id, userId);

        res.json({
            success: true,
            message: `Successfully synced channel "${updatedChannel.title}".`,
            data: updatedChannel
        });
    } catch (error) {
        console.error('Sync Single YouTube Channel Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- YouTube Video Management ---

const YoutubeVideo = require('../models/youtubeVideo.model');

// @desc    Get videos across channels (or single channel) with search, sorting, and pagination
// @route   GET /api/youtube/videos
// @route   GET /api/youtube/channels/:channelId/videos
// @access  Private
exports.getVideos = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const channelDbId = req.params.channelId || req.query.channel_id || null;
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const sortBy = req.query.sort_by || 'published_at';
        const sortOrder = req.query.sort_order || 'desc';

        const [videos, total, totals] = await Promise.all([
            YoutubeVideo.findAll({ userId, channelDbId, search, sortBy, sortOrder, limit, offset }),
            YoutubeVideo.countAll({ userId, channelDbId, search }),
            YoutubeVideo.getTotals({ userId, channelDbId })
        ]);

        const pages = Math.ceil(total / limit) || 1;

        res.json({
            success: true,
            pagination: {
                total,
                page,
                limit,
                pages
            },
            totals,
            data: videos
        });
    } catch (error) {
        console.error('Get YouTube Videos Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single stored video details by videoId or DB ID
// @route   GET /api/youtube/videos/:videoId
// @access  Private
exports.getVideoById = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const video = await YoutubeVideo.findByVideoId(req.params.videoId, userId);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'YouTube Video not found or unauthorized.'
            });
        }

        res.json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('Get YouTube Video Details Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Sync videos for a specific YouTube channel
// @route   POST /api/youtube/channels/:channelId/videos/sync
// @access  Private
exports.syncChannelVideos = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const channelDbId = req.params.channelId;

        const result = await youtubeService.syncChannelVideos(channelDbId, userId);

        res.json({
            success: true,
            message: `Discovered ${result.discoveredCount} videos and synced ${result.syncedCount} videos for "${result.channelTitle}".`,
            result
        });
    } catch (error) {
        console.error('Sync Channel Videos Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Sync videos across all accessible channels for the user
// @route   POST /api/youtube/videos/sync
// @access  Private
exports.syncAllChannelsVideos = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const result = await youtubeService.syncAllUserChannelsVideos(userId);

        res.json({
            success: true,
            message: `Discovered ${result.summary.totalDiscovered} total videos across ${result.summary.channelsProcessed} channels.`,
            summary: result.summary,
            results: result.results
        });
    } catch (error) {
        console.error('Sync All Channels Videos Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

