const { pool } = require('../config/db');
const googleService = require('../services/google.service');

// @desc    Get all tasks for logged in user (with role & owner checks)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        const { role, id: userId, username } = req.user;
        const { status, priority, assigned_to, ad_platform, ad_id, my_tasks } = req.query;

        let query = `
            SELECT t.*, 
                   u_assignee.username as assignee_name, 
                   u_assignee.email as assignee_email,
                   u_assignee.manager_id as assignee_manager_id,
                   u_assigner.username as assigner_name
            FROM tasks t
            LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
            LEFT JOIN users u_assigner ON t.assigned_by = u_assigner.id
            LEFT JOIN meta_ads a ON t.ad_id = a.id AND t.ad_platform = 'meta'
        `;
        
        const conditions = [];
        const params = [];

        // Role-based visibility / my_tasks override
        if (my_tasks === 'true') {
            conditions.push('t.assigned_to = ?');
            params.push(userId);
        } else if (role === 'admin') {
            // Admin sees all tasks
        } else if (role === 'manager') {
            // Manager sees tasks assigned to them, created by them, or assigned to their team members
            conditions.push('(t.assigned_to = ? OR t.assigned_by = ? OR t.assigned_to IN (SELECT id FROM users WHERE manager_id = ?))');
            params.push(userId, userId, userId);
        } else {
            // Standard employees see ONLY tasks assigned to them
            conditions.push('t.assigned_to = ?');
            params.push(userId);
        }

        // Apply filters
        if (status) {
            conditions.push('t.status = ?');
            params.push(status);
        }
        if (priority) {
            conditions.push('t.priority = ?');
            params.push(priority);
        }
        if (assigned_to) {
            conditions.push('t.assigned_to = ?');
            params.push(assigned_to);
        }
        if (ad_platform) {
            conditions.push('t.ad_platform = ?');
            params.push(ad_platform);
        }
        if (ad_id) {
            conditions.push('t.ad_id = ?');
            params.push(ad_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        const [rows] = await pool.query(query, params);

        // Grouping logic for Admin/Manager (skip if my_tasks is requested)
        let tasksList = [];
        if ((role === 'admin' || role === 'manager') && my_tasks !== 'true') {
            const groups = {};
            for (const row of rows) {
                const groupKey = row.parent_task_id || row.id;
                
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        ...row,
                        assignees: []
                    };
                }
                
                groups[groupKey].assignees.push({
                    taskId: row.id,
                    assigned_to: row.assigned_to,
                    assignee_name: row.assignee_name,
                    assignee_email: row.assignee_email,
                    status: row.status,
                    remarks: row.remarks
                });
            }
            
            tasksList = Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            // Standard employees or my_tasks view only see their own tasks as individual items
            tasksList = rows.map(row => ({
                ...row,
                assignees: [{
                    taskId: row.id,
                    assigned_to: row.assigned_to,
                    assignee_name: row.assignee_name,
                    assignee_email: row.assignee_email,
                    status: row.status,
                    remarks: row.remarks
                }]
            }));
        }

        res.status(200).json({ success: true, tasks: tasksList });
    } catch (error) {
        console.error('getTasks Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Restricted to admin, manager, or self-assignee)
exports.createTask = async (req, res) => {
    try {
        const { title, description, assigned_to, ad_platform, ad_id, ad_name, priority, due_date } = req.body;
        const assigned_by = req.user.id;
        const { role } = req.user;

        if (!title || !assigned_to) {
            return res.status(400).json({ success: false, message: 'Title and Assignee are required.' });
        }

        // Parse assigned_to which can be a single ID, an array of IDs, or a comma-separated list of IDs
        let assignees = [];
        if (Array.isArray(assigned_to)) {
            assignees = assigned_to.map(id => parseInt(id)).filter(id => !isNaN(id));
        } else if (typeof assigned_to === 'string' && assigned_to.includes(',')) {
            assignees = assigned_to.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else if (assigned_to !== undefined && assigned_to !== null) {
            const parsed = parseInt(assigned_to);
            if (!isNaN(parsed)) {
                assignees = [parsed];
            }
        }

        if (assignees.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one valid assignee is required.' });
        }

        // Only admin or manager can create tasks for others. Anyone can create a task for themselves.
        const containsOthers = assignees.some(id => id !== assigned_by);
        if (role !== 'admin' && role !== 'manager' && containsOthers) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only administrators, managers, or team leads can assign tasks to other team members.' 
            });
        }

        // Check if all assignees exist in DB
        const [userRows] = await pool.query('SELECT id FROM users WHERE id IN (?)', [assignees]);
        if (userRows.length !== new Set(assignees).size) {
            return res.status(404).json({ success: false, message: 'One or more assignees not found.' });
        }

        const taskIds = [];
        let firstTaskId = null;
        for (let i = 0; i < assignees.length; i++) {
            const assigneeId = assignees[i];
            const [result] = await pool.query(
                `INSERT INTO tasks (title, description, assigned_to, assigned_by, ad_platform, ad_id, ad_name, priority, due_date, parent_task_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    title, 
                    description || null, 
                    assigneeId, 
                    assigned_by, 
                    ad_platform || 'general', 
                    ad_id || null, 
                    ad_name || null, 
                    priority || 'medium', 
                    due_date || null,
                    firstTaskId
                ]
            );
            
            const insertedId = result.insertId;
            if (i === 0) {
                firstTaskId = insertedId;
                await pool.query('UPDATE tasks SET parent_task_id = ? WHERE id = ?', [firstTaskId, firstTaskId]);
            }
            taskIds.push(insertedId);
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully for all assignees.',
            taskId: taskIds[0],
            taskIds
        });
    } catch (error) {
        console.error('createTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update an existing task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, assigned_to, ad_platform, ad_id, ad_name, priority, status, due_date, remark } = req.body;
        const { role, id: userId } = req.user;

        // Fetch task
        const [taskRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        const task = taskRows[0];

        const isCreator = task.assigned_by === userId;
        const isAssignee = task.assigned_to === userId;
        const isAdmin = role === 'admin';

        // Check if assignee is a team member of the current manager
        let isManagerOfAssignee = false;
        if (role === 'manager' && task.assigned_to) {
            const [assigneeRows] = await pool.query('SELECT manager_id FROM users WHERE id = ?', [task.assigned_to]);
            if (assigneeRows.length > 0 && assigneeRows[0].manager_id === userId) {
                isManagerOfAssignee = true;
            }
        }

        // Check authorization
        if (!isAdmin && !isCreator && !isAssignee && !isManagerOfAssignee) {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this task.' });
        }

        // Parse existing remarks
        let remarksArray = [];
        if (task.remarks) {
            try {
                remarksArray = typeof task.remarks === 'string' ? JSON.parse(task.remarks) : task.remarks;
                if (!Array.isArray(remarksArray)) {
                    remarksArray = [];
                }
            } catch (e) {
                remarksArray = [];
            }
        }

        // Append new remark if provided
        if (remark !== undefined && remark !== null && remark.toString().trim() !== '') {
            remarksArray.push({
                text: remark.toString().trim(),
                by: role,
                username: req.user.username,
                at: new Date().toISOString()
            });
        }

        // If assignee (and not admin/creator/manager of assignee), they can only update status or add a remark
        if (!isAdmin && !isCreator && !isManagerOfAssignee && isAssignee) {
            if (status === undefined && remark === undefined) {
                return res.status(400).json({ success: false, message: 'Assignees can only update the task status or add a remark.' });
            }
            
            const fields = [];
            const params = [];
            if (status !== undefined) {
                fields.push('status = ?');
                params.push(status);
            }
            if (remark !== undefined) {
                fields.push('remarks = ?');
                params.push(JSON.stringify(remarksArray));
            }
            
            params.push(id);
            await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
        } else {
            // Full update for admin, manager, or creator
            if (task.parent_task_id && (isAdmin || isCreator || isManagerOfAssignee)) {
                // Update shared metadata fields for the whole group
                const groupFields = [];
                const groupParams = [];
                if (title !== undefined) { groupFields.push('title = ?'); groupParams.push(title); }
                if (description !== undefined) { groupFields.push('description = ?'); groupParams.push(description); }
                if (ad_platform !== undefined) { groupFields.push('ad_platform = ?'); groupParams.push(ad_platform); }
                if (ad_id !== undefined) { groupFields.push('ad_id = ?'); groupParams.push(ad_id); }
                if (ad_name !== undefined) { groupFields.push('ad_name = ?'); groupParams.push(ad_name); }
                if (priority !== undefined) { groupFields.push('priority = ?'); groupParams.push(priority); }
                if (due_date !== undefined) { groupFields.push('due_date = ?'); groupParams.push(due_date); }

                if (groupFields.length > 0) {
                    groupParams.push(task.parent_task_id);
                    await pool.query(`UPDATE tasks SET ${groupFields.join(', ')} WHERE parent_task_id = ?`, groupParams);
                }

                // Update specific task fields (assigned_to, status, remarks) for the specific row ID
                const specificFields = [];
                const specificParams = [];
                if (assigned_to !== undefined) { specificFields.push('assigned_to = ?'); specificParams.push(assigned_to); }
                if (status !== undefined) { specificFields.push('status = ?'); specificParams.push(status); }
                if (remark !== undefined) { specificFields.push('remarks = ?'); specificParams.push(JSON.stringify(remarksArray)); }

                if (specificFields.length > 0) {
                    specificParams.push(id);
                    await pool.query(`UPDATE tasks SET ${specificFields.join(', ')} WHERE id = ?`, specificParams);
                }
            } else {
                // Single/un-grouped task update
                const fields = [];
                const params = [];

                if (title !== undefined) { fields.push('title = ?'); params.push(title); }
                if (description !== undefined) { fields.push('description = ?'); params.push(description); }
                if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to); }
                if (ad_platform !== undefined) { fields.push('ad_platform = ?'); params.push(ad_platform); }
                if (ad_id !== undefined) { fields.push('ad_id = ?'); params.push(ad_id); }
                if (ad_name !== undefined) { fields.push('ad_name = ?'); params.push(ad_name); }
                if (priority !== undefined) { fields.push('priority = ?'); params.push(priority); }
                if (status !== undefined) { fields.push('status = ?'); params.push(status); }
                if (due_date !== undefined) { fields.push('due_date = ?'); params.push(due_date); }
                if (remark !== undefined) { fields.push('remarks = ?'); params.push(JSON.stringify(remarksArray)); }

                if (fields.length === 0) {
                    return res.status(400).json({ success: false, message: 'No fields provided for update.' });
                }

                params.push(id);
                await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
            }
        }

        res.status(200).json({ success: true, message: 'Task updated successfully.' });
    } catch (error) {
        console.error('updateTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete an existing task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        // Fetch task
        const [taskRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        const task = taskRows[0];

        // Check if assignee is a team member of the current manager
        let isManagerOfAssignee = false;
        if (role === 'manager' && task.assigned_to) {
            const [assigneeRows] = await pool.query('SELECT manager_id FROM users WHERE id = ?', [task.assigned_to]);
            if (assigneeRows.length > 0 && assigneeRows[0].manager_id === userId) {
                isManagerOfAssignee = true;
            }
        }

        // Only Admin, the creator, or the manager of the assignee can delete the task
        if (role !== 'admin' && task.assigned_by !== userId && !isManagerOfAssignee) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this task.' });
        }

        if (task.parent_task_id) {
            await pool.query('DELETE FROM tasks WHERE parent_task_id = ?', [task.parent_task_id]);
        } else {
            await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
        }
        res.status(200).json({ success: true, message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('deleteTask Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get active assignable users list
// @route   GET /api/tasks/users
// @access  Private
exports.getAssignableUsers = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        let query = 'SELECT id, username, email, role FROM users WHERE status = "active"';
        const params = [];

        if (role === 'admin') {
            // Admin can assign to anyone active
        } else if (role === 'manager') {
            // Manager can assign to their team or themselves
            query += ' AND (manager_id = ? OR id = ?)';
            params.push(userId, userId);
        } else {
            // Standard users can only assign to themselves
            query += ' AND id = ?';
            params.push(userId);
        }

        query += ' ORDER BY username ASC';
        const [rows] = await pool.query(query, params);
        res.status(200).json({ success: true, users: rows });
    } catch (error) {
        console.error('getAssignableUsers Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assignable ads/campaigns depending on platform selected
// @route   GET /api/tasks/ads
// @access  Private
exports.getAssignableAds = async (req, res) => {
    try {
        const { platform } = req.query;
        if (!platform) {
            return res.status(400).json({ success: false, message: 'Platform query parameter is required.' });
        }

        let ads = [];

        switch (platform) {
            case 'meta':
                const [metaRows] = await pool.query('SELECT id, name, owner_name FROM meta_ads ORDER BY name ASC');
                ads = metaRows;
                break;
            case 'linkedin':
                const [linkedinRows] = await pool.query('SELECT id, name FROM linkedin_campaigns ORDER BY name ASC');
                ads = linkedinRows;
                break;
            case 'whatsapp':
                const [whatsappRows] = await pool.query('SELECT id, name FROM whatsapp_campaigns ORDER BY name ASC');
                ads = whatsappRows;
                break;
            case 'google':
                const customerId = process.env.GOOGLE_CUSTOMER_ID;
                if (customerId) {
                    try {
                        const googleCampaigns = await googleService.getGoogleCampaigns(customerId);
                        ads = (googleCampaigns || []).map(c => ({
                            id: c.campaign.id.toString(),
                            name: c.campaign.name
                        }));
                    } catch (googleError) {
                        console.warn('[Google API Warning] Failed to fetch Google campaigns for tasks:', googleError.message);
                        ads = [];
                    }
                }
                break;
            default:
                ads = [];
                break;
        }

        res.status(200).json({ success: true, ads });
    } catch (error) {
        console.error('getAssignableAds Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get count of active pending tasks assigned to logged-in user
// @route   GET /api/tasks/pending-count
// @access  Private
exports.getPendingTasksCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM tasks 
             WHERE assigned_to = ? AND status IN ('pending', 'in_progress')`,
            [userId]
        );
        res.status(200).json({ success: true, count: rows[0].count });
    } catch (error) {
        console.error('getPendingTasksCount Controller Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
