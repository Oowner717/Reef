// One vignette per zone visit: chosen from a per-zone shuffled bag, started a
// few seconds in, finished with time to spare, and cleaned up after.
import { addLayer, addUpdater, app } from '../main.js';
import { cam, screenX, screenY, jumpToZone } from '../camera.js';
import { world } from '../world.js';
import { cfg } from '../config.js';
import { spawner } from '../spawner.js';
import { speciesById } from '../creatures/base.js';
import { createBag } from '../bag.js';
import { addTierHold } from '../perf.js';
import { addInfo, addChoice, addToggle } from '../debug/registry.js';
import { addProvider } from '../debug/diagnostics.js';
import { VIGNETTES, vignetteById } from './base.js';
import { scenesForZone } from '../registry.js';
import { updateFx, drawFx, clearFx, fxLive } from './fx.js';

export const director = {
  running: null,      // { v, t, actors }
  chosen: null,
  visitZone: -1,
  log: [],            // last five ids played
  enabled: true,
  forced: null,
};

const bags = [];
const completeHooks = [];
export function onComplete(fn) { completeHooks.push(fn); }

let visitLeft = 0, startIn = 0, tries = 0;

function realVisitSeconds() {
  const s = Math.max(0.02, cam.speed * cfg.speed);
  return 20 / s;
}

// --- staging ----------------------------------------------------------------

function stagePoint(out) {
  // Middle of the frame, biased slightly ahead of the camera's travel, so the
  // beat happens where the eye already is.
  out.x = cam.x + app.iw * (0.3 + Math.random() * 0.4);
  out.y = cam.y + app.ih * (0.36 + Math.random() * 0.22)
    + (cam.descending ? app.ih * 0.10 : -app.ih * 0.10);
  return out;
}
const pt = { x: 0, y: 0 };

/** An already-visible individual of this species, if there is one. */
function findOnScreen(id) {
  const items = spawner.pool.items;
  let best = null, bestD = 1e9;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c.alive || c.vignette || c.def.id !== id) continue;
    if (!c.onScreen(8)) continue;
    const dx = c.sx() - app.iw * 0.5, dy = c.sy() - app.ih * 0.5;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** Every live individual of a species — for scenes that use a whole group. */
export function findAll(id, out) {
  out.length = 0;
  const items = spawner.pool.items;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (c.alive && c.def.id === id) out.push(c);
  }
  return out;
}

function spawnActor(sp) {
  stagePoint(pt);
  const c = spawner.pool.acquire();
  const grouped = sp.behaviourId === 'schooling';
  const n = Array.isArray(sp.count) ? sp.count[0] : (sp.count || 1);
  c.spawn(sp, ((pt.x % world.wrapW) + world.wrapW) % world.wrapW, pt.y,
    grouped ? { count: n } : undefined);
  if (sp.behaviourId === 'skimming' || sp.behaviourId === 'diving') {
    c.d.ceilY = Math.min.apply(null, sp.zones) * world.zoneH + 5;
  }
  c.d.spawnedForVignette = true;
  return c;
}

function acquireActors(v) {
  const actors = {};
  for (const id of v.needs) {
    const sp = speciesById(id);
    if (!sp) return null;
    const c = findOnScreen(id) || spawnActor(sp);
    if (!c) return null;
    c.vignette = v.id;
    actors[id] = c;
  }
  return actors;
}

function release(run) {
  for (const id in run.actors) {
    const c = run.actors[id];
    if (!c || !c.alive) continue;
    c.vignette = null;
    // Promoted actors go back to normal behaviour where they now are; spawned
    // ones simply swim off and the spawner retires them in its own time.
    c.homeX = c.x; c.homeY = c.y;
    c.alpha = 1;
    delete c.d.frame;
  }
}

// --- the visit loop ---------------------------------------------------------

function beginVisit(zone) {
  director.visitZone = zone;
  director.chosen = null;
  tries = 0;
  if (!director.enabled) return;
  const list = scenesForZone(zone);
  if (!list.length) return;
  const real = realVisitSeconds();
  visitLeft = real;
  // Skip anything that cannot be staged from here — a ceiling scene with the
  // surface already out of frame, say — rather than play it broken.
  const id = director.forced || bags[zone].nextWhere((x) => {
    const c = vignetteById(x);
    return c && (!c.can || c.can());
  }, 4);
  const v = vignetteById(id);
  if (!v || (v.can && !v.can())) return;
  // Start 3-6 s in and finish with at least 3 s to spare, in real seconds.
  const budget = real - v.duration - 3;
  if (budget < 3) return;                       // no room: skip silently
  startIn = 3 + Math.random() * Math.min(3, budget - 3);
  director.chosen = v;
}

