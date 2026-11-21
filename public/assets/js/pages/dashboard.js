// Accueil : dernière douche, Goutti, stats, graphique et écosystème (série de connexion).

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { euros, num, timeAgo } from '../format.js';
import { spring } from '../motion.js';
import { requireUser, userKey } from '../session.js';
import {
  averageLiters, currentEcoStreak, flowRate, litersByPeriod, showersOf, toEuros, totalLitersSaved,
} from '../stats.js';
import { storage } from '../storage.js';
import { $, createSheet, poll, renderNav, segmented, setText } from '../ui.js';

const user = requireUser();
renderNav();
setText('user-name', user);
setText('greeting', new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir');

const TIPS = [
  'Un pommeau classique débite environ 15 litres par minute. Un pommeau économe, deux fois moins.',
  "Couper l’eau pendant qu’on se savonne économise jusqu’à 10 litres.",
  'Une douche de 5 minutes consomme environ trois fois moins d’eau qu’un bain.',
  "Chauffer l’eau représente la majeure partie du coût d’une douche : chaque minute en moins compte double.",
  'Défi du jour : une douche de moins de 3 minutes.',
];

/** Goutti’s reaction to the last shower volume. */
const MOODS = [
  [0, 'Hmm, 0 litre ? Le capteur a dû rater ta douche.'],
  [20, 'Incroyable ! Tu es une vraie légende de l’eau.'],
  [40, 'Belle douche, profil éco validé.'],
  [55, "Dans la moyenne. Garde un œil sur l’écran."],
  [72, 'Attention, ça commence à déborder…'],
  [Infinity, "Aïe ! Grosse douche. On fait mieux demain ?"],
];

/** Eco-tree levels by daily login streak: [drops needed, image] */
const TREE = [
  [0, '/img/arbre_lvl1.png'],
  [3, '/img/arbre_lvl2.png'],
  [7, '/img/arbre_lvl3.png'],
  [15, '/img/arbre_lvl4.png'],
  [30, '/img/arbre_lvl5.png'],
];

let userShowers = [];
let drops = Number(storage.get(userKey('streak', user))) || 0;
let view = 'daily';
let chart = null;

/* ---------- daily drop (login streak) ---------- */

const dropSheet = createSheet($('drop-sheet'));
$('drop-ok').addEventListener('click', () => dropSheet.close());

function checkDailyDrop() {
  const today = new Date().toISOString().slice(0, 10);
  const last = storage.get(userKey('last_login', user));
  if (last === today) return;

  let title;
  let text;
  if (!last) {
    drops = 1;
    title = 'Ta première goutte';
    text = "Reviens chaque jour pour faire grandir ton écosystème.";
  } else {
    const away = Math.round((new Date(today) - new Date(last)) / 86_400_000);
    if (away === 1) {
      drops += 1;
      title = '+1 goutte';
      text = `${drops} jours d’affilée. Ton écosystème grandit !`;
    } else if (away === 2) {
      title = 'Tu nous as manqué hier';
      text = "Ta série tient encore, mais pense à revenir demain.";
    } else {
      drops = 1;
      title = 'On repart de zéro';
      text = "Ton arbre a séché pendant ton absence. Une goutte pour recommencer.";
    }
  }
  storage.set(userKey('last_login', user), today);
  storage.set(userKey('streak', user), String(drops));
  setText('drop-title', title);
  setText('drop-text', text);
  setTimeout(dropSheet.open, 500);
}

/* ---------- rendering ---------- */

function renderConnection(online, last) {
  $('conn-dot').className = `dot ${online ? 'online' : 'offline'}`;
  const status = online ? 'Boîtier connecté' : 'Hors ligne';
  setText('conn-text', last ? `${status} · dernière douche ${timeAgo(last.createdAt)}` : status);
}

function renderLastShower(last) {
  if (!last) {
    ['last-liters', 'last-duration', 'last-flow'].forEach((id) => setText(id, '—'));
    setText('last-vs-avg', '');
    setText('mascot-msg', 'Prends ta première douche, je compte !');
    return;
  }
  setText('last-liters', num(last.liters));
  setText('last-duration', last.durationMin > 0 ? num(last.durationMin) : '—');
  setText('last-flow', num(flowRate(last)));

  const delta = last.liters - averageLiters(userShowers);
  const vs = $('last-vs-avg');
  vs.textContent = userShowers.length > 1 ? `${delta <= 0 ? '−' : '+'}${num(Math.abs(delta))} L vs ta moyenne` : '';
  vs.style.color = delta <= 0 ? 'var(--success)' : 'var(--warning)';

  setText('mascot-msg', MOODS.find(([max]) => last.liters <= max)[1]);
}

function renderStats() {
  const avg = averageLiters(userShowers);
  const streak = currentEcoStreak(userShowers);
  setText('stat-avg', avg === null ? '—' : num(avg));
  setText('stat-saved', euros(toEuros(totalLitersSaved(userShowers))));
  setText('stat-streak', streak);
  setText('stat-streak-unit', streak > 1 ? 'douches' : 'douche');
  setText('stat-count', userShowers.length);
}

function renderTree() {
  const index = TREE.findLastIndex(([min]) => drops >= min);
  const [min, image] = TREE[index];
  const next = TREE[index + 1];
  $('tree-img').src = image;
  setText('tree-level', next ? `Niveau ${index + 1}` : 'Niveau max');
  $('tree-progress').style.width = `${next ? ((drops - min) / (next[0] - min)) * 100 : 100}%`;
  const left = next ? next[0] - drops : 0;
  setText('tree-goal', next ? `${left} goutte${left > 1 ? 's' : ''} avant le niveau ${index + 2} · une goutte par jour de visite` : 'Ton écosystème est à son apogée.');
}

/* ---------- chart ---------- */

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function chartData() {
  if (view === 'daily') {
    const recent = userShowers.slice(-12);
    const days = recent.map((s) => new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const sameDay = new Set(days).size === 1; // many showers on one day: show the time instead
    return {
      labels: recent.map((s, i) =>
        sameDay ? new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : days[i]),
      data: recent.map((s) => s.liters),
    };
  }
  const groups = litersByPeriod(userShowers, view === 'weekly' ? 'week' : 'month');
  return {
    labels: groups.map((g) => (view === 'weekly' ? g.label.replace('W', 'S') : g.label)),
    data: groups.map((g) => Math.round(g.liters)),
  };
}

function renderChart() {
  if (!userShowers.length || typeof Chart === 'undefined') return;
  const { labels, data } = chartData();

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }

  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const fill = ctx.createLinearGradient(0, 0, 0, 220);
  fill.addColorStop(0, 'rgba(34, 154, 241, 0.22)');
  fill.addColorStop(1, 'rgba(1, 223, 234, 0)');
  const grid = css('--separator');
  const text = css('--text-3');

  chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        fill: true,
        backgroundColor: fill,
        borderColor: css('--blue'),
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: css('--blue'),
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { label: (item) => `${num(item.parsed.y)} L` },
        },
      },
      scales: {
        y: { beginAtZero: true, border: { display: false }, grid: { color: grid }, ticks: { color: text, maxTicksLimit: 5 } },
        x: { border: { display: false }, grid: { display: false }, ticks: { color: text, maxRotation: 0, autoSkipPadding: 12 } },
      },
    },
  });
}

segmented($('chart-view'), (value) => {
  view = value;
  renderChart();
});

/* ---------- Goutti ---------- */

$('mascot').addEventListener('click', () => {
  const img = $('mascot').querySelector('img');
  spring('mascot', {
    from: 0,
    to: 360,
    velocity: 900,
    damping: 0.8,
    response: 0.6,
    onUpdate: (v) => (img.style.transform = `rotate(${v % 360}deg)`),
    onComplete: () => (img.style.transform = ''),
  });
  refresh();
});

/* ---------- data loop ---------- */

async function refresh() {
  const { showers, online } = await fetchShowers();
  userShowers = showersOf(showers, user);
  const last = userShowers.at(-1) ?? null;
  renderConnection(online && showers.length > 0, last);
  renderLastShower(last);
  renderStats();
  renderTree();
  renderChart();
}

setText('tip-text', TIPS[new Date().getDate() % TIPS.length]);
checkDailyDrop();
poll(refresh, POLL_INTERVAL_MS);
