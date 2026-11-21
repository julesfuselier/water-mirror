// Calls to the Water Mirror API, with a local cache so pages still render offline.

import { storage } from './storage.js';

const CACHE_KEY = 'wm_showers_cache';

/**
 * @returns {Promise<{showers: Array<{id:number,user:string,liters:number,durationMin:number,createdAt:string}>, online: boolean}>}
 */
export async function fetchShowers() {
  try {
    const res = await fetch('/api/showers', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const showers = await res.json();
    storage.set(CACHE_KEY, showers);
    return { showers, online: true };
  } catch (err) {
    console.warn('API unreachable, using cached data.', err);
    return { showers: storage.getJSON(CACHE_KEY, []), online: false };
  }
}

/** Wipes the whole history on the server. Requires the admin key. */
export async function resetHistory(adminKey) {
  const res = await fetch('/api/reset', { method: 'POST', headers: { 'x-api-key': adminKey } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
}