function begin(v) {
  const actors = acquireActors(v);
  if (!actors) {
    // Could not be staged. Try the next in the bag rather than play it broken.
    if (++tries < 3 && visitLeft > v.duration + 6) {
      const id = bags[director.visitZone].nextWhere((x) => {
        const c = vignetteById(x);
        return c && (!c.can || c.can());
      }, 4);
      const nv = id && vignetteById(id);
      if (nv) { director.chosen = nv; startIn = 0.2; return; }
    }
    director.chosen = null;
    return;
  }
  director.running = { v, t: 0, actors };
  director.chosen = null;
  if (v.start) v.start(director.running);
}

function finish() {
  const run = director.running;
  if (!run) return;
  if (run.v.end) run.v.end(run);
  release(run);
  director.log.push(run.v.id);
  if (director.log.length > 5) director.log.shift();
  for (const fn of completeHooks) fn(run.v);
  director.running = null;
}

function update(dt) {
  updateFx(dt);
  // Deferred rather than dropped: a scene that overruns into the next band used
  // to cost that band its vignette outright, because the visit was marked begun
  // and never revisited.
  if (cam.zone !== director.visitZone && !director.running) beginVisit(cam.zone);
  visitLeft -= dt;

  if (director.chosen) {
    startIn -= dt;
    if (startIn <= 0) begin(director.chosen);
  }
  const run = director.running;
  if (!run) return;
  run.t += dt;
  if (run.v.update) run.v.update(run, run.t, dt);
  if (run.t >= run.v.duration) finish();
}

function draw(c) {
  const run = director.running;
  if (run && run.v.draw) run.v.draw(c, run);
  drawFx(c);
}

/** True while a payoff is on screen — the governor must not switch tier here. */
function inPeak() {
  const run = director.running;
  if (!run || !run.v.peak) return false;
  return run.t >= run.v.peak[0] && run.t <= run.v.peak[1];
}
export { inPeak };

export function trigger(id) {
  const v = vignetteById(id);
  if (!v) return false;
  if (director.running) finish();
  director.chosen = v;
  startIn = 0.05;
  visitLeft = 60;
  return true;
}

export function init() {
  for (let z = 0; z < 7; z++) {
    const list = scenesForZone(z).map((v) => v.id);
    bags[z] = createBag('vig' + z, list.length ? list : ['none']).sync();
  }
  addUpdater(update, 20);
  addLayer('vignette', 55, draw);
  addTierHold(inPeak);

  if (cfg.vignette) {
    const v = vignetteById(cfg.vignette);
    // Put the camera in the right band, or the scene has nothing to stage on.
    if (v) { director.forced = v.id; jumpToZone(v.zone); }
  }

  addInfo('vignette', 'playing', () => (director.running ? director.running.v.id.toUpperCase()
    : director.chosen ? 'IN ' + director.chosen.id.toUpperCase() : 'NONE'), { sectionOrder: 28 });
  addInfo('vignette', 'at', () => (director.running
    ? director.running.t.toFixed(1) + ' / ' + director.running.v.duration : '-'));
  addInfo('vignette', 'recent', () => (director.log.length ? director.log.join(' ').toUpperCase() : 'NONE'));
  addInfo('vignette', 'fx', () => String(fxLive()));
  addToggle('vignette', 'director', () => director.enabled, (v) => { director.enabled = v; });
  addChoice('vignette', 'trigger',
    VIGNETTES.map((v) => ({ label: v.id, value: v.id })),
    () => (director.running ? director.running.v.id : VIGNETTES[0] && VIGNETTES[0].id),
    (id) => trigger(id));
  addProvider('vignettes', 28, () => 'playing ' + (director.running ? director.running.v.id : 'none') +
    '  recent ' + (director.log.join(', ') || 'none') +
    '\\nbags ' + bags.map((b, i) => i + ':' + b.remaining()).join(' '));
}
