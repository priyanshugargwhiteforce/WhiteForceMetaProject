const express = require('express');
const router = express.Router();
const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');
const { 
    registerMediaToLinkedIn, 
    getLinkedInAssetStatus 
} = require('../../services/linkedinAsset.service');
const { pool } = require('../../config/db');

// All endpoints in this file require authentication & LinkedIn access scope
router.use(protect);
router.use(authorizeLinkedin);

/**
 * POST /api/linkedin/assets/register
 * Takes mediaLibraryId and accountId, registers & uploads file to LinkedIn
 */
router.post('/register', async (req, res, next) => {
    try {
        const { mediaLibraryId, accountId } = req.body;
        if (!mediaLibraryId) {
            return res.status(400).json({ success: false, message: 'mediaLibraryId is required.' });
        }
        if (!accountId) {
            return res.status(400).json({ success: false, message: 'accountId is required.' });
        }

        const result = await registerMediaToLinkedIn(mediaLibraryId, accountId, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'LinkedIn asset registration failed.'
        });
    }
});

/**
 * GET /api/linkedin/assets/status/:id
 * Retrieve real-time status of registration on LinkedIn
 */
router.get('/status/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { accountId } = req.query; // optional check context
        
        const result = await getLinkedInAssetStatus(id, accountId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/linkedin/assets
 * Returns all media library items that have a registered linkedin_asset_urn
 */
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM media_library 
             WHERE linkedin_asset_urn IS NOT NULL AND is_deleted = 0 
             ORDER BY updated_at DESC`
        );
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
