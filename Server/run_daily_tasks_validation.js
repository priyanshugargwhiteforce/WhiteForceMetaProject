require('dotenv').config();
const { pool } = require('./src/config/db');
const dailyTaskController = require('./src/controllers/dailyTask.controller');
const XLSX = require('xlsx');

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
    console.log('║        Daily Task Module Automated Test Suite        ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    let testTaskId = null;
    let testUserId = null;

    try {
        // Setup: Seed test user
        console.log('\n[Setup] Verifying test user & schema...');
        await pool.query(
            `INSERT INTO users (username, email, password, role, status)
             VALUES ('DailyTaskTester', 'dailytester@val.com', 'pwd123', 'admin', 'active')
             ON DUPLICATE KEY UPDATE role = 'admin'`
        );
        const [[u]] = await pool.query("SELECT id FROM users WHERE username = 'DailyTaskTester'");
        testUserId = u.id;

        // Ensure initSchema runs or daily_tasks exists
        const { initSchema } = require('./src/config/initSchema');
        await initSchema();

        // ── Test 1: Table schema structure verification ──────────────────────────
        console.log('\n[T1] Table schema validation for daily_tasks');
        const [columns] = await pool.query("SHOW COLUMNS FROM daily_tasks");
        const columnNames = columns.map(c => c.Field);

        const requiredCols = [
            'id', 'date', 'theme', 'social_media_platform', 'page_name', 'department', 
            'manager_name', 'given_by', 'employee', 'position', 'poster_name', 'location', 
            'facebook', 'instagram', 'linkedin', 'youtube', 'twitter', 'status', 'created_by', 
            'created_at', 'updated_at'
        ];

        requiredCols.forEach(col => {
            assert(columnNames.includes(col), `daily_tasks table contains ${col} column`);
        });


        // ── Test 2: Manual Creation & CRUD Lifecycle ─────────────────────────────
        console.log('\n[T2] Manual Daily Task creation & CRUD lifecycle');
        
        const createReq = {
            body: {
                date: '2026-08-04',
                theme: 'Creative',
                social_media_platform: 'LinkedIn',
                page_name: 'Shailesh Rajpal',
                department: 'Boss',
                manager_name: 'Deepali maam',
                given_by: 'Tanya',
                employee: 'Harsh',
                poster_name: 'Senior Marketing Specialist',
                location: 'Delhi',
                facebook: 'https://facebook.com/example-post-1',
                instagram: 'https://instagram.com/example-post-1',
                linkedin: 'https://linkedin.com/example-post-1',
                youtube: 'https://youtube.com/watch?v=sample1',
                twitter: 'https://x.com/example-tweet-1'
            },
            user: { id: testUserId }
        };

        let createCode = null, createRes = null;
        const mockCreateRes = {
            status: (code) => { createCode = code; return mockCreateRes; },
            json: (data) => { createRes = data; return mockCreateRes; }
        };

        await dailyTaskController.createDailyTask(createReq, mockCreateRes);
        assert(createCode === 201 && createRes.success === true, 'Manual Daily Task created via controller');
        testTaskId = createRes.taskId;
        assert(testTaskId > 0, `Task ID returned: ${testTaskId}`);

        // Fetch task details
        const [[row]] = await pool.query('SELECT * FROM daily_tasks WHERE id = ?', [testTaskId]);
        assert(row.employee === 'Harsh', 'Employee name stored correctly');
        assert(row.page_name === 'Shailesh Rajpal', 'Page Name stored correctly');
        assert(row.manager_name === 'Deepali maam', 'Manager Name stored correctly');
        assert(row.status === 'active', 'Default status is active');

        // Update task details
        const updateReq = {
            params: { id: testTaskId },
            body: { theme: 'Updated Creative', manager_name: 'Senior Manager' },
            user: { id: testUserId }
        };
        let updateCode = null, updateRes = null;
        const mockUpdateRes = {
            status: (code) => { updateCode = code; return mockUpdateRes; },
            json: (data) => { updateRes = data; return mockUpdateRes; }
        };
        await dailyTaskController.updateDailyTask(updateReq, mockUpdateRes);
        assert(updateCode === 200 && updateRes.success === true, 'Daily Task updated via controller');

        const [[updatedRow]] = await pool.query('SELECT theme, manager_name FROM daily_tasks WHERE id = ?', [testTaskId]);
        assert(updatedRow.theme === 'Updated Creative' && updatedRow.manager_name === 'Senior Manager', 'Theme & Manager Name updated in DB');


        // ── Test 3: Soft Delete Verification ───────────────────────────────────
        console.log('\n[T3] Soft Delete assertion');
        const deleteReq = { params: { id: testTaskId }, user: { id: testUserId } };
        let delCode = null, delRes = null;
        const mockDelRes = {
            status: (code) => { delCode = code; return mockDelRes; },
            json: (data) => { delRes = data; return mockDelRes; }
        };
        await dailyTaskController.deleteDailyTask(deleteReq, mockDelRes);
        assert(delCode === 200 && delRes.success === true, 'Soft Delete returned 200 success');

        const [[deletedRow]] = await pool.query('SELECT status FROM daily_tasks WHERE id = ?', [testTaskId]);
        assert(deletedRow.status === 'deleted', 'Record status updated to "deleted" (Soft Delete)');


        // ── Test 4: Excel Upload Processing & Duplicate Check ──────────────────
        console.log('\n[T4] Excel Upload bulk processing, empty row skipping & duplicate assertion');
        
        const mockExcelData = [
            // Row 1: Valid
            {
                'S.No': 1, 'Date': '2026-08-04', 'Themes': 'Brand Awareness', 'Social Media Platforms': 'LinkedIn',
                'Page name': 'Shailesh Rajpal', 'Department': 'Digital Marketing', 'Manager Name': 'Deepali maam',
                'Given By': 'Director', 'Employee': 'Alice Cooper', 'Poster Name': 'Content Creator',
                'Location': 'Delhi', 'Facebook': 'fb.com/a1', 'Instagram': 'ig.com/a1', 'LinkedIn': 'li.com/a1',
                'Youtube': 'yt.com/a1', 'Twitter': 'tw.com/a1'
            },
            // Row 2: Valid
            {
                'S.No': 2, 'Date': '2026-08-04', 'Themes': 'App Promotion', 'Social Media Platforms': 'YouTube',
                'Page name': 'White force', 'Department': 'Media', 'Manager Name': 'Juhi maam',
                'Given By': 'Lead', 'Employee': 'Bob Builder', 'Poster Name': 'Video Editor',
                'Location': 'Noida', 'Facebook': '', 'Instagram': '', 'LinkedIn': '',
                'Youtube': 'yt.com/b2', 'Twitter': ''
            },
            // Row 3: Duplicate of Row 1
            {
                'S.No': 3, 'Date': '2026-08-04', 'Themes': 'Brand Awareness', 'Social Media Platforms': 'LinkedIn',
                'Page name': 'Shailesh Rajpal', 'Department': 'Digital Marketing', 'Manager Name': 'Deepali maam',
                'Given By': 'Director', 'Employee': 'Alice Cooper', 'Poster Name': 'Content Creator',
                'Location': 'Delhi', 'Facebook': 'fb.com/a1', 'Instagram': 'ig.com/a1', 'LinkedIn': 'li.com/a1',
                'Youtube': 'yt.com/a1', 'Twitter': 'tw.com/a1'
            },
            // Row 4: Empty row (should be ignored)
            {
                'S.No': '', 'Date': '', 'Themes': '', 'Social Media Platforms': '',
                'Page name': '', 'Department': '', 'Manager Name': '', 'Given By': '',
                'Employee': '', 'Poster Name': '', 'Location': '', 'Facebook': '',
                'Instagram': '', 'LinkedIn': '', 'Youtube': '', 'Twitter': ''
            }
        ];

        const uploadReq = {
            body: { excelData: mockExcelData },
            user: { id: testUserId }
        };
        let upCode = null, upRes = null;
        const mockUpRes = {
            status: (code) => { upCode = code; return mockUpRes; },
            json: (data) => { upRes = data; return mockUpRes; }
        };

        await dailyTaskController.uploadDailyTasksExcel(uploadReq, mockUpRes);
        assert(upCode === 200 && upRes.success === true, 'Excel upload endpoint executed successfully');
        assert(upRes.summary.inserted === 2, `Inserted 2 valid rows (got ${upRes.summary.inserted})`);
        assert(upRes.summary.duplicate === 1, `Skipped 1 duplicate row (got ${upRes.summary.duplicate})`);
        assert(upRes.summary.totalRows === 3, `Ignored empty row, totalRows is 3 (got ${upRes.summary.totalRows})`);


        // ── Test 5: Reports Generation & Aggregation ────────────────────────────
        console.log('\n[T5] Daily Tasks Reports & Aggregation assertion');
        let repCode = null, repRes = null;
        const mockRepRes = {
            status: (code) => { repCode = code; return mockRepRes; },
            json: (data) => { repRes = data; return mockRepRes; }
        };

        await dailyTaskController.getDailyTaskReports({}, mockRepRes);
        assert(repCode === 200 && repRes.success === true, 'Reports API returned 200 success');
        assert(repRes.summary.totalTasks >= 2, `Total active daily tasks counted correctly (>= 2, got ${repRes.summary.totalTasks})`);
        assert(Array.isArray(repRes.breakdown.departmentCounts), 'Department breakdown array returned');
        assert(Array.isArray(repRes.breakdown.employeeCounts), 'Employee breakdown array returned');


        // ── Test 6: Filter, Search & Pagination Query API ────────────────────────
        console.log('\n[T6] Filter, Search, Sorting & Pagination query API assertion');
        let listCode = null, listRes = null;
        const mockListRes = {
            status: (code) => { listCode = code; return mockListRes; },
            json: (data) => { listRes = data; return mockListRes; }
        };

        await dailyTaskController.getDailyTasks({
            query: { page: '1', limit: '10', search: 'Alice', sortBy: 'employee', sortOrder: 'ASC' }
        }, mockListRes);

        assert(listCode === 200 && listRes.success === true, 'Get Daily Tasks search query returned 200 success');
        assert(listRes.tasks.length === 1 && listRes.tasks[0].employee === 'Alice Cooper', 'Filtered 1 record matching "Alice"');
        assert(listRes.pagination.total >= 1, 'Pagination total object returned');


        // ── Test 7: Export Daily Tasks Excel Generation ──────────────────────────
        console.log('\n[T7] Export Daily Tasks Excel workbook generation');
        let expHeader = {}, expBuffer = null, expCode = null;
        const mockExpRes = {
            setHeader: (name, val) => { expHeader[name] = val; },
            status: (code) => { expCode = code; return mockExpRes; },
            send: (buf) => { expBuffer = buf; return mockExpRes; }
        };

        await dailyTaskController.exportDailyTasks({ query: {} }, mockExpRes);
        assert(expCode === 200 && expBuffer !== null, 'Excel export returned Buffer');
        assert(expHeader['Content-Type'].includes('spreadsheetml'), 'Content-Type header set to Excel spreadsheet');
        
        // Verify buffer is valid Excel
        const exportedWb = XLSX.read(expBuffer, { type: 'buffer' });
        assert(exportedWb.SheetNames.includes('Daily Tasks'), 'Workbook sheet name matches "Daily Tasks"');


        // ── Test 8: Sample/Dummy Template Excel Generation ─────────────────────
        console.log('\n[T8] Sample Excel Template sheet generation assertion');
        let tmplHeader = {}, tmplBuffer = null, tmplCode = null;
        const mockTmplRes = {
            setHeader: (name, val) => { tmplHeader[name] = val; },
            status: (code) => { tmplCode = code; return mockTmplRes; },
            send: (buf) => { tmplBuffer = buf; return mockTmplRes; }
        };

        await dailyTaskController.downloadSampleExcelTemplate({}, mockTmplRes);
        assert(tmplCode === 200 && tmplBuffer !== null, 'Sample template endpoint returned Excel Buffer');
        
        const tmplWb = XLSX.read(tmplBuffer, { type: 'buffer' });
        assert(tmplWb.SheetNames.includes('Daily Tasks Template'), 'Template workbook contains "Daily Tasks Template" sheet');
        const tmplRows = XLSX.utils.sheet_to_json(tmplWb.Sheets['Daily Tasks Template']);
        assert(tmplRows.length === 2, 'Template contains sample pre-formatted rows');
        assert(tmplRows[0]['Employee'] === 'Harsh', 'Sample row contains pre-populated employee name');


        // ── Test 9: Daily Tasks Global View & Scoped Edit/Delete Permissions ─────
        console.log('\n[T9] Daily Tasks Global View & Scoped Edit/Delete Permissions assertion');
        
        // Seed Manager 1 & Team Worker 1
        await pool.query("INSERT INTO users (username, email, password, role) VALUES ('DailyTaskMgr1', 'dtmgr1@val.com', 'pwd', 'manager') ON DUPLICATE KEY UPDATE role='manager'");
        const [[mgr1]] = await pool.query("SELECT id, username, email, role FROM users WHERE username = 'DailyTaskMgr1'");
        
        await pool.query("INSERT INTO users (username, email, password, role, manager_id) VALUES ('DailyTaskWorker1', 'dtworker1@val.com', 'pwd', 'user', ?) ON DUPLICATE KEY UPDATE manager_id=?", [mgr1.id, mgr1.id]);
        const [[wrk1]] = await pool.query("SELECT id, username, email, role, manager_id FROM users WHERE username = 'DailyTaskWorker1'");

        // Seed Manager 2 & Team Worker 2
        await pool.query("INSERT INTO users (username, email, password, role) VALUES ('DailyTaskMgr2', 'dtmgr2@val.com', 'pwd', 'manager') ON DUPLICATE KEY UPDATE role='manager'");
        const [[mgr2]] = await pool.query("SELECT id, username, email, role FROM users WHERE username = 'DailyTaskMgr2'");
        
        await pool.query("INSERT INTO users (username, email, password, role, manager_id) VALUES ('DailyTaskWorker2', 'dtworker2@val.com', 'pwd', 'user', ?) ON DUPLICATE KEY UPDATE manager_id=?", [mgr2.id, mgr2.id]);
        const [[wrk2]] = await pool.query("SELECT id, username, email, role, manager_id FROM users WHERE username = 'DailyTaskWorker2'");

        // Insert Task 1 (Worker 1 under Mgr 1)
        const [t1Ins] = await pool.query(
            `INSERT INTO daily_tasks (date, theme, employee, department, status, created_by)
             VALUES ('2026-08-05', 'Team 1 Campaign', 'DailyTaskWorker1', 'Marketing', 'active', ?)`
            , [wrk1.id]
        );
        const task1Id = t1Ins.insertId;

        // Insert Task 2 (Worker 2 under Mgr 2)
        const [t2Ins] = await pool.query(
            `INSERT INTO daily_tasks (date, theme, employee, department, status, created_by)
             VALUES ('2026-08-05', 'Team 2 Campaign', 'DailyTaskWorker2', 'Sales', 'active', ?)`
            , [wrk2.id]
        );
        const task2Id = t2Ins.insertId;

        // Assertion 1: Regular Worker 1 can VIEW all tasks (including Task 2)
        let wrk1TasksCode = null, wrk1TasksRes = null;
        const mockWrk1Res = {
            status: (code) => { wrk1TasksCode = code; return mockWrk1Res; },
            json: (data) => { wrk1TasksRes = data; return mockWrk1Res; }
        };

        await dailyTaskController.getDailyTasks({
            query: { page: '1', limit: '100' },
            user: wrk1
        }, mockWrk1Res);

        assert(wrk1TasksCode === 200 && wrk1TasksRes.success === true, 'Worker 1 getDailyTasks returned 200');
        const wrk1TaskIds = wrk1TasksRes.tasks.map(t => t.id);
        assert(wrk1TaskIds.includes(task1Id) && wrk1TaskIds.includes(task2Id), 'Regular worker can view all daily tasks in system for complete reports/excel processing');

        // Assertion 2: Worker 1 CAN update their own Task 1
        let wrk1OwnUpdateCode = null;
        const mockWrk1OwnRes = {
            status: (code) => { wrk1OwnUpdateCode = code; return mockWrk1OwnRes; },
            json: () => mockWrk1OwnRes
        };

        await dailyTaskController.updateDailyTask({
            params: { id: task1Id },
            body: { theme: 'Worker 1 Updated Theme' },
            user: wrk1
        }, mockWrk1OwnRes);

        assert(wrk1OwnUpdateCode === 200, 'Worker 1 CAN update their own daily task');

        // Assertion 3: Worker 1 CANNOT update Worker 2 Task 2 (returns 403 Forbidden)
        let wrk1OtherUpdateCode = null;
        const mockWrk1OtherRes = {
            status: (code) => { wrk1OtherUpdateCode = code; return mockWrk1OtherRes; },
            json: () => mockWrk1OtherRes
        };

        await dailyTaskController.updateDailyTask({
            params: { id: task2Id },
            body: { theme: 'Unauthorized Edit' },
            user: wrk1
        }, mockWrk1OtherRes);

        assert(wrk1OtherUpdateCode === 403, 'Worker 1 CANNOT update someone else daily task (403 Forbidden)');

        // Assertion 4: Manager 1 trying to update Task 2 fails with 403 Forbidden
        let mgr1OtherUpdateCode = null;
        const mockMgr1UnauthRes = {
            status: (code) => { mgr1OtherUpdateCode = code; return mockMgr1UnauthRes; },
            json: () => mockMgr1UnauthRes
        };

        await dailyTaskController.updateDailyTask({
            params: { id: task2Id },
            body: { theme: 'Hacked Theme' },
            user: mgr1
        }, mockMgr1UnauthRes);

        assert(mgr1OtherUpdateCode === 403, 'Manager 1 update on unassigned Manager 2 team task correctly rejected with 403 Forbidden');

        // Assertion 5: Admin sees and updates all tasks
        const adminUser = { id: 1, username: 'AdminTester', role: 'admin' };
        let adminCode = null, adminRes = null;
        const mockAdminRes = {
            status: (code) => { adminCode = code; return mockAdminRes; },
            json: (data) => { adminRes = data; return mockAdminRes; }
        };

        await dailyTaskController.getDailyTasks({
            query: { page: '1', limit: '100' },
            user: adminUser
        }, mockAdminRes);

        const adminTaskIds = adminRes.tasks.map(t => t.id);
        assert(adminTaskIds.includes(task1Id) && adminTaskIds.includes(task2Id), 'Admin user sees tasks from ALL teams');

        // Cleanup T9
        await pool.query('DELETE FROM daily_tasks WHERE id IN (?, ?)', [task1Id, task2Id]);
        await pool.query('DELETE FROM users WHERE username IN ("DailyTaskMgr1", "DailyTaskWorker1", "DailyTaskMgr2", "DailyTaskWorker2")');

    } catch (err) {
        console.error('\n[FATAL ERROR IN TEST SUITE]:', err.message);
        failed++;
    } finally {
        // Cleanup test data
        console.log('\n[Cleanup] Cleaning up validation test data...');
        await pool.query('DELETE FROM daily_tasks WHERE theme LIKE "%Automation%" OR theme IN ("Brand Awareness", "App Promotion")');
        await pool.query("DELETE FROM users WHERE username = 'DailyTaskTester'");
        await pool.end();
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  Daily Tasks Results: ${passed} PASSED  |  ${failed} FAILED`);
    if (failed === 0) {
        console.log('║  🎉  Daily Task Module FULLY VALIDATED — Production Ready!');
    } else {
        console.log(`║  ⚠️   ${failed} validation issue(s) need attention.`);
    }
    console.log('╚══════════════════════════════════════════════════════╝');
    process.exit(failed > 0 ? 1 : 0);
}

run();
