// French number and date formatting.

const fmtCache = new Map();
function nf(min, max) {
  const key = `${min}-${max}`;
  if (!fmtCache.has(key)) {
    fmtCache.set(key, new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max }));
  }
  return fmtCache.get(key);
}

/** 12.345 -> "12,3" */
export const num = (value, decimals = 1) => nf(decimals, decimals).format(value);

/** 1234.5 -> "1 235" */
export const int = (value) => nf(0, 0).format(Math.floor(value));

/** 3.2 -> "3,20 €" */
export const euros = (value) => `${nf(2, 2).format(value)} €`;

export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `il y a ${hours} h`;
  return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

/** Initial for avatars, robust to emoji/accents */
export const initial = (name) => [...String(name).trim()][0]?.toUpperCase() ?? '?';
