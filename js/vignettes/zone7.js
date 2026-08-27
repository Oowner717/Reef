// Zone 7 vignettes. Warm, close to the floor, and lit from below.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01, softGlow } from './base.js';
import { emit, TONE } from './fx.js';
import { smokerAt, whaleFall, floorScreenY, ventFx } from '../landmarks/vents.js';
import { findAll } from './director.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'smoker-billow', zone: 6, name: 'Smoker billow', duration: 8, peak: [3.0, 5.4],
  note: 'The chimney belches and a dense dark plume rolls up, lit orange from below.',
  needs: [],
  start(v) {
    v.i = (Math.random() * 3) | 0;
    ventFx.billowIndex = v.i;
    v.seeded = false;
  },
  update(v, t) {
    ventFx.billowIndex = v.i;
    ventFx.billow = pulse(t, 1.4, 6.4) * 1.6;
    const s = smokerAt(v.i);
    if (!s) return;
    if (!v.seeded && t > 1.6) {
      v.seeded = true;
      const x = cam.x + s.at * app.iw;
      const y = cam.y + floorScreenY(s.at * app.iw) - s.h;
      emit(x, y, { n: 34, spread: 12, speed: 10, up: 30, life: 6.4, tone: TONE.smoke, gravity: -6, size: 3 });
    }
  },
  end() { ventFx.billow = 0; },
});

defineVignette({
  id: 'worm-retract', zone: 6, name: 'Worm retract', duration: 8, peak: [2.8, 4.8],
  note: 'A shadow crosses and the whole bed snaps shut in a travelling ripple.',
  needs: ['tubeworm'],
  start(v) {
    v.beds = [];
    v.dir = Math.random() < 0.5 ? 1 : -1;
  },
  update(v, t) {
    findAll('tubeworm', v.beds);
    const k = clamp01((t - 1.4) / 2.6);
    const front = v.dir > 0 ? -30 + k * (app.iw + 60) : app.iw + 30 - k * (app.iw + 60);
    const strength = pulse(t, 1.4, 6.6);
    for (const b of v.beds) {
      const x = b.sx();
      const hit = Math.max(0, 1 - Math.abs(x - front) / 54) * strength;
      b.d.retract = Math.max(hit, (b.d.retract || 0) * 0.90);
    }
    v.front = front;
    v.shadow = strength;
  },
  draw(c, v) {
    if (!v.shadow || v.shadow < 0.05) return;
    // The shadow that caused it, crossing above the bed.
    for (let i = 3; i >= 1; i--) {
      const k = i / 3;
      c.fillStyle = css(P.smoker, 0.16 * v.shadow * (1 - k * 0.5));
      c.fillRect((v.front - 14 * (1 + k)) | 0, 0, (28 * (1 + k)) | 0, app.ih);
    }
  },
  end(v) { for (const b of v.beds) b.d.retract = 0; },
});

defineVignette({
  id: 'hagfish-knot', zone: 6, name: 'Hagfish knot', duration: 8, peak: [3.4, 5.6],
  note: 'It ties itself into a knot and slides the knot down its own body.',
  needs: ['hagfish'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.55;
    v.slimed = false;
  },
  update(v, t) {
    const h = v.actors.hagfish;
    if (!h || !h.alive || !h.spineX) return;
    const n = h.def.tune.segments;
    h.x += (v.cx - h.x) * 0.05;
    h.y += (v.cy - h.y) * 0.05;
    const knot = phase(t, 1.6, 3.4) * (1 - phase(t, 6.0, 7.4));
    const slide = clamp01((t - 3.4) / 2.4);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      // A loop travelling from the head down to the tail.
      const near = Math.max(0, 1 - Math.abs(u - slide) * 3.2) * knot;
      const a = u * Math.PI * 2 * 1.4 + t * 1.6;
      const r = 7 * near;
      const bx = v.cx + (u - 0.5) * 26;
      const by = v.cy;
      h.spineX[i] += (bx + Math.cos(a) * r - h.spineX[i]) * 0.25;
      h.spineY[i] += (by + Math.sin(a) * r - h.spineY[i]) * 0.25;
    }
    if (!v.slimed && t > 4.4) {
      v.slimed = true;
      emit(v.cx, v.cy, { n: 22, spread: 16, speed: 9, life: 4.4, tone: TONE.white, gravity: 0.6, size: 2 });
    }
  },
});

defineVignette({
  id: 'backlit-dumbo', zone: 6, name: 'Backlit dumbo', duration: 8, peak: [3.4, 5.4],
  note: 'It flaps straight through the vent glow and its ear fins turn translucent.',
  needs: ['dumbo'],
  start(v) {
    const s = smokerAt(1) || smokerAt(0);
    v.gx = cam.x + (s ? s.at * app.iw : app.iw * 0.5);
    v.y = cam.y + app.ih * 0.5;
    v.from = v.gx - 90; v.to = v.gx + 90;
  },
  update(v, t) {
    const d = v.actors.dumbo;
    if (!d || !d.alive) return;
    const k = phase(t, 0.3, 7.4);
    place(d, v.from + (v.to - v.from) * k, v.y + Math.sin(t * 1.3) * 7, 1);
    v.glow = 1 - Math.min(1, Math.abs(d.x - v.gx) / 40);
  },
  draw(c, v) {
    const d = v.actors.dumbo;
    if (!d || !d.alive || !v.glow || v.glow < 0.05) return;
    const x = d.sx(), y = d.sy();
    softGlow(c, x, y, 20, 13, P.ventWarm, 0.85 * v.glow);
    c.fillStyle = css(P.palePink, 0.55 * v.glow);
    c.fillRect((x - 11) | 0, (y - 4) | 0, 6, 5);
    c.fillRect((x + 6) | 0, (y - 4) | 0, 6, 5);
  },
});

defineVignette({
  id: 'whalefall-stir', zone: 6, name: 'Whale-fall stir', duration: 9, peak: [4.0, 6.4],
  note: 'The mat on the bones brightens, the brittle stars converge, and a rib settles.',
  needs: ['brittlestar'],
  start(v) {
    const f = whaleFall();
    v.cx = cam.x + (f ? f.at * app.iw : app.iw * 0.5);
    v.stars = [];
    v.settled = false;
  },
  update(v, t) {
    ventFx.stir = pulse(t, 1.2, 7.0);
    findAll('brittlestar', v.stars);
    const pull = phase(t, 1.4, 5.2);
    const y = cam.y + floorScreenY(v.cx - cam.x) - 14;
    for (let i = 0; i < v.stars.length; i++) {
      const s = v.stars[i];
      const tx = v.cx + ((i + 0.5) / Math.max(1, v.stars.length) - 0.5) * 90;
      s.x += (tx - s.x) * pull * 0.04;
      s.y += (y - s.y) * pull * 0.04;
      s.homeX = s.x; s.homeY = s.y;
    }
    if (!v.settled && t > 4.4) {
      v.settled = true;
      emit(v.cx + 24, y + 10, { n: 24, spread: 14, speed: 11, up: 3, life: 4.6, tone: TONE.darkSand, gravity: 2 });
    }
  },
  end() { ventFx.stir = 0; },
});
