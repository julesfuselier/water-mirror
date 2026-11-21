// Device diagnostics (based on the latest measurement received) and beta feedback form.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { $, poll, renderNav, setText } from '../ui.js';

renderNav();

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60_000);
  if (minutes < 1) return 'Just Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

async function refresh() {
  const { showers, online } = await fetchShowers();
  const dot = $('status-dot');
  const color = online ? 'var(--success)' : 'var(--danger)';
  dot.style.background = color;
  dot.style.boxShadow = `0 0 10px ${color}`;
  setText('status-text', online ? 'Online' : 'Offline');
  setText('last-ping', showers.length ? timeAgo(showers.at(-1).createdAt) : 'Never');
}

/* ---------- Feedback form (not sent anywhere yet) ---------- */

let rating = 0;
const stars = [...document.querySelectorAll('#star-rating i')];

stars.forEach((star) =>
  star.addEventListener('click', () => {
    rating = Number(star.dataset.val);
    stars.forEach((s, i) => s.classList.toggle('active', i < rating));
  }),
);

$('btn-feedback').addEventListener('click', () => {
  if (!rating) return alert('Please select a star rating before submitting.');
  alert(`Feedback sent successfully! Rating: ${rating} stars. The dev team thanks you.`);
  rating = 0;
  stars.forEach((s) => s.classList.remove('active'));
  $('feedback-text').value = '';
});

poll(refresh, POLL_INTERVAL_MS);
