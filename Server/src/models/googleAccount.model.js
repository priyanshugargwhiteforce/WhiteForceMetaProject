const { pool } = require('../config/db');

const GoogleAccount = {
    async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS google_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                google_account_id VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NULL,
                picture VARCHAR(500) NULL,
                refresh_token TEXT NOT NULL,
                access_token TEXT NULL,
                token_expires_at TIMESTAMP NULL,
                scopes TEXT NULL,
                status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_google_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await pool.query(query);

        // Migrations for existing table schema safely
        try { await pool.query("ALTER TABLE google_accounts ADD COLUMN user_id INT NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE google_accounts ADD COLUMN picture VARCHAR(500) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE google_accounts ADD COLUMN status ENUM('active', 'revoked', 'expired') DEFAULT 'active'"); } catch (e) {}
        try { await pool.query("ALTER TABLE google_accounts ADD CONSTRAINT fk_google_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"); } catch (e) {}
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT id, user_id, google_account_id, email, name, picture, token_expires_at, scopes, status, created_at, updated_at 
             FROM google_accounts WHERE id = ?`,
            [id]
        );
        return rows[0];
    },

    async findByIdWithTokens(id) {
        const [rows] = await pool.query(
            `SELECT * FROM google_accounts WHERE id = ?`,
            [id]
        );
        return rows[0];
    },

    async findByGoogleAccountId(googleAccountId) {
        const [rows] = await pool.query(
            `SELECT id, user_id, google_account_id, email, name, picture, token_expires_at, scopes, status, created_at, updated_at 
             FROM google_accounts WHERE google_account_id = ?`,
            [googleAccountId]
        );
        return rows[0];
    },

    async findAll(userId = null) {
        let query = `
            SELECT id, user_id, google_account_id, email, name, picture, token_expires_at, scopes, status, created_at, updated_at 
            FROM google_accounts
        `;
        const params = [];
        if (userId !== null) {
            query += ` WHERE user_id = ?`;
            params.push(userId);
        }
        query += ` ORDER BY created_at DESC`;

        const [rows] = await pool.query(query, params);
        return rows;
    },

    async upsertAccount({ user_id, google_account_id, email, name, picture, refresh_token, access_token, token_expires_at, scopes, status = 'active' }) {
        const query = `
            INSERT INTO google_accounts (user_id, google_account_id, email, name, picture, refresh_token, access_token, token_expires_at, scopes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                email = VALUES(email),
                name = VALUES(name),
                picture = VALUES(picture),
                refresh_token = IF(VALUES(refresh_token) IS NOT NULL AND VALUES(refresh_token) != '', VALUES(refresh_token), refresh_token),
                access_token = VALUES(access_token),
                token_expires_at = VALUES(token_expires_at),
                scopes = VALUES(scopes),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP
        `;
        const [result] = await pool.query(query, [
            user_id || null,
            google_account_id,
            email,
            name || null,
            picture || null,
            refresh_token,
            access_token || null,
            token_expires_at || null,
            scopes || null,
            status
        ]);
        return result;
    },

    async updateTokens(id, { access_token, token_expires_at, refresh_token = null, status = 'active' }) {
        let query = `UPDATE google_accounts SET access_token = ?, token_expires_at = ?, status = ?`;
        const params = [access_token, token_expires_at, status];

        if (refresh_token) {
            query += `, refresh_token = ?`;
            params.push(refresh_token);
        }

        query += ` WHERE id = ?`;
        params.push(id);

        const [result] = await pool.query(query, params);
        return result.affectedRows;
    },

    async updateStatus(id, status) {
        const [result] = await pool.query(
            `UPDATE google_accounts SET status = ? WHERE id = ?`,
            [status, id]
        );
        return result.affectedRows;
    },

    async delete(id, userId = null) {
        let query = `DELETE FROM google_accounts WHERE id = ?`;
        const params = [id];

        if (userId !== null) {
            query += ` AND user_id = ?`;
            params.push(userId);
        }

        const [result] = await pool.query(query, params);
        return result.affectedRows;
    }
};

// Initialize table
GoogleAccount.createTable().catch(err => console.error('Error creating google_accounts table:', err));

module.exports = GoogleAccount;
