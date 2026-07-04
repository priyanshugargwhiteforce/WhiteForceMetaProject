const { Queue, Worker } = require('bullmq');
const { pool } = require('../config/db');
const redisConnection = require('../config/redis');
const metaService = require('./meta.service');
const metaEventsService = require('./meta-events.service');

// Initialize BullMQ Queue
const metaPostingQueue = new Queue('meta-posting', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10000 // 10s base backoff delay
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

console.log('✓ BullMQ Queue "meta-posting" initialized.');

// Setup Worker Limiter configurations via env variables (default 10 posts per second limit)
const limitMax = parseInt(process.env.META_QUEUE_RATE_LIMIT_MAX || '10');
const limitDuration = parseInt(process.env.META_QUEUE_RATE_LIMIT_DURATION || '1000');

// Initialize BullMQ Worker
const worker = new Worker('meta-posting', async (job) => {
    const { targetId: targetRowId } = job.data;
    console.log(`[Meta Queue Worker] Processing target row ID: ${targetRowId}, Job ID: ${job.id}`);

    // 1. Fetch target details and job metadata inside transaction/locks
    const connection = await pool.getConnection();
    let target = null;
    let postJob = null;

    try {
        await connection.beginTransaction();

        const [[targetRow]] = await connection.query(
            'SELECT * FROM meta_post_targets WHERE id = ? FOR UPDATE',
            [targetRowId]
        );

        target = targetRow;

        if (!target) {
            await connection.rollback();
            console.error(`[Meta Queue Worker] Target row ${targetRowId} not found.`);
            return;
        }

        // If target is already completed or cancelled, skip
        if (target.status === 'published' || target.status === 'cancelled' || target.status === 'quota_exhausted') {
            await connection.rollback();
            console.log(`[Meta Queue Worker] Target ${targetRowId} status is ${target.status}. Skipping.`);
            return;
        }

        // Fetch parent post job metadata
        const [[jobRow]] = await connection.query(
            'SELECT * FROM meta_post_jobs WHERE id = ?',
            [target.post_job_id]
        );

        postJob = jobRow;

        if (!postJob) {
            await connection.query(
                'UPDATE meta_post_targets SET status = "failed", error_message = "Parent post job not found" WHERE id = ?',
                [targetRowId]
            );
            await connection.commit();
            metaEventsService.sendProgressUpdate(null, {
                jobId: target.post_job_id,
                targetId: target.id,
                status: 'failed',
                errorMessage: 'Parent post job not found'
            });
            return;
        }

        // Update status to processing
        await connection.query(
            'UPDATE meta_post_targets SET status = "processing", attempt_count = attempt_count + 1 WHERE id = ?',
            [targetRowId]
        );
        await connection.commit();
    } catch (dbErr) {
        await connection.rollback();
        connection.release();
        throw dbErr;
    } finally {
        connection.release();
    }

    // Broadcast processing status via SSE
    metaEventsService.sendProgressUpdate(postJob.created_by, {
        jobId: postJob.id,
        targetId: target.id,
        status: 'processing'
    });

    try {
        // 2. Fetch and decrypt config access token
        const token = await metaService.getDecryptedAccessToken(postJob.config_id);

        // Fetch media asset details if any
        let imageUrl = null;
        if (postJob.media_asset_id) {
            const [[asset]] = await pool.query('SELECT * FROM media_library WHERE id = ?', [postJob.media_asset_id]);
            if (!asset) {
                throw new Error('Media asset not found in database.');
            }
            
            // Normalize variants using Sharp if they don't exist yet
            const variants = await metaService.processMediaVariants(asset);
            
            // Resolve base public media URL
            const mediaBaseUrl = process.env.PUBLIC_MEDIA_BASE_URL || 'https://wfadmanager.astro-buddy.in/uploads';
            const variantPath = target.platform === 'instagram' ? variants.instagram_variant : variants.facebook_variant;
            
            // If variantPath starts with /uploads, strip it to prevent duplicate path segments
            const cleanedPath = variantPath.replace(/^\/uploads\//, '');
            imageUrl = `${mediaBaseUrl}/${cleanedPath}`;
        }

        let result;
        if (target.platform === 'facebook') {
            // Find the Page Access Token for this target.id
            const pages = await metaService.getFacebookPages(postJob.config_id);
            const targetPage = pages.data?.find(p => p.id === target.target_id);
            const pageAccessToken = targetPage?.access_token || token;

            result = await metaService.publishFacebookPost({
                pageId: target.target_id,
                pageAccessToken,
                caption: postJob.caption,
                imageUrl
            });
        } else if (target.platform === 'instagram') {
            // Instagram publishing uses Page Access Token of its connected Facebook Page
            const pages = await metaService.getFacebookPages(postJob.config_id);
            const targetPage = pages.data?.find(p => p.id === target.linked_page_id);
            const pageAccessToken = targetPage?.access_token || token;

            result = await metaService.publishInstagramPost({
                igUserId: target.target_id,
                pageAccessToken,
                caption: postJob.caption,
                imageUrl
            });
        } else {
            throw new Error(`Unsupported platform: ${target.platform}`);
        }

        // 3. Mark as published
        await pool.query(
            `UPDATE meta_post_targets 
             SET status = "published", remote_post_id = ?, remote_media_id = ?, container_id = ?, permalink = ?, published_at = NOW() 
             WHERE id = ?`,
            [
                result.remotePostId || null,
                result.remoteMediaId || null,
                result.containerId || null,
                result.permalink || null,
                targetRowId
            ]
        );

        // Update successful count on job
        await pool.query(
            'UPDATE meta_post_jobs SET successful_targets = successful_targets + 1 WHERE id = ?',
            [target.post_job_id]
        );

        // Broadcast success status
        metaEventsService.sendProgressUpdate(postJob.created_by, {
            jobId: postJob.id,
            targetId: target.id,
            status: 'published',
            permalink: result.permalink || null
        });

        // Check if job completed
        await checkAndUpdateJobStatus(target.post_job_id);

    } catch (error) {
        console.error(`[Meta Queue Worker] Job target execution failed:`, error.message);
        
        let targetStatus = 'failed';
        if (error.code === 'quota_exhausted') {
            targetStatus = 'quota_exhausted';
        } else if (error.isRetryable && job.attemptsMade < (job.opts.attempts || 3) - 1) {
            targetStatus = 'retry_scheduled';
        } else if (!error.code && error.message.toLowerCase().includes('timeout')) {
            targetStatus = 'outcome_unknown';
        }

        await pool.query(
            `UPDATE meta_post_targets 
             SET status = ?, error_code = ?, error_subcode = ?, error_message = ?, meta_trace_id = ?
             WHERE id = ?`,
            [
                targetStatus,
                error.code || null,
                error.subcode || null,
                error.message || 'Unknown processing error',
                error.traceId || null,
                targetRowId
            ]
        );

        if (targetStatus !== 'retry_scheduled') {
            await pool.query(
                'UPDATE meta_post_jobs SET failed_targets = failed_targets + 1 WHERE id = ?',
                [target.post_job_id]
            );
        }

        // Broadcast failure status
        metaEventsService.sendProgressUpdate(postJob.created_by, {
            jobId: target.post_job_id,
            targetId: target.id,
            status: targetStatus,
            errorMessage: error.message
        });

        if (targetStatus !== 'retry_scheduled') {
            await checkAndUpdateJobStatus(target.post_job_id);
        }

        if (targetStatus === 'retry_scheduled') {
            throw error;
        }
    }
}, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
        max: limitMax,
        duration: limitDuration
    }
});

