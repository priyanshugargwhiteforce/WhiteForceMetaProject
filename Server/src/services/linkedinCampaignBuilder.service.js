/**
 * LinkedIn Campaign Builder Service
 * Compiles and normalizes internal wizard payloads into LinkedIn Ads API v2 specifications.
 */

const normalizeAccountUrn = (accountId) => {
    if (!accountId) return null;
    const str = String(accountId);
    if (str.startsWith('urn:li:')) return str;
    return `urn:li:sponsoredAccount:${str}`;
};

const normalizeGroupUrn = (groupId) => {
    if (!groupId) return null;
    const str = String(groupId);
    if (str.startsWith('urn:li:')) return str;
    return `urn:li:sponsoredCampaignGroup:${str}`;
};

/**
 * Build the RESTli v2 API payload for creating a campaign
 * @param {Object} data - Validation-cleared campaign config from wizard
 * @param {String} currency - Readonly currency from active ad account
 * @returns {Object} RESTli payload matching LinkedIn API v2 specs
 */
const buildLinkedInCampaignPayload = (data, currency = 'USD') => {
    const payload = {
        account: normalizeAccountUrn(data.accountId),
        campaignGroup: normalizeGroupUrn(data.campaignGroupId),
        name: data.campaignName.trim(),
        status: data.status ? data.status.toUpperCase() : 'DRAFT',
        type: data.type || 'SPONSORED_UPDATES',
        objectiveType: data.objective.toUpperCase(),
        format: 'STANDARD_UPDATE',
        creativeSelection: 'OPTIMIZED'
    };

    // 1. Build Schedules
    payload.runSchedule = {
        start: new Date(data.startTime).getTime()
    };
    if (data.endTime) {
        payload.runSchedule.end = new Date(data.endTime).getTime();
    }

    // 2. Build Budgets
    payload.dailyBudget = {
        amount: String(Number(data.dailyBudget).toFixed(2)),
        currencyCode: currency
    };

    if (data.unitCost) {
        payload.unitCost = {
            amount: String(Number(data.unitCost).toFixed(2)),
            currencyCode: currency
        };
    }

    // 2.5. Build Locale (Required by LinkedIn API)
    payload.locale = {
        language: data.language || 'en',
        country: data.country || 'US'
    };

    // 3. Cost Type
    payload.costType = data.costType.toUpperCase();

    // 5. Build Targeting include/exclude and/or array
    if (data.targeting) {
        const andFilters = [];

        // Geographies / locations
        const locations = data.targeting.locations || data.targeting.countries || [];
        if (locations.length > 0) {
            const locUrns = locations.filter(val => typeof val === 'string' && val.startsWith('urn:li:'));
            if (locUrns.length > 0) {
                andFilters.push({
                    or: {
                        'urn:li:adTargetingFacet:locations': locUrns
                    }
                });
            }
        }

        // Languages
        if (Array.isArray(data.targeting.languages) && data.targeting.languages.length > 0) {
            const langUrns = data.targeting.languages.filter(val => typeof val === 'string' && val.startsWith('urn:li:'));
            if (langUrns.length > 0) {
                andFilters.push({
                    or: {
                        'urn:li:adTargetingFacet:interfaceLanguages': langUrns
                    }
                });
            }
        }

        // Job Functions
        if (Array.isArray(data.targeting.jobFunctions) && data.targeting.jobFunctions.length > 0) {
            const jobUrns = data.targeting.jobFunctions.filter(val => typeof val === 'string' && val.startsWith('urn:li:'));
            if (jobUrns.length > 0) {
                andFilters.push({
                    or: {
                        'urn:li:adTargetingFacet:jobFunctions': jobUrns
                    }
                });
            }
        }

        // Industries
        if (Array.isArray(data.targeting.industries) && data.targeting.industries.length > 0) {
            const indUrns = data.targeting.industries.filter(val => typeof val === 'string' && val.startsWith('urn:li:'));
            if (indUrns.length > 0) {
                andFilters.push({
                    or: {
                        'urn:li:adTargetingFacet:industries': indUrns
                    }
                });
            }
        }

        if (andFilters.length > 0) {
            payload.targetingCriteria = {
                include: {
                    and: andFilters
                }
            };
        }
    }

    return payload;
};

module.exports = {
    normalizeAccountUrn,
    normalizeGroupUrn,
    buildLinkedInCampaignPayload
};
