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

/**
 * Normalizes targeting items into URN strings.
 * Supports both raw URN strings and { name, urn } objects.
 * @param {Array} list - Array of URN strings or targeting objects
 * @returns {Array} List of validated URN strings
 */
const normalizeTargetingUrns = (list) => {
    if (!Array.isArray(list)) return [];
    return list
        .map(item => {
            let urn = null;
            if (typeof item === 'string') urn = item;
            else if (item && typeof item === 'object' && typeof item.urn === 'string') urn = item.urn;
            
            // Auto-convert legacy language URNs to supported interfaceLocales URNs
            if (urn && urn.startsWith('urn:li:language:')) {
                const lang = urn.replace('urn:li:language:', '');
                const langMap = {
                    en: 'en_US',
                    es: 'es_ES',
                    fr: 'fr_FR',
                    de: 'de_DE',
                    hi: 'hi_IN',
                    ja: 'ja_JP',
                    zh: 'zh_CN',
                    pt: 'pt_BR',
                    it: 'it_IT',
                    ru: 'ru_RU',
                    ar: 'ar_AE',
                    ko: 'ko_KR',
                    nl: 'nl_NL',
                    tr: 'tr_TR'
                };
                const mappedLocale = langMap[lang] || 'en_US';
                return `urn:li:locale:${mappedLocale}`;
            }
            return urn;
        })
        .filter(urn => urn && urn.startsWith('urn:li:'));
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
    // Map language code to standard, supported interface locale country pairs to prevent INVALID_INTERFACE_LOCALE_CODE validation error
    const lang = data.language || 'en';
    let countryCode = 'US';
    if (lang === 'es') countryCode = 'ES';
    else if (lang === 'fr') countryCode = 'FR';
    else if (lang === 'de') countryCode = 'DE';
    else if (lang === 'it') countryCode = 'IT';
    else if (lang === 'ja') countryCode = 'JP';
    else if (lang === 'pt') countryCode = 'BR';
    else if (lang === 'ru') countryCode = 'RU';
    else if (lang === 'zh') countryCode = 'CN';
    else if (lang === 'ko') countryCode = 'KR';

    payload.locale = {
        language: lang,
        country: countryCode
    };

    // 3. Cost Type
    payload.costType = data.costType.toUpperCase();

    // 5. Build Targeting include/exclude and/or array
    if (data.targeting) {
        const andFilters = [];

        // Geographies / locations
        const locations = data.targeting.locations || data.targeting.countries || [];
        const locUrns = normalizeTargetingUrns(locations);
        if (locUrns.length > 0) {
            andFilters.push({
                or: {
                    'urn:li:adTargetingFacet:locations': locUrns
                }
            });
        }

        // Languages (interfaceLocales)
        const langUrns = normalizeTargetingUrns(data.targeting.languages);
        if (langUrns.length > 0) {
            andFilters.push({
                or: {
                    'urn:li:adTargetingFacet:interfaceLocales': langUrns
                }
            });
        }

        // Job Functions
        const jobUrns = normalizeTargetingUrns(data.targeting.jobFunctions);
        if (jobUrns.length > 0) {
            andFilters.push({
                or: {
                    'urn:li:adTargetingFacet:jobFunctions': jobUrns
                }
            });
        }

        // Industries
        const indUrns = normalizeTargetingUrns(data.targeting.industries);
        if (indUrns.length > 0) {
            andFilters.push({
                or: {
                    'urn:li:adTargetingFacet:industries': indUrns
                }
            });
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
    normalizeTargetingUrns,
    buildLinkedInCampaignPayload
};
