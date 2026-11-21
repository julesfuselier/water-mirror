// Pure calculations on shower records. No DOM here.

import { BASELINE_LITERS, ECO_SHOWER_MAX_LITERS, EUR_PER_LITER } from './config.js';

export const sum = (values) => values.reduce((total, v) => total + v, 0);

export const showersOf = (showers, user) =>
  showers.filter((s) => s.user.toLowerCase() === String(user).toLowerCase());

export const litersSaved = (shower) => Math.max(0, BASELINE_LITERS - shower.liters);

export const totalLitersSaved = (showers) => sum(showers.map(litersSaved));

export const toEuros = (liters) => liters * EUR_PER_LITER;

export const averageLiters = (showers) =>
  showers.length ? sum(showers.map((s) => s.liters)) / showers.length : null;

export const flowRate = (shower) => (shower.durationMin > 0 ? shower.liters / shower.durationMin : 0);

export const isEcoShower = (shower) => shower.liters > 0 && shower.liters <= ECO_SHOWER_MAX_LITERS;

/** Consecutive eco showers, counted back from the latest one. */
export function currentEcoStreak(showers) {
  let streak = 0;
  for (let i = showers.length - 1; i >= 0 && isEcoShower(showers[i]); i--) streak++;
  return streak;
}

/** Longest run of consecutive eco showers. */
export function bestEcoStreak(showers) {
  let best = 0;
  let run = 0;
  for (const shower of showers) {
    run = isEcoShower(shower) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

/**
 * Total liters per week or month, for the last `count` periods that contain data.
 * @param {'week'|'month'} period
 */
export function litersByPeriod(showers, period, count = 6) {
  const groups = new Map();
  for (const shower of showers) {
    const date = new Date(shower.createdAt);
    let key;
    let label;
    if (period === 'week') {
      const { year, week } = isoWeek(date);
      key = `${year}-${String(week).padStart(2, '0')}`;
      label = `W${week}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      label = date.toLocaleDateString('en-US', { month: 'short' });
    }
    const group = groups.get(key) ?? { key, label, liters: 0 };
    group.liters += shower.liters;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-count);
}
