const express = require('express');
const router = express.Router();
const momController = require('../controllers/mom.controller');

router.get('/', momController.getMoMs);
router.get('/:id', momController.getMoMById);
router.post('/', momController.createMoM);
router.put('/:id', momController.updateMoM);
router.delete('/:id', momController.deleteMoM);

module.exports = router;
