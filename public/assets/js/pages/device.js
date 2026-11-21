// Boîtier : état (d’après la dernière mesure reçue) et formulaire de retour.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { int, timeAgo } from '../format.js';
import { icon } from '../icons.js';
import { $, poll, renderNav, setText, toast } from '../ui.js';

renderNav();

async function refresh() {
  const { showers, online } = await fetchShowers();
  $('status-dot').className = `dot ${online ? 'online' : 'offline'}`;
  setText('status-text', online ? 'En ligne' : 'Hors ligne');
  setText('last-sync', showers.length ? timeAgo(showers.at(-1).createdAt) : 'Aucune');
  setText('count', int(showers.length));
}

/* ---------- feedback (not stored anywhere yet) ---------- */

let rating = 0;
const stars = $('stars');
stars.innerHTML = [1, 2, 3, 4, 5]
  .map((n) => `<button role="radio" aria-checked="false" aria-label="${n} sur 5" data-value="${n}">${icon('star')}</button>`)
  .join('');
const buttons = [...stars.children];

function setRating(value) {
  rating = value;
  buttons.forEach((b, i) => {
    b.classList.toggle('on', i < value);
    b.setAttribute('aria-checked', String(i + 1 === value));
  });
}
buttons.forEach((b) => b.addEventListener('click', () => setRating(Number(b.dataset.value))));

$('btn-feedback').addEventListener('click', () => {
  if (!rating) return toast('Choisis une note d’abord');
  toast('Merci pour ton retour !');
  setRating(0);
  $('feedback-text').value = '';
});

poll(refresh, POLL_INTERVAL_MS);
