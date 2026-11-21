// Scroll-driven exploded view: the device starts closed and opens from the inside.
// Parts were cut from img/device_hero.webp; positions are fractions of that 1024×1024 picture.

import { reducedMotion } from './prefs.js';

const PARTS = [
  // name, box in the exploded picture, stacking order when closed, opening window [start, end], label
  { name: 'capot', x: 0.8018, y: 0.043, w: 0.1406, h: 0.4072, z: 1, from: 0.0, to: 0.55, label: 'Capot' },
  { name: 'coque', x: 0.623, y: 0.0381, w: 0.167, h: 0.4277, z: 2, from: 0.08, to: 0.62, label: 'Coque' },
  { name: 'support', x: 0.4404, y: 0.04, w: 0.1416, h: 0.0859, z: 3, from: 0.22, to: 0.78 },
  { name: 'batterie', x: 0.4863, y: 0.1377, w: 0.0752, h: 0.2588, z: 4, from: 0.28, to: 0.86 },
  { name: 'ressort', x: 0.4521, y: 0.2305, w: 0.0215, h: 0.0703, z: 4, from: 0.32, to: 0.9 },
  { name: 'carte', x: 0.3096, y: 0.0615, w: 0.1201, h: 0.3711, z: 5, from: 0.16, to: 0.74, label: 'Carte ESP32' },
  { name: 'ecran', x: 0.0801, y: 0.042, w: 0.1885, h: 0.4365, z: 6, from: 0.0, to: 0.58, label: 'Écran' },
  { name: 'debitmetre', x: 0.4121, y: 0.419, w: 0.1787, h: 0.581, z: 0, from: 0.05, to: 0.6, dy: -0.075, label: 'Débitmètre' },
];

const CLOSED_X = 0.5; // every part is centred here when the device is closed
const LABEL_ROW = 0.495;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function initExplodedView(section) {
  const stage = section.querySelector('.explode-stage');
  const hint = section.querySelector('.explode-hint');

  const parts = PARTS.map((p) => {
    const img = new Image();
    img.src = `/img/explode/${p.name}.webp`;
    img.alt = '';
    img.className = 'explode-part';
    img.decoding = 'async';
    Object.assign(img.style, {
      left: `${p.x * 100}%`,
      top: `${p.y * 100}%`,
      width: `${p.w * 100}%`,
      height: `${p.h * 100}%`,
      zIndex: p.z,
    });
    stage.append(img);

    let label = null;
    if (p.label) {
      label = document.createElement('span');
      label.className = 'explode-label';
      label.textContent = p.label;
      const isPipe = p.name === 'debitmetre';
      Object.assign(label.style, {
        left: `${(isPipe ? p.x + p.w + 0.07 : p.x + p.w / 2) * 100}%`,
        top: `${(isPipe ? p.y + 0.28 : LABEL_ROW) * 100}%`, // one shared baseline under the device
      });
      stage.append(label);
    }
    return { ...p, img, label, dx: CLOSED_X - (p.x + p.w / 2) };
  });
  stage.classList.add('explode-ready');
  section.classList.add('explode-ready');

  let target = 0;
  let shown = 0;
  let raf = 0;

  function draw(progress) {
    const size = stage.clientWidth;
    for (const p of parts) {
      const e = easeInOut(clamp01((progress - p.from) / (p.to - p.from)));
      const closed = 1 - e;
      const tx = p.dx * size * closed;
      const ty = (p.dy ?? 0) * size * closed;
      // a hint of depth: parts sit slightly smaller while packed inside
      const scale = 0.94 + 0.06 * e;
      p.img.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      p.label?.classList.toggle('show', progress > 0.9);
    }
    hint.style.opacity = progress > 0.04 ? '0' : '1';
  }

  function readScroll() {
    const rect = section.getBoundingClientRect();
    const travel = section.offsetHeight - section.querySelector('.explode-sticky').offsetHeight;
    target = travel > 0 ? clamp01(-rect.top / (travel * 0.85)) : 1;
  }

  // Follow the scroll with a soft critically-damped lag so the motion stays silky
  function tick() {
    shown += (target - shown) * 0.16;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    draw(shown);
    raf = shown === target ? 0 : requestAnimationFrame(tick);
  }

  function onScroll() {
    if (reducedMotion()) {
      target = shown = 1;
      draw(1);
      return;
    }
    readScroll();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('wm:prefs', onScroll);
  onScroll();
  shown = target;
  draw(shown);
}
