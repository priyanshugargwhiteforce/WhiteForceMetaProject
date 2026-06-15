const fs = require('fs');
const axios = require('axios');
const { pool } = require('../config/db');
const { callLinkedInWriteAPI, logLinkedInWriteAction } = require('./linkedin.service');
const { getAssetById, logSystemWrite } = require('./mediaLibrary.service');

/**
 * Check if the current environment allows simulation fallback
 */
const isSimulationAllowed = () => {
    return process.env.NODE_ENV !== 'production' || process.env.LINKEDIN_SIMULATION_MODE === 'true';
};

/**
 * Register and upload a local media asset to LinkedIn
 * @param {number} mediaLibraryId - The ID in the media_library table
 * @param {string} accountId - LinkedIn Ad Account ID
 * @param {object} user - Authenticated user details
 */
const registerMediaToLinkedIn = async (mediaLibraryId, accountId, user = null) => {
    const userId = user ? user.id : null;
    const startTime = Date.now();

    // 1. Fetch Media Asset
    const asset = await getAssetById(mediaLibraryId);
    if (!asset) {
        throw new Error(`Media Library asset with ID ${mediaLibraryId} not found.`);
    }

    // Check if URN already exists
    if (asset.linkedin_asset_urn) {
        console.log(`[LinkedIn Asset] Asset already registered with URN: ${asset.linkedin_asset_urn}`);
        return {
            success: true,
            duplicate: true,
            linkedin_asset_urn: asset.linkedin_asset_urn,
            processing_status: asset.processing_status
        };
    }

    const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');

    // Map recipes
    let recipe = 'urn:li:digitalmediaRecipe:feedshare-image';
    if (asset.asset_type === 'VIDEO') {
        recipe = 'urn:li:digitalmediaRecipe:feedshare-video';
    } else if (asset.asset_type === 'DOCUMENT') {
        recipe = 'urn:li:digitalmediaRecipe:feedshare-document';
    }

    // Request payload for LinkedIn registerUpload
    const registerPayload = {
        registerUploadRequest: {
            recipes: [recipe],
            owner: `urn:li:sponsoredAccount:${cleanAccountId}`,
            serviceRelationships: [
                {
                    relationshipType: 'OWNER',
                    // UGC sharing is standard for updates
                    identifier: 'urn:li:userGeneratedContent'
                }
            ]
        }
    };

    console.log(`[LinkedIn Asset Service] Registering media ${mediaLibraryId} for Account ${cleanAccountId}...`);
    await pool.query(
        "UPDATE media_library SET processing_status = 'REGISTERED' WHERE id = ?",
        [mediaLibraryId]
    );

    let apiRes;
    try {
        const url = 'https://api.linkedin.com/v2/assets?action=registerUpload';
        apiRes = await callLinkedInWriteAPI('POST', url, registerPayload);
    } catch (err) {
        apiRes = { success: false, error: err.message, status: 500 };
    }

    const executionTime = Date.now() - startTime;

    // Handle API Failure
    if (!apiRes || !apiRes.success) {
        console.error('[LinkedIn Register API Failed]:', apiRes?.error || 'Unknown error');
        
        // Check if simulation is allowed
        if (isSimulationAllowed()) {
            console.warn('[Simulation Mode Enabled] Falling back to fake LinkedIn Asset registration...');
            const simulatedUrn = `urn:li:digitalmediaAsset:C560DAQMOCK${mediaLibraryId}_${Date.now()}`;
            
            await pool.query(
                `UPDATE media_library 
                 SET linkedin_asset_urn = ?, processing_status = 'AVAILABLE', error_message = NULL 
                 WHERE id = ?`,
                [simulatedUrn, mediaLibraryId]
            );

            await logLinkedInWriteAction(
                cleanAccountId,
                'MEDIA_UPLOAD_SIMULATED',
                registerPayload,
                { asset: simulatedUrn, status: 'AVAILABLE' },
                'SUCCESS',
                null,
                executionTime
            );

            return {
                success: true,
                simulated: true,
                linkedin_asset_urn: simulatedUrn,
                processing_status: 'AVAILABLE'
            };
        } else {
            // Production error handling
            const errMsg = apiRes?.error ? JSON.stringify(apiRes.error) : 'LinkedIn registration request failed.';
            
            await pool.query(
                `UPDATE media_library 
                 SET processing_status = 'FAILED', error_message = ? 
                 WHERE id = ?`,
                [errMsg, mediaLibraryId]
            );

            await logLinkedInWriteAction(
                cleanAccountId,
                'MEDIA_FAILED',
                registerPayload,
                apiRes?.error || null,
                'LINKEDIN_FAILED',
                errMsg,
                executionTime
            );

            throw new Error(`LinkedIn API Asset registration failed: ${errMsg}`);
        }
    }

    // Success response parsing
    const uploadMechanism = apiRes.data?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
    const assetUrn = apiRes.data?.value?.asset;

    if (!uploadMechanism || !assetUrn) {
        const missingErr = 'LinkedIn API did not return uploadUrl or asset URN.';
        await pool.query(
            "UPDATE media_library SET processing_status = 'FAILED', error_message = ? WHERE id = ?",
            [missingErr, mediaLibraryId]
        );
        throw new Error(missingErr);
    }

    const uploadUrl = uploadMechanism.uploadUrl;
    console.log(`[LinkedIn Asset Uploader] Registration success. URN: ${assetUrn}. Starting binary stream...`);

    // 2. Perform Binary Upload
    try {
        await pool.query(
            "UPDATE media_library SET linkedin_asset_urn = ?, processing_status = 'PROCESSING' WHERE id = ?",
            [assetUrn, mediaLibraryId]
        );

        await logLinkedInWriteAction(
            cleanAccountId,
            'MEDIA_PROCESSING',
            { mediaLibraryId, assetUrn, uploadUrl },
            apiRes.data,
            'SUCCESS',
            null,
            Date.now() - startTime
        );

        // Read file stream and upload
        const fileStream = fs.createReadStream(asset.local_path);
        
        await axios.put(uploadUrl, fileStream, {
            headers: {
                'Content-Type': asset.mime_type
            }
        });

        console.log('[LinkedIn Asset Uploader] Binary upload completed. Polling status...');

        // 3. Poll status
        let isAvailable = false;
        let attempts = 0;
        const maxAttempts = 5;

        const assetId = assetUrn.replace('urn:li:digitalmediaAsset:', '');

        // Synchronous immediate polling (non-blocking for UI if running fast, else handled)
        while (attempts < maxAttempts && !isAvailable) {
            attempts++;
            await new Promise(r => setTimeout(r, 1500)); // sleep 1.5s
            
            try {
                const checkRes = await callLinkedInWriteAPI('GET', `https://api.linkedin.com/v2/assets/${assetId}`);
                if (checkRes.success && checkRes.data) {
                    const status = checkRes.data.status;
                    console.log(`[LinkedIn Poller] Attempt ${attempts}: Status is ${status}`);
                    if (status === 'AVAILABLE' || status === 'ALLOWED') {
                        isAvailable = true;
                    }
                }
            } catch (pollErr) {
                console.warn(`[LinkedIn Poller] Poll attempt ${attempts} failed:`, pollErr.message);
            }
        }

        if (isAvailable) {
            await pool.query(
                "UPDATE media_library SET processing_status = 'AVAILABLE', error_message = NULL WHERE id = ?",
                [mediaLibraryId]
            );
            await logLinkedInWriteAction(
                cleanAccountId,
                'MEDIA_AVAILABLE',
                { mediaLibraryId, assetUrn },
                { status: 'AVAILABLE' },
                'SUCCESS',
                null,
                Date.now() - startTime
            );
        } else {
            // If it takes longer, leave in PROCESSING state so client polling can query it.
            console.log('[LinkedIn Asset Uploader] Asset still processing in background.');
        }

        return {
            success: true,
            linkedin_asset_urn: assetUrn,
            processing_status: isAvailable ? 'AVAILABLE' : 'PROCESSING'
        };

    } catch (uploadError) {
        console.error('[LinkedIn Binary Upload/Poll Failed]:', uploadError.message);
        
        const errMsg = uploadError.message;
        await pool.query(
            "UPDATE media_library SET processing_status = 'FAILED', error_message = ? WHERE id = ?",
            [errMsg, mediaLibraryId]
        );

        await logLinkedInWriteAction(
            cleanAccountId,
            'MEDIA_FAILED',
            { mediaLibraryId, assetUrn },
            null,
            'LINKEDIN_FAILED',
            errMsg,
            Date.now() - startTime
        );

        throw new Error(`LinkedIn upload failed: ${errMsg}`);
    }
};

