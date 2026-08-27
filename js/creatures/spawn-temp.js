// TEMPORARY. Stage 5's hard-coded population so the zones can be looked at.
// Stage 7 deletes this file and replaces it with js/spawner.js.
import { addUpdater, addLayer, layer, app } from '../main.js';
import { world, dailySeed, rng } from '../world.js';
import { cam } from '../camera.js';
import { cfg } from '../config.js';
import { SPECIES, makePool } from './base.js';
import { addInfo } from '../debug/registry.js';
import { addProvider } from '../debug/diagnostics.js';

const pool = makePool(220);
let built = false;

function randint(v, r) {
  if (typeof v === 'number') return v;
  if (!v) return 1;
  return v[0] + Math.round(r() * (v[1] - v[0]));
}

function populate() {
  pool.clear();
  const r = rng(dailySeed() + 77);
  for (const s of SPECIES) {
    if (!s.ambient) continue;
    const grouped = s.behaviourId === 'schooling';
    // The world wraps at four screen widths, so a single individual is only in
    // frame a quarter of the time. Spread copies evenly instead of randomly.
    const base = grouped ? Math.max(1, s.maxAlive || 1) : Math.max(1, randint(s.count, r));
    const entities = Math.max(1, Math.min(10, Math.round(base * 2 * cfg.density)));
    for (let i = 0; i < entities; i++) {
      const zone = s.zones[0];
      const y = (zone + s.depth[0] + r() * (s.depth[1] - s.depth[0])) * world.zoneH;
      const x = ((i + r() * 0.85) / entities) * world.wrapW;
      const c = pool.acquire();
      c.spawn(s, x, y, grouped ? { count: randint(s.count, r) } : undefined);
      c.face = r() < 0.5 ? -1 : 1;
      if (s.behaviourId === 'skimming' || s.behaviourId === 'diving') {
        c.d.ceilY = zone * world.zoneH + 5;
      }
    }
  }
  built = true;
}

function update(dt) {
  if (!built) populate();
  const near = app.ih * 2.2;
  pool.forEach((c) => {
    if (Math.abs(c.y - cam.centre) > near) return;
    c.update(dt);
    const s = c.def;
    if (s.variants) {
      const k = Math.floor(c.age / s.variantEvery) % s.variants.length;
      c.variant = s.variants[k];
    }
    // Keep everything inside its own band and inside the wrapped world.
    const zone = s.zones[0];
    const top = (zone + s.depth[0] * 0.8) * world.zoneH;
    const bot = (zone + Math.min(1, s.depth[1] * 1.05)) * world.zoneH;
    if (c.y < top) { c.y = top; c.vy = Math.abs(c.vy); }
    if (c.y > bot) { c.y = bot; c.vy = -Math.abs(c.vy); }
    c.homeY = Math.max(top, Math.min(bot, c.homeY));
    c.x = ((c.x % world.wrapW) + world.wrapW) % world.wrapW;
    if (c.flock) {
      for (let i = 0; i < c.flock.n; i++) {
        if (c.flock.y[i] < top) { c.flock.y[i] = top; c.flock.vy[i] = Math.abs(c.flock.vy[i]); }
        if (c.flock.y[i] > bot) { c.flock.y[i] = bot; c.flock.vy[i] = -Math.abs(c.flock.vy[i]); }
      }
    }
  });
}

function draw(c) {
  pool.forEach((e) => { if (e.onScreen(24)) e.draw(c); });
}

export function poolStats() { return { live: pool.live(), cap: pool.cap }; }

export function init() {
  populate();
  addInfo('entities', 'creatures', () => pool.live() + ' / ' + pool.cap, { sectionOrder: 25 });
  addInfo('entities', 'species defined', () => String(SPECIES.length));
  addProvider('entities', 25, () => 'pool ' + pool.live() + '/' + pool.cap +
    '  species ' + SPECIES.length + '  density ' + cfg.density);
  addUpdater(update, 10);
  addLayer('creatures', 45, draw);
  const tf = layer('testfish');
  if (tf) tf.enabled = false;   // the stage 1 placeholder has done its job
}
