const { pool } = require('./db');

const initSchema = async () => {
    try {
        console.log('Initializing database schema...');

        // 0. Meta Account Configurations (Multiple Tokens)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - meta_configs table created/verified');

        // 0b. WhatsApp Configurations (Multiple WABA Credentials)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone_number_id VARCHAR(100) NOT NULL,
                waba_id VARCHAR(100) NOT NULL,
                access_token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_configs table created/verified');

        // 1. Meta Ad Accounts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_ad_accounts (
                id VARCHAR(100) NOT NULL,
                config_id INT DEFAULT 0,
                name VARCHAR(255) NOT NULL,
                account_status INT DEFAULT 1,
                currency VARCHAR(10) DEFAULT 'INR',
                timezone_name VARCHAR(100),
                amount_spent BIGINT DEFAULT 0,
                balance BIGINT DEFAULT 0,
                created_time TIMESTAMP NULL,
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id, config_id)
            )
        `);
        console.log(' - meta_ad_accounts table created/verified');

        // Apply migrations safely for existing tables
        try {
            await pool.query("ALTER TABLE meta_ad_accounts ADD COLUMN config_id INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_ad_accounts DROP PRIMARY KEY, ADD PRIMARY KEY (id, config_id)");
        } catch (e) { /* PK might already be composite */ }

        // 2. Meta Account Insights Summary
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_account_insights (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                date_preset VARCHAR(50) NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                ctr DECIMAL(5, 2) DEFAULT 0.00,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_account_preset (account_id, date_preset)
            )
        `);
        console.log(' - meta_account_insights table created/verified');

        // 3. Meta Insights Daily/Trend Data
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_insights_trend (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                date_preset VARCHAR(50) NOT NULL,
                date_start DATE NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                ctr DECIMAL(5, 2) DEFAULT 0.00,
                cpc DECIMAL(15, 4) DEFAULT 0.00,
                cpm DECIMAL(15, 4) DEFAULT 0.00,
                cost_per_action_type JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_account_preset_date (account_id, date_preset, date_start)
            )
        `);
        console.log(' - meta_insights_trend table created/verified');

        // 4. Meta Ads Table (Stores ads, adset, and campaign info)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_ads (
                id VARCHAR(100) PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50),
                campaign_id VARCHAR(100),
                campaign_name VARCHAR(255),
                adset_id VARCHAR(100),
                adset_name VARCHAR(255),
                creative_id VARCHAR(100),
                ad_active_time INT DEFAULT 0,
                insights_impressions INT DEFAULT 0,
                insights_spend DECIMAL(15, 2) DEFAULT 0.00,
                raw_data JSON,
                owner_name VARCHAR(255) DEFAULT NULL,
                launch_date DATE DEFAULT NULL,
                owner_updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - meta_ads table created/verified');

        // 5. Meta Lead Forms Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_lead_forms (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255),
                status VARCHAR(50),
                leads_count INT DEFAULT 0,
                locale VARCHAR(20),
                created_time TIMESTAMP NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - meta_lead_forms table created/verified');

        // 6. Meta Leads Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_leads (
                lead_id VARCHAR(100) PRIMARY KEY,
                form_id VARCHAR(100) NOT NULL,
                ad_id VARCHAR(100),
                ad_name VARCHAR(255),
                adset_id VARCHAR(100),
                adset_name VARCHAR(255),
                platform VARCHAR(50),
                created_time TIMESTAMP NULL,
                full_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                city VARCHAR(100),
                street_address VARCHAR(255),
                job_title VARCHAR(255),
                field_data JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - meta_leads table created/verified');

        // Safe Alter queries for meta_leads migrations
        try {
            await pool.query("ALTER TABLE meta_leads ADD COLUMN ad_name VARCHAR(255)");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_leads ADD COLUMN adset_id VARCHAR(100)");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_leads ADD COLUMN adset_name VARCHAR(255)");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_leads ADD COLUMN platform VARCHAR(50)");
        } catch (e) { /* Column might exist */ }

        // Safe Alter queries for meta_ads migrations (Ad Owner fields)
        try {
            await pool.query("ALTER TABLE meta_ads ADD COLUMN owner_name VARCHAR(255) DEFAULT NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_ads ADD COLUMN launch_date DATE DEFAULT NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE meta_ads ADD COLUMN owner_updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP");
        } catch (e) { /* Column might exist */ }

        // 7. Google Ads Snapshots
        await pool.query(`
            CREATE TABLE IF NOT EXISTS google_ads_snapshots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(100) NOT NULL,
                date_preset VARCHAR(50) NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                conversions DECIMAL(15, 2) DEFAULT 0.00,
                graph_data JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_customer_preset (customer_id, date_preset)
            )
        `);
        console.log(' - google_ads_snapshots table created/verified');

        // 8. WhatsApp Phone Details
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_phone_details (
                phone_number_id VARCHAR(100) NOT NULL,
                config_id INT DEFAULT 0,
                waba_id VARCHAR(100) NOT NULL,
                display_phone_number VARCHAR(50),
                verified_name VARCHAR(255),
                quality_rating VARCHAR(50),
                name_status VARCHAR(100) DEFAULT 'NONE',
                raw_data JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (phone_number_id, config_id)
            )
        `);
        console.log(' - whatsapp_phone_details table created/verified');

        try {
            await pool.query("ALTER TABLE whatsapp_phone_details ADD COLUMN config_id INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_phone_details DROP PRIMARY KEY, ADD PRIMARY KEY (phone_number_id, config_id)");
        } catch (e) { /* PK might already be composite */ }
        try {
            await pool.query("ALTER TABLE whatsapp_phone_details ADD COLUMN name_status VARCHAR(100) DEFAULT 'NONE'");
        } catch (e) { /* Column might exist */ }

        // 9. WhatsApp Templates
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_templates (
                id VARCHAR(100) PRIMARY KEY,
                waba_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50),
                language VARCHAR(20),
                category VARCHAR(50),
                components JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_templates table created/verified');

        // Migration: Add variables JSON column if not exists
        try {
            await pool.query("ALTER TABLE whatsapp_templates ADD COLUMN variables JSON DEFAULT NULL");
            console.log(' - Added variables JSON column to whatsapp_templates');
        } catch (e) { /* Column might exist */ }

        // Migration: Create whatsapp_template_variables table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_template_variables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id VARCHAR(100) NOT NULL,
                variable_name VARCHAR(255) NOT NULL,
                component_type ENUM('header','body','button') NOT NULL,
                variable_position INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_template_variables table created/verified');

        // 10. WhatsApp Message Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number_id VARCHAR(100) NOT NULL,
                recipient_number VARCHAR(50) NOT NULL,
                template_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'sent',
                message_id VARCHAR(255),
                sent_by INT,
                error_message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_message_logs table created/verified');

        // 11. Meta Creatives Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_creatives (
                id VARCHAR(100) PRIMARY KEY,
                raw_data JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - meta_creatives table created/verified');

        // 12. Meta Single Ad Insights Daily Trend
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meta_ad_insights_trend (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ad_id VARCHAR(100) NOT NULL,
                date_start DATE NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                ctr DECIMAL(5, 2) DEFAULT 0.00,
                cpc DECIMAL(15, 4) DEFAULT 0.00,
                reach INT DEFAULT 0,
                actions JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_ad_date (ad_id, date_start)
            )
        `);
        console.log(' - meta_ad_insights_trend table created/verified');

        // 13. WhatsApp Channels Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_channels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                channel_name VARCHAR(255) NOT NULL,
                manager_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_channels table created/verified');

        // 14. WhatsApp Channel Daily Member Updates Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_channel_member_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                channel_id INT NOT NULL,
                member_count INT NOT NULL,
                update_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES whatsapp_channels(id) ON DELETE CASCADE,
                UNIQUE KEY uq_channel_date (channel_id, update_date)
            )
        `);
        console.log(' - whatsapp_channel_member_updates table created/verified');

        // --- Sprint 3: Contact Management Tables ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(255),
                email VARCHAR(255),
                company VARCHAR(255),
                opt_in_status BOOLEAN DEFAULT TRUE,
                opt_in_date DATETIME DEFAULT NULL,
                last_message_at DATETIME DEFAULT NULL,
                attributes JSON DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_contacts table created/verified');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_contact_lists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' - whatsapp_contact_lists table created/verified');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_contact_list_members (
                list_id INT NOT NULL,
                contact_id INT NOT NULL,
                PRIMARY KEY (list_id, contact_id),
                FOREIGN KEY (list_id) REFERENCES whatsapp_contact_lists(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_contact_list_members table created/verified');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_contact_tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contact_id INT NOT NULL,
                tag_name VARCHAR(100) NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
                UNIQUE KEY uq_contact_tag (contact_id, tag_name)
            )
        `);
        console.log(' - whatsapp_contact_tags table created/verified');

        // --- Sprint 4: Campaigns Tables ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_id INT DEFAULT 0,
                name VARCHAR(255) NOT NULL,
                template_id VARCHAR(100) NOT NULL,
                contact_list_id INT NOT NULL,
                campaign_type ENUM('broadcast', 'scheduled', 'recurring') DEFAULT 'broadcast',
                status ENUM('draft', 'queued', 'running', 'completed', 'failed', 'paused') DEFAULT 'draft',
                scheduled_time TIMESTAMP NULL DEFAULT NULL,
                timezone VARCHAR(50) DEFAULT 'UTC',
                cron_expression VARCHAR(100) NULL,
                parent_campaign_id INT NULL,
                job_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id),
                FOREIGN KEY (contact_list_id) REFERENCES whatsapp_contact_lists(id),
                FOREIGN KEY (parent_campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL
            )
        `);
        console.log(' - whatsapp_campaigns table created/verified');

        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD COLUMN config_id INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns MODIFY COLUMN status ENUM('draft', 'queued', 'running', 'completed', 'failed', 'paused') DEFAULT 'draft'");
        } catch (e) { /* Modify column might fail */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD COLUMN cron_expression VARCHAR(100) NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD COLUMN parent_campaign_id INT NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD COLUMN job_id VARCHAR(255) NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD CONSTRAINT fk_parent_campaign FOREIGN KEY (parent_campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL");
        } catch (e) { /* Constraint might exist */ }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                phone VARCHAR(50) NOT NULL,
                parameters JSON DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'queued',
                message_id VARCHAR(255) DEFAULT NULL,
                error_message TEXT DEFAULT NULL,
                sent_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_campaign_recipients table created/verified');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_campaign_stats (
                campaign_id INT PRIMARY KEY,
                total_count INT DEFAULT 0,
                sent_count INT DEFAULT 0,
                delivered_count INT DEFAULT 0,
                read_count INT DEFAULT 0,
                failed_count INT DEFAULT 0,
                delivery_rate DECIMAL(5,2) DEFAULT 0.00,
                read_rate DECIMAL(5,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_campaign_stats table created/verified');

        // --- Sprint 8: Analytics Cache & Indexes ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_campaign_analytics (
                campaign_id INT PRIMARY KEY,
                sent_count INT DEFAULT 0,
                delivered_count INT DEFAULT 0,
                read_count INT DEFAULT 0,
                failed_count INT DEFAULT 0,
                last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_campaign_analytics table created/verified');

        try {
            await pool.query("ALTER TABLE whatsapp_campaign_recipients ADD INDEX idx_wcr_message_id (message_id)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaign_recipients ADD INDEX idx_wcr_campaign_status (campaign_id, status)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_campaigns ADD INDEX idx_wc_type_status_created (campaign_type, status, created_at)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_message_logs ADD INDEX idx_wml_message_id (message_id)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_message_logs ADD INDEX idx_wml_status (status)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_message_logs ADD INDEX idx_wml_sent_at (sent_at)");
        } catch (e) { /* Index might exist */ }


        // --- Sprint 6 Mappings Table and Migration ---
        try {
            // Check if table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'whatsapp_template_mappings'");
            if (tables.length > 0) {
                // Table exists, check if 'mapping_name' column exists
                const [columns] = await pool.query("SHOW COLUMNS FROM whatsapp_template_mappings LIKE 'mapping_name'");
                if (columns.length === 0) {
                    console.log('Migrating legacy whatsapp_template_mappings to multi-profile schema...');
                    // Rename old table
                    await pool.query("ALTER TABLE whatsapp_template_mappings RENAME TO whatsapp_template_mappings_old");
                    
                    // Create new table
                    await pool.query(`
                        CREATE TABLE whatsapp_template_mappings (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            template_id VARCHAR(100) NOT NULL,
                            mapping_name VARCHAR(255) NOT NULL,
                            mappings JSON NOT NULL,
                            is_default BOOLEAN DEFAULT FALSE,
                            created_by INT NULL,
                            updated_by INT NULL,
                            last_used_at DATETIME NULL,
                            usage_count INT DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
                            UNIQUE KEY uq_template_mapping_name (template_id, mapping_name)
                        )
                    `);
                    
                    // Copy existing data as Default Mapping
                    await pool.query(`
                        INSERT INTO whatsapp_template_mappings (template_id, mapping_name, mappings, is_default)
                        SELECT template_id, 'Default Mapping', mappings, TRUE FROM whatsapp_template_mappings_old
                    `);
                    
                    // Drop old table
                    await pool.query("DROP TABLE whatsapp_template_mappings_old");
                    console.log('✓ Successfully migrated whatsapp_template_mappings table to multi-profile schema.');
                }
            } else {
                // Table does not exist, create fresh
                await pool.query(`
                    CREATE TABLE whatsapp_template_mappings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        template_id VARCHAR(100) NOT NULL,
                        mapping_name VARCHAR(255) NOT NULL,
                        mappings JSON NOT NULL,
                        is_default BOOLEAN DEFAULT FALSE,
                        created_by INT NULL,
                        updated_by INT NULL,
                        last_used_at DATETIME NULL,
                        usage_count INT DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
                        UNIQUE KEY uq_template_mapping_name (template_id, mapping_name)
                    )
                `);
                console.log(' - whatsapp_template_mappings table created/verified');
            }

            // Ensure Sprint 6 additions exist for users already running the new table schema
            try {
                await pool.query("ALTER TABLE whatsapp_template_mappings ADD COLUMN created_by INT NULL");
            } catch (e) { /* Column might exist */ }
            try {
                await pool.query("ALTER TABLE whatsapp_template_mappings ADD COLUMN updated_by INT NULL");
            } catch (e) { /* Column might exist */ }
            try {
                await pool.query("ALTER TABLE whatsapp_template_mappings ADD COLUMN last_used_at DATETIME NULL");
            } catch (e) { /* Column might exist */ }
            try {
                await pool.query("ALTER TABLE whatsapp_template_mappings ADD COLUMN usage_count INT DEFAULT 0");
            } catch (e) { /* Column might exist */ }

        } catch (migrationError) {
            console.error('Error running whatsapp_template_mappings migrations:', migrationError.message);
        }

        // 15. LinkedIn Ad Accounts (Existing compatibility)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_ad_accounts (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                currency VARCHAR(10) DEFAULT 'INR',
                total_spent DECIMAL(15, 2) DEFAULT 0.00,
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_ad_accounts table created/verified');

        // 16. LinkedIn Campaigns
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_campaigns (
                id VARCHAR(100) PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                campaign_group_id VARCHAR(100),
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50),
                type VARCHAR(50),
                total_spent DECIMAL(15, 2) DEFAULT 0.00,
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_campaigns table created/verified');
        try {
            await pool.query("ALTER TABLE linkedin_campaigns ADD COLUMN campaign_group_id VARCHAR(100)");
        } catch (e) { /* Column might exist */ }

        // 17. LinkedIn Daily Insights / Trends (Existing compatibility)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_insights_trend (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                date_start DATE NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                conversions INT DEFAULT 0,
                ctr DECIMAL(5, 2) DEFAULT 0.00,
                cpc DECIMAL(15, 4) DEFAULT 0.00,
                cpm DECIMAL(15, 4) DEFAULT 0.00,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_li_account_date (account_id, date_start)
            )
        `);
        console.log(' - linkedin_insights_trend table created/verified');

        // 18. LinkedIn Access/Refresh Tokens Vault
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_api_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_in INT,
                refresh_token_expires_in INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_api_tokens table created/verified');

        // 19. LinkedIn Live Accounts Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_accounts (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                currency VARCHAR(10) DEFAULT 'INR',
                total_spent DECIMAL(15, 2) DEFAULT 0.00,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_accounts table created/verified');

        // 20. LinkedIn Campaign Groups
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_campaign_groups (
                id VARCHAR(100) PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50),
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_campaign_groups table created/verified');

        // 21. LinkedIn Ads Individual Setup Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_ads (
                id VARCHAR(100) PRIMARY KEY,
                campaign_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50),
                type VARCHAR(50),
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_ads table created/verified');

        // 22. LinkedIn Ad-Level Daily Time-series Analytics
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_ad_analytics_daily (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ad_id VARCHAR(100) NOT NULL,
                account_id VARCHAR(100) NOT NULL,
                date_start DATE NOT NULL,
                spend DECIMAL(15, 2) DEFAULT 0.00,
                impressions INT DEFAULT 0,
                clicks INT DEFAULT 0,
                conversions INT DEFAULT 0,
                ctr DECIMAL(5, 2) DEFAULT 0.00,
                cpc DECIMAL(15, 4) DEFAULT 0.00,
                cpm DECIMAL(15, 4) DEFAULT 0.00,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_li_ad_date (ad_id, date_start)
            )
        `);
        console.log(' - linkedin_ad_analytics_daily table created/verified');

        // 23. LinkedIn Leads Data
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_leads (
                id VARCHAR(100) PRIMARY KEY,
                form_id VARCHAR(100) NOT NULL,
                form_name VARCHAR(255),
                ad_id VARCHAR(100),
                full_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                submitted_at TIMESTAMP NULL,
                field_data JSON,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log(' - linkedin_leads table created/verified');

        // 24. LinkedIn Demographic & Audience insights
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_audience_insights (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                key_name VARCHAR(255) NOT NULL,
                percentage DECIMAL(5, 2) DEFAULT 0.00,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_li_audience_key (account_id, category, key_name)
            )
        `);
        console.log(' - linkedin_audience_insights table created/verified');

        // 25. LinkedIn Sync Telemetry Logging Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linkedin_sync_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id VARCHAR(100) NOT NULL,
                sync_type VARCHAR(50) DEFAULT 'MANUAL',
                status VARCHAR(50) DEFAULT 'RUNNING',
                records_synced INT DEFAULT 0,
                error_message TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL
            )
        `);
        console.log(' - linkedin_sync_logs table created/verified');

        // Seed/Update initial LinkedIn tokens if needed
        const [tokenRows] = await pool.query('SELECT * FROM linkedin_api_tokens LIMIT 1');
        const defaultAccessToken = 'AQXZOSIj5Xy2guESTSXeAkLE_VYsLQQe41gNy-lNNBVyHudgHWAJzQNjY_biMWVTB8duxAD8urXOAQSv8Ku18M6pHoX55SiWBLpEmATBdyxmWJczmuD4Y1SZeWtk53u2IdC_4UQ6Ir_M9WxC6UAQTD6ou0nVvmL4IvDMgRnDc1G4bby8XWSz8x-WR6o-JeFBWdg90gCV18RES1EyJcNL4qTtftGHjXl_y_NFcbCCrVoRedQ2qcrmzDLXQCf3t-SUbNEjjaspgoY8lkHWGLnjjIQq0Z2iN3C7k5wJHNIWUj_jiKKkkPiW2_GRwZGI6SoAGFUNa95ljTO2VzkoJntfPM1j43FVjA';
        const defaultRefreshToken = 'AQWAL3rh-kQ7YQlkcdRbSyx4pRgQmjJEfXsUfiC8-ZXEHk6TnqSwshXGGKKtC2mM3UiHLrcp_y208BtDbP1nNpheJLC8LWf4g49rHNLU1FknTvQxVG5bjVSt9SBkl-ZXWY02K6pOglacxGfG5CtKJZVHCfKYRfafYyRTs8mAINoL6LlAYmQvRvkBe_OUcsDWZfLYMnMjPViLBQs47gXmL0_Ec481tj2ErVRdTQNN2g9aqkBmoTazpBDyz3Ya3S2Hhz7Uoc_7uh9gc48bGTRY4usr_y-Mv5M-RdBTgqaQliCUnbPIhoTQoeyiklUCoxxsWA4WFAVVqFwWmDScyB-jXhotr0ZE7Q';

        if (tokenRows.length === 0) {
            console.log('Seeding initial LinkedIn tokens...');
            await pool.query(
                `INSERT INTO linkedin_api_tokens (id, access_token, refresh_token, expires_in, refresh_token_expires_in)
                 VALUES (1, ?, ?, ?, ?)`,
                [defaultAccessToken, defaultRefreshToken, 5184000, 31536000]
            );
            console.log(' - linkedin_api_tokens seeded with user-provided bootstrap credentials');
        } else {
            console.log('LinkedIn tokens already exist in DB. Skipping seeder overwrite.');
        }

        // --- Template Sync Migration Job (Sprint 1) ---
        try {
            console.log('Running Template Sync Migration Job...');
            const [templates] = await pool.query('SELECT id, components FROM whatsapp_templates');
            for (const tmpl of templates) {
                const comps = typeof tmpl.components === 'string' ? JSON.parse(tmpl.components) : (tmpl.components || []);
                const extracted = [];
                
                comps.forEach(comp => {
                    const compType = String(comp.type).toLowerCase();
                    if (compType === 'body' && comp.text) {
                        const matches = [...comp.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
                        matches.forEach((match, index) => {
                            extracted.push({
                                name: match[1],
                                componentType: 'body',
                                position: index + 1
                            });
                        });
                    } else if (compType === 'header' && comp.format === 'TEXT' && comp.text) {
                        const matches = [...comp.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
                        matches.forEach((match, index) => {
                            extracted.push({
                                name: match[1],
                                componentType: 'header',
                                position: index + 1
                            });
                        });
                    } else if (compType === 'buttons' && Array.isArray(comp.buttons)) {
                        comp.buttons.forEach((btn, btnIdx) => {
                            if (btn.type === 'URL' && btn.url) {
                                const matches = [...btn.url.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
                                matches.forEach((match, index) => {
                                    extracted.push({
                                        name: match[1],
                                        componentType: 'button',
                                        position: btnIdx + 1
                                    });
                                });
                            }
                        });
                    }
                });

                // Clear legacy variable mapping logs for this template
                await pool.query('DELETE FROM whatsapp_template_variables WHERE template_id = ?', [tmpl.id]);

                // Insert into dedicated variable analytics table
                if (extracted.length > 0) {
                    const insertValues = extracted.map(v => [
                        tmpl.id,
                        v.name,
                        v.componentType,
                        v.position
                    ]);
                    await pool.query(
                        'INSERT INTO whatsapp_template_variables (template_id, variable_name, component_type, variable_position) VALUES ?',
                        [insertValues]
                    );
                }

                // Cache names in the templates JSON list
                const varNames = [...new Set(extracted.map(v => v.name))];
                await pool.query(
                    'UPDATE whatsapp_templates SET variables = ? WHERE id = ?',
                    [JSON.stringify(varNames), tmpl.id]
                );
            }
            console.log(`Template Sync Migration Job: Processed ${templates.length} templates successfully.`);
        } catch (migrationError) {
            console.error('Error running Template Sync Migration Job:', migrationError.message);
        }

        // --- Sprint 9: Contact Intelligence & Engagement Engine ---

        // Add engagement intelligence columns to whatsapp_contacts (safe migrations)
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN engagement_score DECIMAL(5,2) DEFAULT 0.00");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN total_sent INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN total_delivered INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN total_read INT DEFAULT 0");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN last_engaged_at DATETIME NULL");
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD COLUMN status ENUM('active','unsubscribed','archived') DEFAULT 'active'");
        } catch (e) { /* Column might exist */ }
        // Migrate legacy opt_in_status = false → status = 'unsubscribed'
        try {
            await pool.query("UPDATE whatsapp_contacts SET status = 'unsubscribed' WHERE opt_in_status = 0 AND status = 'active'");
        } catch (e) { /* Migration might fail safely */ }
        console.log(' - whatsapp_contacts engagement columns added/verified');

        // Create whatsapp_contact_activity table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_contact_activity (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contact_id INT NOT NULL,
                campaign_id INT NOT NULL,
                message_id VARCHAR(255),
                event_type ENUM('sent','delivered','read','failed','replied','unsubscribed') NOT NULL,
                metadata JSON,
                event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
                FOREIGN KEY (campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE
            )
        `);
        console.log(' - whatsapp_contact_activity table created/verified');

        // Indexes for whatsapp_contact_activity
        try {
            await pool.query("ALTER TABLE whatsapp_contact_activity ADD INDEX idx_wca_contact_event (contact_id, event_timestamp)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contact_activity ADD INDEX idx_wca_campaign_id (campaign_id)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contact_activity ADD INDEX idx_wca_message_id (message_id)");
        } catch (e) { /* Index might exist */ }
        // Index on engagement_score for fast segment queries
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD INDEX idx_wc_engagement_score (engagement_score)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE whatsapp_contacts ADD INDEX idx_wc_status (status)");
        } catch (e) { /* Index might exist */ }
        console.log(' - Sprint 9 indexes created/verified');

        // WABA Live pricing analytics (daily audit nodes)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_waba_pricing_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_id INT DEFAULT 0,
                waba_id VARCHAR(100) NOT NULL,
                start_time INT NOT NULL,
                end_time INT NOT NULL,
                country VARCHAR(10) NOT NULL,
                pricing_category VARCHAR(50) NOT NULL,
                volume INT DEFAULT 0,
                cost DECIMAL(15, 4) DEFAULT 0.0000,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_waba_pricing_point (config_id, start_time, country, pricing_category)
            )
        `);
        console.log(' - whatsapp_waba_pricing_analytics table created/verified');

        // --- Task Management Table ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                assigned_to INT NOT NULL,
                assigned_by INT NOT NULL,
                ad_platform VARCHAR(50) DEFAULT 'general',
                ad_id VARCHAR(255) DEFAULT NULL,
                ad_name VARCHAR(255) DEFAULT NULL,
                status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                due_date DATE DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log(' - tasks table created/verified');

        // Indexes for tasks table
        try {
            await pool.query("ALTER TABLE tasks ADD INDEX idx_tasks_assigned_to (assigned_to)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE tasks ADD INDEX idx_tasks_assigned_by (assigned_by)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE tasks ADD INDEX idx_tasks_status (status)");
        } catch (e) { /* Index might exist */ }
        try {
            await pool.query("ALTER TABLE tasks ADD INDEX idx_tasks_ad_id (ad_id)");
        } catch (e) { /* Index might exist */ }

        // --- User Hierarchy Migrations ---
        try {
            await pool.query("ALTER TABLE users ADD COLUMN manager_id INT NULL DEFAULT NULL");
            console.log(' - Added manager_id column to users table');
        } catch (e) { /* Column might exist */ }
        try {
            await pool.query("ALTER TABLE users ADD CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL");
            console.log(' - Added fk_user_manager foreign key constraint to users table');
        } catch (e) { /* Constraint might exist */ }

        console.log('Database schema initialization completed successfully.');
    } catch (error) {
        console.error('Error initializing database schema:', error.message);
        throw error;
    }
};


module.exports = { initSchema };
