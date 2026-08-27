// The twelve movement types. The movement is what sells the species, so no two
// share a core: each one is a different shape of motion, not a tuned wander.
import { app } from './main.js';
import { drawSpriteC } from './sprites.js';
import { screenX, screenY } from './camera.js';
import { updateFlock, driftTarget, seedFlock } from './boids.js';

const TAU = Math.PI * 2;
function wrapAngle(a) { return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; }
function rnd() { return Math.random(); }

// --- 1 · schooling ----------------------------------------------------------

export const schooling = {
  id: 'schooling',
  init(c) {
    const t = c.def.tune, f = c.ensureFlock();
    const n = c.d.count || (t.min + Math.round(rnd() * (t.max - t.min)));
    seedFlock(f, n, c.x, c.y, t.spread, t.speed, rnd);
  },
  update(c, dt) {
    const t = c.def.tune, f = c.flock;
    c.x += t.travel * c.face * dt;
    c.y += Math.sin(c.phase * 0.23) * t.rise * dt;
    driftTarget(f, dt, c.x, c.y, t.swirl, t.swirl * 0.45, t.swirlRate);
    updateFlock(f, dt, t, app.frame);
  },
};

export function renderFlock(c, ctx) {
  const f = c.flock, d = c.def, layer = d.layer || 1;
  if (!f) return;
  const key = c.spriteKey();
  const n = d.frames || 1;
  const prev = ctx.globalAlpha;
  if (c.alpha < 1) ctx.globalAlpha = prev * c.alpha;
  for (let i = 0; i < f.n; i++) {
    const x = screenX(f.x[i], layer), y = screenY(f.y[i], layer);
    if (x < -12 || x > app.iw + 12 || y < -12 || y > app.ih + 12) continue;
    const fr = n > 1 ? (Math.floor(f.ph[i] * (d.fps || 8)) % n) : 0;
    drawSpriteC(ctx, key, fr, x | 0, y | 0, f.vx[i] < 0);
  }
  ctx.globalAlpha = prev;
}

// --- 2 · cruising -----------------------------------------------------------

export const cruising = {
  id: 'cruising',
  init(c) { c.d.a = c.face > 0 ? 0 : Math.PI; c.d.w = rnd() * 20; },
  update(c, dt) {
    const t = c.def.tune;
    c.d.w += dt;
    const base = c.face > 0 ? 0 : Math.PI;
    const target = base + Math.sin(c.d.w * t.turnRate) * t.turnAmp
      + Math.sin(c.d.w * t.turnRate * 0.41) * t.turnAmp * 0.5;
    c.d.a += wrapAngle(target - c.d.a) * Math.min(1, t.agility * dt);
    const sp = t.speed * (1 + Math.sin(c.d.w * 0.3) * (t.surge || 0));
    c.vx = Math.cos(c.d.a) * sp;
    c.vy = Math.sin(c.d.a) * sp * (t.vertical ?? 0.18);
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.fpsMul = 0.6 + Math.abs(sp) / t.speed * 0.6;
  },
};

// --- 3 · undulating ---------------------------------------------------------

export const undulating = {
  id: 'undulating',
  init(c) {
    const t = c.def.tune;
    c.ensureSpine();
    for (let i = 0; i < t.segments; i++) {
      c.spineX[i] = c.x - i * t.segLen * c.face;
      c.spineY[i] = c.y;
    }
    c.d.w = rnd() * 10;
  },
  update(c, dt) {
    const t = c.def.tune;
    c.d.w += dt;
    // The head swims a sine path; every segment then chases the one ahead at a
    // fixed distance, which is what makes the whole body ripple.
    c.x += t.speed * c.face * dt;
    c.y += Math.sin(c.d.w * t.waveRate) * t.waveAmp * dt;
    c.spineX[0] = c.x; c.spineY[0] = c.y;
    for (let i = 1; i < t.segments; i++) {
      const dx = c.spineX[i - 1] - c.spineX[i];
      const dy = c.spineY[i - 1] - c.spineY[i];
      const d = Math.hypot(dx, dy) || 1e-6;
      const k = (d - t.segLen) / d;
      c.spineX[i] += dx * k;
      c.spineY[i] += dy * k;
      // A little lateral lag so the ripple travels down the body.
      c.spineY[i] += Math.sin(c.d.w * t.waveRate - i * t.lag) * t.ripple * dt;
    }
  },
};

