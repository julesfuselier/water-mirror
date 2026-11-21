// Défis : calculés à partir des vraies douches ; les récompenses récupérées sont gardées dans le navigateur.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { int } from '../format.js';
import { icon } from '../icons.js';
import { getFamily, requireUser, userKey } from '../session.js';
import { averageLiters, currentEcoStreak, showersOf, totalLitersSaved } from '../stats.js';
import { storage } from '../storage.js';
import { $, poll, renderNav, setText, toast } from '../ui.js';

const user = requireUser();
renderNav();

const QUESTS = [
  {
    id: 'q1', group: 'daily', xp: 50, title: 'Chrono', text: 'Une douche de moins de 3 minutes.',
    progress: ({ last }) => (last && last.durationMin > 0 && last.durationMin < 3 ? 100 : 0),
  },
  {
    id: 'q2', group: 'daily', xp: 100, title: 'Chameau du désert', text: 'Moins de 15 litres sur ta dernière douche.',
    progress: ({ last }) => (last && last.liters > 0 && last.liters <= 15 ? 100 : 0),
  },
  {
    id: 'q3', group: 'daily', xp: 150, title: 'Régularité', text: '3 douches éco d’affilée (moins de 40 L).',
    progress: ({ streak }) => (streak / 3) * 100,
  },
  {
    id: 'sq1', group: 'family', xp: 300, title: 'Esprit d’équipe', text: 'Moyenne de toute la famille sous les 35 litres.',
    progress: ({ familyAvg }) => (familyAvg === null ? 0 : familyAvg <= 35 ? 100 : (35 / familyAvg) * 100),
  },
  {
    id: 'ep1', group: 'career', xp: 1000, title: "Sauveur d’océan", text: '1 000 litres économisés au total.',
    progress: ({ saved }) => (saved / 1000) * 100,
  },
];

const claimed = (id) => storage.get(userKey(`claimed_${id}`, user)) === 'true';
const bonusXp = () => Number(storage.get(userKey('bonus_xp', user))) || 0;
let ctx = null;

function claim(quest) {
  storage.set(userKey(`claimed_${quest.id}`, user), 'true');
  storage.set(userKey('bonus_xp', user), String(bonusXp() + quest.xp));
  toast(`+${quest.xp} XP`);
  render();
}

function questHtml(q) {
  const progress = Math.min(100, Math.max(0, q.progress(ctx)));
  const isClaimed = claimed(q.id);
  const action = isClaimed
    ? `<span class="badge badge-success">${icon('check')} Obtenu</span>`
    : progress >= 100
      ? `<button class="btn btn-brand btn-sm" data-claim="${q.id}">Récupérer</button>`
      : `<span class="label num">${Math.floor(progress)} %</span>`;
  return `
    <article class="card quest ${isClaimed ? 'claimed' : ''}">
      <div>
        <h3 class="headline">${q.title}</h3>
        <p class="secondary">${q.text}</p>
        <p class="quest-reward">+${int(q.xp)} XP</p>
      </div>
      ${action}
      <div class="progress ${progress >= 100 ? 'done' : ''}"><span style="width:${progress}%"></span></div>
    </article>`;
}

function render() {
  setText('xp', int(ctx.saved + bonusXp()));
  setText('streak', ctx.streak);
  document.querySelectorAll('[data-group]').forEach((el) => {
    el.innerHTML = QUESTS.filter((q) => q.group === el.dataset.group).map(questHtml).join('');
  });
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-claim]');
  if (button) claim(QUESTS.find((q) => q.id === button.dataset.claim));
});

async function refresh() {
  const { showers, online } = await fetchShowers();
  if (!online) setText('status-text', 'Hors ligne : progression d’après les dernières données.');
  const own = showersOf(showers, user);
  ctx = {
    last: own.at(-1) ?? null,
    streak: currentEcoStreak(own),
    saved: totalLitersSaved(own),
    familyAvg: averageLiters(getFamily().flatMap((name) => showersOf(showers, name))),
  };
  render();
}

poll(refresh, POLL_INTERVAL_MS);
