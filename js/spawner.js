// Per-zone resident tables, traveller depth ranges, pre-spawn ahead of the
// camera's direction of travel, retire well off-screen, pooled throughout.
// Nothing pops in or out in view: every spawn lands outside the visible window.
import { addLayer, addUpdater, layer, app } from './main.js';
import { cam, screenY } from './camera.js';
import { world } from './world.js';
import { cfg } from './config.js';
import { SPECIES, makePool } from './creatures/base.js';
import { tierParams } from './perf.js';
import { addInfo, addToggle } from './debug/registry.js';
import { addProvider } from './debug/diagnostics.js';
import { P, css } from './palette.js';

const POOL_CAP = 130;
// Entity caps by size band. A school is one entity, so these are lower than the
// individual-animal caps in DESIGN.md.
const BAND_CAP = { motes: 14, small: 36, medium: 52, large: 14, huge: 1, mythical: 1 };

const pool = makePool(POOL_CAP);
const ranges = new Map();
const counts = Object.create(null);
const bandCounts = Object.create(null);

export const spawner = { pool, densityMul: 1, showBounds: false };

let tickAt = 0;
let whaleRun = -1, whaleAllowed = false;

function rangeFor(s) {
  let r = ranges.get(s.id);
  if (r) return r;
  const z0 = Math.min.apply(null, s.zones), z1 = Math.max.apply(null, s.zones);
  r = [(z0 + s.depth[0]) * world.zoneH, (z1 + s.depth[1]) * world.zoneH];
  ranges.set(s.id, r);
  return r;
}

function density() {
  return cfg.density * spawner.densityMul * tierParams().density;
}

const win = { top: 0, bottom: 0 };
function activeWindow() {
  const back = app.ih * 1.3, ahead = app.ih * 2.8;
  if (cam.descending) { win.top = cam.centre - back; win.bottom = cam.centre + ahead; }
  else { win.top = cam.centre - ahead; win.bottom = cam.centre + back; }
  return win;
}

function wrapX(x) { const w = world.wrapW; return ((x % w) + w) % w; }

function randint(v) {
  if (typeof v === 'number') return v;
  if (!v) return 1;
  return v[0] + Math.round(Math.random() * (v[1] - v[0]));
}

/** A spawn point outside the visible window: off the top or bottom if the
 *  species' band allows it, otherwise well off to one side. */
const pos = { x: 0, y: 0, ok: false };
function spawnPos(s, anywhere) {
  const r = rangeFor(s);
  const y0 = Math.max(win.top, r[0]), y1 = Math.min(win.bottom, r[1]);
  pos.ok = false;
  if (y1 <= y0) return pos;
  if (anywhere) {
    // Cold start or a jump: there is no "in view" to protect yet, so fill the
    // whole window including the screen. Every later spawn is off-screen.
    pos.y = y0 + Math.random() * (y1 - y0);
    pos.x = wrapX(cam.x + (Math.random() - 0.5) * app.iw * 1.7);
    pos.ok = true;
    return pos;
  }
  const M = (s.size || 12) + 20;
  const above = Math.min(y1, cam.y - M), below = Math.max(y0, cam.y + app.ih + M);
  const canAbove = above > y0, canBelow = below < y1;
  // Prefer the side the camera is heading into, so it scrolls into view.
  const wantBelow = cam.descending ? canBelow : !canAbove;
  if (canAbove || canBelow) {
    if (wantBelow && canBelow) pos.y = below + Math.random() * (y1 - below);
    else if (canAbove) pos.y = y0 + Math.random() * (above - y0);
    else pos.y = below + Math.random() * (y1 - below);
    // Near the camera horizontally: the world is four screens wide, so a
    // uniformly-placed animal would spend three quarters of its life unseen.
    pos.x = wrapX(cam.x + (Math.random() - 0.5) * app.iw * 1.8);
  } else {
    // Its band is entirely on screen — come in from one side instead.
    pos.y = y0 + Math.random() * (y1 - y0);
    const side = Math.random() < 0.5 ? -1 : 1;
    const off = side > 0 ? app.iw + M + Math.random() * app.iw * 0.6
      : -M - Math.random() * app.iw * 0.6;
    pos.x = wrapX(cam.x + off);
  }
  pos.ok = true;
  return pos;
}

