const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { validateFile } = require('../validators/mediaValidator');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Log write events to database audit logs (reusing linkedin_write_logs)
 */
const logSystemWrite = async (userId, actionType, payload, response, status, errorMsg = null) => {
    try {
        await pool.query(
            `INSERT INTO linkedin_write_logs (account_id, action_type, request_payload, response_payload, status, error_message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId ? String(userId) : null,
                actionType,
                payload ? JSON.stringify(payload) : null,
                response ? JSON.stringify(response) : null,
                status,
                errorMsg || null
            ]
        );
    } catch (err) {
        console.error('[System Logger Error] Failed to write action logs:', err.message);
    }
};

/**
 * Calculates SHA256 checksum of file
 */
const calculateSHA256 = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', err => reject(err));
    });
};

/**
 * Process uploaded file, validate size/type, verify hash, and save metadata.
 * @param {object} file - Express Multer file object
 * @param {string} customName - User defined name for asset
 * @param {string} category - Media Category (IMAGE, VIDEO, DOCUMENT, LOGO, BRAND, OTHER)
 * @param {object} user - Authenticated user details
 */
const uploadMedia = async (file, customName, category = 'OTHER', user = null) => {
    const userId = user ? user.id : null;
    const requestPayload = { originalFilename: file.originalname, category, customName };

    try {
        // 1. Initial Validation
        const valRes = validateFile(file, category);
        if (!valRes.isValid) {
            await logSystemWrite(userId, 'MEDIA_FAILED', requestPayload, null, 'FAILED', valRes.error);
            // Delete temp file from Multer
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw new Error(valRes.error);
        }

        // 2. Generate SHA256 hash
        const fileHash = await calculateSHA256(file.path);

        // 3. Duplicate Detection Check
        const [existing] = await pool.query(
            'SELECT * FROM media_library WHERE hash = ? AND is_deleted = 0 LIMIT 1',
            [fileHash]
        );

        if (existing && existing.length > 0) {
            console.log(`[Media Library Dedup] Duplicate file detected (hash: ${fileHash}). Bypassing save.`);
            // Clean up temp file from Multer to save space
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            // Increment used count
            const duplicateRecord = existing[0];
            await pool.query(
                'UPDATE media_library SET used_count = used_count + 1 WHERE id = ?',
                [duplicateRecord.id]
            );

            await logSystemWrite(userId, 'MEDIA_DUPLICATE', requestPayload, duplicateRecord, 'SUCCESS');
            return {
                success: true,
                duplicate: true,
                data: {
                    ...duplicateRecord,
                    used_count: duplicateRecord.used_count + 1
                }
            };
        }

        // 4. Save file to final isolated directory
        const uuid = crypto.randomUUID();
        const ext = path.extname(file.originalname).toLowerCase();
        const finalFilename = `${uuid}${ext}`;
        const finalPath = path.join(UPLOADS_DIR, finalFilename);

        // Copy and delete temp file
        fs.copyFileSync(file.path, finalPath);
        fs.unlinkSync(file.path);

        // Mapped dynamic URLs using local controller previews
        const relativeUrlPath = `/api/media/${uuid}/preview`;
        const assetName = customName && customName.trim() ? customName.trim() : file.originalname;

        const mediaRecord = {
            uuid,
            asset_name: assetName,
            original_filename: file.originalname,
            platform: 'ALL',
            asset_type: category,
            mime_type: file.mimetype,
            extension: ext.replace('.', ''),
            file_size: file.size,
            storage_provider: 'LOCAL',
            local_path: finalPath,
            preview_url: relativeUrlPath,
            cdn_url: relativeUrlPath,
            thumbnail_url: relativeUrlPath,
            hash: fileHash,
            processing_status: 'AVAILABLE',
            uploaded_by: userId,
            access_scope: 'ORGANIZATION',
            checksum_algorithm: 'SHA256',
            linked_platforms: JSON.stringify([]),
            metadata: JSON.stringify({}),
            used_count: 0
        };

        // 5. Save record to MySQL
        const [insertRes] = await pool.query(
            `INSERT INTO media_library 
             (uuid, asset_name, original_filename, platform, asset_type, mime_type, extension, file_size, storage_provider, local_path, preview_url, cdn_url, thumbnail_url, hash, processing_status, uploaded_by, access_scope, checksum_algorithm, linked_platforms, metadata, used_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                mediaRecord.uuid,
                mediaRecord.asset_name,
                mediaRecord.original_filename,
                mediaRecord.platform,
                mediaRecord.asset_type,
                mediaRecord.mime_type,
                mediaRecord.extension,
                mediaRecord.file_size,
                mediaRecord.storage_provider,
                mediaRecord.local_path,
                mediaRecord.preview_url,
                mediaRecord.cdn_url,
                mediaRecord.thumbnail_url,
                mediaRecord.hash,
                mediaRecord.processing_status,
                mediaRecord.uploaded_by,
                mediaRecord.access_scope,
                mediaRecord.checksum_algorithm,
                mediaRecord.linked_platforms,
                mediaRecord.metadata,
                mediaRecord.used_count
            ]
        );

        mediaRecord.id = insertRes.insertId;

        await logSystemWrite(userId, 'MEDIA_UPLOAD', requestPayload, mediaRecord, 'SUCCESS');
        
        return {
            success: true,
            duplicate: false,
            data: mediaRecord
        };

    } catch (error) {
        console.error('[Media Library Upload Service Error]:', error.message);
        throw error;
    }
};

