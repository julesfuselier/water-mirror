// Product story page: parallax scroll, reveal animations and the "flip" demo.

import { renderNav } from '../ui.js';

renderNav();

const scroller = document.getElementById('scroll-engine');
const root = document.documentElement.style;
const blocks = document.querySelectorAll('.scroll-block');

scroller.addEventListener('scroll', () => {
  const y = scroller.scrollTop;
  root.setProperty('--scroll-offset', `${y * 0.4}px`);
  root.setProperty('--bg-parallax', `${y * 0.2}px`);
  root.setProperty('--device-zoom', 1 + y * 0.0015);

  // Highlight the text block in the middle of the screen
  blocks.forEach((block) => {
    const { top, bottom } = block.getBoundingClientRect();
    block.classList.toggle('active', top < innerHeight * 0.6 && bottom > innerHeight * 0.4);
  });
});

const revealer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('active')),
  { root: scroller, threshold: 0.15 },
);
document.querySelectorAll('.reveal-up, .reveal-scale').forEach((el) => revealer.observe(el));

let flipped = false;
document.getElementById('flip-stage').addEventListener('click', () => {
  flipped = !flipped;
  const device = document.getElementById('interactive-device');
  const screen = document.getElementById('screen-val');
  const color = flipped ? 'var(--success)' : 'var(--warning)';
  device.style.transform = flipped ? 'rotateZ(180deg) scale(1.05)' : 'rotateZ(0deg) scale(1)';
  device.style.borderColor = color;
  screen.style.transform = flipped ? 'rotateZ(180deg)' : 'rotateZ(0deg)'; // keep the text readable
  screen.style.color = color;
  screen.style.textShadow = `0 0 25px ${flipped ? 'rgba(0,255,136,0.6)' : 'rgba(241,196,15,0.6)'}`;
});
