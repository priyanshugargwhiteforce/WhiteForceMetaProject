const express = require('express');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/user.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes here are restricted to admin (protect is applied in app.js)
router.use(authorize('admin'));

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;
