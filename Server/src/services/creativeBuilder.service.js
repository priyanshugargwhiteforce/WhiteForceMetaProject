const { pool } = require('../config/db');
const { validateCreative } = require('../validators/creativeValidator');
const { isSimulationAllowed } = require('./linkedinAsset.service');
const { callLinkedInWriteAPI, logLinkedInWriteAction } = require('./linkedin.service');
const { getAssetById, logSystemWrite } = require('./mediaLibrary.service');

/**
 * Save a local ad creative draft without contacting LinkedIn API
 */
const saveCreativeDraft = async (data, user = null) => {
    const userId = user ? user.id : null;
    const valRes = validateCreative(data, true); // lenient draft validation
    if (!valRes.isValid) {
        throw new Error(JSON.stringify(valRes.errors));
    }

    const {
        accountId,
        campaignGroupId,
        campaignId,
        mediaLibraryId,
        headline,
        description,
        destinationUrl,
        callToAction,
        creativeType,
        creativePayload
    } = data;

    const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');
    const cleanGroupId = String(campaignGroupId).replace('urn:li:sponsoredCampaignGroup:', '');
    const cleanCampaignId = String(campaignId).replace('urn:li:sponsoredCampaign:', '');

    // Compile preview payload based on fields
    const previewPayload = {
        headline: headline || '',
        description: description || '',
        destinationUrl: destinationUrl || '',
        callToAction: callToAction || 'LEARN_MORE',
        creativeType: creativeType || 'SINGLE_IMAGE',
        mediaLibraryId: mediaLibraryId || null
    };

    const query = `
        INSERT INTO linkedin_creatives 
        (account_id, campaign_group_id, campaign_id, media_library_id, headline, description, destination_url, call_to_action, creative_type, status, creative_payload, preview_payload, creation_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, 'LOCAL_DRAFT')
    `;

    const [insertRes] = await pool.query(query, [
        cleanAccountId,
        cleanGroupId,
        cleanCampaignId,
        mediaLibraryId || null,
        headline || null,
        description || null,
        destinationUrl || null,
        callToAction || null,
        creativeType || 'SINGLE_IMAGE',
        JSON.stringify(creativePayload || {}),
        JSON.stringify(previewPayload)
    ]);

    const createdId = insertRes.insertId;

    await logSystemWrite(
        userId,
        'CREATIVE_DRAFT',
        data,
        { id: createdId, status: 'DRAFT' },
        'SUCCESS'
    );

    return {
        id: createdId,
        status: 'DRAFT',
        creation_source: 'LOCAL_DRAFT',
        preview: previewPayload
    };
};

/**
 * Validate and publish an ad creative to LinkedIn, linking it to campaign groups.
 */
