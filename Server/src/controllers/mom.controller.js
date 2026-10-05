const { pool } = require('../config/db');

// Helper to format date into YYYY-MM-DD
const formatDateStr = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toISOString().split('T')[0];
};

// Helper to get day name (e.g., 'Tuesday')
const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return days[d.getDay()];
};

// @desc    Get all MoM records with role hierarchy filtering
// @route   GET /api/moms
// @access  Private
exports.getMoMs = async (req, res) => {
    try {
        const { department, search } = req.query;
        const user = req.user;

        let query = `
            SELECT id, title, department, 
                   DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date, 
                   meeting_day, meeting_with, custom_meeting_with, attendees, agenda, 
                   discussion_points, created_by, created_by_name, creator_manager_id, 
                   status, created_at, updated_at
            FROM meeting_moms
            WHERE is_deleted = 0
        `;
        const queryParams = [];

        // Role & Team Access Control
        if (user.role === 'admin') {
            // Admin sees all MoMs across the entire company
        } else if (user.role === 'manager') {
            // Manager sees MoMs created by themselves OR by their team members (where creator_manager_id = manager.id)
            query += ` AND (created_by = ? OR creator_manager_id = ?)`;
            queryParams.push(user.id, user.id);
        } else {
            // Worker/User sees MoMs created by themselves, created by their manager, OR created by any teammate under the same manager
            if (user.manager_id) {
                query += ` AND (created_by = ? OR created_by = ? OR creator_manager_id = ?)`;
                queryParams.push(user.id, user.manager_id, user.manager_id);
            } else {
                query += ` AND created_by = ?`;
                queryParams.push(user.id);
            }
        }

        // Department Filter
        if (department && department !== 'All') {
            query += ` AND department = ?`;
            queryParams.push(department);
        }

        // Search Filter
        if (search && search.trim() !== '') {
            const searchPattern = `%${search.trim()}%`;
            query += ` AND (title LIKE ? OR attendees LIKE ? OR agenda LIKE ? OR created_by_name LIKE ?)`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY meeting_date DESC, created_at DESC`;

        const [rows] = await pool.query(query, queryParams);

        // Parse discussion_points JSON if string
        const formattedRows = rows.map(r => {
            let points = [];
            try {
                points = typeof r.discussion_points === 'string' 
                    ? JSON.parse(r.discussion_points) 
                    : (r.discussion_points || []);
            } catch (e) {
                points = [];
            }
            return {
                ...r,
                discussion_points: points
            };
        });

        res.status(200).json({
            success: true,
            count: formattedRows.length,
            data: formattedRows
        });
    } catch (error) {
        console.error('getMoMs Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch MoMs: ' + error.message
        });
    }
};

// @desc    Get single MoM record by ID
// @route   GET /api/moms/:id
// @access  Private
exports.getMoMById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT id, title, department, 
                    DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date, 
                    meeting_day, meeting_with, custom_meeting_with, attendees, agenda, 
                    discussion_points, created_by, created_by_name, creator_manager_id, 
                    status, created_at, updated_at
             FROM meeting_moms
             WHERE id = ? AND is_deleted = 0`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'MoM record not found.'
            });
        }

        const record = rows[0];
        let points = [];
        try {
            points = typeof record.discussion_points === 'string' 
                ? JSON.parse(record.discussion_points) 
                : (record.discussion_points || []);
        } catch (e) {
            points = [];
        }

        res.status(200).json({
            success: true,
            data: {
                ...record,
                discussion_points: points
            }
        });
    } catch (error) {
        console.error('getMoMById Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch MoM record: ' + error.message
        });
    }
};

