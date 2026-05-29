const { pool } = require('../config/db');

const YoutubeAd = {
    async createTable() {
        // Table 1: Campaign Metadata
        const queryAds = `
            CREATE TABLE IF NOT EXISTS youtube_ads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(50) NOT NULL,
                campaign_id VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                video_url VARCHAR(255),
                budget DECIMAL(15, 2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'PAUSED',
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_campaign (customer_id, campaign_id)
            )
        `;
        await pool.query(queryAds);

        // Run migrations on table 1 in case it was created without some fields earlier
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN customer_id VARCHAR(50) NOT NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN campaign_id VARCHAR(100) NOT NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD UNIQUE KEY unique_campaign (customer_id, campaign_id)"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads MODIFY COLUMN video_url VARCHAR(255) NULL DEFAULT NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads MODIFY COLUMN status VARCHAR(50) DEFAULT 'PAUSED'"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN campaign_name VARCHAR(255) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN campaign_status VARCHAR(50) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN ad_id VARCHAR(100) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN ad_name VARCHAR(255) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN video_id VARCHAR(100) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN video_title VARCHAR(255) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN video_description TEXT NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN thumbnail VARCHAR(255) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN channel_name VARCHAR(255) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN channel_id VARCHAR(100) NULL"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN impressions BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN clicks BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN views BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN ctr DECIMAL(10, 4) DEFAULT 0.0000"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN cpv DECIMAL(15, 4) DEFAULT 0.0000"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN spend DECIMAL(15, 2) DEFAULT 0.00"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN engagements BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN likes BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN comments BIGINT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN watch_time DECIMAL(15, 2) DEFAULT 0.00"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN avg_view_duration DECIMAL(15, 2) DEFAULT 0.00"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN audience_retention DECIMAL(5, 2) DEFAULT 0.00"); } catch(e){}
        try { await pool.query("ALTER TABLE youtube_ads ADD COLUMN subscribers_gained INT DEFAULT 0"); } catch(e){}

        // Table 2: Daily time-series metric tracking
        const queryHistory = `
            CREATE TABLE IF NOT EXISTS youtube_ad_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                youtube_ad_id INT NOT NULL,
                date DATE NOT NULL,
                impressions BIGINT DEFAULT 0,
                views BIGINT DEFAULT 0,
                clicks BIGINT DEFAULT 0,
                cost DECIMAL(15, 2) DEFAULT 0.00,
                likes INT DEFAULT 0,
                comments INT DEFAULT 0,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_ad_date (youtube_ad_id, date),
                FOREIGN KEY (youtube_ad_id) REFERENCES youtube_ads(id) ON DELETE CASCADE
            )
        `;
        await pool.query(queryHistory);
    },

    async findAllByCustomer(customerId, year, month) {
        // Build base query
        let sql = 'SELECT * FROM youtube_ads WHERE customer_id = ?';
        const params = [customerId];
        // If a year/month filter is supplied, constrain by start_date and end_date
        if (year && month) {
            const y = parseInt(year, 10);
            const m = parseInt(month, 10);
            // Compute first day of month (YYYY-MM-01) and last day of month
            const startDate = `${y}-${m.toString().padStart(2, '0')}-01`;
            // JavaScript: last day = new Date(year, month, 0)
            const lastDay = new Date(y, m, 0).getDate();
            const endDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
            sql += ' AND start_date >= ? AND end_date <= ?';
            params.push(startDate, endDate);
        }
        const [rows] = await pool.query(sql, params);
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM youtube_ads WHERE id = ?', [id]);
        return rows[0];
    },

    async findHistoryByAdId(youtubeAdId) {
        const [rows] = await pool.query(
            'SELECT * FROM youtube_ad_history WHERE youtube_ad_id = ? ORDER BY date ASC',
            [youtubeAdId]
        );
        return rows;
    },

    async createHistoryBatch(historyData) {
        if (historyData.length === 0) return;
        const query = `
            INSERT INTO youtube_ad_history (youtube_ad_id, date, impressions, views, clicks, cost, likes, comments)
            VALUES ?
            ON DUPLICATE KEY UPDATE
                impressions = VALUES(impressions),
                views = VALUES(views),
                clicks = VALUES(clicks),
                cost = VALUES(cost),
                likes = VALUES(likes),
                comments = VALUES(comments)
        `;
        await pool.query(query, [historyData]);
    }
};

// Initialize table
YoutubeAd.createTable().catch(err => console.error('Error creating youtube_ads & history tables:', err));

module.exports = YoutubeAd;
