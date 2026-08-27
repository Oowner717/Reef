// Frame-time measurement and the quality governor.
// The governor reacts to the 1% low, not the average, because the average hides
// exactly the stutters people notice.
import { app } from './main.js';

const RING = 180;                 // ~3 s at 60 fps
const intervals = new Float32Array(RING);
const work = new Float32Array(RING);
let head = 0, filled = 0, lastNow = 0;
let recomputeAt = 0;
const scratch = new Float32Array(RING);

export const perf = {
  avg: 60, low: 60, worstMs: 0, workMs: 0,
  tier: 0, forced: -1, tierChanges: 0,
  history: [],                    // { t, from, to, avg, low }, capped
};

export const TIER_PARAMS = [
  { particles: 1.00, bloom: 1.0, maxShafts: Infinity, density: 1.0, caustics: 1, mergeParallax: false },
  { particles: 0.60, bloom: 0.5, maxShafts: Infinity, density: 1.0, caustics: 1, mergeParallax: false },
  { particles: 0.60, bloom: 0.0, maxShafts: 2, density: 0.7, caustics: 1, mergeParallax: false },
  { particles: 0.25, bloom: 0.0, maxShafts: 0, density: 0.5, caustics: 0, mergeParallax: true },
];

/** The parameters the rest of the app sheds load by. */
export function tierParams() { return TIER_PARAMS[perf.tier]; }

// Anything that must not be interrupted — a vignette payoff, a mythical hold
// frame — registers a predicate here. While one returns true the tier is frozen.
const holds = [];
export function addTierHold(fn) { holds.push(fn); }
function held() { for (let i = 0; i < holds.length; i++) if (holds[i]()) return true; return false; }

let belowSince = -1, aboveSince = -1, deferred = 0;

function percentileLow(n) {
  // Mean of the worst 1% of frame intervals in the window, as fps.
  const a = scratch.subarray(0, n);
  a.set(intervals.subarray(0, n));
  a.sort((x, y) => y - x);
  const k = Math.max(1, Math.ceil(n / 100));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += a[i];
  const ms = sum / k;
  return ms > 0 ? 1000 / ms : 60;
}

function recompute(now) {
  const n = filled;
  if (n < 8) return;
  let sum = 0, worst = 0;
  for (let i = 0; i < n; i++) { sum += intervals[i]; if (intervals[i] > worst) worst = intervals[i]; }
  perf.avg = sum > 0 ? 1000 / (sum / n) : 60;
  perf.low = percentileLow(n);
  perf.worstMs = Math.max(perf.worstMs, worst);
  let wsum = 0;
  for (let i = 0; i < n; i++) wsum += work[i];
  perf.workMs = wsum / n;
  govern(now);
}

function setTier(next, now) {
  if (next === perf.tier) return;
  if (held()) { deferred++; return; }
  const from = perf.tier;
  perf.tier = next;
  app.tier = next;
  perf.tierChanges++;
  perf.history.push({ t: Math.round(now / 100) / 10, from, to: next, avg: Math.round(perf.avg), low: Math.round(perf.low) });
  if (perf.history.length > 12) perf.history.shift();
  belowSince = -1; aboveSince = -1;
}

function govern(now) {
  if (perf.forced >= 0) {
    if (perf.tier !== perf.forced) { perf.tier = perf.forced; app.tier = perf.forced; }
    return;
  }
  if (perf.low < 55) {
    if (belowSince < 0) belowSince = now;
    if (now - belowSince >= 3000 && perf.tier < 3) setTier(perf.tier + 1, now);
  } else belowSince = -1;

  if (perf.avg > 58 && perf.low > 57) {
    if (aboveSince < 0) aboveSince = now;
    if (now - aboveSince >= 20000 && perf.tier > 0) setTier(perf.tier - 1, now);
  } else aboveSince = -1;
}

/** Called from the render loop every frame. `ms` is this frame's own work. */
export function sample(ms, now) {
  if (lastNow > 0) {
    const dt = now - lastNow;
    if (dt > 0 && dt < 2000) {
      intervals[head] = dt;
      work[head] = ms;
      head = (head + 1) % RING;
      if (filled < RING) filled++;
    }
  }
  lastNow = now;
  if (now >= recomputeAt) { recomputeAt = now + 200; recompute(now); }
}

export function setForcedTier(t) {
  perf.forced = t;
  if (t >= 0) { perf.tier = t; app.tier = t; }
  belowSince = -1; aboveSince = -1;
}

/** Recent frame intervals, oldest first — for the debug menu's graph. */
export function frameGraph(out, count) {
  const n = Math.min(count, filled);
  for (let i = 0; i < n; i++) {
    out[i] = intervals[(head - n + i + RING * 2) % RING];
  }
  return n;
}

export function deferredChanges() { return deferred; }

export function reset() {
  head = 0; filled = 0; lastNow = 0; perf.worstMs = 0;
}
