'use strict';

/** Service for LinkedIn Ad Drafts and Publishing */
const { pool } = require('../config/db');
const { getAccessToken, callLinkedInWriteAPI, logLinkedInWriteAction } = require('./linkedin.service');
const adValidator = require('./adValidator');

/** Save or update a draft */
async function saveDraft(draftPayload, userId) {
  const { draftId, accountId, campaignId, creativeId, adName, adFormat } = draftPayload;
  const now = new Date();
  let targetDraftId = draftId;
  if (draftId) {
    // Update existing draft
    await pool.query(
      `UPDATE linkedin_ad_drafts SET account_id = ?, campaign_id = ?, creative_id = ?, ad_name = ?, ad_format = ?, draft_payload = ?, updated_at = ? WHERE id = ? AND created_by = ?`,
      [accountId, campaignId, creativeId, adName, adFormat, JSON.stringify(draftPayload), now, draftId, userId]
    );
  } else {
    // Insert new draft
    const [result] = await pool.query(
      `INSERT INTO linkedin_ad_drafts (account_id, campaign_id, creative_id, ad_name, ad_format, draft_payload, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [accountId, campaignId, creativeId, adName, adFormat, JSON.stringify(draftPayload), userId, now, now]
    );
    targetDraftId = result.insertId;
  }

  try {
    await logLinkedInWriteAction(accountId, 'AD_DRAFT_SAVED', draftPayload, { draftId: targetDraftId }, 'SUCCESS');
  } catch (err) {
    console.warn('Logging AD_DRAFT_SAVED failed:', err.message);
  }

  return { draftId: targetDraftId };
}

/** Validate ad payload using pure validator */
async function validateAd(payload) {
  const { isValid, errors } = adValidator(payload);
  return { isValid, errors };
}

/** Publish ad draft (real or simulated) */
async function publishAd(draftId, userId) {
  // Retrieve draft
  const [[draft]] = await pool.query('SELECT * FROM linkedin_ad_drafts WHERE id = ? AND created_by = ?', [draftId, userId]);
  if (!draft) {
    throw new Error('Draft not found');
  }

  const payload = typeof draft.draft_payload === 'string' ? JSON.parse(draft.draft_payload) : draft.draft_payload;
  const validation = await validateAd(payload);
  if (!validation.isValid) {
    try {
      await logLinkedInWriteAction(draft.account_id, 'AD_VALIDATION_FAILED', payload, { errors: validation.errors }, 'FAILURE');
    } catch (err) {
      console.warn('Logging AD_VALIDATION_FAILED failed:', err.message);
    }
    return { success: false, code: 'VALIDATION_FAILED', message: 'Please fix validation errors.', validationErrors: validation.errors };
  }

  const simulationMode = process.env.LINKEDIN_SIMULATION_MODE === 'true';
  if (simulationMode) {
    // Simulated success
    const simulatedUrn = `urn:li:ad:simulated-${draftId}`;
    await pool.query(
      `UPDATE linkedin_ad_drafts SET status='PUBLISHED', preview_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify({ simulatedUrn }), draftId]
    );
    await logLinkedInWriteAction(draft.account_id, 'AD_CREATED', payload, { simulatedUrn, simulated: true }, 'SUCCESS');
    return { success: true, simulated: true, adUrn: simulatedUrn };
  }

  // Verify LinkedIn publish endpoint is confirmed (simple flag for now)
  const endpointConfirmed = process.env.LINKEDIN_AD_PUBLISH_ENDPOINT_CONFIRMED === 'true';
  if (!endpointConfirmed) {
    try {
      await logLinkedInWriteAction(draft.account_id, 'AD_CREATE_FAILED', payload, { code: 'LINKEDIN_AD_PUBLISH_ENDPOINT_UNCONFIRMED' }, 'FAILURE');
    } catch (err) {
      console.warn('Logging AD_CREATE_FAILED failed:', err.message);
    }
    return {
      success: false,
      code: 'LINKEDIN_AD_PUBLISH_ENDPOINT_UNCONFIRMED',
      message: 'LinkedIn ad publish endpoint is not confirmed for this account/creative flow. Ad draft and local library are saved, but live publish is blocked until endpoint is verified.',
      retryable: false
    };
  }

  // Assemble LinkedIn payload (simplified)
  const linkedinPayload = {
    account: `urn:li:sponsoredAccount:${draft.account_id}`,
    campaign: `urn:li:sponsoredCampaign:${draft.campaign_id}`,
    creative: `urn:li:sponsoredCreative:${draft.creative_id}`,
    name: draft.ad_name,
    format: draft.ad_format
  };

  const response = await callLinkedInWriteAPI('POST', 'https://api.linkedin.com/v2/adCreativesV2', linkedinPayload);
  if (!response.success) {
    await logLinkedInWriteAction(draft.account_id, 'AD_CREATE_FAILED', linkedinPayload, response.error, 'FAILURE');
    return { success: false, code: 'AD_CREATE_FAILED', message: response.error };
  }

  const adUrn = response.data.id || response.data.urn || `urn:li:ad:${draftId}`;
  await pool.query(
    `UPDATE linkedin_ad_drafts SET status='PUBLISHED', preview_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify({ adUrn, rawResponse: response.data }), draftId]
  );
  await logLinkedInWriteAction(draft.account_id, 'AD_CREATED', linkedinPayload, response.data, 'SUCCESS');
  return { success: true, adUrn };
}

/** List ads (drafts + published) with pagination */
async function listAds(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT id, ad_name, ad_format, status, created_at, updated_at FROM linkedin_ad_drafts ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );
  return rows;
}

/** Get ad detail */
async function getAdDetail(id) {
  const [[ad]] = await pool.query('SELECT * FROM linkedin_ad_drafts WHERE id = ?', [id]);
  if (!ad) return null;
  return ad;
}

/** Pause/Resume placeholder */
async function pauseAd(id) {
  return { success: false, code: 'ACTION_NOT_SUPPORTED', message: 'Pause/Resume is not supported for this ad entity.' };
}
async function resumeAd(id) {
  return { success: false, code: 'ACTION_NOT_SUPPORTED', message: 'Pause/Resume is not supported for this ad entity.' };
}

module.exports = { saveDraft, validateAd, publishAd, listAds, getAdDetail, pauseAd, resumeAd };
