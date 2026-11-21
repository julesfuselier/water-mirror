// Validation of incoming shower measurements (from the ESP32 or the API).

import { HttpError } from './http.js';

const MAX_LITERS = 1000;
const MAX_MINUTES = 600;

/** "10m45s" -> 10.75, "45s" -> 0.75, "3.5" -> 3.5 (minutes) */
export function parseDuration(value) {
  if (typeof value === 'number') return value;
  const str = String(value ?? '').trim().toLowerCase();
  const match = str.match(/^(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (str && match && (match[1] || match[2])) {
    return Number(match[1] ?? 0) + Number(match[2] ?? 0) / 60;
  }
  return Number(str);
}

/** Same normalisation as the original Flask server: "aLEX " -> "Alex" */
export function normalizeUser(name) {
  const clean = String(name ?? '').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function parseShower(input) {
  const user = normalizeUser(input.user);
  const liters = Number(input.liters);
  const durationMin = parseDuration(input.duration ?? input.durationMin);

  if (!user || user.length > 40) throw new HttpError(400, '`user` is required (max 40 characters).');
  if (!Number.isFinite(liters) || liters < 0 || liters > MAX_LITERS) {
    throw new HttpError(400, `\`liters\` must be a number between 0 and ${MAX_LITERS}.`);
  }
  if (!Number.isFinite(durationMin) || durationMin < 0 || durationMin > MAX_MINUTES) {
    throw new HttpError(400, '`duration` must be minutes (e.g. 3.5) or a string like "3m30s".');
  }

  // Optional timestamp, e.g. measurements buffered by the ESP32 while offline
  let createdAt = null;
  if (input.createdAt) {
    const date = new Date(input.createdAt);
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 2020 || date.getTime() > Date.now() + 60_000) {
      throw new HttpError(400, '`createdAt` must be an ISO date between 2020 and now.');
    }
    createdAt = date.toISOString();
  }

  const deviceId = input.device ? String(input.device).slice(0, 64) : null;
  return {
    user,
    liters: Math.round(liters * 100) / 100,
    durationMin: Math.round(durationMin * 100) / 100,
    deviceId,
    createdAt,
  };
}
