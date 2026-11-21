// Impact collectif : litres économisés par tous, équivalences et cagnotte.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { euros, int, num } from '../format.js';
import { toEuros, totalLitersSaved } from '../stats.js';
import { $, poll, renderNav, setText } from '../ui.js';

renderNav();

const OLYMPIC_POOL_L = 2_500_000;
const BOTTLE_L = 1.5;
const FOREST_IRRIGATION_L_PER_DAY = 1500;
const PROJECTS = [
  { id: 'p1', goal: 5 },
  { id: 'p2', goal: 15 },
];

const FORMATS = {
  'liters-saved': int,
  'money-saved': euros,
  'eq-pools': (v) => num(v, 3),
  'eq-bottles': int,
  'eq-forest': int,
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Count-up from 0 on first display (ease-out). */
function countUp(id, end, duration = 1400) {
  const el = $(id);
  if (reduced) return (el.textContent = FORMATS[id](end));
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = FORMATS[id](end * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderProjects(money) {
  let remaining = money;
  for (const { id, goal } of PROJECTS) {
    const pct = Math.max(0, Math.min(100, (remaining / goal) * 100));
    setText(`${id}-percent`, `${num(pct, 0)} %`);
    setText(`${id}-goal`, euros(goal));
    $(`${id}-fill`).style.width = `${pct}%`;
    $(`${id}-fill`).parentElement.classList.toggle('done', pct >= 100);
    remaining -= goal;
  }
}

let first = true;
async function refresh() {
  const { showers, online } = await fetchShowers();
  if (!online) setText('status-text', 'Hors ligne : derniers chiffres connus.');

  const liters = totalLitersSaved(showers);
  const values = {
    'liters-saved': liters,
    'money-saved': toEuros(liters),
    'eq-pools': liters / OLYMPIC_POOL_L,
    'eq-bottles': liters / BOTTLE_L,
    'eq-forest': liters / FOREST_IRRIGATION_L_PER_DAY,
  };
  for (const [id, value] of Object.entries(values)) {
    if (first) countUp(id, value);
    else setText(id, FORMATS[id](value));
  }
  renderProjects(values['money-saved']);
  first = false;
}

poll(refresh, POLL_INTERVAL_MS);
