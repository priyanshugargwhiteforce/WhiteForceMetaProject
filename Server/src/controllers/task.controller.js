const { pool } = require('../config/db');
const googleService = require('../services/google.service');

// @desc    Get all tasks for logged in user (with role & owner checks)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        const { role, id: userId, username } = req.user;
        const { status, priority, assigned_to, ad_platform, ad_id } = req.query;

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

        // Role-based visibility
        if (role === 'admin') {
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
        res.status(200).json({ success: true, tasks: rows });
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

        // Only admin or manager can create tasks for others. Anyone can create a task for themselves.
        if (role !== 'admin' && role !== 'manager' && parseInt(assigned_to) !== assigned_by) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only administrators, managers, or team leads can assign tasks to other team members.' 
            });
        }

        if (!title || !assigned_to) {
            return res.status(400).json({ success: false, message: 'Title and Assignee are required.' });
        }

        // Check if assignee exists
        const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [assigned_to]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Assignee not found.' });
        }

        const [result] = await pool.query(
            `INSERT INTO tasks (title, description, assigned_to, assigned_by, ad_platform, ad_id, ad_name, priority, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description || null, 
                assigned_to, 
                assigned_by, 
                ad_platform || 'general', 
                ad_id || null, 
                ad_name || null, 
                priority || 'medium', 
                due_date || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Task created successfully.',
            taskId: result.insertId
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
        const { title, description, assigned_to, ad_platform, ad_id, ad_name, priority, status, due_date } = req.body;
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

        // If assignee (and not admin/creator/manager of assignee), they can only update status
        if (!isAdmin && !isCreator && !isManagerOfAssignee && isAssignee) {
            if (status === undefined) {
                return res.status(400).json({ success: false, message: 'Assignees can only update the task status.' });
            }
            await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
        } else {
            // Full update for admin, manager, or creator
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

            if (fields.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields provided for update.' });
            }

            params.push(id);
            await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
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

        await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
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
