// Le projet : apparitions au défilement et démo de rotation de l’écran.

import { spring } from '../motion.js';
import { initExplodedView } from '../explode.js';
import { renderNav, revealOnScroll } from '../ui.js';

renderNav();
revealOnScroll();
initExplodedView(document.getElementById('explode'));

const stage = document.getElementById('flip');
const device = document.getElementById('flip-device');
const screen = document.getElementById('flip-screen');
let flipped = false;
let angle = 0;

function flip() {
  flipped = !flipped;
  // The device turns over, the screen counter-rotates so the reading stays upright.
  spring('flip', {
    from: angle,
    to: flipped ? 180 : 0,
    damping: 0.8,
    response: 0.5,
    onUpdate: (v) => {
      angle = v;
      device.style.transform = `rotate(${v}deg)`;
      screen.style.transform = `rotate(${-v}deg)`;
    },
  });
}

stage.addEventListener('click', flip);
stage.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    flip();
  }
});
