const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
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
        const { username, email, password, role, status, meta_access, google_access, whatsapp_access, linkedin_access } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = {
            username,
            email,
            password: hashedPassword,
            role: role || 'user',
            status: status || 'active',
            meta_access: meta_access ? 1 : 0,
            google_access: google_access ? 1 : 0,
            whatsapp_access: whatsapp_access ? 1 : 0,
            linkedin_access: linkedin_access ? 1 : 0
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
                linkedin_access: userData.linkedin_access
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
        const { role, status, username, email, password, meta_access, google_access, whatsapp_access, linkedin_access } = req.body;
        
        const updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (meta_access !== undefined) updateData.meta_access = meta_access ? 1 : 0;
        if (google_access !== undefined) updateData.google_access = google_access ? 1 : 0;
        if (whatsapp_access !== undefined) updateData.whatsapp_access = whatsapp_access ? 1 : 0;
        if (linkedin_access !== undefined) updateData.linkedin_access = linkedin_access ? 1 : 0;
        
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

        const affectedRows = await User.delete(req.params.id);
        
        if (!affectedRows) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
