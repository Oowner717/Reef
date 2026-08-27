// URL query parameters -> a plain settings object, with safe defaults.
// Unknown or malformed values fall back to the default and are ignored.
// Stage 11 layers the full precedence chain (URL > save > default) on top of
// this; `present` is what tells it which rows are being overridden.

const q = new URLSearchParams(location.search);

/** Names of the parameters actually supplied in the URL. */
export const present = new Set();

function raw(name) {
  if (!q.has(name)) return null;
  present.add(name);
  return q.get(name);
}

function bool(name, dflt) {
  const v = raw(name);
  if (v === null) return dflt;
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '' || v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
  present.delete(name);
  return dflt;
}

function num(name, dflt, lo, hi) {
  const v = raw(name);
  if (v === null) return dflt;
  const n = parseFloat(v);
  if (!isFinite(n) || n < lo || n > hi) { present.delete(name); return dflt; }
  return n;
}

function str(name, dflt) {
  const v = raw(name);
  if (v === null || v === '') return dflt;
  // ids are lowercase alphanumeric with dashes; anything else is malformed
  if (!/^[a-z0-9-]{1,32}$/i.test(v)) { present.delete(name); return dflt; }
  return v.toLowerCase();
}

export const ZONE_IDS = ['shallows', 'reef', 'dropoff', 'open', 'twilight', 'midnight', 'vents'];

const ZONE_ALIASES = {
  surface: 0, shallows: 0, '1': 0,
  reef: 1, coral: 1, '2': 1,
  dropoff: 2, 'drop-off': 2, drop: 2, wall: 2, '3': 2,
  open: 3, 'openblue': 3, blue: 3, '4': 3,
  twilight: 4, '5': 4,
  midnight: 5, deep: 5, '6': 5,
  vents: 6, vent: 6, 'ventfield': 6, '7': 6,
};

function zone(name, dflt) {
  const v = raw(name);
  if (v === null) return dflt;
  const k = ZONE_ALIASES[v.toLowerCase().replace(/[^a-z0-9-]/g, '')];
  if (k === undefined) { present.delete(name); return dflt; }
  return k;
}

export const cfg = {
  sound: bool('sound', true),
  awake: bool('awake', true),
  crt: bool('crt', false),
  speed: num('speed', 1, 0.05, 40),
  start: zone('start', 0),
  density: num('density', 1, 0.1, 3),
  myth: str('myth', null),
  vignette: str('vignette', null),
  glossary: bool('glossary', true),
  seenAll: raw('seen') === 'all',
  save: bool('save', true),
  title: bool('title', true),
  fps: bool('fps', false),
  // `?debug=1` opens the menu; `?debug=behaviours` opens a named debug scene.
  debug: (() => {
    const v = raw('debug');
    if (v === null) return null;
    if (v === '' || v === '1' || v === 'true') return 'menu';
    if (v === '0' || v === 'false') { present.delete('debug'); return null; }
    if (!/^[a-z]{1,24}$/i.test(v)) { present.delete('debug'); return null; }
    return v.toLowerCase();
  })(),
};

// `?seen=all` is recorded in `present` by raw(); drop it again if it was some
// other value, so the settings panel does not claim an override that isn't one.
if (present.has('seen') && !cfg.seenAll) present.delete('seen');

/** True when the system asks for reduced motion. Re-read, never cached hard. */
export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
