// Quests: daily, family ("squad") and career, computed from live data.
// Claimed rewards are stored per profile in the browser.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { getFamily, requireUser, userKey } from '../session.js';
import { averageLiters, currentEcoStreak, showersOf, totalLitersSaved } from '../stats.js';
import { storage } from '../storage.js';
import { $, poll, renderNav, setText } from '../ui.js';

const user = requireUser();
renderNav();

/** Each quest returns its progress (0-100) from the context. */
const QUESTS = [
  { id: 'q1', xp: 50, progress: ({ last }) => (last && last.durationMin > 0 && last.durationMin < 3 ? 100 : 0) },
  { id: 'q2', xp: 100, progress: ({ last }) => (last && last.liters > 0 && last.liters <= 15 ? 100 : 0) },
  { id: 'q3', xp: 150, progress: ({ streak }) => (streak / 3) * 100 },
  {
    id: 'sq1',
    xp: 300,
    progress: ({ familyAvg }) => (familyAvg === null ? 0 : familyAvg <= 35 ? 100 : (35 / familyAvg) * 100),
  },
  { id: 'ep1', xp: 1000, progress: ({ saved }) => (saved / 1000) * 100 },
];

const isClaimed = (id) => storage.get(userKey(`claimed_${id}`, user)) === 'true';
const bonusXp = () => Number(storage.get(userKey('bonus_xp', user))) || 0;
let context = null;

function claim(quest) {
  storage.set(userKey(`claimed_${quest.id}`, user), 'true');
  storage.set(userKey('bonus_xp', user), String(bonusXp() + quest.xp));
  render();
}

function renderQuest(quest) {
  const progress = Math.min(100, quest.progress(context));
  const action = $(`action-${quest.id}`);
  $(`bar-${quest.id}`).style.width = `${progress}%`;

  if (isClaimed(quest.id)) {
    $(`card-${quest.id}`).classList.add('completed');
    action.innerHTML = '<button class="ch-btn done"><i class="fas fa-check"></i> Claimed</button>';
  } else if (progress >= 100) {
    action.innerHTML = '<button class="ch-btn claim">Claim Reward</button>';
    action.firstElementChild.addEventListener('click', () => claim(quest));
  } else {
    action.innerHTML = `<button class="ch-btn locked">${Math.floor(progress)}%</button>`;
  }
}

function render() {
  setText('xp-display', Math.floor(context.saved + bonusXp()));
  setText('streak-display', context.streak);
  QUESTS.forEach(renderQuest);
}

async function refresh() {
  const { showers, online } = await fetchShowers();
  if (!online) $('status-text').innerHTML = '<i class="fas fa-unlink" style="color: var(--danger)"></i> Server Offline';

  const own = showersOf(showers, user);
  const familyShowers = getFamily().flatMap((name) => showersOf(showers, name));
  context = {
    last: own.at(-1) ?? null,
    streak: currentEcoStreak(own),
    saved: totalLitersSaved(own),
    familyAvg: averageLiters(familyShowers),
  };
  render();
}

function revealCardsOnScroll() {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }),
    { threshold: 0.18 },
  );
  document.querySelectorAll('.challenge-box').forEach((card) => observer.observe(card));
}

revealCardsOnScroll();
poll(refresh, POLL_INTERVAL_MS);