const publishCreative = async (data, user = null) => {
    const userId = user ? user.id : null;
    const startTime = Date.now();

    // 1. Strict validation
    const valRes = validateCreative(data, false);
    if (!valRes.isValid) {
        throw new Error(JSON.stringify(valRes.errors));
    }

    const {
        accountId,
        campaignGroupId,
        campaignId,
        mediaLibraryId,
        headline,
        description,
        destinationUrl,
        callToAction,
        creativeType,
        creativePayload
    } = data;

    const cleanAccountId = String(accountId).replace('urn:li:sponsoredAccount:', '').replace('urn:lia:sponsoredAccount:', '');
    const cleanGroupId = String(campaignGroupId).replace('urn:li:sponsoredCampaignGroup:', '');
    const cleanCampaignId = String(campaignId).replace('urn:li:sponsoredCampaign:', '');

    let assetUrn = null;
    
    // Check if mediaLibraryId is present, must be resolved and registered
    if (creativeType !== 'CAROUSEL') {
        const asset = await getAssetById(mediaLibraryId);
        if (!asset) {
            throw new Error(`Media Asset ID ${mediaLibraryId} not found.`);
        }
        if (!asset.linkedin_asset_urn) {
            throw new Error(`Media Asset is not registered on LinkedIn yet. Please run asset registration first.`);
        }
        assetUrn = asset.linkedin_asset_urn;
    } else {
        // Carousel validations (each slide media must be registered)
        if (creativePayload && Array.isArray(creativePayload.slides)) {
            for (const slide of creativePayload.slides) {
                if (!slide.mediaLibraryId) {
                    throw new Error('All carousel slides must reference a mediaLibraryId.');
                }
                const slideAsset = await getAssetById(slide.mediaLibraryId);
                if (!slideAsset || !slideAsset.linkedin_asset_urn) {
                    throw new Error(`Media Asset ID ${slide.mediaLibraryId} for carousel slide is not registered on LinkedIn.`);
                }
            }
        }
    }

    // 2. Publish logic
    console.log(`[Creative Builder] Publishing creative for Campaign ${cleanCampaignId}...`);

    const publishData = {
        accountId: cleanAccountId,
        campaignGroupId: cleanGroupId,
        campaignId: cleanCampaignId,
        mediaLibraryId,
        headline,
        creativeType,
        destinationUrl,
        callToAction
    };

    // Check if simulation is allowed
    if (isSimulationAllowed()) {
        console.log('[Simulation Mode Enabled] Creating fake LinkedIn creative response...');
        const fakeUrn = `urn:li:sponsoredCreative:mock_${Date.now()}`;
        
        const previewPayload = {
            headline,
            description: description || '',
            destinationUrl: destinationUrl || '',
            callToAction: callToAction || 'LEARN_MORE',
            creativeType,
            mediaLibraryId
        };

        const [insertRes] = await pool.query(
            `INSERT INTO linkedin_creatives 
             (creative_urn, account_id, campaign_group_id, campaign_id, media_library_id, headline, description, destination_url, call_to_action, creative_type, status, linkedin_raw_response, creative_payload, preview_payload, creation_source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'WEB_APPLICATION')`,
            [
                fakeUrn,
                cleanAccountId,
                cleanGroupId,
                cleanCampaignId,
                mediaLibraryId || null,
                headline,
                description || null,
                destinationUrl || null,
                callToAction || null,
                creativeType,
                JSON.stringify({ simulated: true, id: fakeUrn }),
                JSON.stringify(creativePayload || {}),
                JSON.stringify(previewPayload)
            ]
        );

        const execTime = Date.now() - startTime;
        await logLinkedInWriteAction(
            cleanAccountId,
            'CREATIVE_CREATED_SIMULATED',
            data,
            { creativeUrn: fakeUrn, status: 'ACTIVE' },
            'SUCCESS',
            null,
            execTime
        );

        return {
            success: true,
            id: insertRes.insertId,
            creative_urn: fakeUrn,
            status: 'ACTIVE',
            simulated: true
        };
    }

    // Production logic: hit LinkedIn APIs
    try {
        // First, create the Share/UGC Post containing the registered asset URN
        const shareMediaCategory = creativeType === 'VIDEO' ? 'VIDEO' : (creativeType === 'DOCUMENT' ? 'NATIVE_DOCUMENT' : 'IMAGE');
        
        const ugcPayload = {
            author: `urn:li:sponsoredAccount:${cleanAccountId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: description || headline
                    },
                    shareMediaCategory,
                    media: [
                        {
                            status: 'READY',
                            description: {
                                text: headline
                            },
                            media: assetUrn,
                            originalUrl: destinationUrl || null
                        }
                    ]
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'DARK' // sponsor ads must be dark
            }
        };

        console.log('[LinkedIn UGC Post] Sending share request...');
        const ugcRes = await callLinkedInWriteAPI('POST', 'https://api.linkedin.com/v2/ugcPosts', ugcPayload);
        
        if (!ugcRes.success) {
            throw new Error(`UGC share post creation failed: ${JSON.stringify(ugcRes.error)}`);
        }

        const shareUrn = ugcRes.headers?.['x-restli-id'] || ugcRes.data?.id;
        if (!shareUrn) {
            throw new Error('LinkedIn did not return UGC post URN.');
        }

        // Second, link the UGC post to Campaign via adCreativesV2
        const adCreativePayload = {
            campaign: `urn:li:sponsoredCampaign:${cleanCampaignId}`,
            reference: shareUrn,
            status: 'ACTIVE',
            variables: {
                'com.linkedin.ads.SponsoredUpdateCreativeVariables': {
                    activity: shareUrn
                }
            },
            name: headline.substring(0, 50)
        };

        console.log('[LinkedIn Ad Creative] Linking UGC Share to Campaign...');
        const creativeRes = await callLinkedInWriteAPI('POST', 'https://api.linkedin.com/v2/adCreativesV2', adCreativePayload);

        if (!creativeRes.success) {
            throw new Error(`Ad creative creation failed: ${JSON.stringify(creativeRes.error)}`);
        }

        const creativeUrn = creativeRes.headers?.['x-restli-id'] || creativeRes.data?.id;
        if (!creativeUrn) {
            throw new Error('LinkedIn did not return creative URN.');
        }

        const previewPayload = {
            headline,
            description: description || '',
            destinationUrl: destinationUrl || '',
            callToAction: callToAction || 'LEARN_MORE',
            creativeType,
            mediaLibraryId
        };

        const [insertRes] = await pool.query(
            `INSERT INTO linkedin_creatives 
             (creative_urn, account_id, campaign_group_id, campaign_id, media_library_id, headline, description, destination_url, call_to_action, creative_type, status, linkedin_raw_response, creative_payload, preview_payload, creation_source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'WEB_APPLICATION')`,
            [
                creativeUrn,
                cleanAccountId,
                cleanGroupId,
                cleanCampaignId,
                mediaLibraryId || null,
                headline,
                description || null,
                destinationUrl || null,
                callToAction || null,
                creativeType,
                JSON.stringify(creativeRes.data || {}),
                JSON.stringify(creativePayload || {}),
                JSON.stringify(previewPayload)
            ]
        );

        const execTime = Date.now() - startTime;
        await logLinkedInWriteAction(
            cleanAccountId,
            'CREATIVE_CREATED',
            data,
            creativeRes.data,
            'SUCCESS',
            null,
            execTime
        );

        return {
            success: true,
            id: insertRes.insertId,
            creative_urn: creativeUrn,
            status: 'ACTIVE'
        };

    } catch (publishErr) {
        console.error('[LinkedIn Creative Publish Failed]:', publishErr.message);

        // Save locally as failed
        const previewPayload = {
            headline,
            description: description || '',
            destinationUrl: destinationUrl || '',
            callToAction: callToAction || 'LEARN_MORE',
            creativeType,
            mediaLibraryId
        };

        const [insertRes] = await pool.query(
            `INSERT INTO linkedin_creatives 
             (creative_urn, account_id, campaign_group_id, campaign_id, media_library_id, headline, description, destination_url, call_to_action, creative_type, status, last_publish_error, creative_payload, preview_payload, creation_source)
             VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FAILED', ?, ?, ?, 'WEB_APPLICATION')`,
            [
                cleanAccountId,
                cleanGroupId,
                cleanCampaignId,
                mediaLibraryId || null,
                headline,
                description || null,
                destinationUrl || null,
                callToAction || null,
                creativeType,
                publishErr.message,
                JSON.stringify(creativePayload || {}),
                JSON.stringify(previewPayload)
            ]
        );

        const execTime = Date.now() - startTime;
        await logLinkedInWriteAction(
            cleanAccountId,
            'CREATIVE_FAILED',
            data,
            null,
            'LINKEDIN_FAILED',
            publishErr.message,
            execTime
        );

        return {
            success: false,
            id: insertRes.insertId,
            status: 'FAILED',
            error: publishErr.message
        };
    }
};

/**
 * Retrieve creatives from DB
 */
const getCreativesList = async (accountId = null) => {
    let query = `
        SELECT c.*, ml.preview_url, ml.original_filename, ml.mime_type
        FROM linkedin_creatives c
        LEFT JOIN media_library ml ON c.media_library_id = ml.id
    `;
    const params = [];

    if (accountId) {
        query += ' WHERE c.account_id = ?';
        params.push(accountId);
    }

    query += ' ORDER BY c.created_at DESC';
    const [rows] = await pool.query(query, params);
    return rows;
};

module.exports = {
    saveCreativeDraft,
    publishCreative,
    getCreativesList
};
