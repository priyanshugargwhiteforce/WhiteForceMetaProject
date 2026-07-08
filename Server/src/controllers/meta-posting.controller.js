const { pool } = require('../config/db');
const metaService = require('../services/meta.service');
const { metaPostingQueue } = require('../services/meta-queue.service');
const metaEventsService = require('../services/meta-events.service');

/**
 * GET /api/meta/posting/targets
 */
exports.getSanitizedTargets = async (req, res) => {
    try {
        const configId = req.query.configId;
        if (!configId) {
            return res.status(400).json({ success: false, message: 'configId parameter is required.' });
        }
        
        const targets = await metaService.getPublishingTargets(configId, req.user);
        res.json({ success: true, targets });
    } catch (error) {
        console.error('Error in getSanitizedTargets:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/meta/posting/publish
 */
exports.publishPost = async (req, res) => {
    const { configId, caption, mediaAssetId, targets, idempotencyKey } = req.body;
    
    // 1. Basic validation
    if (!configId) {
        return res.status(400).json({ success: false, message: 'configId is required.' });
    }
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one target destination must be selected.' });
    }
    
    const maxTargets = parseInt(process.env.META_MAX_TARGETS_PER_POST || '50');
    if (targets.length > maxTargets) {
        return res.status(400).json({ success: false, message: `Cannot publish to more than ${maxTargets} destinations at once.` });
    }

    const hasInstagram = targets.some(t => t.platform === 'instagram');
    if (hasInstagram && !mediaAssetId) {
        return res.status(400).json({ success: false, message: 'Instagram publishing requires a selected image asset.' });
    }

    // 2. Validate media asset if provided
    let asset = null;
    if (mediaAssetId) {
        const [[assetRow]] = await pool.query('SELECT * FROM media_library WHERE id = ? AND is_deleted = 0', [mediaAssetId]);
        if (!assetRow) {
            return res.status(404).json({ success: false, message: 'Selected media asset not found.' });
        }
        asset = assetRow;

        // Image signature and extension validation
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(asset.mime_type.toLowerCase())) {
            return res.status(400).json({ success: false, message: `Unsupported media type: ${asset.mime_type}. Only JPEG, PNG, and WebP images are allowed.` });
        }
    }

    // 3. Check for duplicate idempotency key
    if (idempotencyKey) {
        const [[existingJob]] = await pool.query(
            'SELECT id FROM meta_post_jobs WHERE tenant_id = 1 AND idempotency_key = ?',
            [idempotencyKey]
        );
        if (existingJob) {
            return res.status(409).json({ success: false, message: 'Duplicate publishing request detected (idempotency match).' });
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 4. Create parent post job
        const [jobResult] = await connection.query(
            `INSERT INTO meta_post_jobs (config_id, tenant_id, created_by, caption, content_type, media_asset_id, status, idempotency_key, total_targets)
             VALUES (?, 1, ?, ?, ?, ?, 'queued', ?, ?)`,
            [
                configId,
                req.user.id,
                caption || '',
                mediaAssetId ? 'IMAGE' : 'TEXT',
                mediaAssetId || null,
                idempotencyKey || null,
                targets.length
            ]
        );

        const jobId = jobResult.insertId;
        const targetIdsAndJobs = [];

        // 5. Create target entries
        for (const target of targets) {
            const [targetResult] = await connection.query(
                `INSERT INTO meta_post_targets (post_job_id, platform, target_id, target_name, linked_page_id, status)
                 VALUES (?, ?, ?, ?, ?, 'queued')`,
                [
                    jobId,
                    target.platform,
                    target.target_id,
                    target.target_name,
                    target.linked_page_id || null
                ]
            );
            targetIdsAndJobs.push({
                targetRowId: targetResult.insertId,
                platform: target.platform,
                target_id: target.target_id
            });
        }

        await connection.commit();
        connection.release();

        // 6. Enqueue targets into BullMQ
        for (const targetItem of targetIdsAndJobs) {
            await metaPostingQueue.add(
                'post-to-target',
                { targetId: targetItem.targetRowId },
                { jobId: `meta-post-target-${targetItem.targetRowId}` }
            );
        }

        res.status(202).json({
            success: true,
            message: 'Publishing job enqueued successfully.',
            jobId
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Transaction failed during post creation:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error while scheduling post.' });
    }
};

/**
 * GET /api/meta/posting/jobs/:jobId
 */
exports.getJobDetails = async (req, res) => {
    try {
        const { jobId } = req.params;
        const [[job]] = await pool.query('SELECT * FROM meta_post_jobs WHERE id = ?', [jobId]);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Publishing job not found.' });
        }

        const [targets] = await pool.query('SELECT * FROM meta_post_targets WHERE post_job_id = ?', [jobId]);
        
        // Clean error access tokens if any
        targets.forEach(t => {
            if (t.error_message) {
                const { scrubToken } = require('../utils/metaGraphClient');
                t.error_message = scrubToken(t.error_message);
            }
        });

        res.json({
            success: true,
            job,
            targets
        });
    } catch (error) {
        console.error('Error in getJobDetails:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/meta/posting/progress
 */
exports.getPostingProgressEvents = (req, res) => {
    metaEventsService.addClient(req, res);
};
