// Classement familial : la moyenne la plus basse gagne.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { num } from '../format.js';
import { getCurrentUser, getFamily } from '../session.js';
import { averageLiters, currentEcoStreak, showersOf } from '../stats.js';
import { $, avatarHtml, confirmAndResetEverything, escapeHtml, poll, renderNav, setText, toast } from '../ui.js';

renderNav();
const me = (getCurrentUser() ?? '').toLowerCase();
const SCALE_MAX_LITERS = 80;
const MEDALS = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];

const TITLES = [
  [20, "Légende de l’eau"],
  [35, 'Éco-gardien'],
  [50, 'Apprenti'],
  [Infinity, 'Gros débit'],
];
const titleFor = (avg) => (avg === null ? 'Pas encore de douche' : TITLES.find(([max]) => avg <= max)[1]);
const barTone = (avg) => (avg <= 35 ? 'var(--success)' : avg <= 55 ? 'var(--warning)' : 'var(--danger)');

function leaderboard(showers) {
  return getFamily()
    .map((name) => {
      const own = showersOf(showers, name);
      return { name, avg: averageLiters(own), streak: currentEcoStreak(own) };
    })
    .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
}

function renderPodium(players) {
  const order = [1, 0, 2]; // 2nd, 1st, 3rd
  $('podium').innerHTML = order
    .map((i) => {
      const p = players[i];
      if (!p || p.avg === null) return '<div></div>';
      return `
        <div class="card podium-place ${i === 0 ? 'first' : ''}">
          <span class="medal" style="background:${MEDALS[i]}">${i + 1}</span>
          ${avatarHtml(p.name)}
          <span class="name">${escapeHtml(p.name)}</span>
          <span class="label num">${num(p.avg, 0)} L</span>
        </div>`;
    })
    .join('');
}

function renderList(players) {
  $('ranking').innerHTML = players
    .map((p, i) => {
      const fill = p.avg === null ? 0 : Math.min(100, (p.avg / SCALE_MAX_LITERS) * 100);
      const isMe = p.name.toLowerCase() === me;
      return `
        <div class="list-row ${isMe ? 'me' : ''}">
          <span class="rank">${i + 1}</span>
          ${avatarHtml(p.name)}
          <div class="grow">
            <p class="headline">${escapeHtml(p.name)}${isMe ? ' <span class="badge badge-brand" style="margin-left:6px">Toi</span>' : ''}</p>
            <p class="label">${titleFor(p.avg)}${p.streak ? ` · série de ${p.streak}` : ''}</p>
          </div>
          <div class="rank-score">
            <p class="headline num">${p.avg === null ? '—' : `${num(p.avg)} L`}</p>
            <div class="progress"><span style="width:${fill}%;background:${barTone(p.avg)}"></span></div>
          </div>
        </div>`;
    })
    .join('');
}

async function refresh() {
  const { showers, online } = await fetchShowers();
  $('status-dot').className = `dot ${online ? 'online' : 'offline'}`;
  setText('status-text', online ? 'En direct' : 'Hors ligne');
  const players = leaderboard(showers);
  renderPodium(players);
  renderList(players);
}

$('btn-share').addEventListener('click', async () => {
  const data = { title: 'Water Mirror', text: 'On fait la course aux douches économes en famille avec Water Mirror 💧', url: location.origin };
  if (navigator.share) return navigator.share(data).catch(() => {});
  await navigator.clipboard?.writeText(`${data.text} ${data.url}`);
  toast('Lien copié');
});
$('btn-reset').addEventListener('click', confirmAndResetEverything);

poll(refresh, POLL_INTERVAL_MS);
