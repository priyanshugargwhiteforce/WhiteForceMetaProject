const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const managerIdFilter = role === 'manager' ? userId : null;
        const users = await User.findAll(managerIdFilter);
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Manager check
        if (req.user.role === 'manager' && user.manager_id !== req.user.id && user.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this user profile' });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create user (Admin)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access, manager_id } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Manager specific checks
        let finalManagerId = manager_id ? parseInt(manager_id) : null;
        let finalRole = role || 'user';

        if (req.user.role === 'manager') {
            // Managers can only create users under their own team
            finalManagerId = req.user.id;
            // Managers cannot create other admins or managers
            if (finalRole === 'admin' || finalRole === 'manager') {
                return res.status(403).json({ success: false, message: 'Forbidden: Managers cannot create administrative accounts.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = {
            username,
            email,
            password: hashedPassword,
            role: finalRole,
            status: status || 'active',
            meta_access: meta_access ? 1 : 0,
            google_access: google_access ? 1 : 0,
            whatsapp_access: whatsapp_access ? 1 : 0,
            linkedin_access: linkedin_access ? 1 : 0,
            manager_id: finalManagerId
        };

        const userId = await User.create(userData);
        
        res.status(201).json({
            success: true,
            user: {
                id: userId,
                username,
                email,
                role: userData.role,
                status: userData.status,
                meta_access: userData.meta_access,
                google_access: userData.google_access,
                whatsapp_access: userData.whatsapp_access,
                linkedin_access: userData.linkedin_access,
                manager_id: userData.manager_id
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { role, status, username, email, password, meta_access, google_access, whatsapp_access, linkedin_access, manager_id } = req.body;
        
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let finalRole = role;
        let finalManagerId = manager_id;

        if (req.user.role === 'manager') {
            // Managers can only update users on their team
            if (targetUser.manager_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Forbidden: You can only edit users on your team.' });
            }
            // Managers cannot promote to admin or manager
            if (role && (role === 'admin' || role === 'manager')) {
                return res.status(403).json({ success: false, message: 'Forbidden: Managers cannot assign administrative roles.' });
            }
            // Freeze manager_id to current manager
            finalManagerId = req.user.id;
        } else {
            // Admin self manager check
            if (manager_id && parseInt(manager_id) === parseInt(req.params.id)) {
                return res.status(400).json({ success: false, message: 'A user cannot be their own manager' });
            }
        }

        const updateData = {};
        if (finalRole) updateData.role = finalRole;
        if (status) updateData.status = status;
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (meta_access !== undefined) updateData.meta_access = meta_access ? 1 : 0;
        if (google_access !== undefined) updateData.google_access = google_access ? 1 : 0;
        if (whatsapp_access !== undefined) updateData.whatsapp_access = whatsapp_access ? 1 : 0;
        if (linkedin_access !== undefined) updateData.linkedin_access = linkedin_access ? 1 : 0;
        if (finalManagerId !== undefined) updateData.manager_id = finalManagerId ? parseInt(finalManagerId) : null;
        
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const affectedRows = await User.update(req.params.id, updateData);
        
        if (!affectedRows) {
            return res.status(404).json({ success: false, message: 'User not found or no changes made' });
        }

        const updatedUser = await User.findById(req.params.id);
        res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        // Prevent deleting oneself
        if (req.user.id.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (req.user.role === 'manager') {
            // Managers can only delete users on their team
            if (targetUser.manager_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Forbidden: You can only delete users on your team.' });
            }
        }

        const affectedRows = await User.delete(req.params.id);
        
        if (!affectedRows) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get list of active managers
// @route   GET /api/users/managers/list
// @access  Private/Admin
exports.getManagers = async (req, res) => {
    try {
        const managers = await User.findManagers();
        res.status(200).json({ success: true, managers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
