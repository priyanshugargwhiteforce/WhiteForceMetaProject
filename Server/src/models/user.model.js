const { pool } = require('../config/db');

const User = {
    async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                status ENUM('active', 'hold', 'rejected') DEFAULT 'active',
                meta_access TINYINT(1) DEFAULT 0,
                google_access TINYINT(1) DEFAULT 0,
                whatsapp_access TINYINT(1) DEFAULT 0,
                linkedin_access TINYINT(1) DEFAULT 0,
                meta_publish TINYINT(1) DEFAULT 0,
                manager_id INT NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `;
        await pool.query(query);

        // Optional: Check if role and status columns exist (for migration of existing table)
        try {
            await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'hold', 'rejected') DEFAULT 'active'");
        } catch (e) { /* Column might exist */ }
        try { await pool.query("ALTER TABLE users ADD COLUMN meta_access TINYINT(1) DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN google_access TINYINT(1) DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN whatsapp_access TINYINT(1) DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN linkedin_access TINYINT(1) DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN meta_publish TINYINT(1) DEFAULT 0"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN manager_id INT NULL DEFAULT NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN department VARCHAR(255) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN designation VARCHAR(255) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL"); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN profile_image LONGTEXT NULL"); } catch (e) {}
    },

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async findByResetToken(token) {
        const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?', [token, new Date()]);
        return rows[0];
    },

    async create(userData) {
        const { username, email, password, role = 'user', status = 'active', meta_access = 0, google_access = 0, whatsapp_access = 0, linkedin_access = 0, meta_publish = 0, manager_id = null } = userData;
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access, meta_publish, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access, meta_publish, manager_id || null]
        );
        return result.insertId;
    },

    async findById(id) {
        const query = `
            SELECT u.id, u.username, u.email, u.role, u.status, u.meta_access, u.google_access, u.whatsapp_access, u.linkedin_access, u.meta_publish, u.manager_id, u.department, u.designation, u.phone, u.profile_image, mgr.username AS manager_name, u.created_at 
            FROM users u 
            LEFT JOIN users mgr ON u.manager_id = mgr.id 
            WHERE u.id = ?
        `;
        const [rows] = await pool.query(query, [id]);
        return rows[0];
    },

    async findAll(managerId = null) {
        let query = `
            SELECT u.id, u.username, u.email, u.role, u.status, u.meta_access, u.google_access, u.whatsapp_access, u.linkedin_access, u.meta_publish, u.manager_id, u.department, u.designation, u.phone, u.profile_image, mgr.username AS manager_name, u.created_at 
            FROM users u 
            LEFT JOIN users mgr ON u.manager_id = mgr.id
        `;
        const params = [];
        if (managerId !== null) {
            query += ' WHERE u.manager_id = ? OR u.id = ?';
            params.push(managerId, managerId);
        }
        query += ' ORDER BY u.created_at DESC';
        const [rows] = await pool.query(query, params);
        return rows;
    },

    async findManagers() {
        const [rows] = await pool.query("SELECT id, username, email FROM users WHERE role = 'manager' AND status = 'active' ORDER BY username ASC");
        return rows;
    },

    async update(id, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await pool.query(query, values);
        return result.affectedRows;
    },
    
    async delete(id) {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows;
    }
};

// Initialize table
User.createTable().catch(err => console.error('Error creating users table:', err));

module.exports = User;
