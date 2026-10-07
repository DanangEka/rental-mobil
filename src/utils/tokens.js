/**
 * Canvas-rendered colour resolution.
 *
 * Anything that draws to a `<canvas>` — Chart.js, jsPDF — cannot consume
 * `var(--c57-*)` the way CSS does, because custom properties are resolved by
 * the style engine and never reach the 2D context. Those renderers therefore
 * need plain RGB triplets, which historically meant freezing a second and
 * third copy of the palette into each file.
 *
 * This reads the live custom properties off the document root instead, so
 * the tokens in `index.css` stay the single source of truth: change
 * `--c57-primary` there and the charts and the printed invoice both follow.
 *
 * Resolution is lazy and falls back to the literal Editorial Crimson values,
 * so a render can still be produced before the stylesheet has loaded — and
 * under jsdom, where `getComputedStyle` returns nothing.
 */
export const TOKEN_FALLBACK = {
  '--c57-primary': [110, 0, 0],
  '--c57-primary-container': [153, 0, 0],
  '--c57-on-primary': [255, 255, 255],
  '--c57-scrim': [21, 21, 21],
  '--c57-on-scrim': [238, 231, 227],
  '--c57-on-surface': [30, 27, 25],
  '--c57-on-surface-variant': [91, 64, 60],
  '--c57-surface': [255, 248, 245],
  '--c57-surface-container-low': [250, 242, 238],
  '--c57-surface-variant': [233, 225, 221],
  '--c57-outline': [143, 112, 107],
  '--c57-outline-variant': [228, 190, 184],
  '--c57-tertiary': [67, 48, 17],
  '--c57-tertiary-container': [91, 70, 38],
  '--c57-accent-line': [210, 181, 140],
  '--c57-available-bg': [237, 244, 238],
  '--c57-available-text': [35, 92, 43],
};

export const hexToRgb = (hex) => {
  const h = hex.trim().replace('#', '');
  // The production CSS minifier rewrites #990000 as #900, and may emit 4/8
  // digit forms for alpha — expand to full pairs and keep the first 3 channels.
  let full;
  if (h.length === 3 || h.length === 4) {
    full = h.split('').slice(0, 3).map((c) => c + c).join('');
  } else {
    full = h.slice(0, 6);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

/**
 * @param {string[]} names subset of `TOKEN_FALLBACK` to resolve
 * @returns {Object<string, number[]>} token name -> [r, g, b]
 */
export const resolveTokens = (names = Object.keys(TOKEN_FALLBACK)) => {
  if (typeof window === 'undefined' || !window.getComputedStyle) {
    return Object.fromEntries(names.map((n) => [n, TOKEN_FALLBACK[n]]));
  }
  const styles = window.getComputedStyle(document.documentElement);
  const out = {};
  for (const name of names) {
    const value = styles.getPropertyValue(name);
    out[name] = value && value.trim().startsWith('#') ? hexToRgb(value) : TOKEN_FALLBACK[name];
  }
  return out;
};

/** `[r, g, b]` -> `rgba(r, g, b, alpha)`, which is what both renderers want. */
export const rgba = ([r, g, b], alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** `[r, g, b]` -> `#rrggbb`, for canvas APIs that reject `rgb()` strings. */
export const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
