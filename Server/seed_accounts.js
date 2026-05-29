const { pool } = require('./src/config/db');

async function seedAccounts() {
    try {
        console.log('Seeding LinkedIn Accounts...');
        await pool.query(
            `INSERT INTO linkedin_accounts (id, name, status, currency, total_spent) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)`,
            ['512891410', 'Mili Chauhan', 'ACTIVE', 'INR', 0.00]
        );
        
        await pool.query(
            `INSERT INTO linkedin_accounts (id, name, status, currency, total_spent) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)`,
            ['512893385', 'White Force Outsourcing Public Limited', 'ACTIVE', 'INR', 0.00]
        );
        
        console.log('Seeding successful!');
    } catch (err) {
        console.error('Error seeding accounts:', err.message);
    } finally {
        process.exit(0);
    }
}

seedAccounts();
