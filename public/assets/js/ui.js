// DOM helpers, navigation, sheets, toasts and the segmented control.

import { resetHistory } from './api.js';
import { initial } from './format.js';
import { hydrateIcons, icon } from './icons.js';
import { project, rubberband, spring } from './motion.js';
import { getCurrentUser, getFamily } from './session.js';
import { storage } from './storage.js';

export const $ = (id) => document.getElementById(id);

export function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---------------------------------------------------------------- avatars */

const TINTS = ['#229af1', '#01b8c4', '#7a5af8', '#f5a524', '#ee46bc', '#12b76a'];

/** Stable color per family member (by position in the family list). */
export function tintFor(name) {
  const index = getFamily().findIndex((m) => m.toLowerCase() === String(name).toLowerCase());
  return TINTS[(index < 0 ? 0 : index) % TINTS.length];
}

export const avatarHtml = (name, extraClass = '') =>
  `<span class="avatar ${extraClass}" style="--tint:${tintFor(name)}" aria-hidden="true">${escapeHtml(initial(name))}</span>`;

/* ---------------------------------------------------------------- navigation */

const LINKS = [
  { page: 'dashboard', href: '/dashboard', icon: 'home', label: 'Accueil' },
  { page: 'ranking', href: '/ranking', icon: 'trophy', label: 'Classement' },
  { page: 'challenges', href: '/challenges', icon: 'target', label: 'Défis' },
  { page: 'impact', href: '/impact', icon: 'globe', label: 'Impact' },
  { page: 'device', href: '/device', icon: 'device', label: 'Boîtier' },
];

const brandHtml = `<a class="brand" href="/dashboard"><img src="/img/logo-mark.png" alt="" width="22" height="26">Water Mirror</a>`;

/** Fills <header data-nav="top"> and <nav data-nav="tabs">, then swaps <i data-icon> for SVGs. */
export function renderNav(active = document.body.dataset.page) {
  const user = getCurrentUser();
  const current = (l) => (l.page === active ? ' aria-current="page"' : '');

  const top = document.querySelector('[data-nav="top"]');
  if (top) {
    const links = [...LINKS, { page: 'about', href: '/about', label: 'Le projet' }];
    top.innerHTML = `
      ${brandHtml}
      <nav class="topnav" aria-label="Navigation principale">
        ${links.map((l) => `<a href="${l.href}"${current(l)}>${l.label}</a>`).join('')}
      </nav>
      ${
        user
          ? `<a class="profile-chip" href="/" title="Changer de profil">${escapeHtml(user)} ${avatarHtml(user)}</a>`
          : `<a class="profile-chip" href="/">Choisir un profil</a>`
      }`;
  }

  const tabs = document.querySelector('[data-nav="tabs"]');
  if (tabs) {
    tabs.setAttribute('aria-label', 'Navigation');
    tabs.innerHTML = LINKS.map((l) => `<a href="${l.href}"${current(l)}>${icon(l.icon)}<span>${l.label}</span></a>`).join('');
  }

  hydrateIcons();
}

/* ---------------------------------------------------------------- sheet */

const isCompact = () => matchMedia('(max-width: 719px)').matches;

/**
 * Bottom sheet on phones (drag down to dismiss, with momentum), centered dialog on larger screens.
 * Markup: <div class="sheet" id="..." role="dialog"><div class="sheet-handle"></div>...</div>
 */
export function createSheet(sheet) {
  sheet.tabIndex = -1;
  sheet.style.outline = 'none';
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  document.body.append(scrim);

  let y = 0;
  let isOpen = false;
  const setY = (v) => {
    y = v;
    sheet.style.transform = `translateY(${v}px)`;
  };
  const height = () => sheet.offsetHeight || 400;

  function open() {
    isOpen = true;
    sheet.classList.add('open');
    scrim.classList.add('open');
    if (isCompact()) spring('sheet', { from: height(), to: 0, damping: 1, response: 0.35, onUpdate: setY });
    else sheet.style.transform = '';
    sheet.focus({ preventScroll: true }); // keyboard users land in the dialog; no keyboard pop-up on phones
  }

  function close(velocity = 0) {
    isOpen = false;
    scrim.classList.remove('open');
    const done = () => {
      if (!isOpen) sheet.classList.remove('open');
    };
    if (isCompact()) {
      spring('sheet', { from: y, to: height() + 20, velocity, damping: 1, response: 0.3, onUpdate: setY, onComplete: done });
    } else {
      sheet.style.transform = '';
      setTimeout(done, 250);
    }
  }

  scrim.addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && isOpen && close());

  // Drag to dismiss (phones). Follows the finger 1:1 downward, resists upward.
  let drag = null;
  sheet.addEventListener('pointerdown', (e) => {
    if (!isCompact() || e.target.closest('input, textarea, button, a') || sheet.scrollTop > 0) return;
    drag = { startY: e.clientY - y, samples: [{ y: e.clientY, t: e.timeStamp }] };
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const raw = e.clientY - drag.startY;
    setY(raw < 0 ? rubberband(raw, height()) : raw);
    drag.samples.push({ y: e.clientY, t: e.timeStamp });
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const endDrag = () => {
    if (!drag) return;
    const s = drag.samples;
    const first = s[0];
    const last = s[s.length - 1];
    const velocity = last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
    drag = null;
    if (y + project(velocity) > height() * 0.4) close(velocity);
    else spring('sheet', { from: y, to: 0, velocity, damping: 0.85, response: 0.35, onUpdate: setY });
  };
  sheet.addEventListener('pointerup', endDrag);
  sheet.addEventListener('pointercancel', endDrag);

  return { open, close, get isOpen() { return isOpen; } };
}

/* ---------------------------------------------------------------- toast */

let toastTimer;
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------------------------------------------------------------- segmented control */

/** <div class="segmented"> with <button data-value> children. Calls onChange(value). */
export function segmented(root, onChange) {
  const buttons = [...root.querySelectorAll('button')];
  const thumb = document.createElement('span');
  thumb.className = 'segmented-thumb';
  root.prepend(thumb);

  const select = (button, notify = true) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    thumb.style.width = `${button.offsetWidth}px`;
    thumb.style.transform = `translateX(${button.offsetLeft - 3}px)`;
    if (notify) onChange(button.dataset.value);
  };
  buttons.forEach((b) => b.addEventListener('click', () => select(b)));
  const initialButton = buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0];
  requestAnimationFrame(() => select(initialButton, false));
  addEventListener('resize', () => select(buttons.find((b) => b.getAttribute('aria-pressed') === 'true'), false));
}

/* ---------------------------------------------------------------- misc */

/** Fade + rise elements with class .reveal as they enter the viewport. */
export function revealOnScroll() {
  document.documentElement.classList.add('reveal-ready'); // content stays visible if JS fails
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

/** Calls `fn` now and then every `ms`, skipping ticks while the tab is hidden. */
export function poll(fn, ms) {
  fn();
  return setInterval(() => {
    if (!document.hidden) fn();
  }, ms);
}

/** Asks for the admin key, wipes the server history and the local game state. */
export async function confirmAndResetEverything() {
  if (!confirm("Effacer tout l'historique des douches, l'XP et les défis de la famille ? Cette action est définitive.")) return;
  const key = prompt('Clé administrateur :');
  if (!key) return;
  try {
    await resetHistory(key);
    storage.clear();
    location.href = '/';
  } catch (err) {
    alert(`Échec de la réinitialisation : ${err.message}`);
  }
}
