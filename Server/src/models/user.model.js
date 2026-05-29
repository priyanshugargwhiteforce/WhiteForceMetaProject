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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    },

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async create(userData) {
        const { username, email, password, role = 'user', status = 'active', meta_access = 0, google_access = 0, whatsapp_access = 0, linkedin_access = 0 } = userData;
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access]
        );
        return result.insertId;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT id, username, email, role, status, meta_access, google_access, whatsapp_access, linkedin_access, created_at FROM users WHERE id = ?', [id]);
        return rows[0];
    },

    async findAll() {
        const [rows] = await pool.query('SELECT id, username, email, role, status, meta_access, google_access, whatsapp_access, linkedin_access, created_at FROM users ORDER BY created_at DESC');
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
