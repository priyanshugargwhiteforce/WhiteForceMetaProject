const express = require('express');
const router = express.Router();
const poController = require('../../controllers/po/po.controller');

/**
 * Purchase Order (PO) API Router
 * Base URL: /api/po
 */

// POST   /api/po     - Create & save a new PO record
router.post('/', poController.createPO);

// GET    /api/po     - Fetch all PO records
router.get('/', poController.getAllPOs);

// GET    /api/po/next-number - Generate next sequential PO Number (e.g. PO202608-001)
router.get('/next-number', poController.getNextPONumber);

// GET    /api/po/:id - Fetch single PO record by ID or PO Number
router.get('/:id', poController.getPOById);

// PUT    /api/po/:id - Update existing PO record
router.put('/:id', poController.updatePO);

// DELETE /api/po/:id - Delete PO record
router.delete('/:id', poController.deletePO);

module.exports = router;
