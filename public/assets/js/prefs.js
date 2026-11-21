// Display & accessibility preferences, saved per browser.
// The same keys are applied before first paint by the inline script in each page <head>.

const KEY = 'wm_prefs';
const DEFAULTS = { theme: 'light', text: 'm', cvd: false, dys: false, motion: false, contrast: false };
const LEXEND = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400..700&display=swap';

export function getPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
}

function loadReadingFont() {
  if (document.getElementById('font-lexend')) return;
  const link = Object.assign(document.createElement('link'), { id: 'font-lexend', rel: 'stylesheet', href: LEXEND });
  document.head.append(link);
}

export function applyPrefs(p = getPrefs()) {
  const d = document.documentElement.dataset;
  d.theme = p.theme;
  d.text = p.text;
  p.cvd ? (d.cvd = 'on') : delete d.cvd;
  p.dys ? (d.dys = 'on') : delete d.dys;
  p.motion ? (d.motion = 'reduce') : delete d.motion;
  p.contrast ? (d.contrast = 'more') : delete d.contrast;
  if (p.dys) loadReadingFont();

  const dark = p.theme === 'dark' || (p.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  document.head.append(Object.assign(document.createElement('meta'), { name: 'theme-color', content: dark ? '#000000' : '#f4f7fb' }));

  // Let pages refresh things drawn with computed colours (charts) and re-measure controls
  window.dispatchEvent(new CustomEvent('wm:prefs', { detail: p }));
  window.dispatchEvent(new Event('resize'));
}

export function setPref(key, value) {
  const p = { ...getPrefs(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  applyPrefs(p);
}

export function resetPrefs() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  applyPrefs({ ...DEFAULTS });
}

/** True if the user asked for less motion, in the panel or in the system settings. */
export const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
