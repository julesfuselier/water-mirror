// "Affichage et accessibilité" panel: theme, text size, colour-blind palette,
// easier reading (dyslexia / dysorthographia), reduced motion, high contrast.

import { icon } from './icons.js';
import { getPrefs, resetPrefs, setPref } from './prefs.js';
import { createSheet, segmented } from './ui.js';

let sheet = null;

const SWITCHES = [
  { key: 'cvd', title: 'Couleurs pour daltoniens', text: 'Remplace le vert et le rouge par du bleu et de l’orange, et ajoute des motifs.' },
  { key: 'dys', title: 'Lecture facilitée', text: 'Police plus lisible, lettres et lignes plus espacées, pas d’italique. Pensé pour la dyslexie et la dysorthographie.' },
  { key: 'motion', title: 'Réduire les animations', text: 'Supprime les mouvements et les effets de rebond.' },
  { key: 'contrast', title: 'Contraste renforcé', text: 'Textes plus foncés et contours plus marqués.' },
];

function build() {
  const p = getPrefs();
  const el = document.createElement('div');
  el.className = 'sheet';
  el.id = 'a11y-sheet';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'a11y-title');
  el.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-body">
      <h2 class="title-2" id="a11y-title">Affichage et accessibilité</h2>

      <div class="setting">
        <p class="headline" id="theme-label">Thème</p>
        <div class="segmented" data-pref="theme" role="group" aria-labelledby="theme-label">
          <button data-value="light" aria-pressed="${p.theme === 'light'}">Clair</button>
          <button data-value="dark" aria-pressed="${p.theme === 'dark'}">Sombre</button>
          <button data-value="auto" aria-pressed="${p.theme === 'auto'}">Auto</button>
        </div>
      </div>

      <div class="setting">
        <p class="headline" id="text-label">Taille du texte</p>
        <div class="segmented" data-pref="text" role="group" aria-labelledby="text-label">
          <button data-value="m" aria-pressed="${p.text === 'm'}">Normale</button>
          <button data-value="l" aria-pressed="${p.text === 'l'}">Grande</button>
          <button data-value="xl" aria-pressed="${p.text === 'xl'}">Très grande</button>
        </div>
      </div>

      ${SWITCHES.map(
        (s) => `
        <div class="setting">
          <div class="setting-row">
            <div>
              <label class="headline" for="pref-${s.key}">${s.title}</label>
              <p class="caption">${s.text}</p>
            </div>
            <span class="switch"><input type="checkbox" role="switch" id="pref-${s.key}" data-key="${s.key}" ${p[s.key] ? 'checked' : ''}><span></span></span>
          </div>
        </div>`,
      ).join('')}

      <div style="display: flex; gap: 10px; margin-top: 18px;">
        <button class="btn btn-plain" data-action="reset">Réinitialiser</button>
        <button class="btn btn-primary" data-action="close" style="margin-left: auto;">Terminé</button>
      </div>
    </div>`;
  document.body.append(el);

  el.querySelectorAll('.segmented[data-pref]').forEach((group) =>
    segmented(group, (value) => setPref(group.dataset.pref, value)),
  );
  el.querySelectorAll('input[data-key]').forEach((input) =>
    input.addEventListener('change', () => setPref(input.dataset.key, input.checked)),
  );
  el.querySelector('[data-action="close"]').addEventListener('click', () => sheet.close());
  el.querySelector('[data-action="reset"]').addEventListener('click', () => {
    resetPrefs();
    sheet.close();
    el.remove();
    sheet = null; // rebuilt with defaults next time
  });

  return createSheet(el);
}

export function openA11yPanel() {
  sheet ??= build();
  sheet.open();
  window.dispatchEvent(new Event('resize')); // position the segmented thumbs now that it is laid out
}

export const a11yButtonHtml = () =>
  `<button class="a11y-button" type="button" data-open-a11y aria-label="Affichage et accessibilité" title="Affichage et accessibilité">${icon('access')}</button>`;

/** Wires every [data-open-a11y] button on the page. */
export function bindA11yButtons(root = document) {
  root.querySelectorAll('[data-open-a11y]').forEach((b) => b.addEventListener('click', openA11yPanel));
}
