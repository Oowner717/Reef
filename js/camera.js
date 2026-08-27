// The 5:20 timeline over the seven-band column: two 20 s lingers and two 140 s
// legs of 20 s per zone, eased at each end so the camera never jerks out of a
// linger. Plus the sideways current and the per-layer parallax offsets.
import { addUpdater, onResize, app } from './main.js';
import { world, layoutWorld, zoneAt, N_ZONES } from './world.js';
import { cfg } from './config.js';

export const RUN = 320;          // seconds, one full descent and ascent
const LINGER = 20;
const LEG = 140;
const EASE_FRACTION = 2 / LEG;   // 2 s of easing at each end of a leg
const CURRENT = 4;               // internal px per second, sideways
const CURRENT_PERIOD = 47;

export const cam = {
  t: 0,          // seconds into the run, 0..RUN
  y: 0,          // world y of the top of the view
  x: 0,          // world x, wraps at world.wrapW
  centre: 0,     // world y of the middle of the view
  depth: 0,      // 0..1 down the whole column
  zone: 0,       // index of the zone under the middle of the view
  zoneT: 0,      // 0..1 within that zone
  descending: true,
  vy: 0,         // world px per second, signed
  runs: 0,
  speed: 1,      // settings multiplier; ?speed= and the debug slider fold in here
};

// --- the eased leg ----------------------------------------------------------
// A trapezoidal speed profile integrated once into a lookup table, so the
// middle of a leg is genuinely constant-rate (a zone really is 20 s) while the
// ends are smooth.
const LUT = new Float32Array(513);
(function buildLut() {
  const a = EASE_FRACTION;
  const n = LUT.length - 1;
  let acc = 0;
  const v = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const r = Math.min(u / a, (1 - u) / a, 1);
    const s = r <= 0 ? 0 : r >= 1 ? 1 : r * r * (3 - 2 * r);
    v[i] = s;
    acc += s;
  }
  let run = 0;
  for (let i = 0; i <= n; i++) { LUT[i] = run / acc; run += v[i]; }
  LUT[n] = 1;
})();

function legProgress(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const f = u * (LUT.length - 1);
  const i = f | 0;
  return LUT[i] + (LUT[Math.min(i + 1, LUT.length - 1)] - LUT[i]) * (f - i);
}

/** Inverse of legProgress, for `?start=`. */
function legTimeFor(p) {
  let lo = 0, hi = LUT.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (LUT[mid] < p) lo = mid + 1; else hi = mid;
  }
  return lo / (LUT.length - 1);
}

/** Column progress 0 (surface) .. 1 (floor) for a time in the run. */
export function progressAt(t) {
  const tt = ((t % RUN) + RUN) % RUN;
  if (tt < LINGER) return 0;
  if (tt < LINGER + LEG) return legProgress((tt - LINGER) / LEG);
  if (tt < LINGER * 2 + LEG) return 1;
  return 1 - legProgress((tt - (LINGER * 2 + LEG)) / LEG);
}

/**
 * The run time at which the descent puts the middle of the view on the middle
 * of a zone. The view is one band tall, so that is simply progress index/6.
 */
export function timeForZone(index) {
  // Zone 1 means the surface, and the surface means the linger: starting at the
  // instant the descent begins would skip the only 20 s the ceiling is in view.
  if (index <= 0) return 0;
  const target = Math.min(1, Math.max(0, index / (N_ZONES - 1)));
  return LINGER + legTimeFor(target) * LEG;
}

// --- run-boundary hooks -----------------------------------------------------

const runEnd = [];
/** Called as the camera returns to the surface — the one safe seam. */
export function onRunEnd(fn) { runEnd.push(fn); }

// --- parallax ---------------------------------------------------------------

/**
 * Parallax is anchored on the middle of the view: a far layer moves less than
 * the camera but stays put relative to what it is behind. Multiplying `cam.y`
 * directly instead would slide a distant landmark right out of its own zone.
 * A factor of 0 means "already in screen space" and is used by the debug scene.
 */
export function screenY(worldY, factor = 1) {
  if (factor === 1) return worldY - cam.y;
  if (factor === 0) return worldY;
  return (worldY - cam.y) * factor + app.ih * 0.5 * (1 - factor);
}

/** Wrapped horizontal position, returned near the visible window. */
export function screenX(worldX, factor = 1) {
  if (factor === 0) return worldX;
  const w = world.wrapW || 1;
  let x = (worldX - cam.x * factor) % w;
  if (x < 0) x += w;
  if (x > app.iw + w * 0.5) x -= w;
  return x;
}

// --- update -----------------------------------------------------------------

function step(dt) {
  const s = cam.speed * cfg.speed;
  cam.t += dt * s;
  if (cam.t >= RUN) {
    cam.t -= RUN;
    cam.runs++;
    for (const fn of runEnd) fn();
  }
  cam.x += CURRENT * s * dt * (1 + 0.4 * Math.sin(cam.t * (Math.PI * 2 / CURRENT_PERIOD)));
  if (world.wrapW) cam.x = ((cam.x % world.wrapW) + world.wrapW) % world.wrapW;

  const p = progressAt(cam.t);
  const y = p * world.travel;
  cam.vy = dt > 0 ? (y - cam.y) / dt : 0;
  // Flip halfway through the bottom linger, so the spawner is already
  // pre-spawning upward before the ascent starts.
  cam.descending = cam.t < LINGER * 1.5 + LEG;
  cam.y = y;
  cam.centre = y + app.ih * 0.5;
  cam.depth = world.columnH ? cam.centre / world.columnH : 0;
  const z = zoneAt(cam.centre);
  cam.zone = z.index;
  cam.zoneT = z.t;
}

export function init() {
  layoutWorld(app.iw, app.ih);
  onResize((iw, ih) => { layoutWorld(iw, ih); step(0); });
  cam.t = timeForZone(cfg.start);
  cam.x = 0;
  step(0);
  addUpdater(step, -100);
}

/** Seek to an arbitrary point in the run — the stage 12 depth resume. */
export function seek(t) {
  cam.t = ((t % RUN) + RUN) % RUN;
  step(0);
}

/** Used by the debug menu's jump-to-zone. */
export function jumpToZone(index) {
  cam.t = timeForZone(Math.max(0, Math.min(N_ZONES - 1, index | 0)));
  step(0);
}