export function renderChain(c, ctx) {
  const t = c.def.tune, d = c.def, layer = d.layer || 1;
  const key = c.spriteKey();
  const prev = ctx.globalAlpha;
  if (c.alpha < 1) ctx.globalAlpha = prev * c.alpha;
  for (let i = t.segments - 1; i >= 0; i--) {
    const x = screenX(c.spineX[i], layer), y = screenY(c.spineY[i], layer);
    const fr = i === 0 ? 0 : (d.frames > 1 ? 1 + (i % (d.frames - 1)) : 0);
    drawSpriteC(ctx, key, fr, x | 0, y | 0, c.face < 0);
  }
  ctx.globalAlpha = prev;
}

// --- 4 · flapping -----------------------------------------------------------

export const flapping = {
  id: 'flapping',
  init(c) { c.d.cy = rnd(); },
  update(c, dt) {
    const t = c.def.tune;
    c.d.cy += dt / t.period;
    const u = c.d.cy % 1;
    const beating = u < t.beat;
    // Height is lost on the glide and won back on the beat — the tell.
    c.vx = t.speed * c.face;
    c.vy = beating ? -t.lift * Math.sin(u / t.beat * Math.PI) : t.sink;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.fpsMul = beating ? 1.8 : 0.35;
  },
};

// --- 5 · pulsing ------------------------------------------------------------

export const pulsing = {
  id: 'pulsing',
  init(c) { c.d.cy = rnd(); c.d.wob = rnd() * 10; },
  update(c, dt) {
    const t = c.def.tune;
    c.d.cy += dt / t.period;
    c.d.wob += dt;
    const u = c.d.cy % 1;
    const thrust = u < t.contract ? Math.sin(u / t.contract * Math.PI) : 0;
    c.vy += (-t.thrust * thrust - c.vy * t.drag) * dt;
    c.vx = Math.sin(c.d.wob * 0.4) * t.wander;
    c.x += c.vx * dt;
    c.y += (c.vy + t.sink) * dt;
    c.fpsMul = 0;
    c.d.frame = u < t.contract ? 1 : (u < t.contract * 2.2 ? 2 : 0);
  },
};

// --- 6 · jetting ------------------------------------------------------------

