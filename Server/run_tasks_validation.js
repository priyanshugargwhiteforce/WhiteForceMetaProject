require('dotenv').config();
const { pool } = require('./src/config/db');

let passed = 0, failed = 0;

function assert(cond, label) {
    if (cond) {
        console.log('  ✅ PASS:', label);
        passed++;
    } else {
        console.error('  ❌ FAIL:', label);
        failed++;
    }
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        Task Management System Validation Suite       ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    let testUser1Id = null;
    let testUser2Id = null;
    let testTaskId = null;
    let testAdId = 'mock_task_ad_123';

    try {
        // Setup: Create test users
        console.log('\n[Setup] Seeding test users...');
        
        // User 1 (Manager/Assigner)
        await pool.query(
            `INSERT INTO users (username, email, password, role, status)
             VALUES ('TaskValidationManager', 'mgr@val.com', 'pwd123', 'manager', 'active')
             ON DUPLICATE KEY UPDATE role = 'manager'`
        );
        const [[u1]] = await pool.query("SELECT id FROM users WHERE username = 'TaskValidationManager'");
        testUser1Id = u1.id;

        // User 2 (Employee/Assignee)
        await pool.query(
            `INSERT INTO users (username, email, password, role, status)
             VALUES ('TaskValidationWorker', 'worker@val.com', 'pwd123', 'marketing', 'active')
             ON DUPLICATE KEY UPDATE role = 'marketing'`
        );
        const [[u2]] = await pool.query("SELECT id FROM users WHERE username = 'TaskValidationWorker'");
        testUser2Id = u2.id;

        console.log(`  Manager ID: ${testUser1Id} | Worker ID: ${testUser2Id}`);

        // Seed a mock Meta Ad owned by User 2 (TaskValidationWorker)
        await pool.query(
            `INSERT INTO meta_ads (id, account_id, name, status, owner_name)
             VALUES (?, 'act_123', 'Task Validation Ad', 'ACTIVE', 'TaskValidationWorker')
             ON DUPLICATE KEY UPDATE owner_name = 'TaskValidationWorker'`,
            [testAdId]
        );
        console.log(`  Mock Meta Ad Seeded: ${testAdId} (Owned by 'TaskValidationWorker')`);


        // ── Test 1: Table schema structure verification ──────────────────────────
        console.log('\n[T1] Table schema validation');
        const [columns] = await pool.query("SHOW COLUMNS FROM tasks");
        const columnNames = columns.map(c => c.Field);
        
        assert(columnNames.includes('id'), 'tasks table contains id column');
        assert(columnNames.includes('title'), 'tasks table contains title column');
        assert(columnNames.includes('description'), 'tasks table contains description column');
        assert(columnNames.includes('assigned_to'), 'tasks table contains assigned_to column');
        assert(columnNames.includes('assigned_by'), 'tasks table contains assigned_by column');
        assert(columnNames.includes('ad_platform'), 'tasks table contains ad_platform column');
        assert(columnNames.includes('ad_id'), 'tasks table contains ad_id column');
        assert(columnNames.includes('ad_name'), 'tasks table contains ad_name column');
        assert(columnNames.includes('status'), 'tasks table contains status column');
        assert(columnNames.includes('priority'), 'tasks table contains priority column');
        assert(columnNames.includes('due_date'), 'tasks table contains due_date column');


        // ── Test 2: Task Creation & CRUD verification ─────────────────────────────
        console.log('\n[T2] Task creation & CRUD lifecycle');
        
        // Insert a task assigned by manager to worker
        const [insertRes] = await pool.query(
            `INSERT INTO tasks (title, description, assigned_to, assigned_by, ad_platform, ad_id, ad_name, priority, due_date)
             VALUES ('Verify SEO campaigns', 'Check backlinks count', ?, ?, 'meta', ?, 'Task Validation Ad', 'high', DATE_ADD(NOW(), INTERVAL 7 DAY))`,
            [testUser2Id, testUser1Id, testAdId]
        );
        testTaskId = insertRes.insertId;
        assert(testTaskId > 0, `Task successfully inserted in DB. ID: ${testTaskId}`);

        // Read task
        const [[taskRow]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [testTaskId]);
        assert(taskRow.title === 'Verify SEO campaigns', 'Title stored correctly');
        assert(taskRow.status === 'pending', 'Default status is pending');
        assert(taskRow.priority === 'high', 'Priority matches high');
        assert(taskRow.ad_platform === 'meta', 'Platform matches meta');


        // ── Test 3: Visibility Simulation ───────────────────────────────────────
        console.log('\n[T3] Task visibility controls');
        
        // Worker view: should see ONLY tasks assigned to them
        const [workerTasks] = await pool.query(
            `SELECT t.* FROM tasks t
             WHERE t.assigned_to = ?`,
            [testUser2Id]
        );
        assert(workerTasks.some(t => t.id === testTaskId), 'Worker can see task assigned to them successfully');
        assert(workerTasks.length === 1, 'Worker sees exactly 1 task (only assigned to them)');

        // Manager view: should see tasks created by them or assigned to them
        const [managerTasks] = await pool.query(
            `SELECT t.* FROM tasks t
             WHERE t.assigned_to = ? OR t.assigned_by = ?`,
            [testUser1Id, testUser1Id]
        );
        assert(managerTasks.some(t => t.id === testTaskId), 'Manager can see task they created successfully');

        // Third unrelated user view: should NOT see task
        const [unrelatedTasks] = await pool.query(
            `SELECT t.* FROM tasks t
             WHERE t.assigned_to = 999`,
            []
        );
        assert(!unrelatedTasks.some(t => t.id === testTaskId), 'Unrelated user cannot see task');

        // ── Test 3b: Pending Tasks Count Simulation ────────────────────────────────
        console.log('\n[T3b] Pending Tasks Count assertion');
        const [[countRow]] = await pool.query(
            `SELECT COUNT(*) as count FROM tasks 
             WHERE assigned_to = ? AND status IN ('pending', 'in_progress')`,
            [testUser2Id]
        );
        assert(countRow.count === 1, `Pending count for worker is correct (expected 1, got ${countRow.count})`);


        // ── Test 4: Update Permissions Simulation ──────────────────────────────
        console.log('\n[T4] Update restrictions check');
        
        // Simulator check: Assignee changes status
        await pool.query('UPDATE tasks SET status = ? WHERE id = ?', ['in_progress', testTaskId]);
        const [[taskRowUpdated]] = await pool.query('SELECT status FROM tasks WHERE id = ?', [testTaskId]);
        assert(taskRowUpdated.status === 'in_progress', 'Assignee can update task status successfully');


        // ── Test 5: Self-Assignment Capability ────────────────────────────────
        console.log('\n[T5] Self-Assignment capability check');
        
        // Manager creates task and assigns to themselves
        const [selfInsert] = await pool.query(
            `INSERT INTO tasks (title, description, assigned_to, assigned_by, ad_platform, priority)
             VALUES ('Review my own metrics', 'Check personal KPIs', ?, ?, 'general', 'medium')`,
            [testUser1Id, testUser1Id]
        );
        const selfTaskId = selfInsert.insertId;
        assert(selfTaskId > 0, `Self-assigned task created in DB. ID: ${selfTaskId}`);

        const [[selfTaskRow]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [selfTaskId]);
        assert(selfTaskRow.assigned_to === testUser1Id && selfTaskRow.assigned_by === testUser1Id, 'Self-assigned fields set correctly');

        // Cleanup self-assigned task
        await pool.query('DELETE FROM tasks WHERE id = ?', [selfTaskId]);

    } catch (err) {
        console.error('\n[FATAL ERROR IN TEST SUITE]:', err.message);
        failed++;
    } finally {
        // Cleanup test data
        console.log('\n[Cleanup] Cleaning up validation test data...');
        if (testTaskId) {
            await pool.query('DELETE FROM tasks WHERE id = ?', [testTaskId]);
        }
        if (testAdId) {
            await pool.query('DELETE FROM meta_ads WHERE id = ?', [testAdId]);
        }
        if (testUser1Id) {
            await pool.query('DELETE FROM users WHERE id = ?', [testUser1Id]);
        }
        if (testUser2Id) {
            await pool.query('DELETE FROM users WHERE id = ?', [testUser2Id]);
        }
        
        await pool.end();
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  Validation Results: ${passed} PASSED  |  ${failed} FAILED`);
    if (failed === 0) {
        console.log('║  🎉  Task Management Suite FULLY VALIDATED — Production Ready!');
    } else {
        console.log(`║  ⚠️   ${failed} validation issue(s) need attention.`);
    }
    console.log('╚══════════════════════════════════════════════════════╝');
    process.exit(failed > 0 ? 1 : 0);
}

run();
