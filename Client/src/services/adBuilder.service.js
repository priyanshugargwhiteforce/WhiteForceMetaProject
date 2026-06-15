'use strict';

import axios from 'axios';

const API_BASE = '/api/linkedin/ads';

/** Save or update a draft */
export async function saveDraft(draftPayload) {
  // backend expects draftPayload as body
  const response = await axios.post(`${API_BASE}/draft`, draftPayload);
  return response.data;
}

/** Publish a draft */
export async function publishAd(publishPayload) {
  const response = await axios.post(`${API_BASE}/create`, publishPayload);
  return response.data;
}

/** List ads (drafts + published) */
export async function listAds(page = 1, limit = 20) {
  const response = await axios.get(API_BASE, { params: { page, limit } });
  return response.data.ads;
}

/** Get ad detail */
export async function getAdDetail(id) {
  const response = await axios.get(`${API_BASE}/${id}`);
  return response.data.ad;
}

/** Pause an ad */
export async function pauseAd(id) {
  const response = await axios.put(`${API_BASE}/${id}/pause`);
  return response.data;
}

/** Resume an ad */
export async function resumeAd(id) {
  const response = await axios.put(`${API_BASE}/${id}/resume`);
  return response.data;
}
