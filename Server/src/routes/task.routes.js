const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { protect } = require('../middlewares/auth.middleware');

// Apply protection middleware to all task routes
router.use(protect);

router.route('/')
    .get(taskController.getTasks)
    .post(taskController.createTask);

router.route('/:id')
    .put(taskController.updateTask)
    .delete(taskController.deleteTask);

router.get('/pending-count', taskController.getPendingTasksCount);
router.get('/users', taskController.getAssignableUsers);
router.get('/ads', taskController.getAssignableAds);

module.exports = router;
