const { pool } = require('../config/db');
const XLSX = require('xlsx');

/**
 * Format Excel date or string date to YYYY-MM-DD
 */
function parseDateValue(val) {
    if (!val) return null;
    if (typeof val === 'number') {
        // Excel serial date integer
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    // Handle DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
            // DD-MM-YYYY or MM-DD-YYYY
            const dOrM1 = parseInt(parts[0], 10);
            const dOrM2 = parseInt(parts[1], 10);
            const y = parts[2];
            if (dOrM1 > 12) {
                // First part is Day (DD-MM-YYYY)
                return `${y}-${String(dOrM2).padStart(2, '0')}-${String(dOrM1).padStart(2, '0')}`;
            } else {
                // Default to DD-MM-YYYY if ambiguous
                return `${y}-${String(dOrM2).padStart(2, '0')}-${String(dOrM1).padStart(2, '0')}`;
            }
        }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return null;
}

/**
 * Helper for Daily Tasks Role Scoping & Edit/Delete Authorization:
 * - View access: ALL users (Admin, Manager, User) can VIEW all active daily tasks and reports.
 * - Edit / Delete access:
 *   - Admin: can edit/delete any task.
 *   - Manager: can edit/delete tasks created by them, given by them, or belonging to workers in their team.
 *   - Regular User: can edit/delete ONLY their own tasks (created by them or assigned to them).
 */
async function buildRoleScope(user) {
    if (!user || user.role === 'admin') {
        return {
            clause: '',
            params: [],
            isManagerOrAdmin: true,
            canEditOrDelete: () => true
        };
    }

    const userId = Number(user.id);
    const username = user.username ? String(user.username).trim() : '';
    const email = user.email ? String(user.email).trim() : '';

    if (user.role === 'manager') {
        // Fetch team members reporting to this manager
        const [teamRows] = await pool.query(
            'SELECT id, username, email FROM users WHERE manager_id = ? OR id = ?',
            [userId, userId]
        );

        const teamUserIds = new Set([userId]);
        const teamUsernames = new Set();
        const teamEmails = new Set();

        teamRows.forEach(u => {
            if (u.id) teamUserIds.add(Number(u.id));
            if (u.username) teamUsernames.add(String(u.username).trim());
            if (u.email) teamEmails.add(String(u.email).trim());
        });

        const canEditOrDelete = (task) => {
            if (!task) return false;
            if (task.created_by && teamUserIds.has(Number(task.created_by))) return true;
            if (task.employee && (teamUsernames.has(task.employee.trim()) || teamEmails.has(task.employee.trim()))) return true;
            if (task.given_by && teamUsernames.has(task.given_by.trim())) return true;
            if (task.manager_name && teamUsernames.has(task.manager_name.trim())) return true;
            return false;
        };

        return { clause: '', params: [], isManagerOrAdmin: true, canEditOrDelete };
    } else {
        // Regular User Role: Can view all tasks, but edit/delete only own tasks
        const canEditOrDelete = (task) => {
            if (!task) return false;
            if (task.created_by && Number(task.created_by) === userId) return true;
            if (task.employee && (task.employee.trim() === username || task.employee.trim() === email)) return true;
            if (task.given_by && task.given_by.trim() === username) return true;
            return false;
        };

        return { clause: '', params: [], isManagerOrAdmin: false, canEditOrDelete };
    }
}

