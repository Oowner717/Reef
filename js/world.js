// Seven zone bands, depth ranges, blend curves, and the daily seed.
// Geometry and colour only: creatures and landmarks register themselves against
// these bands in later stages.
import { P, mix } from './palette.js';

export const N_ZONES = 7;

/** Per-zone identity. Visual strengths are 0..1 and blend across boundaries. */
export const ZONES = [
  { id: 'shallows', name: 'Surface Shallows', shafts: 1.00, caustics: 1.00, snow: 0.00, dust: 0.15, glow: 0.00 },
  { id: 'reef', name: 'Coral Reef', shafts: 0.80, caustics: 0.55, snow: 0.00, dust: 0.30, glow: 0.00 },
  { id: 'dropoff', name: 'The Drop-off', shafts: 0.50, caustics: 0.15, snow: 0.05, dust: 0.65, glow: 0.05 },
  { id: 'open', name: 'Open Blue', shafts: 0.15, caustics: 0.00, snow: 0.15, dust: 0.45, glow: 0.10 },
  { id: 'twilight', name: 'Twilight', shafts: 0.03, caustics: 0.00, snow: 0.45, dust: 0.15, glow: 0.35 },
  { id: 'midnight', name: 'Midnight', shafts: 0.00, caustics: 0.00, snow: 0.85, dust: 0.05, glow: 0.80 },
  { id: 'vents', name: 'The Vent Field', shafts: 0.00, caustics: 0.00, snow: 0.60, dust: 0.35, glow: 1.00 },
];

// The water ramp as control points down the whole column, so the gradient is
// continuous across every boundary. Zone 7 gets an extra stop so the floor
// keeps darkening after the last band change.
const RAMP = [
  [0 / 7, 'w0'], [1 / 7, 'w1'], [2 / 7, 'w2'], [3 / 7, 'w3'],
  [4 / 7, 'w4'], [5 / 7, 'w5'], [6 / 7, 'w6'], [6.62 / 7, 'w7'], [1, 'w8'],
];

// Geometry, set by layoutWorld(). One zone band is one screen height, shortened
// if that would push the pre-rendered water strip near the 4096 px ceiling that
// iOS may silently refuse to allocate.
export const world = { zoneH: 0, columnH: 0, colourH: 0, wrapW: 0, travel: 0 };

const MAX_STRIP = 4000;

export function layoutWorld(iw, ih) {
  let zh = ih;
  if (zh * (N_ZONES - 1) + ih > MAX_STRIP) zh = Math.floor((MAX_STRIP - ih) / (N_ZONES - 1));
  if (zh < 120) zh = 120;
  world.zoneH = zh;
  world.travel = zh * (N_ZONES - 1);
  // The strip runs a full view height past the last band so the floor is still
  // covered when the camera is at the bottom of its travel.
  world.columnH = world.travel + ih;
  world.colourH = zh * N_ZONES;
  world.wrapW = iw * 4;
}

/** Fraction down the colour ramp for a world y. Zone i always starts at i/7. */
export function colourDepth(worldY) {
  const d = worldY / (world.colourH || 1);
  return d < 0 ? 0 : d > 1 ? 1 : d;
}

/** Zone index and 0..1 position within that band, from a world y. */
export function zoneAt(worldY) {
  const f = worldY / world.zoneH;
  let i = Math.floor(f);
  if (i < 0) i = 0; else if (i > N_ZONES - 1) i = N_ZONES - 1;
  let t = f - i;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return { index: i, t };
}

/**
 * The soft-boundary blend: which two zones are in force and how much.
 * The outer 18% of each band cross-fades into its neighbour, so spawn tables,
 * light, particles and audio never switch on a line.
 */
const EDGE = 0.18;
export function blendAt(worldY) {
  const { index, t } = zoneAt(worldY);
  if (t < EDGE && index > 0) {
    return { a: index - 1, b: index, k: 0.5 + (t / EDGE) * 0.5 };
  }
  if (t > 1 - EDGE && index < N_ZONES - 1) {
    return { a: index, b: index + 1, k: ((t - (1 - EDGE)) / EDGE) * 0.5 };
  }
  return { a: index, b: index, k: 1 };
}

/** Blend any numeric zone property across the transition band. */
export function zoneValue(worldY, key) {
  const { a, b, k } = blendAt(worldY);
  return ZONES[a][key] * k + ZONES[b][key] * (1 - k);
}

/** Colour of the water at a fraction of the whole column, as [r, g, b]. */
export function waterAtDepth(d) {
  const t = d < 0 ? 0 : d > 1 ? 1 : d;
  let i = 0;
  while (i < RAMP.length - 2 && t > RAMP[i + 1][0]) i++;
  const [t0, c0] = RAMP[i], [t1, c1] = RAMP[i + 1];
  return mix(c0, c1, (t - t0) / (t1 - t0));
}

/**
 * The two palette stops in force at a depth, plus the dither mix between them.
 * Shaped so each band is mostly solid colour with an ordered-dither transition
 * in its middle, which is what makes the column read as seven bands.
 */
export function rampStopsAt(d) {
  const t = d < 0 ? 0 : d > 1 ? 1 : d;
  let i = 0;
  while (i < RAMP.length - 2 && t > RAMP[i + 1][0]) i++;
  const [t0, c0] = RAMP[i], [t1, c1] = RAMP[i + 1];
  const f = (t - t0) / (t1 - t0);
  const s = f <= 0.28 ? 0 : f >= 0.72 ? 1 : (f - 0.28) / 0.44;
  return { a: c0, b: c1, f: s * s * (3 - 2 * s) };
}

/** How strongly the vent field's warm cast applies at a depth. */
export function ventCast(d) {
  const start = 6.35 / 7;
  if (d <= start) return 0;
  const k = (d - start) / (1 - start);
  return k * k;
}

// --- deterministic randomness ----------------------------------------------

/** Today's seed, so a day's landmark placement is stable but tomorrow differs. */
export function dailySeed(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** xorshift32. Returns a function producing floats in [0, 1). */
export function rng(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  return function next() {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5; s |= 0;
    return ((s >>> 0) % 16777216) / 16777216;
  };
}

export { P };
