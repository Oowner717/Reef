// Zone 4 vignettes. The band is empty on purpose, so each of these is one very
// large animal doing one very legible thing.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01, worldAt } from './base.js';
import { emit, TONE } from './fx.js';
import { findAll } from './director.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'sailfish-run', zone: 3, name: 'Sailfish run', duration: 9, peak: [4.6, 6.4],
  note: 'The sail comes up, the bait goes tight, and then it goes straight through.',
  needs: ['sailfish', 'silverside'],
  start(v) {
    v.cx = cam.x + app.iw * 0.55;
    v.cy = cam.y + app.ih * 0.45;
    v.slashed = false;
  },
  update(v, t) {
    const f = v.actors.sailfish, s = v.actors.silverside;
    const circle = phase(t, 0.6, 4.4);
    const slash = phase(t, 4.6, 5.6);
    if (f && f.alive) {
      const a = -Math.PI * 0.5 + circle * Math.PI * 2.2;
      const r = 52 - circle * 16;
      const x = slash > 0 ? v.cx - 90 + slash * 200 : v.cx + Math.cos(a) * r;
      const y = slash > 0 ? v.cy : v.cy + Math.sin(a) * r * 0.6;
      place(f, x, y, slash > 0 ? 1 : (Math.cos(a + 0.6) > 0 ? 1 : -1));
      v.sail = phase(t, 0.8, 2.2) * (1 - phase(t, 7.0, 8.4));
    }
    if (s && s.alive && s.flock) {
      const fl = s.flock;
      const tighten = circle * (1 - phase(t, 5.0, 7.4));
      s.x = v.cx; s.y = v.cy;
      for (let i = 0; i < fl.n; i++) {
        const a = (i / fl.n) * Math.PI * 2 + t * 0.7;
        const r = 30 - tighten * 18;
        fl.x[i] += (v.cx + Math.cos(a) * r - fl.x[i]) * tighten * 0.14;
        fl.y[i] += (v.cy + Math.sin(a) * r - fl.y[i]) * tighten * 0.14;
        fl.vx[i] *= 1 - tighten * 0.5; fl.vy[i] *= 1 - tighten * 0.5;
      }
      if (!v.slashed && t >= 5.0) {
        v.slashed = true;
        for (let i = 0; i < fl.n; i++) {
          const a = Math.random() * Math.PI * 2;
          fl.vx[i] += Math.cos(a) * 90; fl.vy[i] += Math.sin(a) * 60;
        }
        emit(v.cx, v.cy, { n: 20, spread: 22, speed: 40, life: 1.1, tone: TONE.silver, gravity: 0 });
      }
    }
  },
  draw(c, v) {
    const f = v.actors.sailfish;
    if (!f || !f.alive || !v.sail) return;
    const x = f.sx(), y = f.sy();
    c.fillStyle = css(P.bioViolet, 0.7 * v.sail);
    for (let i = -18; i < 14; i++) {
      const u = (i + 18) / 32;
      const h = Math.sin(u * Math.PI) * 15 * v.sail;
      c.fillRect((x + i * -f.face) | 0, (y - 5 - h) | 0, 1, h | 0);
    }
  },
});

defineVignette({
  id: 'whaleshark-pass', zone: 3, name: 'Whale shark pass', duration: 10, peak: [4.5, 7],
  note: 'It crosses with its mouth open and the bait ball opens to let it through.',
  needs: ['whaleshark', 'silverside'],
  start(v) {
    v.y = cam.y + app.ih * 0.46;
    v.from = cam.x - 110;
    v.to = cam.x + app.iw + 110;
    v.dir = Math.random() < 0.5 ? 1 : -1;
    if (v.dir < 0) { const a = v.from; v.from = v.to; v.to = a; }
    v.bx = cam.x + app.iw * 0.5;
  },
  update(v, t) {
    const w = v.actors.whaleshark, s = v.actors.silverside;
    if (w && w.alive) {
      const k = phase(t, 0.2, 9.2);
      place(w, v.from + (v.to - v.from) * k, v.y + Math.sin(t * 0.4) * 4, v.dir);
    }
    if (s && s.alive && s.flock && w && w.alive) {
      const fl = s.flock;
      s.x = v.bx; s.y = v.y;
      for (let i = 0; i < fl.n; i++) {
        // Parts around the mouth and closes again behind it.
        const dx = fl.x[i] - w.x, dy = fl.y[i] - w.y;
        const d = Math.hypot(dx, dy);
        if (d < 76) {
          const push = (1 - d / 76) * 70;
          fl.vx[i] += (dx / (d || 1)) * push * 0.06;
          fl.vy[i] += (dy / (d || 1)) * push * 0.09;
        }
      }
    }
  },
});

defineVignette({
  id: 'manta-roll', zone: 3, name: 'Manta barrel roll', duration: 8, peak: [3.6, 5.2],
  note: 'A slow backward loop through the plankton, white underside at the top.',
  needs: ['manta'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.46;
    v.seeded = false;
  },
  update(v, t, dt) {
    const m = v.actors.manta;
    if (!v.seeded) {
      v.seeded = true;
      for (let i = 0; i < 8; i++) {
        emit(v.cx + (Math.random() - 0.5) * 70, v.cy + (Math.random() - 0.5) * 40,
          { n: 4, spread: 16, speed: 2, life: 8, tone: TONE.white, gravity: 0.4, size: 1 });
      }
    }
    if (!m || !m.alive) return;
    const roll = phase(t, 2.2, 5.6);
    const a = -Math.PI * 0.5 + roll * Math.PI * 2;
    place(m, v.cx + Math.cos(a) * 34, v.cy + Math.sin(a) * 26, 1);
    // Frame 1 is the widest wing pose — the underside at the apex of the loop.
    m.d.frame = roll > 0.35 && roll < 0.7 ? 1 : undefined;
  },
});

defineVignette({
  id: 'hammerhead-column', zone: 3, name: 'Hammerhead column', duration: 9, peak: [4.4, 6.6],
  note: 'The haze resolves into a stack of them, holding station, then it is gone.',
  needs: ['hammerhead'],
  start(v) {
    v.list = [];
    v.sx = app.iw * (0.3 + Math.random() * 0.4);
    v.sy = app.ih * 0.5;
  },
  update(v, t) {
    findAll('hammerhead', v.list);
    if (!v.list.length) return;
    const stack = phase(t, 1.0, 4.2) * (1 - phase(t, 6.8, 8.6));
    for (let i = 0; i < v.list.length; i++) {
      const h = v.list[i];
      // Hammerheads live on the far haze layer, so the target is converted out
      // of screen space into that layer's own coordinates.
      const w = worldAt(v.sx, v.sy + (i - (v.list.length - 1) / 2) * 22, h.def.layer);
      h.x += (w.x - h.x) * stack * 0.05;
      h.y += (w.y - h.y) * stack * 0.07;
      if (stack > 0.7) h.face = 1;
    }
  },
});
