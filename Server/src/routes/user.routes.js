const express = require('express');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getManagers,
    getDashboardStats,
    getProfile,
    updateProfile
} = require('../controllers/user.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Route for current user's profile (accessible by any logged in user)
router.route('/profile/me')
    .get(getProfile)
    .put(updateProfile);

// Route to get dashboard statistics
router.route('/dashboard/stats')
    .get(getDashboardStats);

// Route to get list of active managers (strictly Admin)
router.route('/managers/list')
    .get(authorize('admin'), getManagers);

// Main user routes
router.route('/')
    .get(authorize('admin', 'manager'), getUsers)
    .post(authorize('admin', 'manager'), createUser);

router.route('/:id')
    .get(authorize('admin', 'manager'), getUser)
    .put(authorize('admin', 'manager'), updateUser)
    .delete(authorize('admin', 'manager'), deleteUser);

module.exports = router;
