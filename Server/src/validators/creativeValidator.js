const validateUrl = (urlStr) => {
    if (!urlStr) return false;
    try {
        new URL(urlStr);
        return true;
    } catch (_) {
        return false;
    }
};

/**
 * Validate input fields for a LinkedIn Creative creation request
 * @param {object} body - Request body
 * @param {boolean} isDraft - Is it a draft request or final publish request
 * @returns {object} { isValid, errors }
 */
const validateCreative = (body, isDraft = false) => {
    const errors = [];

    const {
        accountId,
        campaignGroupId,
        campaignId,
        mediaLibraryId,
        headline,
        destinationUrl,
        creativeType,
        creativePayload
    } = body;

    // For drafts, we require basic identifying fields
    if (!accountId) {
        errors.push({ field: 'accountId', message: 'Account ID is required.' });
    }
    if (!campaignGroupId) {
        errors.push({ field: 'campaignGroupId', message: 'Campaign Group is required.' });
    }
    if (!campaignId) {
        errors.push({ field: 'campaignId', message: 'Campaign is required.' });
    }

    if (isDraft) {
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Strict validation for live publishing
    if (!headline || !headline.trim()) {
        errors.push({ field: 'headline', message: 'Headline is required for publishing.' });
    }

    if (!creativeType) {
        errors.push({ field: 'creativeType', message: 'Creative Type is required.' });
    } else {
        const allowedTypes = ['SINGLE_IMAGE', 'CAROUSEL', 'VIDEO', 'DOCUMENT'];
        if (!allowedTypes.includes(creativeType)) {
            errors.push({ 
                field: 'creativeType', 
                message: `Unsupported creative type: ${creativeType}. Allowed: ${allowedTypes.join(', ')}` 
            });
        }
    }

    // Validations based on type
    if (creativeType === 'SINGLE_IMAGE' || creativeType === 'VIDEO' || creativeType === 'DOCUMENT') {
        if (!mediaLibraryId) {
            errors.push({ field: 'mediaLibraryId', message: `Media asset is required for ${creativeType} creatives.` });
        }
    } else if (creativeType === 'CAROUSEL') {
        // Validate carousel payload if present
        if (!creativePayload || !Array.isArray(creativePayload.slides) || creativePayload.slides.length === 0) {
            errors.push({ field: 'creativePayload', message: 'Carousel creatives must contain at least one slide.' });
        }
    }

    // Validate Destination URL
    if (destinationUrl) {
        if (!validateUrl(destinationUrl)) {
            errors.push({ field: 'destinationUrl', message: 'Destination URL is not valid. Must be a full URL starting with http:// or https://' });
        }
    } else {
        // For ads with a link, target url is generally required
        if (creativeType !== 'DOCUMENT') {
            errors.push({ field: 'destinationUrl', message: 'Destination URL is required for this creative type.' });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateCreative
};
