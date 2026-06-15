const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/auth.middleware');
const { 
    uploadMedia, 
    getMediaList, 
    getAssetById, 
    deleteAsset 
} = require('../services/mediaLibrary.service');

// Configure Multer storage to write temporary files before hash calculation
const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`);
    }
});

const upload = multer({
    storage: tempStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB overall max file limit for multer chunk parsing
        files: 1
    }
});

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * POST /api/media/upload
 * Multi-part form upload
 */
router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please provide a file field named "file".' });
        }

        const { name, category = 'OTHER' } = req.body;
        const result = await uploadMedia(req.file, name, category.toUpperCase(), req.user);
        
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/media/search
 * Search assets by name
 */
router.get('/search', protect, async (req, res, next) => {
    try {
        const { query, category } = req.query;
        const result = await getMediaList({
            search: query,
            category,
            limit: 50
        });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/media
 * Pagination and listing
 */
router.get('/', protect, async (req, res, next) => {
    try {
        const { category, search, page = 1, limit = 20 } = req.query;
        const result = await getMediaList({ category, search, page, limit });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/media/:id
 * Retrieve metadata details
 */
router.get('/:id', protect, async (req, res, next) => {
    try {
        const asset = await getAssetById(req.params.id);
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Media asset not found.' });
        }
        res.status(200).json({ success: true, data: asset });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/media/:id
 * Soft delete media asset
 */
router.delete('/:id', protect, async (req, res, next) => {
    try {
        await deleteAsset(req.params.id, req.user?.id);
        res.status(200).json({ success: true, message: 'Asset deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/media/:id/preview
 * Authenticated preview stream with path-traversal check
 */
router.get('/:id/preview', protect, async (req, res, next) => {
    try {
        const asset = await getAssetById(req.params.id);
        // Fallback check by UUID if ID was not matched
        let finalAsset = asset;
        if (!finalAsset) {
            const { pool } = require('../config/db');
            const [rows] = await pool.query('SELECT * FROM media_library WHERE uuid = ? AND is_deleted = 0', [req.params.id]);
            finalAsset = rows[0];
        }

        if (!finalAsset) {
            return res.status(404).json({ success: false, message: 'Media asset not found.' });
        }

        const resolvedPath = path.resolve(finalAsset.local_path);
        const resolvedUploadsDir = path.resolve(UPLOADS_DIR);

        // Path Traversal Prevention
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(403).json({ success: false, message: 'Access denied: Path traversal detected.' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ success: false, message: 'Physical file not found.' });
        }

        res.setHeader('Content-Type', finalAsset.mime_type);
        fs.createReadStream(resolvedPath).pipe(res);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/media/:id/download
 * Authenticated download stream with attachment headers
 */
router.get('/:id/download', protect, async (req, res, next) => {
    try {
        const asset = await getAssetById(req.params.id);
        let finalAsset = asset;
        if (!finalAsset) {
            const { pool } = require('../config/db');
            const [rows] = await pool.query('SELECT * FROM media_library WHERE uuid = ? AND is_deleted = 0', [req.params.id]);
            finalAsset = rows[0];
        }

        if (!finalAsset) {
            return res.status(404).json({ success: false, message: 'Media asset not found.' });
        }

        const resolvedPath = path.resolve(finalAsset.local_path);
        const resolvedUploadsDir = path.resolve(UPLOADS_DIR);

        // Path Traversal Prevention
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(403).json({ success: false, message: 'Access denied: Path traversal detected.' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ success: false, message: 'Physical file not found.' });
        }

        res.setHeader('Content-Type', finalAsset.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalAsset.original_filename)}"`);
        fs.createReadStream(resolvedPath).pipe(res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
