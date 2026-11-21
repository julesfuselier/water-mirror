// Family leaderboard: lowest average consumption wins.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { getCurrentUser, getFamily } from '../session.js';
import { averageLiters, currentEcoStreak, showersOf } from '../stats.js';
import { $, confirmAndResetEverything, escapeHtml, poll, renderNav } from '../ui.js';

renderNav();
const currentUser = getCurrentUser() ?? '';
const SCALE_MAX_LITERS = 80; // full width of the volume bar

const TITLES = [
  [20, 'Aqua Legend'],
  [35, 'Eco-Guardian'],
  [50, 'Splash Rookie'],
  [Infinity, 'Water Waster'],
];
const titleFor = (avg) => (avg === null ? 'Waiting...' : TITLES.find(([max]) => avg <= max)[1]);
const barClass = (avg) => (avg <= 35 ? 'vol-good' : avg <= 55 ? 'vol-warn' : 'vol-bad');
const RANK_COLORS = ['var(--warning)', 'var(--silver)', 'var(--bronze)'];
const rankColor = (rank) => RANK_COLORS[rank - 1] ?? 'var(--text-muted)';

function setStatus(online) {
  const status = $('status-text');
  status.innerHTML = online
    ? '<i class="fas fa-link"></i> Live Connected'
    : '<i class="fas fa-unlink"></i> Offline (cached data)';
  status.style.color = online ? 'var(--success)' : 'var(--danger)';
}

function buildLeaderboard(showers) {
  return getFamily()
    .map((name) => {
      const own = showersOf(showers, name);
      return { name, avg: averageLiters(own), streak: currentEcoStreak(own) };
    })
    .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
}

function renderPodium(players) {
  [1, 2, 3].forEach((pos) => {
    const p = players[pos - 1];
    const ranked = p && p.avg !== null;
    $(`p${pos}-name`).textContent = ranked ? p.name : '???';
    $(`p${pos}-avatar`).textContent = ranked ? p.name.charAt(0).toUpperCase() : '-';
    $(`p${pos}-score`).innerHTML = `${ranked ? p.avg.toFixed(0) : '--'}<span>L</span>`;
  });
}

function renderList(players) {
  $('ranking-rows-container').innerHTML = players
    .map((p, i) => {
      const rank = i + 1;
      const color = rankColor(rank);
      const isYou = p.name.toLowerCase() === currentUser.toLowerCase();
      const fill = p.avg === null ? 0 : Math.min(100, (p.avg / SCALE_MAX_LITERS) * 100);
      return `
        <div class="ranking-item ${isYou ? 'current-user' : ''}">
          <div class="rank-number" style="color: ${color}">#${rank}</div>
          <div class="item-details">
            <div class="item-header">
              <div class="item-avatar" style="border-color: ${color}; color: ${color}; box-shadow: 0 0 10px ${color}50;">
                ${escapeHtml(p.name.charAt(0).toUpperCase())}
              </div>
              <div class="item-name">${escapeHtml(p.name)}</div>
              ${isYou ? '<span class="title-tag me">YOU</span>' : ''}
              <span class="title-tag hidden-mobile">${titleFor(p.avg)}</span>
            </div>
            <div class="item-stats">
              <span class="stat-pill"><i class="fas fa-fire"></i> ${p.streak} days</span>
            </div>
          </div>
          <div class="item-score">
            <div class="score-bold">${p.avg === null ? '---' : p.avg.toFixed(1)}<span>L / avg</span></div>
            <div class="vol-bar-bg"><div class="vol-bar-fill ${barClass(p.avg ?? Infinity)}" style="width: ${fill}%"></div></div>
          </div>
        </div>`;
    })
    .join('');
}

async function refresh() {
  const { showers, online } = await fetchShowers();
  setStatus(online);
  const players = buildLeaderboard(showers);
  renderPodium(players);
  renderList(players);
}

function share() {
  const data = {
    title: 'My Water Mirror Score',
    text: "I'm competing on Water Mirror with my family! My eco-profile is on point. 💧🌍",
    url: location.origin,
  };
  if (navigator.share) navigator.share(data).catch(() => {});
  else alert("Sharing is not supported on this browser, but you're still a hero! 💧");
}

$('btn-share').addEventListener('click', share);
$('btn-reset').addEventListener('click', confirmAndResetEverything);
poll(refresh, POLL_INTERVAL_MS);
