// Tiny spring animator (Apple-style damping ratio + response), interruptible:
// a new call on the same key starts from the current value and keeps its velocity.

import { reducedMotion } from './prefs.js';

const running = new Map();

/**
 * @param {string} key identifies the animated property (one animation per key)
 * @param {{from:number, to:number, velocity?:number, damping?:number, response?:number,
 *          onUpdate:(v:number)=>void, onComplete?:()=>void}} o
 */
export function spring(key, o) {
  const prev = running.get(key);
  let x = prev ? prev.x : o.from;
  let v = prev ? prev.v : (o.velocity ?? 0);
  if (prev) cancelAnimationFrame(prev.raf);

  if (reducedMotion()) {
    running.delete(key);
    o.onUpdate(o.to);
    o.onComplete?.();
    return;
  }

  const damping = o.damping ?? 1;
  const response = o.response ?? 0.4;
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  const state = { x, v, raf: 0 };
  let last = performance.now();

  const step = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const force = -stiffness * (state.x - o.to) - friction * state.v;
    state.v += force * dt;
    state.x += state.v * dt;
    if (Math.abs(state.v) < 0.5 && Math.abs(state.x - o.to) < 0.5) {
      running.delete(key);
      o.onUpdate(o.to);
      o.onComplete?.();
      return;
    }
    o.onUpdate(state.x);
    state.raf = requestAnimationFrame(step);
  };
  running.set(key, state);
  state.raf = requestAnimationFrame(step);
}

/** Where a flick would come to rest (Apple's deceleration projection). */
export const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

/** Progressive resistance past a boundary. */
export const rubberband = (overshoot, dimension, c = 0.55) =>
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
