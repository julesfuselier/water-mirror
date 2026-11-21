// Profile selection ("Who is showering?") and family management.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { getFamily, saveFamily } from '../session.js';
import { toEuros, totalLitersSaved } from '../stats.js';
import { $, escapeHtml, poll, setText } from '../ui.js';

const AVATAR_COLORS = ['#00d2ff', '#00ff88', '#f1c40f', '#b128ff', '#ff4b2b'];
let members = getFamily();

function render() {
  $('profile-grid').innerHTML = members
    .map((name, i) => {
      const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
      return `
        <a href="/dashboard?user=${encodeURIComponent(name)}" class="profile-item">
          <div class="avatar-circle" style="border-color: ${color}40; color: ${color}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
          <span class="profile-name">${escapeHtml(name)}</span>
        </a>`;
    })
    .join('');

  $('member-list-edit').innerHTML = members
    .map(
      (name, i) => `
        <div class="edit-item">
          <span>${escapeHtml(name)}</span>
          <button class="btn-del" data-index="${i}" aria-label="Delete ${escapeHtml(name)}"><i class="fas fa-trash"></i></button>
        </div>`,
    )
    .join('');
}

function addMember() {
  const input = $('new-member-name');
  const name = input.value.trim();
  if (!name || members.some((m) => m.toLowerCase() === name.toLowerCase())) return;
  members.push(name);
  saveFamily(members);
  input.value = '';
  render();
}

function deleteMember(index) {
  if (!confirm(`Permanently delete ${members[index]}?`)) return;
  members.splice(index, 1);
  saveFamily(members);
  render();
}

function toggleManage() {
  $('manage-panel').classList.toggle('active');
  $('modal-overlay').classList.toggle('active');
}

async function refreshFamilySavings() {
  const { showers } = await fetchShowers();
  setText('global-money', toEuros(totalLitersSaved(showers)).toFixed(2));
}

document.querySelectorAll('[data-action="toggle-manage"]').forEach((el) => el.addEventListener('click', toggleManage));
$('btn-add-member').addEventListener('click', addMember);
$('new-member-name').addEventListener('keydown', (e) => e.key === 'Enter' && addMember());
$('member-list-edit').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del');
  if (btn) deleteMember(Number(btn.dataset.index));
});

render();
poll(refreshFamilySavings, POLL_INTERVAL_MS);
