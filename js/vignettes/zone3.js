// Zone 3 vignettes. Staged against the wall and the wreck, which are the two
// things the eye is already on in this band.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world } from '../world.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01 } from './base.js';
import { emit, TONE } from './fx.js';
import { wreckPos, wreckScreen, wallSide } from '../landmarks/dropoff.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

/** World coordinates of a point near the wreck, from its screen anchor. */
function nearWreck(dx, dy) {
  const w = wreckScreen();
  return { x: cam.x + w.x + dx, y: wreckPos().y + dy };
}

defineVignette({
  id: 'barracuda-strike', zone: 2, name: 'Barracuda strike', duration: 8, peak: [3.4, 4.4],
  note: 'Motionless, then across the whole frame in two frames, then motionless again.',
  needs: ['barracuda', 'batfish'],
  start(v) {
    v.y = cam.y + app.ih * 0.44;
    v.from = cam.x - 20;
    v.to = cam.x + app.iw + 20;
    v.mid = cam.x + app.iw * 0.55;
    v.hit = false;
  },
  update(v, t) {
    const b = v.actors.barracuda, s = v.actors.batfish;
    if (s && s.alive) { s.x += (v.mid - s.x) * 0.03; s.y += (v.y - s.y) * 0.03; }
    if (!b || !b.alive) return;
    if (t < 3.2) {
      place(b, v.from + 26, v.y + Math.sin(t) * 1.2, 1);
      b.alpha = 1;
    } else if (t < 3.9) {
      // The strike itself: two blurred frames across the whole screen.
      const k = clamp01((t - 3.2) / 0.7);
      place(b, v.from + (v.to - v.from) * k, v.y, 1);
      b.alpha = 0.55;
    } else {
      const back = phase(t, 4.2, 6.4);
      place(b, v.to - (v.to - v.mid - 40) * back, v.y - 6 * back, -1);
      b.alpha = 1;
    }
    if (!v.hit && t >= 3.5) {
      v.hit = true;
      if (s && s.flock) {
        const f = s.flock;
        for (let i = 0; i < f.n; i++) {
          const a = Math.random() * Math.PI * 2;
          f.vx[i] += Math.cos(a) * 60;
          f.vy[i] += Math.sin(a) * 40;
        }
      }
      emit(v.mid, v.y, { n: 14, spread: 14, speed: 30, life: 0.9, tone: TONE.silver, gravity: 0 });
    }
  },
});

defineVignette({
  id: 'wreck-exhale', zone: 2, name: 'Wreck exhale', duration: 8, peak: [2.8, 5],
  note: 'A shudder runs the hull and a slug of trapped air wobbles up the wall.',
  needs: [],
  start(v) { v.blew = false; v.shake = 0; },
  update(v, t, dt) {
    const p = nearWreck(6, -6);
    v.shake = pulse(t, 1.6, 2.8);
    if (!v.blew && t >= 2.6) {
      v.blew = true;
      emit(p.x, p.y, { n: 18, spread: 4, speed: 5, up: 20, life: 5.2, tone: TONE.white, gravity: -7, size: 2 });
    }
    if (t > 3.0 && t < 5.4 && Math.random() < 0.3) {
      emit(p.x + (Math.random() - 0.5) * 8, p.y - 6, {
        n: 2, spread: 3, speed: 3, up: 16, life: 4.4, tone: TONE.white, gravity: -6,
      });
    }
  },
  draw(c, v) {
    if (v.shake <= 0.02) return;
    const w = wreckScreen();
    c.fillStyle = css(P.rust, v.shake * 0.35);
    c.fillRect((w.x - w.len / 2) | 0, (w.y - 2 + Math.sin(v.t * 40) * 1.2) | 0, w.len, 2);
  },
});

