const { pool } = require('../config/db');

const YoutubeVideo = {
    async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS youtube_videos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                youtube_channel_id INT NOT NULL,
                video_id VARCHAR(100) NOT NULL,
                title VARCHAR(500) NOT NULL,
                description TEXT NULL,
                thumbnail VARCHAR(500) NULL,
                published_at TIMESTAMP NULL,
                duration VARCHAR(50) NULL,
                privacy_status VARCHAR(50) DEFAULT 'public',
                upload_status VARCHAR(50) DEFAULT 'processed',
                live_broadcast_content VARCHAR(50) DEFAULT 'none',
                view_count BIGINT DEFAULT 0,
                like_count BIGINT DEFAULT 0,
                comment_count BIGINT DEFAULT 0,
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_channel_video (youtube_channel_id, video_id),
                CONSTRAINT fk_youtube_video_channel FOREIGN KEY (youtube_channel_id) REFERENCES youtube_channels(id) ON DELETE CASCADE
            )
        `;
        await pool.query(query);

        // Safe additive column migrations
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN duration VARCHAR(50) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN privacy_status VARCHAR(50) DEFAULT 'public'"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN upload_status VARCHAR(50) DEFAULT 'processed'"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN live_broadcast_content VARCHAR(50) DEFAULT 'none'"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN like_count BIGINT DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_videos ADD COLUMN comment_count BIGINT DEFAULT 0"); } catch (e) {}
    },

    async bulkUpsertVideos(videos) {
        if (!videos || videos.length === 0) return { affectedRows: 0 };

        const values = [];
        for (const v of videos) {
            values.push([
                v.youtube_channel_id,
                v.video_id,
                v.title || 'Untitled Video',
                v.description || null,
                v.thumbnail || null,
                v.published_at || null,
                v.duration || null,
                v.privacy_status || 'public',
                v.upload_status || 'processed',
                v.live_broadcast_content || 'none',
                v.view_count || 0,
                v.like_count || 0,
                v.comment_count || 0
            ]);
        }

        const query = `
            INSERT INTO youtube_videos (
                youtube_channel_id,
                video_id,
                title,
                description,
                thumbnail,
                published_at,
                duration,
                privacy_status,
                upload_status,
                live_broadcast_content,
                view_count,
                like_count,
                comment_count
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                thumbnail = VALUES(thumbnail),
                published_at = VALUES(published_at),
                duration = VALUES(duration),
                privacy_status = VALUES(privacy_status),
                upload_status = VALUES(upload_status),
                live_broadcast_content = VALUES(live_broadcast_content),
                view_count = VALUES(view_count),
                like_count = VALUES(like_count),
                comment_count = VALUES(comment_count),
                last_synced_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        `;

        const [result] = await pool.query(query, [values]);
        return result;
    },

    async findAll(options = {}) {
        const {
            userId = null,
            search = '',
            sortBy = 'published_at',
            sortOrder = 'DESC',
            limit = 25,
            offset = 0
        } = options;
        const channelDbId = options.channelDbId || options.youtube_channel_id || null;
        // Whitelist allowed sort fields to prevent SQL injection
        const allowedSortFields = {
            'published_at': 'yv.published_at',
            'view_count': 'yv.view_count',
            'like_count': 'yv.like_count',
            'comment_count': 'yv.comment_count',
            'title': 'yv.title',
            'created_at': 'yv.created_at'
        };

        const sortColumn = allowedSortFields[sortBy] || 'yv.published_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let query = `
            SELECT 
                yv.*,
                yc.title AS channel_title,
                yc.channel_id AS channel_youtube_id,
                yc.thumbnail AS channel_thumbnail,
                yc.custom_url AS channel_custom_url,
                ga.email AS google_account_email,
                ga.name AS google_account_name
            FROM youtube_videos yv
            JOIN youtube_channels yc ON yv.youtube_channel_id = yc.id
            JOIN google_accounts ga ON yc.google_account_id = ga.id
            WHERE 1=1
        `;

        const params = [];

        if (userId !== null) {
            query += ` AND ga.user_id = ?`;
            params.push(userId);
        }

        if (channelDbId) {
            query += ` AND (yc.id = ? OR yc.channel_id = ?)`;
            params.push(channelDbId, channelDbId);
        }

        if (search && search.trim() !== '') {
            query += ` AND (yv.title LIKE ? OR yv.video_id LIKE ? OR yv.description LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        query += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);
        return rows;
    },

    async countAll(options = {}) {
        const { userId = null, search = '' } = options;
        const channelDbId = options.channelDbId || options.youtube_channel_id || null;
        let query = `
            SELECT COUNT(*) AS total
            FROM youtube_videos yv
            JOIN youtube_channels yc ON yv.youtube_channel_id = yc.id
            JOIN google_accounts ga ON yc.google_account_id = ga.id
            WHERE 1=1
        `;

        const params = [];

        if (userId !== null) {
            query += ` AND ga.user_id = ?`;
            params.push(userId);
        }

        if (channelDbId) {
            query += ` AND (yc.id = ? OR yc.channel_id = ?)`;
            params.push(channelDbId, channelDbId);
        }

        if (search && search.trim() !== '') {
            query += ` AND (yv.title LIKE ? OR yv.video_id LIKE ? OR yv.description LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        const [rows] = await pool.query(query, params);
        return parseInt(rows[0]?.total) || 0;
    },

    async findByVideoId(videoId, userId = null) {
        let query = `
            SELECT 
                yv.*,
                yc.title AS channel_title,
                yc.channel_id AS channel_youtube_id,
                yc.thumbnail AS channel_thumbnail,
                yc.custom_url AS channel_custom_url,
                ga.email AS google_account_email,
                ga.name AS google_account_name,
                ga.user_id AS google_account_owner_id
            FROM youtube_videos yv
            JOIN youtube_channels yc ON yv.youtube_channel_id = yc.id
            JOIN google_accounts ga ON yc.google_account_id = ga.id
            WHERE (yv.video_id = ? OR yv.id = ?)
        `;
        const params = [videoId, videoId];

        if (userId !== null) {
            query += ` AND ga.user_id = ?`;
            params.push(userId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0];
    },

    async getTotals(options = {}) {
        const { userId = null } = options;
        const channelDbId = options.channelDbId || options.youtube_channel_id || null;
        let query = `
            SELECT 
                COUNT(*) AS total_videos,
                COALESCE(SUM(yv.view_count), 0) AS total_views,
                COALESCE(SUM(yv.like_count), 0) AS total_likes,
                COALESCE(SUM(yv.comment_count), 0) AS total_comments
            FROM youtube_videos yv
            JOIN youtube_channels yc ON yv.youtube_channel_id = yc.id
            JOIN google_accounts ga ON yc.google_account_id = ga.id
            WHERE 1=1
        `;

        const params = [];

        if (userId !== null) {
            query += ` AND ga.user_id = ?`;
            params.push(userId);
        }

        if (channelDbId) {
            query += ` AND (yc.id = ? OR yc.channel_id = ?)`;
            params.push(channelDbId, channelDbId);
        }

        const [rows] = await pool.query(query, params);
        return {
            total_videos: parseInt(rows[0]?.total_videos) || 0,
            total_views: parseInt(rows[0]?.total_views) || 0,
            total_likes: parseInt(rows[0]?.total_likes) || 0,
            total_comments: parseInt(rows[0]?.total_comments) || 0
        };
    }
};

// Initialize table
YoutubeVideo.createTable().catch(err => console.error('Error creating youtube_videos table:', err));

module.exports = YoutubeVideo;
