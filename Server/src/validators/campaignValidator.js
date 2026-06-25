/**
 * Campaign Validator
 * Reusable validator for campaign drafts and publications.
 */

const isUrn = (str) => {
    return typeof str === 'string' && (str.startsWith('urn:li:') || str.startsWith('urn:lia:'));
};

const getUrn = (val) => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && typeof val.urn === 'string') return val.urn;
    return null;
};

/**
 * Validate campaign data
 * @param {Object} data - The campaign request payload
 * @param {Boolean} isPublish - Whether this is a publish action (true) or draft save (false)
 * @returns {Array} List of validation errors: { field, message }
 */
const validateCampaign = (data, isPublish = false, currency = 'USD') => {
    const errors = [];

    // --- Draft and Publish Shared Minimums ---
    if (!data.accountId) {
        errors.push({ field: 'accountId', message: 'Account ID is required.' });
    }

    if (!data.campaignName || !data.campaignName.trim()) {
        errors.push({ field: 'campaignName', message: 'Campaign name is required.' });
    }

    if (!data.campaignGroupId) {
        errors.push({ field: 'campaignGroupId', message: 'Campaign group is required.' });
    }

    // Budget validations for both drafts and publishes (prevent negative values)
    if (data.dailyBudget !== undefined && data.dailyBudget !== null) {
        const numDaily = Number(data.dailyBudget);
        if (isNaN(numDaily) || numDaily < 0) {
            errors.push({ field: 'dailyBudget', message: 'Daily budget cannot be negative or invalid.' });
        }
    }

    if (data.lifetimeBudget !== undefined && data.lifetimeBudget !== null) {
        const numLife = Number(data.lifetimeBudget);
        if (isNaN(numLife) || numLife < 0) {
            errors.push({ field: 'lifetimeBudget', message: 'Lifetime budget cannot be negative or invalid.' });
        }
    }

    // --- Publish Specific Validations ---
    if (isPublish) {
        // Objective
        if (!data.objective) {
            errors.push({ field: 'objective', message: 'Objective is required for publication.' });
        }

        // Language
        if (!data.language) {
            errors.push({ field: 'language', message: 'Language is required for publication.' });
        }

        // Daily budget must meet currency-based minimums
        const numDaily = Number(data.dailyBudget);
        let minBudget = 10.00;
        if (currency === 'INR') minBudget = 500.00;
        else if (currency === 'JPY') minBudget = 1000.00;

        if (data.dailyBudget === undefined || data.dailyBudget === null || isNaN(numDaily) || numDaily < minBudget) {
            errors.push({ field: 'dailyBudget', message: `Daily budget must be at least ${currency} ${minBudget.toFixed(2)} for publication.` });
        }

        // Lifetime budget must be >= Daily Budget if provided
        if (data.dailyBudget && data.lifetimeBudget && Number(data.lifetimeBudget) < Number(data.dailyBudget)) {
            errors.push({ field: 'lifetimeBudget', message: 'Lifetime budget must be greater than or equal to daily budget.' });
        }

        // Bid Strategy & Optimization Goal
        if (!data.bidStrategy) {
            errors.push({ field: 'bidStrategy', message: 'Bid strategy is required for publication.' });
        }
        if (!data.optimizationGoal) {
            errors.push({ field: 'optimizationGoal', message: 'Optimization goal is required for publication.' });
        }
        if (!data.costType) {
            errors.push({ field: 'costType', message: 'Cost type is required for publication.' });
        }

        // Schedule
        if (!data.startTime) {
            errors.push({ field: 'startTime', message: 'Start time is required for publication.' });
        } else {
            const startMs = new Date(data.startTime).getTime();
            if (isNaN(startMs)) {
                errors.push({ field: 'startTime', message: 'Invalid start date format.' });
            } else if (startMs < Date.now()) {
                errors.push({ field: 'startTime', message: 'Start date must be in the future for publication.' });
            }
        }

        if (data.endTime) {
            const endMs = new Date(data.endTime).getTime();
            const startMs = new Date(data.startTime).getTime();
            if (isNaN(endMs)) {
                errors.push({ field: 'endTime', message: 'Invalid end date format.' });
            } else if (!isNaN(startMs) && endMs <= startMs) {
                errors.push({ field: 'endTime', message: 'End date must be strictly after the start date.' });
            }
        }

        // Location is required for publish targeting
        if (!data.targeting || !Array.isArray(data.targeting.locations) || data.targeting.locations.length === 0) {
            errors.push({
                field: 'targeting.locations',
                message: 'At least one target location is required for publication.'
            });
        }

        // Targeting Safety: Must be valid URN formats
        if (data.targeting) {
            const facets = ['countries', 'locations', 'languages', 'jobFunctions', 'industries'];
            facets.forEach(facet => {
                if (Array.isArray(data.targeting[facet])) {
                    const invalidItems = data.targeting[facet].filter(val => {
                        const urn = getUrn(val);
                        return !urn || !isUrn(urn);
                    });
                    if (invalidItems.length > 0) {
                        errors.push({
                            field: `targeting.${facet}`,
                            message: `Targeting values for ${facet} must be valid LinkedIn URNs for publish.`
                        });
                    }
                }
            });
        }
    } else {
        // Warnings for draft dates (do not block draft save, but warn if invalid date objects)
        if (data.startTime && isNaN(new Date(data.startTime).getTime())) {
            // Log warning internally or append to warning flags (not blocking)
            console.log('[Draft Warning] Invalid draft start date format.');
        }
        if (data.endTime && isNaN(new Date(data.endTime).getTime())) {
            console.log('[Draft Warning] Invalid draft end date format.');
        }
    }

    return errors;
};

module.exports = {
    validateCampaign,
    isUrn
};