export const jetting = {
  id: 'jetting',
  init(c) { c.state = 0; c.timer = 0.5 + rnd() * 2; },
  update(c, dt) {
    const t = c.def.tune;
    c.timer -= dt;
    if (c.state === 0) {
      const k = Math.pow(0.05, dt);
      c.vx *= k; c.vy *= k;
      if (c.timer <= 0) {
        c.state = 1;
        c.timer = t.burst;
        const a = (rnd() - 0.5) * t.spread + (c.face > 0 ? 0 : Math.PI);
        c.vx = Math.cos(a) * t.speed;
        c.vy = Math.sin(a) * t.speed * 0.5;
        c.face = c.vx >= 0 ? 1 : -1;
      }
    } else if (c.timer <= 0) {
      c.state = 0;
      c.timer = t.rest * (0.6 + rnd() * 0.8);
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.fpsMul = c.state === 1 ? 2.5 : 0.2;
  },
};

// --- 7 · hovering -----------------------------------------------------------

export const hovering = {
  id: 'hovering',
  init(c) { c.d.w = rnd() * 10; c.timer = 1 + rnd() * 3; },
  update(c, dt) {
    const t = c.def.tune;
    c.d.w += dt;
    c.x = c.homeX + Math.sin(c.d.w * t.rate * 0.63) * t.sway;
    c.y = c.homeY + Math.sin(c.d.w * t.rate) * t.bob;
    c.timer -= dt;
    if (c.timer <= 0) { c.timer = t.faceEvery * (0.5 + rnd()); c.face = rnd() < 0.5 ? -1 : 1; }
    c.fpsMul = 0.5;
  },
};

// --- 8 · grazing ------------------------------------------------------------

export const grazing = {
  id: 'grazing',
  init(c) { c.state = 0; c.timer = rnd() * 2; c.d.travelled = 0; },
  update(c, dt) {
    const t = c.def.tune;
    c.timer -= dt;
    if (c.state === 0) {
      c.x += t.speed * c.face * dt;
      c.d.travelled += t.speed * dt;
      c.y = c.homeY + Math.sin(c.x * 0.3) * (t.follow || 0);
      if (c.timer <= 0) { c.state = 1; c.timer = t.biteTime; }
      if (c.d.travelled > t.range) { c.d.travelled = 0; c.face = -c.face; }
    } else if (c.timer <= 0) {
      c.state = 0; c.timer = t.biteEvery * (0.5 + rnd());
      if (t.onBite) t.onBite(c);
    }
    c.fpsMul = c.state === 1 ? 2 : 0.4;
  },
};

// --- 9 · skimming -----------------------------------------------------------

export const skimming = {
  id: 'skimming',
  init(c) { c.state = 0; c.timer = 2 + rnd() * 6; c.d.w = rnd() * 10; },
  update(c, dt) {
    const t = c.def.tune;
    const ceil = c.d.ceilY || 0;
    c.d.w += dt;
    c.x += t.speed * c.face * dt;
    c.timer -= dt;
    if (c.state === 0) {
      c.y = ceil + t.depth + Math.sin(c.d.w * 2.2) * 1.5;
      if (c.timer <= 0 && t.breaks) { c.state = 1; c.timer = t.breakTime; }
    } else {
      // Arc up through the ceiling and back — seen only from below.
      const u = 1 - c.timer / t.breakTime;
      c.y = ceil + t.depth - Math.sin(u * Math.PI) * t.breakHeight;
      if (c.timer <= 0) { c.state = 0; c.timer = 4 + rnd() * 8; }
    }
    c.fpsMul = 1.6;
  },
};

// --- 10 · ambush ------------------------------------------------------------

export const ambush = {
  id: 'ambush',
  init(c) { c.state = 0; c.timer = 1 + rnd() * 4; c.d.out = 0; },
  update(c, dt) {
    const t = c.def.tune;
    c.timer -= dt;
    if (c.state === 0) {                       // hidden
      c.d.out += (0 - c.d.out) * Math.min(1, 6 * dt);
      if (c.timer <= 0) { c.state = 1; c.timer = t.emerge; }
    } else if (c.state === 1) {                // emerging
      c.d.out += (t.reach - c.d.out) * Math.min(1, 4 * dt);
      if (c.timer <= 0) { c.state = 2; c.timer = t.watch; }
    } else if (c.state === 2) {                // watching
      if (c.timer <= 0) { c.state = 3; c.timer = t.withdraw; }
    } else {                                   // withdrawing
      c.d.out += (0 - c.d.out) * Math.min(1, 3 * dt);
      if (c.timer <= 0) { c.state = 0; c.timer = t.hide * (0.5 + rnd()); }
    }
    c.x = c.homeX + c.d.out * c.face;
    c.y = c.homeY + Math.sin(c.phase * 1.4) * 0.6;
    c.fpsMul = c.state === 2 ? 0.8 : 0.3;
  },
};

// --- 11 · falling -----------------------------------------------------------

export const falling = {
  id: 'falling',
  init(c) { c.d.w = rnd() * 10; c.angle = rnd() * TAU; },
  update(c, dt) {
    const t = c.def.tune;
    c.d.w += dt;
    c.y += t.sink * dt;
    c.x += Math.sin(c.d.w * t.driftRate) * t.drift * dt;
    c.angle += t.spin * dt;
    c.fpsMul = 0.3;
  },
};

// --- 12 · diving ------------------------------------------------------------

export const diving = {
  id: 'diving',
  init(c) { c.state = 0; c.timer = 0; c.d.ceilY = c.d.ceilY || 0; },
  update(c, dt) {
    const t = c.def.tune;
    const ceil = c.d.ceilY;
    if (c.state === 0) {                       // steep entry from above
      c.vy = t.diveSpeed;
      c.vx = t.diveSpeed * 0.35 * c.face;
      c.y += c.vy * dt; c.x += c.vx * dt;
      if (c.y > ceil + t.depth) { c.state = 1; c.timer = t.hold; if (t.onEnter) t.onEnter(c); }
    } else if (c.state === 1) {                // hard decelerate, grab
      const k = Math.pow(0.02, dt);
      c.vy *= k; c.vx *= k;
      c.y += c.vy * dt; c.x += c.vx * dt;
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 2; if (t.onGrab) t.onGrab(c); }
    } else {                                   // rise and exit through the ceiling
      c.vy += (-t.riseSpeed - c.vy) * Math.min(1, 3 * dt);
      c.y += c.vy * dt; c.x += c.vx * dt;
      if (c.y < ceil - t.exitAbove) { if (t.onExit) t.onExit(c); c.retire(); }
    }
    c.fpsMul = c.state === 0 ? 0.6 : 2;
  },
};

export const BEHAVIOURS = {
  schooling, cruising, undulating, flapping, pulsing, jetting,
  hovering, grazing, skimming, ambush, falling, diving,
};
export const BEHAVIOUR_IDS = Object.keys(BEHAVIOURS);
