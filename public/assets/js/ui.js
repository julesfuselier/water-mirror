// DOM helpers and the shared navigation (sidebar on desktop, bottom bar on mobile).

import { resetHistory } from './api.js';
import { storage } from './storage.js';

export const $ = (id) => document.getElementById(id);

export function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const SIDEBAR_LINKS = [
  { page: 'dashboard', href: '/dashboard', icon: 'fa-home', label: 'Home' },
  { page: 'ranking', href: '/ranking', icon: 'fa-trophy', label: 'Ranking' },
  { page: 'impact', href: '/impact', icon: 'fa-globe', label: 'Global Impact' },
  { page: 'challenges', href: '/challenges', icon: 'fa-medal', label: 'Challenges' },
  { page: 'about', href: '/about', icon: 'fa-info-circle', label: 'About' },
  { page: 'device', href: '/device', icon: 'fa-wrench', label: 'Device & Beta' },
];

const BOTTOM_LINKS = [
  { page: 'profiles', href: '/', icon: 'fa-user-circle', label: 'Profiles' },
  { page: 'ranking', href: '/ranking', icon: 'fa-trophy', label: 'Rank' },
  { page: 'dashboard', href: '/dashboard', icon: 'fa-home', label: 'Home', fab: true },
  { page: 'device', href: '/device', icon: 'fa-wrench', label: 'Device' },
  { page: 'challenges', href: '/challenges', icon: 'fa-medal', label: 'Quests' },
];

/** Fills the <nav data-nav="sidebar|bottom"> placeholders of the page. */
export function renderNav(activePage = document.body.dataset.page) {
  const sidebar = document.querySelector('[data-nav="sidebar"]');
  if (sidebar) {
    const items = SIDEBAR_LINKS.map(
      (l) => `<li class="${l.page === activePage ? 'active' : ''}"><a href="${l.href}"><i class="fas ${l.icon}"></i> ${l.label}</a></li>`,
    ).join('');
    sidebar.innerHTML = `
      <div class="logo"><img src="/img/logo.png" alt="Logo"> Water<span>Mirror</span></div>
      <ul class="menu">
        ${items}
        <li class="logout-link"><a href="/"><i class="fas fa-sign-out-alt"></i> Quit</a></li>
      </ul>`;
  }

  const bottom = document.querySelector('[data-nav="bottom"]');
  if (bottom) {
    bottom.innerHTML = BOTTOM_LINKS.map((l) =>
      l.fab
        ? `<div class="nav-fab-container"><a href="${l.href}" class="nav-fab"><i class="fas ${l.icon}"></i> ${l.label}</a></div>`
        : `<a href="${l.href}" class="nav-item ${l.page === activePage ? 'active' : ''}"><i class="fas ${l.icon}"></i> ${l.label}</a>`,
    ).join('');
  }
}

/** Asks for the admin key, wipes the server history and the local game state. */
export async function confirmAndResetEverything() {
  if (!confirm('🚨 WARNING! This permanently deletes the whole shower history, XP and quests for the family. Continue?')) return;
  const key = prompt('Admin key:');
  if (!key) return;
  try {
    await resetHistory(key);
    storage.clear();
    location.href = '/';
  } catch (err) {
    alert(`Reset failed: ${err.message}`);
  }
}

/** Calls `fn` now and then every `ms` milliseconds, skipping ticks while the tab is hidden. */
export function poll(fn, ms) {
  fn();
  return setInterval(() => {
    if (!document.hidden) fn();
  }, ms);
}
