// Zone 2 vignettes. The reef is the busiest band, so these are staged tight and
// close: one animal doing one legible thing.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world } from '../world.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01 } from './base.js';
import { emit, TONE } from './fx.js';
import { stationPos, stationInView } from '../landmarks/reef.js';
import { floorWorldY } from '../landmarks/common.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'cleaning-station', zone: 1, can: stationInView, name: 'Cleaning station', duration: 9, peak: [4, 6.4],
  note: 'A big fish holds still with its mouth open while smaller ones work it over.',
  needs: ['grouper', 'cleanershrimp'],
  start(v) {
    const st = stationPos();
    v.px = st.x; v.py = st.y - 12;
    v.arrive = { x: v.px - 44, y: v.py - 10 };
  },
  update(v, t) {
    const g = v.actors.grouper, s = v.actors.cleanershrimp;
    const k = phase(t, 0, 2.2);
    place(g, v.arrive.x + (v.px - v.arrive.x) * k, v.arrive.y + (v.py - v.arrive.y) * k, 1);
    if (t > 6.6) {
      const out = phase(t, 6.6, 9);
      place(g, v.px + out * 60, v.py - out * 14, 1);
    }
    g.d.frame = t > 2.4 && t < 6.6 ? 1 : undefined;
    if (s && s.alive) {
      const orbit = t * 2.4;
      place(s, v.px + Math.cos(orbit) * 11, v.py + Math.sin(orbit * 1.7) * 6, 1);
      s.alpha = 1 - phase(t, 7.4, 8.6);
    }
    // Flushes pale while it is being cleaned, then dark again as it leaves.
    v.flush = pulse(t, 2.6, 6.4);
  },
  draw(c, v) {
    const g = v.actors.grouper;
    if (!g || !g.alive || !v.flush) return;
    c.fillStyle = css(P.white, v.flush * 0.30);
    c.fillRect((g.sx() - 20) | 0, (g.sy() - 9) | 0, 40, 18);
  },
});

defineVignette({
  id: 'octopus-hunt', zone: 1, name: 'Octopus hunt', duration: 9, peak: [5, 6.6],
  note: 'It flows over the rock matching every colour, then everything happens at once.',
  needs: ['octopus', 'hermitcrab'],
  start(v) {
    v.floor = floorWorldY(1);
    v.x0 = cam.x + app.iw * 0.22;
    v.prey = cam.x + app.iw * 0.62;
    v.puffed = false;
  },
  update(v, t) {
    const o = v.actors.octopus, cr = v.actors.hermitcrab;
    if (cr && cr.alive) place(cr, v.prey, v.floor - 4, -1);
    if (!o || !o.alive) return;
    const creep = phase(t, 0.4, 4.6);
    const pounce = phase(t, 4.8, 5.6);
    const x = v.x0 + (v.prey - v.x0) * (creep * 0.78 + pounce * 0.22);
    const y = v.floor - 10 - Math.sin(creep * Math.PI) * 3 - pounce * 2;
    place(o, x, y, 1);
    // Colour-matches the rock as it goes, then flares on the pounce.
    o.variant = pounce > 0.5 ? 'hot' : creep > 0.35 ? 'rock' : null;
    if (!v.puffed && t >= 5.4) {
      v.puffed = true;
      emit(v.prey, v.floor - 3, { n: 20, spread: 12, speed: 18, up: 4, life: 2.6, tone: TONE.sand, gravity: 3 });
      if (cr && cr.alive) cr.alpha = 0;
    }
  },
  end(v) { const o = v.actors.octopus; if (o) o.variant = null; },
});

defineVignette({
  id: 'parrotfish-bite', zone: 1, name: 'Parrotfish bite', duration: 7, peak: [3, 4.6],
  note: 'It takes a bite out of the reef and leaves a plume of new sand behind it.',
  needs: ['parrotfish'],
  start(v) {
    v.floor = floorWorldY(1);
    v.cx = cam.x + app.iw * 0.5;
    v.bit = false;
  },
  update(v, t) {
    const p = v.actors.parrotfish;
    if (!p || !p.alive) return;
    const lunge = pulse(t, 2.4, 3.4);
    place(p, v.cx - 10 + lunge * 8, v.floor - 12 + lunge * 4, 1);
    p.d.frame = lunge > 0.4 ? 1 : undefined;
    if (!v.bit && t >= 3.0) {
      v.bit = true;
      emit(v.cx + 4, v.floor - 12, { n: 10, spread: 5, speed: 22, up: 4, life: 1.4, tone: TONE.coral, gravity: 20 });
      emit(v.cx - 16, v.floor - 12, { n: 22, spread: 6, speed: 14, up: 2, life: 4.2, tone: TONE.sand, gravity: 1.2 });
    }
  },
});

defineVignette({
  id: 'moray-strike', zone: 1, name: 'Moray strike', duration: 8, peak: [4, 5.2],
  note: 'The head tracks across the frame, then half the eel comes out of the hole.',
  needs: ['moray', 'damselfish'],
  start(v) {
    const m = v.actors.moray;
    v.hx = m.homeX; v.hy = m.homeY;
    v.dir = 1;
  },
  update(v, t) {
    const m = v.actors.moray, d = v.actors.damselfish;
    if (!m || !m.alive) return;
    const track = clamp01((t - 0.4) / 3.4);
    const lunge = pulse(t, 4.0, 5.2);
    const out = 6 + track * 8 + lunge * 26;
    m.homeX = v.hx; m.homeY = v.hy;
    m.x = v.hx + out * v.dir;
    m.y = v.hy - track * 4 + Math.sin(t * 3) * 0.8;
    m.d.out = out;
    if (d && d.alive && d.flock) {
      const f = d.flock;
      const px = v.hx + 34 * v.dir, py = v.hy - 8;
      for (let i = 0; i < f.n; i++) {
        if (t < 4.0) { f.x[i] += (px - f.x[i]) * 0.02; f.y[i] += (py - f.y[i]) * 0.02; }
        else { const s = 1 + lunge * 5; f.vx[i] += (f.x[i] - px) * 0.02 * s; f.vy[i] += (f.y[i] - py) * 0.02 * s; }
      }
    }
  },
});

defineVignette({
  id: 'coral-spawning', zone: 1, name: 'Coral spawning', duration: 10, peak: [4.5, 7.5],
  note: 'Every head lets go at the same moment and the whole reef exhales upward.',
  needs: [],
  start(v) {
    v.floor = floorWorldY(1);
    v.next = 0;
  },
  update(v, t, dt) {
    if (t < 2.2 || t > 7.6) return;
    v.next -= dt;
    if (v.next > 0) return;
    v.next = 0.12;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = cam.x + app.iw * ((i + Math.random()) / n);
      emit(x, v.floor - 8 - Math.random() * 6, {
        n: 3, spread: 4, speed: 3, up: 12, life: 6.5,
        tone: TONE.pink, gravity: -3.2, size: 1,
      });
    }
  },
});
