const { pool } = require('../config/db');

const YoutubeChannel = {
    async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS youtube_channels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                google_account_id INT NOT NULL,
                channel_id VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                custom_url VARCHAR(100) NULL,
                thumbnail VARCHAR(500) NULL,
                banner_url VARCHAR(500) NULL,
                subscriber_count BIGINT DEFAULT 0,
                video_count INT DEFAULT 0,
                view_count BIGINT DEFAULT 0,
                uploads_playlist_id VARCHAR(100) NULL,
                published_at TIMESTAMP NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_acc_channel (google_account_id, channel_id),
                CONSTRAINT fk_yt_channel_google_acc FOREIGN KEY (google_account_id) REFERENCES google_accounts(id) ON DELETE CASCADE
            )
        `;
        await pool.query(query);

        // Migrations for existing table safely
        try { await pool.query("ALTER TABLE youtube_channels ADD COLUMN custom_url VARCHAR(100) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_channels ADD COLUMN banner_url VARCHAR(500) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_channels ADD COLUMN uploads_playlist_id VARCHAR(100) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE youtube_channels ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'"); } catch (e) {}
    },

    async upsertChannel({
        google_account_id,
        channel_id,
        title,
        description,
        custom_url,
        thumbnail,
        banner_url,
        subscriber_count,
        video_count,
        view_count,
        uploads_playlist_id,
        published_at,
        status = 'active'
    }) {
        const query = `
            INSERT INTO youtube_channels (
                google_account_id,
                channel_id,
                title,
                description,
                custom_url,
                thumbnail,
                banner_url,
                subscriber_count,
                video_count,
                view_count,
                uploads_playlist_id,
                published_at,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                custom_url = VALUES(custom_url),
                thumbnail = VALUES(thumbnail),
                banner_url = VALUES(banner_url),
                subscriber_count = VALUES(subscriber_count),
                video_count = VALUES(video_count),
                view_count = VALUES(view_count),
                uploads_playlist_id = VALUES(uploads_playlist_id),
                published_at = VALUES(published_at),
                status = VALUES(status),
                last_synced_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        `;
        const [result] = await pool.query(query, [
            google_account_id,
            channel_id,
            title,
            description || null,
            custom_url || null,
            thumbnail || null,
            banner_url || null,
            subscriber_count || 0,
            video_count || 0,
            view_count || 0,
            uploads_playlist_id || null,
            published_at || null,
            status
        ]);
        return result;
    },

    async findAllForUser(userId = null) {
        let query = `
            SELECT 
                yc.id,
                yc.google_account_id,
                yc.channel_id,
                yc.title,
                yc.description,
                yc.custom_url,
                yc.thumbnail,
                yc.banner_url,
                yc.subscriber_count,
                yc.video_count,
                yc.view_count,
                yc.uploads_playlist_id,
                yc.published_at,
                yc.status,
                yc.last_synced_at,
                yc.created_at,
                ga.email AS google_email,
                ga.name AS google_account_name,
                ga.picture AS google_account_picture,
                ga.status AS google_account_status
            FROM youtube_channels yc
            JOIN google_accounts ga ON yc.google_account_id = ga.id
        `;
        const params = [];

        if (userId !== null) {
            query += ` WHERE ga.user_id = ?`;
            params.push(userId);
        }

        query += ` ORDER BY yc.subscriber_count DESC, yc.created_at DESC`;

        const [rows] = await pool.query(query, params);
        return rows;
    },

    async findById(id, userId = null) {
        let query = `
            SELECT 
                yc.*,
                ga.email AS google_email,
                ga.name AS google_account_name,
                ga.picture AS google_account_picture,
                ga.user_id AS google_account_owner_id
            FROM youtube_channels yc
            JOIN google_accounts ga ON yc.google_account_id = ga.id
            WHERE (yc.id = ? OR yc.channel_id = ?)
        `;
        const params = [id, id];

        if (userId !== null) {
            query += ` AND ga.user_id = ?`;
            params.push(userId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0];
    },

    async findByChannelId(channelId) {
        const [rows] = await pool.query(
            `SELECT * FROM youtube_channels WHERE channel_id = ?`,
            [channelId]
        );
        return rows[0];
    },

    async findByGoogleAccountId(googleAccountId) {
        const [rows] = await pool.query(
            `SELECT * FROM youtube_channels WHERE google_account_id = ? ORDER BY subscriber_count DESC`,
            [googleAccountId]
        );
        return rows;
    }
};

// Initialize table
YoutubeChannel.createTable().catch(err => console.error('Error creating youtube_channels table:', err));

module.exports = YoutubeChannel;