/**
 * Retrieve status from LinkedIn
 */
const getLinkedInAssetStatus = async (mediaLibraryId, accountId) => {
    const asset = await getAssetById(mediaLibraryId);
    if (!asset || !asset.linkedin_asset_urn) {
        return { success: false, status: 'NOT_FOUND', message: 'Asset does not have URN.' };
    }

    // In simulation mode, mock check
    if (asset.linkedin_asset_urn.includes('MOCK')) {
        return { success: true, status: 'AVAILABLE', raw: { status: 'AVAILABLE' } };
    }

    const assetId = asset.linkedin_asset_urn.replace('urn:li:digitalmediaAsset:', '');
    const apiRes = await callLinkedInWriteAPI('GET', `https://api.linkedin.com/v2/assets/${assetId}`);
    
    if (apiRes.success && apiRes.data) {
        let status = apiRes.data.status;
        if (status === 'AVAILABLE' || status === 'ALLOWED') {
            status = 'AVAILABLE';
            await pool.query("UPDATE media_library SET processing_status = 'AVAILABLE' WHERE id = ?", [mediaLibraryId]);
        }
        return { success: true, status, raw: apiRes.data };
    }

    return { success: false, error: apiRes.error };
};

module.exports = {
    registerMediaToLinkedIn,
    getLinkedInAssetStatus,
    isSimulationAllowed
};
