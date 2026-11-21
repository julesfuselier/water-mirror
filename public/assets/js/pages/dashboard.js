// Personal dashboard: last shower, mascot, eco-tree (daily login streak) and charts.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { requireUser, userKey } from '../session.js';
import {
  averageLiters, bestEcoStreak, flowRate, litersByPeriod, litersSaved, showersOf, toEuros, totalLitersSaved,
} from '../stats.js';
import { storage } from '../storage.js';
import { $, poll, renderNav, setText } from '../ui.js';

const user = requireUser();
renderNav();
setText('user-name', user);

const FUN_FACTS = [
  'A standard shower head uses 15 liters per minute. The Water Mirror helps you reduce that!',
  'Turning off the water while soaping up saves up to 10 liters.',
  'Challenge: Try to keep your next shower under 3 minutes!',
  'The energy used to heat water for a 10min shower could power a TV for 14 hours.',
  'By taking shorter showers, your family could save thousands of liters a year.',
];

/** Mascot mood by volume of the last shower: [max liters, image, message] */
const MOODS = [
  [20, null, 'Absolute Hero! ✨'], // image depends on accessories, see heroImage()
  [40, 'img/smile.png', 'Excellent! Eco profile. 👍'],
  [55, 'img/normal.png', 'Average. Watch the timer. 👀'],
  [72, 'img/stress.png', 'Warning! Pressure rising...'],
  [Infinity, 'img/triste.png', 'Critical Waste! 🔥'],
];

/** Eco-tree levels by login streak: [streak needed, image, label] */
const TREE_LEVELS = [
  [0, 'img/arbre_lvl1.png', 'Lvl 1'],
  [3, 'img/arbre_lvl2.png', 'Lvl 2'],
  [7, 'img/arbre_lvl3.png', 'Lvl 3'],
  [15, 'img/arbre_lvl4.png', 'Lvl 4'],
  [30, 'img/arbre_lvl5.png', 'MAX'],
];

const CHART_STYLES = {
  daily: { point: '#00d2ff', line: 'rgba(0, 210, 255, 0.8)' },
  weekly: { point: '#b128ff', line: 'rgba(177, 40, 255, 0.8)' },
  monthly: { point: '#00ff88', line: 'rgba(0, 255, 136, 0.8)' },
};

let userShowers = [];
let loginStreak = Number(storage.get(userKey('streak', user))) || 0;
let chartView = 'daily';
let chart = null;
let spinning = false;

/* ---------- Header ---------- */

function renderGreeting() {
  const hour = new Date().getHours();
  const [text, icon, color] =
    hour < 12 ? ['Good Morning', 'fa-sun', 'var(--warning)']
    : hour < 18 ? ['Good Afternoon', 'fa-cloud-sun', 'var(--primary)']
    : ['Good Evening', 'fa-moon', '#b128ff'];
  setText('greeting-text', text);
  $('greeting-icon').className = `fas ${icon}`;
  $('greeting-icon').style.color = color;
}

function renderConnection(online) {
  $('conn-dot').className = `conn-dot ${online ? 'online' : 'offline'}`;
  setText('conn-text', online ? 'Device Online' : 'Device Offline');
}

/* ---------- Daily login streak ("drops") ---------- */

const POPUPS = {
  success: { icon: 'fa-tint', color: 'var(--primary)' },
  warning: { icon: 'fa-hourglass-half', color: 'var(--warning)' },
  danger: { icon: 'fa-leaf', color: 'var(--danger)' },
};

function showPopup(type, title, html) {
  $('popup-icon').className = `fas ${POPUPS[type].icon} popup-icon`;
  $('popup-icon').style.color = POPUPS[type].color;
  setText('popup-title', title);
  setText('popup-total-drops', loginStreak);
  $('popup-text').innerHTML = html;
  $('login-popup-overlay').classList.add('active');
}

function checkDailyLogin() {
  const today = new Date().toISOString().slice(0, 10);
  const lastLogin = storage.get(userKey('last_login', user));
  if (lastLogin === today) return;

  if (!lastLogin) {
    loginStreak = 1;
    showPopup('success', 'Welcome!', 'You earned your first Daily Drop <b>(+1 💧)</b>! Log in every day to grow your tree.');
  } else {
    const daysAway = Math.round((new Date(today) - new Date(lastLogin)) / 86_400_000);
    if (daysAway === 1) {
      loginStreak++;
      showPopup('success', 'Daily Drop!', 'Awesome! You logged in today and earned <b>+1 💧</b>. Keep the streak alive to watch your Ecosystem Tree grow!');
    } else if (daysAway === 2) {
      showPopup('warning', 'Careful!', "You missed yesterday! Don't forget to log in to keep your Ecosystem alive.");
    } else {
      loginStreak = 1;
      showPopup('danger', 'Streak Lost!', "You were gone for too long. Your tree dried up, but you earned <b>1 💧</b> for coming back today! Let's rebuild it.");
    }
  }
  storage.set(userKey('last_login', user), today);
  storage.set(userKey('streak', user), String(loginStreak));
}

/* ---------- Widgets ---------- */

function heroImage() {
  const items = ['crown', 'glasses', 'necklace'].filter((item) => storage.get(`eq_item_${item}_${user}`) === 'true');
  return items.length ? `img/super_happy_${items.join('_')}.png` : 'img/goutte_contente.png';
}