// @desc    Get Daily Tasks (All users can view all daily tasks)
// @route   GET /api/daily-tasks
// @access  Private
exports.getDailyTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            date = '',
            employee = '',
            department = '',
            theme = '',
            platform = '',
            page_name = '',
            manager_name = '',
            sortBy = 'date',
            sortOrder = 'DESC',
            todayOnly = 'false'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const offset = (pageNum - 1) * limitNum;

        const roleScope = await buildRoleScope(req.user);

        let query = 'SELECT * FROM daily_tasks WHERE status = "active"' + roleScope.clause;
        let countQuery = 'SELECT COUNT(*) as total FROM daily_tasks WHERE status = "active"' + roleScope.clause;
        const params = [...roleScope.params];

        if (todayOnly === 'true') {
            query += ' AND date = CURRENT_DATE()';
            countQuery += ' AND date = CURRENT_DATE()';
        }

        if (date) {
            query += ' AND date = ?';
            countQuery += ' AND date = ?';
            params.push(date);
        }
        if (employee) {
            query += ' AND employee = ?';
            countQuery += ' AND employee = ?';
            params.push(employee);
        }
        if (department) {
            query += ' AND department = ?';
            countQuery += ' AND department = ?';
            params.push(department);
        }
        if (theme) {
            query += ' AND theme = ?';
            countQuery += ' AND theme = ?';
            params.push(theme);
        }
        if (platform) {
            query += ' AND social_media_platform = ?';
            countQuery += ' AND social_media_platform = ?';
            params.push(platform);
        }
        if (page_name) {
            query += ' AND page_name = ?';
            countQuery += ' AND page_name = ?';
            params.push(page_name);
        }
        if (manager_name) {
            query += ' AND manager_name = ?';
            countQuery += ' AND manager_name = ?';
            params.push(manager_name);
        }
        if (search && search.trim() !== '') {
            const searchPattern = `%${search.trim()}%`;
            const searchClause = ` AND (theme LIKE ? OR employee LIKE ? OR department LIKE ? OR manager_name LIKE ? OR given_by LIKE ? OR page_name LIKE ? OR poster_name LIKE ? OR position LIKE ? OR location LIKE ? OR social_media_platform LIKE ?)`;
            query += searchClause;
            countQuery += searchClause;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Sorting whitelist
        const validSortFields = ['date', 'employee', 'department', 'theme', 'page_name', 'manager_name', 'created_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${sortField} ${order}, id DESC LIMIT ? OFFSET ?`;

        const queryParams = [...params, limitNum, offset];

        const [rows] = await pool.query(query, queryParams);
        const [[{ total }]] = await pool.query(countQuery, params);

        res.status(200).json({
            success: true,
            tasks: rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (error) {
        console.error('getDailyTasks Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single Daily Task by ID
// @route   GET /api/daily-tasks/:id
// @access  Private
exports.getDailyTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM daily_tasks WHERE id = ? AND status = "active"', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Daily Task not found.' });
        }
        res.status(200).json({ success: true, task: rows[0] });
    } catch (error) {
        console.error('getDailyTaskById Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a single Daily Task (Manual Entry)
// @route   POST /api/daily-tasks
// @access  Private
exports.createDailyTask = async (req, res) => {
    try {
        const {
            date,
            theme,
            social_media_platform,
            page_name,
            department,
            manager_name,
            given_by,
            employee,
            position,
            poster_name,
            location,
            facebook,
            instagram,
            linkedin,
            youtube,
            twitter
        } = req.body;

        const userId = req.user ? req.user.id : null;

        const parsedDate = parseDateValue(date);
        if (!parsedDate) {
            return res.status(400).json({ success: false, message: 'A valid Date (YYYY-MM-DD) is required.' });
        }

        if (!employee || employee.trim() === '') {
            return res.status(400).json({ success: false, message: 'Employee name is required.' });
        }

        const finalPosterName = poster_name ? poster_name.trim() : (position ? position.trim() : null);

        const [result] = await pool.query(
            `INSERT INTO daily_tasks (
                date, theme, social_media_platform, page_name, department, manager_name, given_by, 
                employee, position, poster_name, location, facebook, instagram, linkedin, youtube, twitter, 
                status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [
                parsedDate,
                theme || null,
                social_media_platform || null,
                page_name || null,
                department || null,
                manager_name || null,
                given_by || null,
                employee.trim(),
                position || finalPosterName,
                finalPosterName,
                location || null,
                facebook || null,
                instagram || null,
                linkedin || null,
                youtube || null,
                twitter || null,
                userId
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Daily Task created successfully.',
            taskId: result.insertId
        });
    } catch (error) {
        console.error('createDailyTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update an existing Daily Task (Authorized for Admin, Manager of team, or Task Creator/Assignee)
// @route   PUT /api/daily-tasks/:id
// @access  Private
exports.updateDailyTask = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            date,
            theme,
            social_media_platform,
            page_name,
            department,
            manager_name,
            given_by,
            employee,
            position,
            poster_name,
            location,
            facebook,
            instagram,
            linkedin,
            youtube,
            twitter
        } = req.body;

        const roleScope = await buildRoleScope(req.user);

        const [existing] = await pool.query('SELECT * FROM daily_tasks WHERE id = ? AND status = "active"', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Daily Task not found.' });
        }

        const task = existing[0];
        if (!roleScope.canEditOrDelete(task)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only edit your own daily tasks.' });
        }

        const fields = [];
        const params = [];

        if (date !== undefined) {
            const parsedDate = parseDateValue(date);
            if (!parsedDate) {
                return res.status(400).json({ success: false, message: 'Invalid Date format.' });
            }
            fields.push('date = ?');
            params.push(parsedDate);
        }

        if (theme !== undefined) { fields.push('theme = ?'); params.push(theme || null); }
        if (social_media_platform !== undefined) { fields.push('social_media_platform = ?'); params.push(social_media_platform || null); }
        if (page_name !== undefined) { fields.push('page_name = ?'); params.push(page_name || null); }
        if (department !== undefined) { fields.push('department = ?'); params.push(department || null); }
        if (manager_name !== undefined) { fields.push('manager_name = ?'); params.push(manager_name || null); }
        if (given_by !== undefined) { fields.push('given_by = ?'); params.push(given_by || null); }
        if (employee !== undefined) { fields.push('employee = ?'); params.push(employee || null); }
        if (position !== undefined) { fields.push('position = ?'); params.push(position || null); }
        if (poster_name !== undefined) { fields.push('poster_name = ?'); params.push(poster_name || null); }
        if (location !== undefined) { fields.push('location = ?'); params.push(location || null); }
        if (facebook !== undefined) { fields.push('facebook = ?'); params.push(facebook || null); }
        if (instagram !== undefined) { fields.push('instagram = ?'); params.push(instagram || null); }
        if (linkedin !== undefined) { fields.push('linkedin = ?'); params.push(linkedin || null); }
        if (youtube !== undefined) { fields.push('youtube = ?'); params.push(youtube || null); }
        if (twitter !== undefined) { fields.push('twitter = ?'); params.push(twitter || null); }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        params.push(id);
        await pool.query(`UPDATE daily_tasks SET ${fields.join(', ')} WHERE id = ?`, params);

        res.status(200).json({ success: true, message: 'Daily Task updated successfully.' });
    } catch (error) {
        console.error('updateDailyTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Soft Delete a Daily Task (status = 'deleted')
// @route   DELETE /api/daily-tasks/:id
// @access  Private
exports.deleteDailyTask = async (req, res) => {
    try {
        const { id } = req.params;
        const roleScope = await buildRoleScope(req.user);

        const [existing] = await pool.query('SELECT * FROM daily_tasks WHERE id = ? AND status = "active"', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Daily Task not found.' });
        }

        const task = existing[0];
        if (!roleScope.canEditOrDelete(task)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own daily tasks.' });
        }

        await pool.query('UPDATE daily_tasks SET status = "deleted" WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Daily Task deleted successfully.' });
    } catch (error) {
        console.error('deleteDailyTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload Excel for Bulk Daily Tasks Ingestion (Updated for 16 New Template Columns)
// @route   POST /api/daily-tasks/upload
// @access  Private
exports.uploadDailyTasksExcel = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        if (!req.file && (!req.body || !req.body.excelData)) {
            return res.status(400).json({ success: false, message: 'Excel file or parsed data is required.' });
        }

        let rows = [];
        if (req.file) {
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else if (req.body.excelData && Array.isArray(req.body.excelData)) {
            rows = req.body.excelData;
        }

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Excel file contains no data rows.' });
        }

        // Validate Compulsory Headers for 16 Columns template
        const requiredHeaders = [
            'Date', 'Themes', 'Social Media Platforms', 'Page name', 'Department', 
            'Manager Name', 'Given By', 'Employee', 'Poster Name', 'Location', 
            'Facebook', 'Instagram', 'LinkedIn', 'Youtube', 'Twitter'
        ];

        const firstRowKeys = Object.keys(rows[0]).map(k => k.trim());
        const missingHeaders = [];
        for (const reqH of requiredHeaders) {
            const hasHeader = firstRowKeys.some(k => 
                k.toLowerCase() === reqH.toLowerCase() || 
                k.toLowerCase().replace(/_/g, ' ') === reqH.toLowerCase().replace(/_/g, ' ') ||
                (reqH === 'Poster Name' && k.toLowerCase() === 'position') // Accept position as alias
            );
            if (!hasHeader) {
                missingHeaders.push(reqH);
            }
        }

        if (missingHeaders.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Excel header validation failed. Missing required columns: ${missingHeaders.join(', ')}`
            });
        }

        let totalRows = rows.length;
        let inserted = 0;
        let duplicate = 0;
        let failed = 0;
        const errors = [];

        await connection.beginTransaction();

        const userId = req.user ? req.user.id : null;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Excel line number (1-based header is line 1)

            // Extract row helper by key matching (handles trimmed key names with spaces like "Page name ")
            const getValue = (targetKey) => {
                const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === targetKey.toLowerCase());
                return foundKey ? row[foundKey] : '';
            };

            const rawDate = getValue('Date') || getValue('date');
            const theme = getValue('Themes') || getValue('Theme') || getValue('theme');
            const platform = getValue('Social Media Platforms') || getValue('social_media_platform') || getValue('Platform');
            const page_name = getValue('Page name') || getValue('page_name') || getValue('Page Name');
            const department = getValue('Department') || getValue('department');
            const manager_name = getValue('Manager Name') || getValue('manager_name');
            const given_by = getValue('Given By') || getValue('given_by');
            const employee = getValue('Employee') || getValue('employee');
            const poster_name = getValue('Poster Name') || getValue('poster_name') || getValue('Position') || getValue('position');
            const location = getValue('Location') || getValue('location');
            const facebook = getValue('Facebook') || getValue('facebook');
            const instagram = getValue('Instagram') || getValue('instagram');
            const linkedin = getValue('LinkedIn') || getValue('linkedin');
            const youtube = getValue('Youtube') || getValue('youtube') || getValue('YouTube');
            const twitter = getValue('Twitter') || getValue('twitter');

            // Skip completely empty rows
            const isEmpty = !rawDate && !theme && !employee && !department && !page_name && !facebook && !linkedin && !instagram && !youtube && !twitter;
            if (isEmpty) {
                totalRows--;
                continue;
            }

            // Date validation
            const parsedDate = parseDateValue(rawDate);
            if (!parsedDate) {
                failed++;
                errors.push({ row: rowNum, error: `Invalid date format: '${rawDate}'` });
                continue;
            }

            // Employee validation
            if (!employee || String(employee).trim() === '') {
                failed++;
                errors.push({ row: rowNum, error: 'Employee name is required.' });
                continue;
            }

            // Duplicate check against database
            const [existing] = await connection.query(
                `SELECT id FROM daily_tasks 
                 WHERE date = ? AND employee = ? AND status = "active" 
                   AND (theme = ? OR (theme IS NULL AND ? IS NULL))
                   AND (department = ? OR (department IS NULL AND ? IS NULL))
                   AND (page_name = ? OR (page_name IS NULL AND ? IS NULL))
                 LIMIT 1`,
                [
                    parsedDate, 
                    String(employee).trim(), 
                    theme ? String(theme).trim() : null, theme ? String(theme).trim() : null,
                    department ? String(department).trim() : null, department ? String(department).trim() : null,
                    page_name ? String(page_name).trim() : null, page_name ? String(page_name).trim() : null
                ]
            );

            if (existing.length > 0) {
                duplicate++;
                continue;
            }

            // Insert valid row with all 16 columns
            await connection.query(
                `INSERT INTO daily_tasks (
                    date, theme, social_media_platform, page_name, department, manager_name, given_by, 
                    employee, position, poster_name, location, facebook, instagram, linkedin, youtube, twitter, 
                    status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
                [
                    parsedDate,
                    theme ? String(theme).trim() : null,
                    platform ? String(platform).trim() : null,
                    page_name ? String(page_name).trim() : null,
                    department ? String(department).trim() : null,
                    manager_name ? String(manager_name).trim() : null,
                    given_by ? String(given_by).trim() : null,
                    String(employee).trim(),
                    poster_name ? String(poster_name).trim() : null,
                    poster_name ? String(poster_name).trim() : null,
                    location ? String(location).trim() : null,
                    facebook ? String(facebook).trim() : null,
                    instagram ? String(instagram).trim() : null,
                    linkedin ? String(linkedin).trim() : null,
                    youtube ? String(youtube).trim() : null,
                    twitter ? String(twitter).trim() : null,
                    userId
                ]
            );

            inserted++;
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Excel processing completed.',
            summary: {
                totalRows,
                inserted,
                duplicate,
                failed,
                errors
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('uploadDailyTasksExcel Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Get Daily Task Summary Reports & Breakdown Counters (Updated with Instagram, Page Name, and Manager Name breakdowns)
// @route   GET /api/daily-tasks/reports
// @access  Private
exports.getDailyTaskReports = async (req, res) => {
    try {
        const whereClause = ' WHERE status = "active"';

        // Overall KPIs
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM daily_tasks ${whereClause}`);
        const [[{ today }]] = await pool.query(`SELECT COUNT(*) as today FROM daily_tasks ${whereClause} AND date = CURRENT_DATE()`);
        const [[{ facebookCount }]] = await pool.query(`SELECT COUNT(*) as facebookCount FROM daily_tasks ${whereClause} AND (facebook IS NOT NULL AND facebook != "")`);
        const [[{ instagramCount }]] = await pool.query(`SELECT COUNT(*) as instagramCount FROM daily_tasks ${whereClause} AND (instagram IS NOT NULL AND instagram != "")`);
        const [[{ linkedinCount }]] = await pool.query(`SELECT COUNT(*) as linkedinCount FROM daily_tasks ${whereClause} AND (linkedin IS NOT NULL AND linkedin != "")`);
        const [[{ youtubeCount }]] = await pool.query(`SELECT COUNT(*) as youtubeCount FROM daily_tasks ${whereClause} AND (youtube IS NOT NULL AND youtube != "")`);
        const [[{ twitterCount }]] = await pool.query(`SELECT COUNT(*) as twitterCount FROM daily_tasks ${whereClause} AND (twitter IS NOT NULL AND twitter != "")`);

        // Department breakdown
        const [departmentCounts] = await pool.query(
            `SELECT COALESCE(department, 'General') as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} 
             GROUP BY department ORDER BY count DESC LIMIT 10`
        );

        // Employee breakdown
        const [employeeCounts] = await pool.query(
            `SELECT employee as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} AND employee IS NOT NULL AND employee != "" 
             GROUP BY employee ORDER BY count DESC LIMIT 10`
        );

        // Platform breakdown
        const [platformCounts] = await pool.query(
            `SELECT COALESCE(social_media_platform, 'General') as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} 
             GROUP BY social_media_platform ORDER BY count DESC LIMIT 10`
        );

        // Page Name breakdown
        const [pageCounts] = await pool.query(
            `SELECT COALESCE(page_name, 'General') as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} AND page_name IS NOT NULL AND page_name != ""
             GROUP BY page_name ORDER BY count DESC LIMIT 10`
        );

        // Manager breakdown
        const [managerCounts] = await pool.query(
            `SELECT COALESCE(manager_name, 'General') as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} AND manager_name IS NOT NULL AND manager_name != ""
             GROUP BY manager_name ORDER BY count DESC LIMIT 10`
        );

        // Theme breakdown
        const [themeCounts] = await pool.query(
            `SELECT COALESCE(theme, 'General') as name, COUNT(*) as count 
             FROM daily_tasks ${whereClause} 
             GROUP BY theme ORDER BY count DESC LIMIT 10`
        );

        res.status(200).json({
            success: true,
            summary: {
                totalTasks: total,
                todayTasks: today,
                facebookTasks: facebookCount,
                instagramTasks: instagramCount,
                linkedinTasks: linkedinCount,
                youtubeTasks: youtubeCount,
                twitterTasks: twitterCount
            },
            breakdown: {
                departmentCounts,
                employeeCounts,
                platformCounts,
                pageCounts,
                managerCounts,
                themeCounts
            }
        });
    } catch (error) {
        console.error('getDailyTaskReports Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export filtered Daily Tasks to Excel workbook buffer (Exact 16 columns matching template)
// @route   GET /api/daily-tasks/export
// @access  Private
exports.exportDailyTasks = async (req, res) => {
    try {
        const { date = '', employee = '', department = '', theme = '', platform = '', page_name = '', manager_name = '', search = '' } = req.query;

        let query = 'SELECT * FROM daily_tasks WHERE status = "active"';
        const params = [];

        if (date) { query += ' AND date = ?'; params.push(date); }
        if (employee) { query += ' AND employee = ?'; params.push(employee); }
        if (department) { query += ' AND department = ?'; params.push(department); }
        if (theme) { query += ' AND theme = ?'; params.push(theme); }
        if (platform) { query += ' AND social_media_platform = ?'; params.push(platform); }
        if (page_name) { query += ' AND page_name = ?'; params.push(page_name); }
        if (manager_name) { query += ' AND manager_name = ?'; params.push(manager_name); }
        if (search && search.trim() !== '') {
            const searchPattern = `%${search.trim()}%`;
            query += ' AND (theme LIKE ? OR employee LIKE ? OR department LIKE ? OR manager_name LIKE ? OR given_by LIKE ? OR page_name LIKE ? OR poster_name LIKE ? OR position LIKE ? OR location LIKE ? OR social_media_platform LIKE ?)';
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        query += ' ORDER BY date DESC, id DESC';

        const [rows] = await pool.query(query, params);

        const exportData = rows.map((r, idx) => ({
            'S.No': idx + 1,
            'Date': r.date ? (r.date.toISOString ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0]) : '',
            'Themes': r.theme || '',
            'Social Media Platforms': r.social_media_platform || '',
            'Page name': r.page_name || '',
            'Department': r.department || '',
            'Manager Name': r.manager_name || '',
            'Given By': r.given_by || '',
            'Employee': r.employee || '',
            'Poster Name': r.poster_name || r.position || '',
            'Location': r.location || '',
            'Facebook': r.facebook || '',
            'Instagram': r.instagram || '',
            'LinkedIn': r.linkedin || '',
            'Youtube': r.youtube || '',
            'Twitter': r.twitter || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Tasks');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=daily_tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.status(200).send(buffer);
    } catch (error) {
        console.error('exportDailyTasks Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Download sample/dummy Excel template for Daily Tasks upload (Exact 16 Columns matching team sheet)
// @route   GET /api/daily-tasks/sample-template
// @access  Private
exports.downloadSampleExcelTemplate = async (req, res) => {
    try {
        const sampleRows = [
            {
                'S.No': 1,
                'Date': new Date().toISOString().split('T')[0],
                'Themes': 'Creative',
                'Social Media Platforms': 'LinkedIn',
                'Page name': 'Shailesh Rajpal',
                'Department': 'Boss',
                'Manager Name': 'Deepali maam',
                'Given By': 'Tanya',
                'Employee': 'Harsh',
                'Poster Name': 'Senior Marketing Specialist',
                'Location': 'Delhi',
                'Facebook': 'https://facebook.com/example-post-1',
                'Instagram': 'https://instagram.com/example-post-1',
                'LinkedIn': 'https://linkedin.com/example-post-1',
                'Youtube': 'https://youtube.com/watch?v=sample1',
                'Twitter': 'https://x.com/example-tweet-1'
            },
            {
                'S.No': 2,
                'Date': new Date().toISOString().split('T')[0],
                'Themes': 'Hiring',
                'Social Media Platforms': 'Facebook',
                'Page name': 'White force',
                'Department': 'Onrole',
                'Manager Name': 'Juhi maam',
                'Given By': 'Shruti',
                'Employee': 'Mansi',
                'Poster Name': 'SEO Analyst',
                'Location': 'Noida',
                'Facebook': 'https://facebook.com/example-post-2',
                'Instagram': 'https://instagram.com/example-post-2',
                'LinkedIn': 'https://linkedin.com/example-post-2',
                'Youtube': 'https://youtube.com/watch?v=sample2',
                'Twitter': 'https://x.com/example-tweet-2'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Tasks Template');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=daily_tasks_upload_template.xlsx');
        res.status(200).send(buffer);
    } catch (error) {
        console.error('downloadSampleExcelTemplate Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
