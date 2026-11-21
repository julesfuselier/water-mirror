// Business constants shared by every page. Change them here, nowhere else.

/** Reference shower volume (L). Savings = BASELINE_LITERS - liters used. */
export const BASELINE_LITERS = 60;

/** A shower at or below this volume (and above 0) counts as "eco" for streaks and quests. */
export const ECO_SHOWER_MAX_LITERS = 40;

/** Estimated cost of one liter of hot shower water (water + heating), in €. To validate. */
export const EUR_PER_LITER = 1.05 / 60;

/** How often live pages refresh their data. */
export const POLL_INTERVAL_MS = 10_000;

export const DEFAULT_FAMILY = ['Papa', 'Maman', 'Alex', 'Julie'];
