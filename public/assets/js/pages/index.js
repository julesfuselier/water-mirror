// "Qui se douche ?" — profile selection and family management.

import { fetchShowers } from '../api.js';
import { POLL_INTERVAL_MS } from '../config.js';
import { euros } from '../format.js';
import { hydrateIcons, icon } from '../icons.js';
import { getFamily, saveFamily } from '../session.js';
import { toEuros, totalLitersSaved } from '../stats.js';
import { bindA11yButtons } from '../a11y.js';
import { $, avatarHtml, createSheet, escapeHtml, poll, setText } from '../ui.js';

let members = getFamily();
const sheet = createSheet($('family-sheet'));

function render() {
  $('profiles').innerHTML = members
    .map((name) => `<a class="profile" href="/dashboard?user=${encodeURIComponent(name)}">${avatarHtml(name)}<span>${escapeHtml(name)}</span></a>`)
    .join('');

  $('member-list').innerHTML = members
    .map(
      (name, i) => `
        <div class="member-row">
          ${avatarHtml(name)}
          <span class="grow">${escapeHtml(name)}</span>
          <button class="btn btn-danger btn-sm" data-index="${i}" aria-label="Retirer ${escapeHtml(name)}">${icon('trash')}</button>
        </div>`,
    )
    .join('');
}

$('add-member').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('new-member');
  const name = input.value.trim();
  if (!name) return;
  if (members.some((m) => m.toLowerCase() === name.toLowerCase())) {
    input.select();
    return;
  }
  members.push(name);
  saveFamily(members);
  input.value = '';
  render();
});

$('member-list').addEventListener('click', (e) => {
  const button = e.target.closest('[data-index]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (!confirm(`Retirer ${members[index]} de la famille ?`)) return;
  members.splice(index, 1);
  saveFamily(members);
  render();
});

$('btn-manage').addEventListener('click', sheet.open);
$('btn-done').addEventListener('click', () => sheet.close());

async function refreshSavings() {
  const { showers } = await fetchShowers();
  setText('family-savings', `${euros(toEuros(totalLitersSaved(showers)))} économisés`);
}

hydrateIcons();
bindA11yButtons();
render();
poll(refreshSavings, POLL_INTERVAL_MS);
