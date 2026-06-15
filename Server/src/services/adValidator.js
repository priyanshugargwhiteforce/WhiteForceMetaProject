'use strict';

/** Simple ad validator */
function validateAd(payload) {
  const errors = [];
  if (!payload.accountId) errors.push({field: 'accountId', message: 'accountId is required'});
  if (!payload.campaignId) errors.push({field: 'campaignId', message: 'campaignId is required'});
  if (!payload.creativeId) errors.push({field: 'creativeId', message: 'creativeId is required'});
  if (!payload.adName) errors.push({field: 'adName', message: 'adName is required'});
  if (!payload.adFormat) errors.push({field: 'adFormat', message: 'adFormat is required'});
  const validFormats = ['SINGLE_IMAGE', 'CAROUSEL', 'VIDEO'];
  if (payload.adFormat && !validFormats.includes(payload.adFormat)) {
    errors.push({field: 'adFormat', message: `adFormat must be one of ${validFormats.join(', ')}`});
  }
  // Additional cross-field check placeholder
  // e.g., ensure campaign belongs to account, etc. (skipped)
  return { isValid: errors.length === 0, errors };
}

module.exports = validateAd;
