// Zone 6 vignettes. Everything here is a light in the dark, so each of these is
// about what the light shows and what happens when it goes out.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01 } from './base.js';
import { emit, TONE } from './fx.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'the-lure', zone: 5, name: 'The lure', duration: 9, peak: [4.4, 6.2],
  note: 'The light swings, something drifts in, and then there is no light.',
  needs: ['anglerfish', 'lanternfish'],
  start(v) {
    v.cx = cam.x + app.iw * 0.42;
    v.cy = cam.y + app.ih * 0.46;
    v.snapped = false;
  },
  update(v, t) {
    const a = v.actors.anglerfish, l = v.actors.lanternfish;
    if (a && a.alive) place(a, v.cx, v.cy, 1);
    const lx = v.cx + 9, ly = v.cy - 9;
    if (l && l.alive && l.flock) {
      const f = l.flock;
      const draw = phase(t, 1.4, 4.6);
      for (let i = 0; i < f.n; i++) {
        f.x[i] += (lx + 16 - f.x[i]) * draw * 0.05;
        f.y[i] += (ly - f.y[i]) * draw * 0.05;
      }
      if (t > 4.8) l.alpha = 1 - phase(t, 4.8, 5.2);
    }
    // The whole point: the light snaps out, and for a beat there is nothing.
    v.dark = phase(t, 4.9, 5.2) * (1 - phase(t, 5.9, 7.4));
    if (!v.snapped && t >= 4.9) {
      v.snapped = true;
      emit(lx, ly, { n: 10, spread: 6, speed: 12, life: 1.4, tone: TONE.white, gravity: 2 });
    }
  },
  draw(c, v) {
    if (!v.dark) return;
    c.fillStyle = css(P.w8, Math.min(0.94, v.dark));
    c.fillRect(0, 0, app.iw, app.ih);
  },
});

defineVignette({
  id: 'gulper-balloon', zone: 5, name: 'Gulper balloon', duration: 8, peak: [3.4, 5.2],
  note: 'The jaw inflates to several times the body, engulfs, and folds away again.',
  needs: ['gulpereel'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.46;
  },
  update(v, t) {
    const g = v.actors.gulpereel;
    if (!g || !g.alive || !g.spineX) return;
    const n = g.def.tune.segments;
    g.x += (v.cx - g.x) * 0.03;
    g.y += (v.cy - g.y) * 0.03;
    v.gape = pulse(t, 2.8, 5.4);
  },
  draw(c, v) {
    const g = v.actors.gulpereel;
    if (!g || !g.alive || !g.spineX || !v.gape) return;
    const x = screenX(g.spineX[0], 1), y = screenY(g.spineY[0], 1);
    const w = 8 + v.gape * 30, h = 6 + v.gape * 24;
    c.fillStyle = css(P.silhouette, 0.95);
    for (let i = 0; i < h; i++) {
      const u = i / h;
      const hw = w * 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.5) / 0.55, 2)));
      c.fillRect((x + g.face * 4 - hw) | 0, (y - h * 0.5 + i) | 0, Math.max(1, (hw * 2) | 0), 1);
    }
    c.fillStyle = css(P.bioLime, 0.55 * v.gape);
    c.fillRect((x + g.face * 4 - w * 0.5) | 0, (y - h * 0.5) | 0, w | 0, 1);
  },
});