function hugeOnScreen() {
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (c.alive && c.def.band === 'huge' && Math.abs(c.y - cam.centre) < app.ih * 1.6) return true;
  }
  return false;
}

function census() {
  for (const k in counts) counts[k] = 0;
  for (const k in bandCounts) bandCounts[k] = 0;
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c.alive) continue;
    counts[c.def.id] = (counts[c.def.id] || 0) + 1;
    bandCounts[c.def.band] = (bandCounts[c.def.band] || 0) + 1;
  }
}

function retirePass() {
  const items = pool.items;
  const pad = app.ih * 1.2;
  const xpad = app.iw * 2.0;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c.alive) continue;
    if (c.onScreen(40)) continue;
    if (c.y < win.top - pad || c.y > win.bottom + pad) { c.retire(); continue; }
    // Drifted far off to one side: recycle the slot rather than simulate it
    // all the way round the wrap.
    if (Math.abs(c.sx() - app.iw * 0.5) > xpad) c.retire();
  }
}

function spawnOne(s, anywhere) {
  const p = spawnPos(s, anywhere);
  if (!p.ok) return false;
  const c = pool.acquire();
  const grouped = s.behaviourId === 'schooling';
  c.spawn(s, p.x, p.y, grouped ? { count: randint(s.count) } : undefined);
  c.face = Math.random() < 0.5 ? -1 : 1;
  if (s.behaviourId === 'skimming' || s.behaviourId === 'diving') {
    c.d.ceilY = Math.min.apply(null, s.zones) * world.zoneH + 5;
  }
  return true;
}

let rotate = 0;

function spawnPass(anywhere) {
  const d = density();
  if (cam.runs !== whaleRun) { whaleRun = cam.runs; whaleAllowed = Math.random() < 0.25; }
  // Start the sweep at a different species each tick, so a band hitting its cap
  // does not permanently starve whatever happens to be last in the table.
  rotate = (rotate + 7) % SPECIES.length;
  for (let k = 0; k < SPECIES.length; k++) {
    const s = SPECIES[(k + rotate) % SPECIES.length];
    if (!s.ambient) continue;
    if (s.runChance !== undefined && !whaleAllowed) continue;
    const r = rangeFor(s);
    if (r[1] < win.top || r[0] > win.bottom) continue;
    // The active window is several screens tall and nearly two wide, so a
    // target of "maxAlive in the window" leaves far fewer than that in view.
    // Small life is multiplied up; the big animals are not, because two Huge
    // animals must never share a stretch of water.
    const spread = s.band === 'huge' ? 1 : s.band === 'large' ? 1.3 : 2.2;
    const want = Math.max(1, Math.round((s.maxAlive || 1) * spread * (s.band === 'huge' ? 1 : d)));
    if ((counts[s.id] || 0) >= want) continue;
    if ((bandCounts[s.band] || 0) >= BAND_CAP[s.band]) continue;
    // Never two Huge animals in the same stretch of water.
    if (s.band === 'huge' && hugeOnScreen()) continue;
    if (spawnOne(s, anywhere)) {
      counts[s.id] = (counts[s.id] || 0) + 1;
      bandCounts[s.band] = (bandCounts[s.band] || 0) + 1;
    }
  }
}

let lastCentre = null;

