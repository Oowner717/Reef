// The shared creature. One instance is one entity — a solo animal, or a whole
// school. Everything is poolable: spawn() reinitialises in place and update()
// allocates nothing.
import { drawSpriteC, spriteMeta } from '../sprites.js';
import { screenX, screenY } from '../camera.js';
import { app } from '../main.js';
import { createFlock } from '../boids.js';
import { shade, tint } from '../palette.js';

export const BANDS = ['motes', 'small', 'medium', 'large', 'huge', 'mythical'];
export const MAX_SPINE = 20;
export const MAX_FLOCK = 64;

export class Creature {
  constructor() {
    this.def = null;
    this.alive = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.homeX = 0; this.homeY = 0;
    this.phase = 0; this.face = 1; this.angle = 0;
    this.age = 0; this.seenFor = 0;
    this.state = 0; this.timer = 0; this.t2 = 0;
    this.scale = 1; this.alpha = 1; this.fpsMul = 1;
    this.variant = null;
    this.flock = null;
    this.spineX = null; this.spineY = null;
    this._key = null; this._keyFor = null;
    this.d = {};              // behaviour scratch, reused across spawns
    this.vignette = null;     // set while promoted into a set piece
  }

  ensureSpine() {
    if (!this.spineX) {
      this.spineX = new Float32Array(MAX_SPINE);
      this.spineY = new Float32Array(MAX_SPINE);
    }
    return this.spineX;
  }

  ensureFlock() {
    if (!this.flock) this.flock = createFlock(MAX_FLOCK);
    return this.flock;
  }

  spawn(def, x, y, opts) {
    this.def = def;
    this.alive = true;
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.vx = 0; this.vy = 0;
    this.phase = Math.random() * 4;
    this.face = opts && opts.face !== undefined ? opts.face : (Math.random() < 0.5 ? -1 : 1);
    this.angle = 0;
    this.age = 0; this.seenFor = 0;
    this.state = 0; this.timer = 0; this.t2 = 0;
    this.scale = 1; this.alpha = 1; this.fpsMul = 1;
    this.variant = def.variant || null;
    this.vignette = null;
    for (const k in this.d) delete this.d[k];
    if (opts) for (const k in opts) if (k !== 'face') this.d[k] = opts[k];
    if (def.behaviour.init) def.behaviour.init(this);
    return this;
  }

  retire() { this.alive = false; this.vignette = null; }

  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    this.phase += dt;
    this.def.behaviour.update(this, dt);
  }

  spriteKey() {
    // Cached: this is called for every live entity every frame, and building
    // the variant key by concatenation each time is a per-frame allocation.
    if (!this.variant) return this.def.sprite;
    if (this._keyFor !== this.variant) {
      this._keyFor = this.variant;
      this._key = this.def.sprite + ':' + this.variant;
    }
    return this._key;
  }

  frameIndex() {
    // A behaviour that drives its own frames (pulsing, ambush) sets d.frame.
    if (this.d.frame !== undefined) return this.d.frame;
    const d = this.def;
    const n = d.frames || 1;
    if (n <= 1) return 0;
    return Math.floor(this.phase * (d.fps || 8) * this.fpsMul) % n;
  }

  /** Where this creature is on screen right now, on its parallax layer. */
  sx() { return screenX(this.x, this.def.layer || 1); }
  sy() { return screenY(this.y, this.def.layer || 1); }

  draw(c) {
    if (!this.alive) return;
    const d = this.def;
    const a = this.alpha * hazeOf(d);
    if (a <= 0.02) return;
    const prev = c.globalAlpha;
    if (a < 1) c.globalAlpha = prev * a;
    if (d.render) d.render(this, c);
    else drawSpriteC(c, this.spriteKey(), this.frameIndex(), this.sx() | 0, this.sy() | 0, this.face < 0);
    c.globalAlpha = prev;
  }

  /** True while any part of the creature is inside the visible window. */
  onScreen(pad = 0) {
    const m = spriteMeta(this.spriteKey());
    const w = ((m ? m.w : this.def.size || 8) >> 1) + pad;
    const h = ((m ? m.h : this.def.size || 8) >> 1) + pad;
    const x = this.sx(), y = this.sy();
    return x > -w && x < app.iw + w && y > -h && y < app.ih + h;
  }
}

/**
 * Depth haze. A species on a far parallax layer is metres of water away, and
 * water is not clear: letting the column show through it is the whole of the
 * effect, because what shows through is exactly the colour the haze would be.
 * Layers nearer than the middle ground are left alone.
 */
export function hazeOf(def) {
  const L = def.layer === undefined ? 1 : def.layer;
  return L >= 1 ? 1 : Math.max(0.28, 1 - (1 - L) * 0.95);
}

// --- the species table ------------------------------------------------------
// Every species declares itself here, glossary metadata included, so the
// spawner, the vignette director and (from stage 10) the glossary all read one
// list and nothing is hand-maintained twice.

export const SPECIES = [];

export function defineSpecies(o) {
  const def = {
    frames: 2, fps: 7, layer: 1, weight: 1, band: 'small',
    depth: [0.15, 0.9], maxAlive: 1, ambient: true, kind: 'creature',
    ...o,
  };
  if (SPECIES.some((s) => s.id === def.id)) console.warn('duplicate species id', def.id);
  if (def.behaviourId === 'schooling' && def.tune) {
    // A school whose separation radius is smaller than its own sprite packs
    // into one solid blob. Floor it at roughly the sprite width, and give the
    // seed spread enough room that the flock does not start inside itself.
    const px = def.size || 8;
    def.tune.sepR = Math.max(def.tune.sepR || 0, px * 0.85);
    def.tune.spread = Math.max(def.tune.spread || 0, px * 3.2);
  }
  SPECIES.push(def);
  return def;
}

export function speciesById(id) { return SPECIES.find((s) => s.id === id) || null; }
export function speciesForZone(z) { return SPECIES.filter((s) => s.zones.indexOf(z) >= 0); }

/**
 * The standard palette map for a generated grid. `s` and `h` are the shaded
 * back and the lit dorsal rim, derived from the body colour so every species
 * is countershaded without naming two more tokens each.
 */
export function map(o) {
  return {
    '.': null, k: o.k || 'outline', b: o.b, l: o.l || o.b, d: o.d || o.b,
    f: o.f || o.b, e: o.e || 'outline', g: o.g || 'white',
    s: o.s || shade(o.b), h: o.h || tint(o.b),
  };
}

// --- pooling ----------------------------------------------------------------

/** A fixed-size pool. At the cap the oldest live entity is recycled. */
export function makePool(cap) {
  const items = [];
  for (let i = 0; i < cap; i++) items.push(new Creature());
  let cursor = 0;
  return {
    cap,
    items,
    live() { let n = 0; for (const it of items) if (it.alive) n++; return n; },
    acquire() {
      for (let i = 0; i < cap; i++) {
        const it = items[(cursor + i) % cap];
        if (!it.alive) { cursor = (cursor + i + 1) % cap; return it; }
      }
      // At the cap: recycle the oldest entity that is not currently on screen,
      // so nothing is ever seen vanishing. Only if every slot is visible does
      // the oldest overall give way.
      let victim = null, fallback = items[0];
      for (const it of items) {
        if (it.age > fallback.age) fallback = it;
        if (it.onScreen(24)) continue;
        if (!victim || it.age > victim.age) victim = it;
      }
      const out = victim || fallback;
      out.retire();
      return out;
    },
    release(it) { it.retire(); },
    clear() { for (const it of items) it.retire(); },
    forEach(fn) { for (const it of items) if (it.alive) fn(it); },
  };
}