// @desc    Get assignable users for MoM task creation based on team hierarchy
// @route   GET /api/moms/assignable-users
// @access  Private
exports.getMoMAssignableUsers = async (req, res) => {
    try {
        const user = req.user;
        let query = 'SELECT id, username, email, role, manager_id FROM users WHERE status = "active"';
        const params = [];

        if (user.role === 'admin') {
            // Admin sees all active users across company
        } else if (user.role === 'manager') {
            // Manager sees self + team members reporting to them
            query += ' AND (id = ? OR manager_id = ?)';
            params.push(user.id, user.id);
        } else {
            // Team User sees self + manager + teammates under same manager
            if (user.manager_id) {
                query += ' AND (id = ? OR id = ? OR manager_id = ?)';
                params.push(user.id, user.manager_id, user.manager_id);
            } else {
                query += ' AND id = ?';
                params.push(user.id);
            }
        }

        query += ' ORDER BY username ASC';
        const [users] = await pool.query(query, params);
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('getMoMAssignableUsers Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new MoM record
// @route   POST /api/moms
// @access  Private
exports.createMoM = async (req, res) => {
    try {
        const {
            title,
            department,
            meeting_date,
            meeting_day,
            meeting_with,
            custom_meeting_with,
            attendees,
            agenda,
            discussion_points
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Meeting Title is required.'
            });
        }

        if (!meeting_date) {
            return res.status(400).json({
                success: false,
                message: 'Meeting Date is required.'
            });
        }

        const formattedDate = formatDateStr(meeting_date);
        const dayName = meeting_day || getDayName(formattedDate);
        const deptVal = department || 'Other';
        const withVal = meeting_with || 'CEO Shailesh Rajpal';
        const customWith = withVal === 'Other' ? (custom_meeting_with || '') : null;

        let pointsArray = Array.isArray(discussion_points) ? discussion_points : [];
        if (typeof discussion_points === 'string') {
            try {
                pointsArray = JSON.parse(discussion_points);
            } catch (e) {
                pointsArray = [];
            }
        }

        const pointsJson = JSON.stringify(pointsArray);

        const createdBy = req.user.id;
        const createdByName = req.user.username || req.user.email || 'User';
        const creatorManagerId = req.user.manager_id || null;

        const [result] = await pool.query(
            `INSERT INTO meeting_moms 
                (title, department, meeting_date, meeting_day, meeting_with, custom_meeting_with, attendees, agenda, discussion_points, created_by, created_by_name, creator_manager_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                deptVal,
                formattedDate,
                dayName,
                withVal,
                customWith,
                attendees ? attendees.trim() : '',
                agenda ? agenda.trim() : '',
                pointsJson,
                createdBy,
                createdByName,
                creatorManagerId
            ]
        );

        // Auto-create tasks for assigned discussion points
        let createdTasksCount = 0;
        if (Array.isArray(pointsArray)) {
            for (const pt of pointsArray) {
                if (pt.assign_to && Number(pt.assign_to) > 0) {
                    const taskTitle = pt.topic ? `[MoM Task] ${pt.topic}` : `[MoM Task] ${title.trim()}`;
                    let subPointsText = '';
                    if (Array.isArray(pt.sub_points) && pt.sub_points.length > 0) {
                        subPointsText = pt.sub_points.map(s => `- ${s}`).join('\n');
                    } else {
                        subPointsText = `- ${pt.topic || 'Action Decision'}`;
                    }
                    const taskDesc = `MoM Ref: MOM-#${result.insertId} (${deptVal} Dept)\nMeeting Date: ${formattedDate}\n\nAction Sub-points:\n${subPointsText}`;
                    const taskPriority = (pt.priority || 'medium').toLowerCase();

                    await pool.query(
                        `INSERT INTO tasks (title, description, assigned_to, assigned_by, ad_platform, priority, due_date, status)
                         VALUES (?, ?, ?, ?, 'general', ?, ?, 'pending')`,
                        [taskTitle, taskDesc, Number(pt.assign_to), createdBy, taskPriority, formattedDate]
                    );
                    createdTasksCount++;
                }
            }
        }

        res.status(201).json({
            success: true,
            message: createdTasksCount > 0 
                ? `Minutes of Meeting saved successfully and ${createdTasksCount} Action Task(s) assigned.`
                : 'Minutes of Meeting (MoM) saved successfully.',
            momId: result.insertId,
            tasksCreated: createdTasksCount
        });
    } catch (error) {
        console.error('createMoM Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create MoM: ' + error.message
        });
    }
};

// @desc    Update existing MoM record
// @route   PUT /api/moms/:id
// @access  Private
exports.updateMoM = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            department,
            meeting_date,
            meeting_day,
            meeting_with,
            custom_meeting_with,
            attendees,
            agenda,
            discussion_points
        } = req.body;

        const [existing] = await pool.query(`SELECT * FROM meeting_moms WHERE id = ? AND is_deleted = 0`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'MoM record not found.'
            });
        }

        const record = existing[0];
        // Access Check: Admin can edit any, creator can edit, manager of creator can edit
        if (req.user.role !== 'admin' && record.created_by !== req.user.id && record.creator_manager_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to edit this MoM record.'
            });
        }

        const formattedDate = meeting_date ? formatDateStr(meeting_date) : record.meeting_date;
        const dayName = meeting_day || getDayName(formattedDate);
        const deptVal = department || record.department;
        const withVal = meeting_with || record.meeting_with;
        const customWith = withVal === 'Other' ? (custom_meeting_with || '') : null;

        let pointsArray = discussion_points !== undefined ? (Array.isArray(discussion_points) ? discussion_points : []) : record.discussion_points;
        if (typeof discussion_points === 'string') {
            try {
                pointsArray = JSON.parse(discussion_points);
            } catch (e) {
                pointsArray = [];
            }
        }

        const pointsJson = JSON.stringify(pointsArray);

        await pool.query(
            `UPDATE meeting_moms 
             SET title = ?, department = ?, meeting_date = ?, meeting_day = ?, meeting_with = ?, 
                 custom_meeting_with = ?, attendees = ?, agenda = ?, discussion_points = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                title ? title.trim() : record.title,
                deptVal,
                formattedDate,
                dayName,
                withVal,
                customWith,
                attendees !== undefined ? attendees.trim() : record.attendees,
                agenda !== undefined ? agenda.trim() : record.agenda,
                pointsJson,
                id
            ]
        );

        res.status(200).json({
            success: true,
            message: 'MoM record updated successfully.'
        });
    } catch (error) {
        console.error('updateMoM Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update MoM: ' + error.message
        });
    }
};

// @desc    Soft delete MoM record
// @route   DELETE /api/moms/:id
// @access  Private
exports.deleteMoM = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await pool.query(`SELECT * FROM meeting_moms WHERE id = ? AND is_deleted = 0`, [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'MoM record not found.'
            });
        }

        const record = existing[0];
        if (req.user.role !== 'admin' && record.created_by !== req.user.id && record.creator_manager_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to delete this MoM record.'
            });
        }

        await pool.query(`UPDATE meeting_moms SET is_deleted = 1 WHERE id = ?`, [id]);

        res.status(200).json({
            success: true,
            message: 'MoM record deleted successfully.'
        });
    } catch (error) {
        console.error('deleteMoM Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete MoM: ' + error.message
        });
    }
};
