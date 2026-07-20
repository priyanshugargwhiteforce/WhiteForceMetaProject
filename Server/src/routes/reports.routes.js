const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

router.get('/spend', reportsController.getSpendReport);
router.post('/spend/sync', reportsController.syncSpendReport);

module.exports = router;