function renderMascot(last, online) {
  if (spinning) return;
  const img = $('mascot-image');
  if (!last) {
    img.src = 'img/normal.png';
    setText('mascot-msg', online ? 'Take your first shower! 🚿' : 'Waiting for Sync...');
    return;
  }
  const [, image, message] = MOODS.find(([max]) => last.liters <= max);
  img.src = last.liters === 0 ? 'img/normal.png' : image ?? heroImage();
  setText('mascot-msg', message);
}

function renderTree() {
  const index = TREE_LEVELS.findLastIndex(([min]) => loginStreak >= min);
  const [min, image, label] = TREE_LEVELS[index];
  const next = TREE_LEVELS[index + 1];
  $('tree-img').src = image;
  setText('tree-level-txt', label);
  $('tree-progress').style.width = `${next ? ((loginStreak - min) / (next[0] - min)) * 100 : 100}%`;
  setText('tree-next-goal', next ? `${next[0] - loginStreak} drop(s) to ${next[2]}` : 'Ecosystem fully grown! 🌳');
}

function renderLastShower(last) {
  if (!last) {
    ['liters-val', 'avg-liters-val', 'flow-rate-val', 'money-val'].forEach((id) => setText(id, '--'));
    $('duration-val').innerHTML = '<i class="far fa-clock"></i> -- min';
    return;
  }
  setText('liters-val', last.liters > 0 ? last.liters.toFixed(1) : '0');
  setText('avg-liters-val', averageLiters(userShowers).toFixed(1));
  $('duration-val').innerHTML = `<i class="far fa-clock"></i> ${last.durationMin > 0 ? last.durationMin.toFixed(1) : '--'} min`;
  setText('flow-rate-val', flowRate(last).toFixed(1));
  setText('money-val', toEuros(litersSaved(last)).toFixed(2));
}

/* ---------- Chart & details modal ---------- */

function chartData() {
  if (chartView === 'daily') {
    const recent = userShowers.slice(-10);
    return { labels: recent.map((_, i) => `#${i + 1}`), data: recent.map((s) => s.liters) };
  }
  const groups = litersByPeriod(userShowers, chartView === 'weekly' ? 'week' : 'month');
  return { labels: groups.map((g) => g.label), data: groups.map((g) => Math.round(g.liters)) };
}

function renderChart() {
  if (!userShowers.length || typeof Chart === 'undefined') return;
  const { labels, data } = chartData();
  const style = CHART_STYLES[chartView];

  // Same view: update in place (no flicker on each poll). New view: rebuild with its colors.
  if (chart?.$view === chartView) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none');
    return;
  }
  chart?.destroy();
  chart = new Chart($('insightsChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Liters Consumed',
        data,
        backgroundColor: 'transparent',
        borderColor: style.line,
        borderWidth: 3,
        pointBackgroundColor: style.point,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      },
    },
  });
  chart.$view = chartView;
}

function setChartView(view) {
  chartView = view;
  document.querySelectorAll('.chart-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  renderChart();
}

function openDetails() {
  setText('modal-total-showers', userShowers.length);
  if (userShowers.length) {
    setText('modal-avg-liters', `${averageLiters(userShowers).toFixed(1)} L`);
    setText('modal-total-saved', `${toEuros(totalLitersSaved(userShowers)).toFixed(2)} €`);
    setText('modal-best-streak', bestEcoStreak(userShowers));
  }
  $('info-modal-overlay').classList.add('active');
}

const closeDetails = () => $('info-modal-overlay').classList.remove('active');

/* ---------- Data loop ---------- */

async function refresh() {
  const { showers, online } = await fetchShowers();
  userShowers = showersOf(showers, user);
  const last = userShowers.at(-1) ?? null;

  renderConnection(online && showers.length > 0);
  renderLastShower(last);
  renderMascot(last, online);
  renderTree();
  setText('streak-val', loginStreak);
  setText('xp-total-display', Math.floor(totalLitersSaved(userShowers)));
  renderChart();
}

function spinMascot() {
  if (spinning) return;
  spinning = true;
  const img = $('mascot-image');
  img.style.transform = 'rotate(360deg) scale(1.1)';
  const quotes = ['Eco-Warriors Assemble! 🌍', 'Analyzing flow rates... 📡', 'Water saved = Planet saved! 💧'];
  setText('mascot-msg', quotes[Math.floor(Math.random() * quotes.length)]);
  setTimeout(() => {
    img.style.transform = 'rotate(0deg) scale(1)';
    spinning = false;
    refresh();
  }, 700);
}

/* ---------- Events & init ---------- */

$('mascot-widget').addEventListener('click', spinMascot);
$('chart-widget').addEventListener('click', openDetails);
document.querySelectorAll('.chart-tab').forEach((tab) =>
  tab.addEventListener('click', (e) => {
    e.stopPropagation(); // don't open the details modal
    setChartView(tab.dataset.view);
  }),
);
$('info-modal-overlay').addEventListener('click', (e) => e.target === e.currentTarget && closeDetails());
$('btn-close-details').addEventListener('click', closeDetails);
$('btn-close-popup').addEventListener('click', () => $('login-popup-overlay').classList.remove('active'));

renderGreeting();
setText('daily-fact', FUN_FACTS[new Date().getDate() % FUN_FACTS.length]);
checkDailyLogin();
poll(refresh, POLL_INTERVAL_MS);
