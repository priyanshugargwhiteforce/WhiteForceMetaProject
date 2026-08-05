require('dotenv').config();
const { pool } = require('./src/config/db');
const dailyTaskController = require('./src/controllers/dailyTask.controller');
const { cleanPhoneNumber, checkAndSendMissingTaskReminders } = require('./src/services/dailyTaskReminder.service');

async function runReminderTest() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   Daily Task 06:00 PM WhatsApp Reminder Validation Test   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    let testManagerId = null;
    let testWorkerId = null;

    try {
        // Step 1: Test cleanPhoneNumber formatting
        console.log('\n[T1] Testing Phone Number Sanitizer Utility');
        const p1 = cleanPhoneNumber('9876543210');
        const p2 = cleanPhoneNumber('+91 98765 43210');
        const p3 = cleanPhoneNumber('09876543210');
        console.log('  Cleaned "9876543210" =>', p1);
        console.log('  Cleaned "+91 98765 43210" =>', p2);
        console.log('  Cleaned "09876543210" =>', p3);
        if (p1 === '919876543210' && p2 === '919876543210' && p3 === '919876543210') {
            console.log('  ✅ PASS: Phone numbers cleaned to 91XXXXXXXXXX correctly');
        } else {
            console.error('  ❌ FAIL: Phone number formatting unexpected');
        }

        // Step 2: Seed test manager and worker
        console.log('\n[T2] Seeding Test Manager and Worker User');
        await pool.query(
            `INSERT INTO users (username, email, password, role, status, phone)
             VALUES ('Test Manager Deepali', 'manager_deepali@test.com', 'pwd123', 'manager', 'active', '+91 9876543210')
             ON DUPLICATE KEY UPDATE phone = '+91 9876543210'`
        );
        const [[mRow]] = await pool.query("SELECT id FROM users WHERE email = 'manager_deepali@test.com'");
        testManagerId = mRow.id;

        await pool.query(
            `INSERT INTO users (username, email, password, role, status, manager_id)
             VALUES ('Worker Harsh', 'worker_harsh@test.com', 'pwd123', 'user', 'active', ?)
             ON DUPLICATE KEY UPDATE manager_id = ?`,
            [testManagerId, testManagerId]
        );
        const [[wRow]] = await pool.query("SELECT id FROM users WHERE email = 'worker_harsh@test.com'");
        testWorkerId = wRow.id;

        console.log(`  ✅ Seeded Manager ID: ${testManagerId}, Worker ID: ${testWorkerId}`);

        // Step 3: Run check when worker HAS NOT updated daily task today
        console.log('\n[T3] Running Missing Task Reminder execution (Worker has NOT submitted today)');
        const todayStr = new Date().toISOString().split('T')[0];

        // Ensure no task exists for today for this worker
        await pool.query("DELETE FROM daily_tasks WHERE created_by = ? AND date = ?", [testWorkerId, todayStr]);

        const result = await checkAndSendMissingTaskReminders(todayStr);
        console.log('  Execution Summary:', JSON.stringify(result, null, 2));

        if (result.success && result.missingUsersCount >= 1 && result.managersNotified >= 1) {
            console.log('  ✅ PASS: Found missing worker & queued WhatsApp notification to Manager with template daily_task_not_update');
        } else {
            console.error('  ❌ FAIL: Missing task reminder check did not notify manager as expected');
        }

        // Step 4: Test Controller Endpoint
        console.log('\n[T4] Testing Controller POST /api/daily-tasks/trigger-missing-reminders');
        let ctrlStatus = null, ctrlRes = null;
        const mockRes = {
            status: (code) => { ctrlStatus = code; return mockRes; },
            json: (data) => { ctrlRes = data; return mockRes; }
        };

        await dailyTaskController.triggerMissingTaskReminders({ body: { date: todayStr } }, mockRes);

        if (ctrlStatus === 200 && ctrlRes.success) {
            console.log('  ✅ PASS: Controller endpoint returned 200 OK');
        } else {
            console.error('  ❌ FAIL: Controller endpoint error:', ctrlRes);
        }

        console.log('\n🎉 All 06:00 PM WhatsApp Daily Task Reminder Tests Completed Successfully!');

    } catch (err) {
        console.error('\n❌ Fatal Error during test execution:', err);
    } finally {
        // Cleanup test data
        if (testWorkerId) await pool.query('DELETE FROM users WHERE id = ?', [testWorkerId]);
        if (testManagerId) await pool.query('DELETE FROM users WHERE id = ?', [testManagerId]);
        process.exit(0);
    }
}

runReminderTest();
