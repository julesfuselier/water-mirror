// Minimal line icons (24px grid, 1.8 stroke) so the site needs no icon font.

const paths = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.3 3.6 5 3.6 8s-1.1 5.7-3.6 8c-2.5-2.3-3.6-5-3.6-8S9.5 6.3 12 4z"/>',
  device: '<rect x="7" y="3.5" width="10" height="17" rx="3"/><rect x="9.5" y="6.5" width="5" height="6" rx="1"/><path d="M11 16.5h2"/>',
  drop: '<path d="M12 3.5c3.2 3.6 6 6.9 6 10.2A6 6 0 0 1 6 13.7c0-3.3 2.8-6.6 6-10.2z"/>',
  bulb: '<path d="M9 17h6M10 20h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  pool: '<path d="M3 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M8 14V6a2 2 0 0 1 4 0M16 14V6a2 2 0 0 0-4 0M8 9h8"/>',
  bottle: '<path d="M10 3h4v3l1.5 2.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V8.5L10 6zM8.5 12h7"/>',
  sprout: '<path d="M12 20v-8M12 12c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6zM12 14c0-3 2-5.5 6.5-5.5 0 3-2 5.5-6.5 5.5zM7 20h10"/>',
  share: '<path d="M12 15V4M8 7.5 12 4l4 3.5M7 11H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="currentColor" stroke="none"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  access: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.6" r="1.3" fill="currentColor" stroke="none"/><path d="M7.5 10.2 12 11l4.5-.8M12 11v3.2M12 14.2l-2.2 4M12 14.2l2.2 4"/>',
  people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 6a3 3 0 0 1 0 5.5M17.5 14.7c1.6.6 2.6 2 3 4.3"/>',
};

export function icon(name, label = '') {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${paths[name]}</svg>`;
}

/** Replaces every <i data-icon="name"></i> in the page with its SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, el.getAttribute('aria-label') ?? '');
  });
}