/**
 * Retrieve paginated media assets
 */
const getMediaList = async (filters = {}) => {
    const { category, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM media_library WHERE is_deleted = 0';
    const params = [];

    if (category && category !== 'ALL') {
        query += ' AND asset_type = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND asset_name LIKE ?';
        params.push(`%${search}%`);
    }

    // Sort newest first
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    
    // Get total counts for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM media_library WHERE is_deleted = 0';
    const countParams = [];

    if (category && category !== 'ALL') {
        countQuery += ' AND asset_type = ?';
        countParams.push(category);
    }
    if (search) {
        countQuery += ' AND asset_name LIKE ?';
        countParams.push(`%${search}%`);
    }

    const [[countRow]] = await pool.query(countQuery, countParams);

    return {
        assets: rows,
        pagination: {
            total: countRow.total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: Math.ceil(countRow.total / limit)
        }
    };
};

/**
 * Retrieve asset by ID
 */
const getAssetById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM media_library WHERE id = ? AND is_deleted = 0', [id]);
    return rows[0] || null;
};

/**
 * Soft delete an asset
 */
const deleteAsset = async (id, userId = null) => {
    const asset = await getAssetById(id);
    if (!asset) {
        throw new Error('Media asset not found or already deleted.');
    }

    // 1. Delete physical files from disk
    if (asset.local_path && fs.existsSync(asset.local_path)) {
        try {
            fs.unlinkSync(asset.local_path);
        } catch (err) {
            console.error('[deleteAsset] Error deleting physical file:', err.message);
        }
    }

    if (asset.facebook_variant) {
        const fbPath = path.join(UPLOADS_DIR, '..', asset.facebook_variant);
        if (fs.existsSync(fbPath)) {
            try {
                fs.unlinkSync(fbPath);
            } catch (err) {
                console.error('[deleteAsset] Error deleting facebook variant file:', err.message);
            }
        }
    }

    if (asset.instagram_variant) {
        const igPath = path.join(UPLOADS_DIR, '..', asset.instagram_variant);
        if (fs.existsSync(igPath)) {
            try {
                fs.unlinkSync(igPath);
            } catch (err) {
                console.error('[deleteAsset] Error deleting instagram variant file:', err.message);
            }
        }
    }

    // 2. Mark as soft-deleted and suffix the hash to avoid unique key conflicts
    await pool.query(
        'UPDATE media_library SET is_deleted = 1, hash = CONCAT(hash, "-deleted-", uuid) WHERE id = ?',
        [id]
    );

    // 3. Log event
    await logSystemWrite(userId, 'MEDIA_DELETED', { id }, asset, 'SUCCESS');
    return true;
};

module.exports = {
    uploadMedia,
    getMediaList,
    getAssetById,
    deleteAsset,
    logSystemWrite
};
