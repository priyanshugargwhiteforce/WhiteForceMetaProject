const POModel = require('../../models/po/po.model');

/**
 * Purchase Order Controller for Meta API Project
 */

/**
 * Create a new Purchase Order
 * POST /api/po
 */
async function createPO(req, res) {
  try {
    const poData = req.body;

    if (!poData || typeof poData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request payload. PO data object is required.'
      });
    }

    if (!poData.poNo) {
      return res.status(400).json({
        success: false,
        error: 'PO Number (poNo) is required.'
      });
    }

    const createdPO = await POModel.create(poData);

    console.log(`[PO API] Saved PO to MySQL database: ID=${createdPO.id}, PO#=${createdPO.poNo}`);

    return res.status(201).json({
      success: true,
      message: 'Purchase Order created and saved to MySQL successfully.',
      data: createdPO
    });

  } catch (error) {
    console.error('[PO Controller Error] Failed to create PO:', error);

    // Handle MySQL duplicate key error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: `Purchase Order number '${req.body.poNo}' already exists in database.`
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create Purchase Order in database.',
      details: error.message
    });
  }
}

/**
 * Get all Purchase Orders
 * GET /api/po
 */
async function getAllPOs(req, res) {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status
    };

    const poList = await POModel.findAll(filters);

    return res.json({
      success: true,
      count: poList.length,
      data: poList
    });

  } catch (error) {
    console.error('[PO Controller Error] Failed to fetch POs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch Purchase Orders.',
      details: error.message
    });
  }
}

/**
 * Get a single Purchase Order by ID or PO Number
 * GET /api/po/:id
 */
async function getPOById(req, res) {
  try {
    const { id } = req.params;
    const poRecord = await POModel.findById(id);

    if (!poRecord) {
      return res.status(404).json({
        success: false,
        error: `Purchase Order '${id}' not found.`
      });
    }

    return res.json({
      success: true,
      data: poRecord
    });

  } catch (error) {
    console.error(`[PO Controller Error] Failed to fetch PO '${req.params.id}':`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch Purchase Order details.',
      details: error.message
    });
  }
}

/**
 * Update an existing Purchase Order
 * PUT /api/po/:id
 */
async function updatePO(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPO = await POModel.update(id, updateData);

    if (!updatedPO) {
      return res.status(404).json({
        success: false,
        error: `Purchase Order '${id}' not found for update.`
      });
    }

    console.log(`[PO API] Updated PO in MySQL: ID=${updatedPO.id}, PO#=${updatedPO.poNo}`);

    return res.json({
      success: true,
      message: 'Purchase Order updated successfully.',
      data: updatedPO
    });

  } catch (error) {
    console.error(`[PO Controller Error] Failed to update PO '${req.params.id}':`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update Purchase Order.',
      details: error.message
    });
  }
}

/**
 * Delete a Purchase Order
 * DELETE /api/po/:id
 */
async function deletePO(req, res) {
  try {
    const { id } = req.params;
    const deleted = await POModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Purchase Order '${id}' not found for deletion.`
      });
    }

    console.log(`[PO API] Deleted PO: ID=${id}`);

    return res.json({
      success: true,
      message: `Purchase Order '${id}' deleted successfully.`
    });

  } catch (error) {
    console.error(`[PO Controller Error] Failed to delete PO '${req.params.id}':`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete Purchase Order.',
      details: error.message
    });
  }
}

/**
 * Get next sequential PO Number
 * GET /api/po/next-number
 */
async function getNextPONumber(req, res) {
  try {
    const nextPoNo = await POModel.getNextPONumber();
    return res.json({
      success: true,
      nextPoNo: nextPoNo
    });
  } catch (error) {
    console.error('[PO Controller Error] Failed to generate next PO number:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate next PO number.',
      details: error.message
    });
  }
}

module.exports = {
  createPO,
  getAllPOs,
  getPOById,
  updatePO,
  deletePO,
  getNextPONumber
};