function tick() {
  activeWindow();
  // A jump — cold start, `?start=`, or the debug menu's jump-to-zone — throws
  // the old population away and refills the new window from scratch.
  const jumped = lastCentre === null || Math.abs(cam.centre - lastCentre) > app.ih * 2;
  lastCentre = cam.centre;
  if (jumped) {
    pool.clear();
    for (let i = 0; i < 7; i++) { census(); spawnPass(true); }
    return;
  }
  retirePass();
  census();
  spawnPass(false);
}

function update(dt) {
  if (!world.zoneH) return;
  tickAt -= dt;
  if (tickAt <= 0) { tickAt = 0.25; tick(); }
  const items = pool.items;
  const near = app.ih * 3.4;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c.alive || Math.abs(c.y - cam.centre) > near) continue;
    c.update(dt);
    const s = c.def;
    if (s.variants) c.variant = s.variants[Math.floor(c.age / s.variantEvery) % s.variants.length];
    const r = rangeFor(s);
    if (c.y < r[0]) { c.y = r[0]; c.vy = Math.abs(c.vy); }
    else if (c.y > r[1]) { c.y = r[1]; c.vy = -Math.abs(c.vy); }
    if (c.homeY < r[0]) c.homeY = r[0];
    else if (c.homeY > r[1]) c.homeY = r[1];
    c.x = ((c.x % world.wrapW) + world.wrapW) % world.wrapW;
    const f = c.flock;
    if (f) {
      for (let j = 0; j < f.n; j++) {
        if (f.y[j] < r[0]) { f.y[j] = r[0]; f.vy[j] = Math.abs(f.vy[j]); }
        else if (f.y[j] > r[1]) { f.y[j] = r[1]; f.vy[j] = -Math.abs(f.vy[j]); }
      }
    }
  }
}

function drawBucket(c, lo, hi) {
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.alive) continue;
    const l = e.def.layer || 1;
    if (l < lo || l >= hi) continue;
    if (e.onScreen(24)) e.draw(c);
  }
}

function drawBounds(c) {
  if (!spawner.showBounds) return;
  c.fillStyle = css(P.bioLime, 0.5);
  const t = screenY(win.top, 1), b = screenY(win.bottom, 1);
  if (t > 0 && t < app.ih) c.fillRect(0, t | 0, app.iw, 1);
  if (b > 0 && b < app.ih) c.fillRect(0, b | 0, app.iw, 1);
}

export function poolLive() { return pool.live(); }
export function repopulate() { lastCentre = null; tickAt = 0; tick(); }

export function init() {
  const tf = layer('testfish');
  if (tf) tf.enabled = false;   // the stage 1 placeholder is superseded here
  addUpdater(update, 10);
  addLayer('creatures-far', 30, (c) => drawBucket(c, 0.01, 0.9));
  addLayer('creatures', 45, (c) => drawBucket(c, 0.9, 1.2));
  addLayer('creatures-near', 60, (c) => { drawBucket(c, 1.2, 99); drawBounds(c); });
  tick();   // fill the column before the first frame is drawn

  addInfo('entities', 'pool', () => pool.live() + ' / ' + POOL_CAP, { sectionOrder: 25 });
  addInfo('entities', 'by band', () =>
    ['motes', 'small', 'medium', 'large', 'huge'].map((b) =>
      (b[0].toUpperCase()) + (bandCounts[b] || 0) + '/' + BAND_CAP[b]).join(' '));
  addInfo('entities', 'species', () => String(SPECIES.length));
  addInfo('entities', 'density', () => density().toFixed(2));
  addToggle('overlays', 'spawn bounds', () => spawner.showBounds,
    (v) => { spawner.showBounds = v; }, { sectionOrder: 35 });
  addProvider('entities', 25, () => 'pool ' + pool.live() + '/' + POOL_CAP +
    '  bands ' + ['motes', 'small', 'medium', 'large', 'huge'].map((b) =>
      b + ' ' + (bandCounts[b] || 0) + '/' + BAND_CAP[b]).join(', ') +
    '\\ndensity ' + density().toFixed(2) + '  species ' + SPECIES.length);
}