const checkAndUpdateJobStatus = async (jobId) => {
    const [[job]] = await pool.query('SELECT * FROM meta_post_jobs WHERE id = ?', [jobId]);
    if (!job) return;

    const [targets] = await pool.query('SELECT status FROM meta_post_targets WHERE post_job_id = ?', [jobId]);
    
    const allDone = targets.every(t => ['published', 'failed', 'quota_exhausted', 'outcome_unknown', 'cancelled'].includes(t.status));
    if (allDone) {
        await pool.query(
            'UPDATE meta_post_jobs SET status = "completed", completed_at = NOW() WHERE id = ?',
            [jobId]
        );
    } else {
        const anyProcessing = targets.some(t => t.status === 'processing');
        if (anyProcessing && job.status === 'queued') {
            await pool.query(
                'UPDATE meta_post_jobs SET status = "processing", started_at = NOW() WHERE id = ?',
                [jobId]
            );
        }
    }
};

// Queue Recovery Process: finds queued targets without active jobs and enqueues them
const recoverQueuedJobs = async () => {
    try {
        console.log('[Meta Queue Recovery] Checking for stranded queued target rows...');
        const [strandedTargets] = await pool.query(
            'SELECT id, post_job_id FROM meta_post_targets WHERE status IN ("queued", "processing", "retry_scheduled")'
        );

        for (const target of strandedTargets) {
            const jobId = `meta-post-target:${target.id}`;
            const existingJob = await metaPostingQueue.getJob(jobId);
            if (!existingJob) {
                console.log(`[Meta Queue Recovery] Recovering stranded target ID ${target.id}, adding job to queue...`);
                await metaPostingQueue.add(
                    'post-to-target',
                    { targetId: target.id },
                    { jobId }
                );
            }
        }
        console.log('[Meta Queue Recovery] Recovery scanning completed successfully.');
    } catch (e) {
        console.error('[Meta Queue Recovery] Error during recovery:', e.message);
    }
};

module.exports = {
    metaPostingQueue,
    recoverQueuedJobs
};