defineVignette({
  id: 'batfish-carousel', zone: 2, name: 'Batfish carousel', duration: 9, peak: [4, 6.6],
  note: 'They gather against the wall, tighten into a slow spiral, and unwind.',
  needs: ['batfish'],
  start(v) {
    const side = wallSide();
    v.cx = cam.x + (side < 0 ? app.iw * 0.62 : app.iw * 0.38);
    v.cy = cam.y + app.ih * 0.48;
  },
  update(v, t) {
    const s = v.actors.batfish;
    if (!s || !s.alive || !s.flock) return;
    const f = s.flock;
    const tighten = phase(t, 1.2, 4.4) * (1 - phase(t, 6.8, 8.6));
    const spin = t * 1.3;
    s.x = v.cx; s.y = v.cy;
    for (let i = 0; i < f.n; i++) {
      const a = spin + (i / f.n) * Math.PI * 2;
      const r = 34 - tighten * 20;
      const tx = v.cx + Math.cos(a) * r;
      const ty = v.cy + Math.sin(a) * r * 0.85;
      f.x[i] += (tx - f.x[i]) * tighten * 0.12;
      f.y[i] += (ty - f.y[i]) * tighten * 0.12;
    }
  },
});

defineVignette({
  id: 'grouper-yawn', zone: 2, name: 'Grouper yawn', duration: 8, peak: [3.4, 5],
  note: 'It drifts out of the hull, opens its mouth impossibly wide, and thinks better of it.',
  needs: ['grouper'],
  start(v) {
    const p = nearWreck(-10, 2);
    v.hx = p.x; v.hy = p.y;
  },
  update(v, t) {
    const g = v.actors.grouper;
    if (!g || !g.alive) return;
    const out = phase(t, 0.4, 3.0) * (1 - phase(t, 5.6, 7.6));
    place(g, v.hx + out * 34, v.hy - out * 10, 1);
    v.gape = pulse(t, 3.2, 5.2);
    g.d.frame = v.gape > 0.35 ? 1 : undefined;
  },
  draw(c, v) {
    const g = v.actors.grouper;
    if (!g || !g.alive || !v.gape || v.gape < 0.05) return;
    const x = g.sx() + (g.face > 0 ? 14 : -18), y = g.sy() - 2;
    c.fillStyle = css(P.silhouette, 0.85);
    const w = 4 + v.gape * 9, h = 3 + v.gape * 13;
    c.fillRect((x - w / 2) | 0, (y - h / 2) | 0, w | 0, h | 0);
    c.fillStyle = css(P.palePink, 0.5 * v.gape);
    c.fillRect((x - w / 2 + 1) | 0, (y - h / 2 + 1) | 0, Math.max(1, (w - 2) | 0), Math.max(1, (h - 2) | 0));
  },
});

defineVignette({
  id: 'lionfish-fan', zone: 2, name: 'Lionfish fan', duration: 8, peak: [3.6, 5.2],
  note: 'It spreads to twice its width, corners something against the wall, and folds away.',
  needs: ['lionfish', 'silverside'],
  start(v) {
    const side = wallSide();
    v.side = side;
    v.wallX = cam.x + (side < 0 ? app.iw * 0.30 : app.iw * 0.70);
    v.y = cam.y + app.ih * 0.5;
  },
  update(v, t) {
    const l = v.actors.lionfish, s = v.actors.silverside;
    const herd = phase(t, 1.0, 4.2);
    if (l && l.alive) {
      place(l, v.wallX + (v.side < 0 ? -1 : 1) * (54 - herd * 26), v.y, v.side < 0 ? -1 : 1);
      v.spread = phase(t, 2.0, 3.6) * (1 - phase(t, 5.4, 7.0));
    }
    if (s && s.alive && s.flock) {
      const f = s.flock;
      const tx = v.wallX + (v.side < 0 ? 6 : -6), ty = v.y;
      for (let i = 0; i < f.n; i++) {
        f.x[i] += (tx - f.x[i]) * herd * 0.05;
        f.y[i] += (ty - f.y[i]) * herd * 0.05;
      }
    }
  },
  draw(c, v) {
    const l = v.actors.lionfish;
    if (!l || !l.alive || !v.spread) return;
    const x = l.sx(), y = l.sy();
    c.fillStyle = css(P.accCoral, 0.55 * v.spread);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * Math.PI * 1.3;
      const r = 8 + v.spread * 13;
      for (let k = 4; k < r; k++) {
        c.fillRect((x + Math.cos(a) * k * -l.face) | 0, (y + Math.sin(a) * k) | 0, 1, 1);
      }
    }
  },
});
