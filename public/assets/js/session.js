// Current profile and family members (stored in the browser for now).

import { DEFAULT_FAMILY } from './config.js';
import { storage } from './storage.js';

const USER_KEY = 'wm_user';
const FAMILY_KEY = 'ecoFamily';

/** Profile picked on the home screen. `?user=` in the URL still works (old links). */
export function getCurrentUser() {
  const fromUrl = new URLSearchParams(location.search).get('user');
  if (fromUrl) {
    storage.set(USER_KEY, fromUrl);
    return fromUrl;
  }
  return storage.get(USER_KEY);
}

/** For app pages: sends back to profile selection when nobody is signed in. */
export function requireUser() {
  const user = getCurrentUser();
  if (!user) location.replace('/');
  return user;
}

export function getFamily() {
  const family = storage.getJSON(FAMILY_KEY);
  return Array.isArray(family) && family.length ? family : [...DEFAULT_FAMILY];
}

export function saveFamily(members) {
  storage.set(FAMILY_KEY, members);
}

/** Per-profile key, e.g. userKey('streak', 'Alex') -> "streak_Alex" */
export const userKey = (name, user) => `${name}_${user}`;
