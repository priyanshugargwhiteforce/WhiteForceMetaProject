const cron = require('node-cron');
const { pool } = require('../config/db');
const campaignsService = require('./whatsapp-campaigns.service');

/**
 * Clean & Format phone number into WhatsApp standard e.164 without + symbol
 * e.g. '9876543210' -> '919876543210'
 */
function cleanPhoneNumber(phoneStr) {
    if (!phoneStr) return null;
    let digits = String(phoneStr).replace(/\D/g, '');
    if (!digits) return null;
    
    // 10 digits Indian mobile number (e.g. 9876543210)
    if (digits.length === 10) {
        return '91' + digits;
    }
    // 11 digits with leading 0 (e.g. 09876543210)
    if (digits.length === 11 && digits.startsWith('0')) {
        return '91' + digits.slice(1);
    }
    // Already contains country code (e.g. 919876543210)
    if (digits.length >= 11) {
        return digits;
    }
    return digits;
}

/**
 * Checks for users who haven't updated daily tasks for targetDate,
 * and sends WhatsApp reminder template 'daily_task_not_update' to their Manager.
 */
async function checkAndSendMissingTaskReminders(overrideDate = null) {
    const todayStr = overrideDate || new Date().toISOString().split('T')[0];
    console.log(`\n[Daily Task Reminder] Running automated missing task check for Date: ${todayStr}...`);

    try {
        // 1. Fetch active team members and their assigned Managers
        const [activeUsers] = await pool.query(
            `SELECT 
                u.id AS employee_id, 
                u.username AS employee_name, 
                u.email AS employee_email, 
                m.id AS manager_id, 
                m.username AS manager_name, 
                m.phone AS manager_phone
             FROM users u
             INNER JOIN users m ON u.manager_id = m.id
             WHERE u.status = 'active' AND m.status = 'active'`
        );

        if (activeUsers.length === 0) {
            console.log('[Daily Task Reminder] No active users with assigned managers found.');
            return {
                success: true,
                date: todayStr,
                missingUsersCount: 0,
                managersNotified: 0,
                details: []
            };
        }

        // 2. Fetch users who HAVE logged daily tasks for today
        const [submittedTasks] = await pool.query(
            `SELECT DISTINCT created_by, LOWER(TRIM(employee)) AS employee_name
             FROM daily_tasks
             WHERE DATE(date) = ? AND status = 'active'`,
            [todayStr]
        );

        const submittedUserIds = new Set(submittedTasks.map(t => t.created_by).filter(Boolean));
        const submittedEmployeeNames = new Set(submittedTasks.map(t => t.employee_name).filter(Boolean));

        // 3. Filter users who have NOT submitted daily tasks today
        const missingUsers = activeUsers.filter(u => {
            const byId = submittedUserIds.has(u.employee_id);
            const byName = submittedEmployeeNames.has(String(u.employee_name).toLowerCase().trim());
            return !byId && !byName;
        });

        console.log(`[Daily Task Reminder] Total team members: ${activeUsers.length}, Submitted: ${activeUsers.length - missingUsers.length}, Missing: ${missingUsers.length}`);

        if (missingUsers.length === 0) {
            console.log('[Daily Task Reminder] All team members have updated their daily tasks today! No WhatsApp reminder needed.');
            return {
                success: true,
                date: todayStr,
                missingUsersCount: 0,
                managersNotified: 0,
                details: []
            };
        }

        // 4. Group missing users by Manager
        const managerGroups = {};
        for (const u of missingUsers) {
            if (!managerGroups[u.manager_id]) {
                managerGroups[u.manager_id] = {
                    managerId: u.manager_id,
                    managerName: u.manager_name,
                    rawPhone: u.manager_phone,
                    phone: cleanPhoneNumber(u.manager_phone),
                    missingEmployees: []
                };
            }
            managerGroups[u.manager_id].missingEmployees.push(u.employee_name);
        }

        // 5. Fetch template 'daily_task_not_update' from DB
        let [[templateObj]] = await pool.query(
            'SELECT id, name FROM whatsapp_templates WHERE name = "daily_task_not_update" AND status = "APPROVED" LIMIT 1'
        );

        if (!templateObj) {
            console.warn('[Daily Task Reminder] Template "daily_task_not_update" not found in DB. Auto-syncing templates from Meta...');
            const { getTemplates } = require('./whatsapp.service');
            await getTemplates(true);
            const [[syncedTmpl]] = await pool.query(
                'SELECT id, name FROM whatsapp_templates WHERE name = "daily_task_not_update" LIMIT 1'
            );
            templateObj = syncedTmpl;
        }

        if (!templateObj) {
            throw new Error('Template "daily_task_not_update" is not available on WhatsApp Business Account.');
        }

        // 6. Check/Create Default Contact List for campaign tracking
        let [[defaultList]] = await pool.query('SELECT id FROM whatsapp_contact_lists WHERE name = "Daily Task Reminders List" LIMIT 1');
        let defaultListId;
        if (!defaultList) {
            const [insertRes] = await pool.query('INSERT INTO whatsapp_contact_lists (name) VALUES ("Daily Task Reminders List")');
            defaultListId = insertRes.insertId;
        } else {
            defaultListId = defaultList.id;
        }

        const notificationResults = [];
        let managersNotified = 0;

        // 7. Dispatch WhatsApp message to each Manager
        for (const managerId of Object.keys(managerGroups)) {
            const group = managerGroups[managerId];
            
            if (!group.phone) {
                console.warn(`⚠️ [Daily Task Reminder] Manager "${group.managerName}" (ID: ${group.managerId}) has no valid WhatsApp mobile number in profile. Skipping.`);
                notificationResults.push({
                    managerId: group.managerId,
                    managerName: group.managerName,
                    missingEmployees: group.missingEmployees,
                    status: 'skipped',
                    reason: 'No phone number in profile'
                });
                continue;
            }

            try {
                // Send WhatsApp Template daily_task_not_update with parameter {{1}} = Manager Name
                const campaignName = `Daily Task Reminder - ${group.managerName} - ${todayStr}`;
                const recipients = [
                    {
                        number: group.phone,
                        parameters: [group.managerName]
                    }
                ];

                const campaignRes = await campaignsService.createCampaign({
                    configId: 0,
                    name: campaignName,
                    templateId: templateObj.id,
                    contactListId: defaultListId,
                    campaignType: 'broadcast',
                    status: 'queued',
                    recipients
                });

                console.log(`✅ [Daily Task Reminder] WhatsApp reminder queued for Manager "${group.managerName}" (${group.phone}) for ${group.missingEmployees.length} missing team member(s). Campaign ID: ${campaignRes.campaignId}`);
                managersNotified++;

                notificationResults.push({
                    managerId: group.managerId,
                    managerName: group.managerName,
                    phone: group.phone,
                    missingEmployees: group.missingEmployees,
                    campaignId: campaignRes.campaignId,
                    status: 'queued'
                });

            } catch (sendErr) {
                console.error(`❌ [Daily Task Reminder] Failed to queue WhatsApp for Manager "${group.managerName}":`, sendErr.message);
                notificationResults.push({
                    managerId: group.managerId,
                    managerName: group.managerName,
                    phone: group.phone,
                    missingEmployees: group.missingEmployees,
                    status: 'error',
                    error: sendErr.message
                });
            }
        }

        return {
            success: true,
            date: todayStr,
            missingUsersCount: missingUsers.length,
            managersNotified,
            details: notificationResults
        };

    } catch (err) {
        console.error('[Daily Task Reminder] Error executing checkAndSendMissingTaskReminders:', err.message);
        throw err;
    }
}

/**
 * Initialize 06:00 PM (18:00) Daily Cron Job
 * Cron Expression: '0 18 * * *' (Every day at 18:00 / 06:00 PM)
 */
function initDailyTaskCron() {
    // Schedule cron for 06:00 PM IST (or server local time)
    cron.schedule('0 18 * * *', async () => {
        console.log('⏰ [Cron Job Triggered] Daily Task 06:00 PM Reminder Check starting...');
        try {
            await checkAndSendMissingTaskReminders();
        } catch (err) {
            console.error('❌ [Cron Job Error] Failed to execute 06:00 PM Daily Task reminder:', err.message);
        }
    });

    console.log('✓ Daily Task 06:00 PM WhatsApp Reminder Cron Job initialized (Schedule: 0 18 * * *).');
}

module.exports = {
    checkAndSendMissingTaskReminders,
    initDailyTaskCron,
    cleanPhoneNumber
};
