const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'meta_api_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL Database connected successfully');
        connection.release();
        
        // Initialize all integration tables/schema
        const { initSchema } = require('./initSchema');
        await initSchema();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, connectDB };