defineVignette({
  id: 'beam-sweep', zone: 5, name: 'Beam sweep', duration: 9, peak: [4.0, 6.4],
  note: 'The red beam sweeps the dark and briefly finds something very large.',
  needs: ['dragonfish'],
  start(v) {
    v.cx = cam.x + app.iw * 0.24;
    v.cy = cam.y + app.ih * 0.4;
    v.shape = { x: cam.x + app.iw * 0.72, y: cam.y + app.ih * 0.6 };
  },
  update(v, t) {
    const d = v.actors.dragonfish;
    if (d && d.alive) place(d, v.cx, v.cy, 1);
    v.sweep = clamp01((t - 1.4) / 4.2);
    v.reveal = pulse(t, 4.0, 6.4);
  },
  draw(c, v) {
    const d = v.actors.dragonfish;
    if (!d || !d.alive) return;
    const x = d.sx(), y = d.sy();
    const a = -0.55 + v.sweep * 1.2;
    const prev = c.globalAlpha;
    c.globalAlpha = prev * 0.35;
    c.fillStyle = P.accRed;
    for (let i = 4; i < 150; i++) {
      const px = x + Math.cos(a) * i, py = y + Math.sin(a) * i;
      if (px > app.iw + 4) break;
      c.fillRect(px | 0, py | 0, 1, i > 90 ? 2 : 1);
    }
    c.globalAlpha = prev;
    if (v.reveal > 0.03) {
      // Whatever the beam lands on, nothing else down here could have shown it.
      const sx = screenX(v.shape.x, 1), sy = screenY(v.shape.y, 1);
      c.fillStyle = css(P.accRed, 0.22 * v.reveal);
      for (let i = 0; i < 26; i++) {
        const u = i / 25;
        const hw = 44 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.45) / 0.6, 2)));
        c.fillRect((sx - hw) | 0, (sy - 13 + i) | 0, Math.max(1, (hw * 2) | 0), 1);
      }
    }
  },
});

defineVignette({
  id: 'bigfin-drift', zone: 5, name: 'Bigfin drift', duration: 9, peak: [3.6, 6.6],
  note: 'It descends the whole screen with its arms held at perfect right angles.',
  needs: ['bigfin'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.y0 = cam.y - 20;
    v.y1 = cam.y + app.ih + 40;
  },
  update(v, t) {
    const b = v.actors.bigfin;
    if (!b || !b.alive) return;
    const k = phase(t, 0.3, 8.4);
    place(b, v.cx + Math.sin(t * 0.4) * 6, v.y0 + (v.y1 - v.y0) * k, 1);
  },
});

defineVignette({
  id: 'plankton-burst', zone: 5, name: 'Plankton burst', duration: 7, peak: [3.0, 4.6],
  note: 'Something unseen goes through the cloud and a ring of blue sparks blooms.',
  needs: ['krill'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.46;
    v.burst = false;
  },
  update(v, t) {
    const k = v.actors.krill;
    if (k && k.alive && k.flock) {
      const f = k.flock;
      const gather = phase(t, 0.3, 2.6);
      k.x = v.cx; k.y = v.cy;
      for (let i = 0; i < f.n; i++) {
        f.x[i] += (v.cx - f.x[i]) * gather * 0.05;
        f.y[i] += (v.cy - f.y[i]) * gather * 0.05;
      }
      if (!v.burst && t >= 3.0) {
        v.burst = true;
        for (let i = 0; i < f.n; i++) {
          const a = Math.random() * Math.PI * 2;
          f.vx[i] += Math.cos(a) * 70; f.vy[i] += Math.sin(a) * 70;
        }
        emit(v.cx, v.cy, { n: 30, spread: 6, speed: 46, life: 2.2, tone: TONE.cyan, gravity: 0 });
      }
    }
    v.ring = t > 3.0 ? clamp01((t - 3.0) / 1.8) : 0;
  },
  draw(c, v) {
    if (!v.ring || v.ring >= 1) return;
    const x = screenX(v.cx, 1), y = screenY(v.cy, 1);
    const r = 6 + v.ring * 52;
    c.fillStyle = css(P.bioCyan, 0.5 * (1 - v.ring));
    for (let a = 0; a < 40; a++) {
      const th = (a / 40) * Math.PI * 2;
      c.fillRect((x + Math.cos(th) * r) | 0, (y + Math.sin(th) * r * 0.8) | 0, 1, 1);
    }
  },
});
