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

/* ---------------- Calculateur « Combien coûte ta douche ? » (/calculateur) ---------------- */
// Sources (vérifiées en novembre 2026) — à mettre à jour une fois par an.

/** Prix moyen TTC eau + assainissement, France, au 01/01/2025 (rapport SISPEA) : 4,89 €/m³. */
export const WATER_EUR_PER_M3 = 4.89;

/** Prix du kWh en € TTC par mode de chauffage de l'eau. Électricité : Tarif Bleu option Base (0,194 €/kWh, 2026). */
export const ENERGY_EUR_PER_KWH = {
  electric: 0.194,
  heatpump: 0.194,
  gas: 0.12, // estimation, à vérifier (prix repère gaz)
};

/**
 * Rendement global de production d'eau chaude (pertes du ballon/chaudière comprises).
 * Pompe à chaleur : coefficient de performance moyen (> 1).
 */
export const HEATER_EFFICIENCY = { electric: 0.8, gas: 0.85, heatpump: 2.5 };

/** Énergie pour chauffer 1 L d'eau de douche de 13 °C à 38 °C : 1,163 Wh/(L·K) × 25 K. */
export const WH_PER_SHOWER_LITER = 1.163 * 25;

/** Débits de pommeau proposés (L/min). */
export const SHOWERHEAD_FLOW = { classic: 12, unknown: 10, eco: 7 };

/** Minutes gagnées dans le scénario « et si tu coupais plus tôt ? ». */
export const CALC_SAVING_MINUTES = 2;

/** Volume d'une baignoire (L), pour les équivalences parlantes. */
export const BATHTUB_LITERS = 150;

/** Adresse affichée dans la mention RGPD du formulaire (contact RGPD). */
export const CONTACT_EMAIL = 'jules.fuselier0401@gmail.com';
