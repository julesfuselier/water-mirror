// Collective impact: liters saved by all users, € raised for NGO projects, equivalents.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { toEuros, totalLitersSaved } from '../stats.js';
import { $, poll, renderNav, setText } from '../ui.js';

renderNav();

const OLYMPIC_POOL_L = 2_500_000;
const BOTTLE_L = 1.5;
const FOREST_IRRIGATION_L_PER_DAY = 1500;

/** NGO funding targets, filled one after the other. */
const PROJECTS = [
  { id: 'p1', goal: 5 },
  { id: 'p2', goal: 15 },
];

const FORMATS = {
  'global-liters-counter': (v) => `${Math.floor(v).toLocaleString('en-US')} L`,
  'global-money-counter': (v) => `${v.toFixed(2)} €`,
  'eq-pools': (v) => v.toFixed(4),
  'eq-bottles': (v) => Math.floor(v).toLocaleString('en-US'),
  'eq-forest': (v) => `${Math.floor(v)} d`,
};

/** Count-up animation from 0 to `end` (ease-out). */
function animate(id, end, duration = 1500) {
  const el = $(id);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = FORMATS[id](end * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderProjects(euros) {
  let remaining = euros;
  for (const { id, goal } of PROJECTS) {
    const pct = Math.max(0, Math.min(100, (remaining / goal) * 100));
    setText(`${id}-percent`, `${pct.toFixed(1)}%`);
    $(`${id}-fill`).style.width = `${pct}%`;
    remaining -= goal;
  }
}

let firstRender = true;

async function refresh() {
  const { showers, online } = await fetchShowers();
  if (!online) {
    setText('status-text', 'Server offline — showing cached data');
    $('status-text').style.color = 'var(--danger)';
  }

  const liters = totalLitersSaved(showers);
  const values = {
    'global-liters-counter': liters,
    'global-money-counter': toEuros(liters),
    'eq-pools': liters / OLYMPIC_POOL_L,
    'eq-bottles': liters / BOTTLE_L,
    'eq-forest': liters / FOREST_IRRIGATION_L_PER_DAY,
  };

  for (const [id, value] of Object.entries(values)) {
    if (firstRender) animate(id, value);
    else setText(id, FORMATS[id](value));
  }
  renderProjects(values['global-money-counter']);
  firstRender = false;
}

poll(refresh, POLL_INTERVAL_MS);
