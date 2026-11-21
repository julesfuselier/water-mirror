// Exploded view on the "Le projet" page.
// One scroll gesture glides the page to the device, which opens from the inside (a time-based
// spring, not scroll-scrubbed), then the copy appears. Scrolling back up closes it again.
// Parts were cut from img/device_hero.webp; boxes are fractions of that 1024×1024 picture.

import { spring } from './motion.js';
import { reducedMotion } from './prefs.js';

/** Tuning knobs (see the playground). */
export const CONFIG = {
  crop: 0.6, // visible height of the picture, as a fraction of its width (must match --crop in CSS)
  pipeClosed: -0.075, // flowmeter offset when closed (negative = docked under the device)
  pipeOpen: 0.22, // drop when open: slides out of the frame
  response: 0.9, // spring response in seconds (lower = faster)
  stagger: 1, // 1 = default spread between parts, 0 = all parts move together
  copyAt: 0.72, // progress at which the copy appears
  openAfter: 24, // pixels of scroll that trigger the opening
};

const PARTS = [
  // name, box in the exploded picture, stacking order when closed, opening window, label
  { name: 'capot', x: 0.8018, y: 0.043, w: 0.1406, h: 0.4072, z: 1, from: 0.0, to: 0.55, label: 'Capot' },
  { name: 'coque', x: 0.623, y: 0.0381, w: 0.167, h: 0.4277, z: 2, from: 0.08, to: 0.62, label: 'Coque' },
  { name: 'support', x: 0.4404, y: 0.04, w: 0.1416, h: 0.0859, z: 3, from: 0.22, to: 0.78 },
  { name: 'batterie', x: 0.4863, y: 0.1377, w: 0.0752, h: 0.2588, z: 4, from: 0.28, to: 0.86 },
  { name: 'ressort', x: 0.4521, y: 0.2305, w: 0.0215, h: 0.0703, z: 4, from: 0.32, to: 0.9 },
  { name: 'carte', x: 0.3096, y: 0.0615, w: 0.1201, h: 0.3711, z: 5, from: 0.16, to: 0.74, label: 'Carte ESP32' },
  { name: 'ecran', x: 0.0801, y: 0.042, w: 0.1885, h: 0.4365, z: 6, from: 0.0, to: 0.58, label: 'Écran' },
  { name: 'debitmetre', x: 0.4121, y: 0.419, w: 0.1787, h: 0.581, z: 0, from: 0.1, to: 0.7, pipe: true },
];

const CLOSED_X = 0.5; // every part is centred here when the device is closed
const LABEL_ROW = 0.5;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function initExplodedView(section) {
  const stage = section.querySelector('.explode-stage');
  const copy = section.querySelector('.explode-copy');
  const hint = section.querySelector('.explode-hint');
  const pct = (v) => `${v * 100}%`;
  const crop = CONFIG.crop;

  const parts = PARTS.map((p) => {
    const img = new Image();
    img.src = `/img/explode/${p.name}.webp`;
    img.alt = '';
    img.className = p.pipe ? 'explode-part is-pipe' : 'explode-part';
    img.decoding = 'async';
    Object.assign(img.style, {
      left: pct(p.x),
      top: pct(p.y / crop),
      width: pct(p.w),
      height: pct(p.h / crop),
      zIndex: p.z,
    });
    stage.append(img);

    let label = null;
    if (p.label) {
      label = document.createElement('span');
      label.className = 'explode-label';
      label.textContent = p.label;
      Object.assign(label.style, { left: pct(p.x + p.w / 2), top: pct(LABEL_ROW / crop) });
      stage.append(label);
    }
    return { ...p, img, label, dx: CLOSED_X - (p.x + p.w / 2) };
  });
  section.classList.add('explode-ready');
  stage.classList.add('explode-ready');

  let progress = 0;
  let open = false;

  function draw(v) {
    progress = v;
    const width = stage.clientWidth;
    const mid = 0.45; // stagger is centred on the middle of the sequence
    for (const p of parts) {
      const from = mid + (p.from - mid) * CONFIG.stagger;
      const to = mid + (p.to - mid) * CONFIG.stagger + (1 - CONFIG.stagger) * 0.5;
      const e = easeInOut(clamp01((v - from) / Math.max(0.05, to - from)));
      const tx = p.dx * width * (1 - e);
      const ty = p.pipe ? (CONFIG.pipeClosed + (CONFIG.pipeOpen - CONFIG.pipeClosed) * e) * width : 0;
      const scale = p.pipe ? 1 : 0.94 + 0.06 * e; // packed parts sit slightly smaller, like depth
      p.img.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      p.label?.classList.toggle('show', v > 0.92);
    }
    copy.classList.toggle('show', v > CONFIG.copyAt);
    hint.style.opacity = open || v > 0.02 ? '0' : '1';
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    if (reducedMotion()) return draw(open ? 1 : 0);
    // Critically damped spring: starts from the current value, so a quick back-and-forth just reverses
    // (animated on a 0–1000 scale: the spring's rest thresholds are in pixels)
    spring('explode', {
      from: progress * 1000,
      to: open ? 1000 : 0,
      damping: 1,
      response: CONFIG.response,
      onUpdate: (v) => draw(clamp01(v / 1000)),
    });
  }

  // One gesture = one step: scrolling down from the intro glides the page to the device
  // (which opens), scrolling up from there glides back to the top (which closes it).
  let lastY = scrollY;
  let gliding = false;
  const pinnedY = () => section.offsetTop - (document.querySelector('.topbar')?.offsetHeight ?? 0);

  function glideTo(y) {
    gliding = true;
    scrollTo({ top: y, behavior: 'smooth' });
    const settle = () => {
      gliding = false;
      lastY = scrollY;
    };
    if ('onscrollend' in window) addEventListener('scrollend', settle, { once: true });
    else setTimeout(settle, 700);
  }

  function onScroll() {
    if (reducedMotion()) {
      open = true;
      draw(1);
      return;
    }
    const y = scrollY;
    const goingDown = y > lastY;
    lastY = y;
    const target = pinnedY();

    if (!gliding) {
      if (goingDown && y > CONFIG.openAfter && y < target - 8) glideTo(target); // intro → device
      else if (!goingDown && y > 8 && y < target - 8 && open) glideTo(0); // device → back to the top
    }

    const rect = section.getBoundingClientRect();
    const inView = rect.top < innerHeight * 0.7 && rect.bottom > innerHeight * 0.3;
    if (inView && y > CONFIG.openAfter) setOpen(true);
    else if (y <= CONFIG.openAfter / 2 || !inView) setOpen(false);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => draw(progress));
  addEventListener('wm:prefs', onScroll);
  draw(0);
  onScroll();
}
