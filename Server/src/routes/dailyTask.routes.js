const express = require('express');
const router = express.Router();
const multer = require('multer');
const dailyTaskController = require('../controllers/dailyTask.controller');
const { protect } = require('../middlewares/auth.middleware');

// Memory storage for Excel upload (10 MB size limit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream'
        ];
        if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) files are allowed.'));
        }
    }
});

// Apply protection middleware to all daily task routes
router.use(protect);

router.route('/')
    .get(dailyTaskController.getDailyTasks)
    .post(dailyTaskController.createDailyTask);

router.get('/reports', dailyTaskController.getDailyTaskReports);
router.get('/export', dailyTaskController.exportDailyTasks);
router.get('/sample-template', dailyTaskController.downloadSampleExcelTemplate);
router.post('/upload', upload.single('file'), dailyTaskController.uploadDailyTasksExcel);

router.route('/:id')
    .get(dailyTaskController.getDailyTaskById)
    .put(dailyTaskController.updateDailyTask)
    .delete(dailyTaskController.deleteDailyTask);

module.exports = router;
