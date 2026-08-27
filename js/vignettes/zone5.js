// Zone 5 vignettes. The last of the light, so these are about silver and the
// first faint glows rather than about colour.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { P, css } from '../palette.js';
import { drawSpriteC } from '../sprites.js';
import { defineVignette, phase, pulse, clamp01 } from './base.js';
import { emit, TONE } from './fx.js';

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'mirror-flash', zone: 4, name: 'Mirror flash', duration: 7, peak: [3.0, 4.2],
  note: 'The whole school turns at once and every flank catches the last of the light.',
  needs: ['hatchetfish'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.44;
  },
  update(v, t) {
    const s = v.actors.hatchetfish;
    if (!s || !s.alive || !s.flock) return;
    const f = s.flock;
    const gather = phase(t, 0.4, 2.8);
    s.x = v.cx; s.y = v.cy;
    // Line up level, turn as one, then scatter into the dark.
    v.flash = pulse(t, 3.0, 4.0);
    const scatter = phase(t, 4.4, 6.4);
    for (let i = 0; i < f.n; i++) {
      const tx = v.cx + ((i + 0.5) / f.n - 0.5) * 74;
      const ty = v.cy + ((i % 3) - 1) * 7;
      f.x[i] += (tx - f.x[i]) * gather * 0.1;
      f.y[i] += (ty - f.y[i]) * gather * 0.1;
      f.vx[i] *= 1 - gather * 0.4;
      if (scatter > 0) { f.vx[i] += (f.x[i] - v.cx) * 0.02; f.vy[i] += (f.y[i] - v.cy) * 0.03; }
      if (t > 3.0) f.vx[i] = Math.abs(f.vx[i]) * -1;
    }
  },
  draw(c, v) {
    const s = v.actors.hatchetfish;
    if (!s || !s.alive || !s.flock || !v.flash) return;
    const f = s.flock;
    for (let i = 0; i < f.n; i++) {
      const x = screenX(f.x[i], 1), y = screenY(f.y[i], 1);
      c.fillStyle = css(P.white, Math.min(0.95, v.flash));
      c.fillRect((x - 3) | 0, (y - 2) | 0, 7, 5);
      c.fillStyle = css(P.bioCyan, Math.min(0.7, v.flash) * 0.7);
      c.fillRect((x - 4) | 0, (y - 3) | 0, 9, 1);
      c.fillRect((x - 4) | 0, (y + 3) | 0, 9, 1);
    }
  },
});

defineVignette({
  id: 'vampire-pineapple', zone: 4, name: 'Vampire squid pineapple', duration: 8, peak: [3.4, 5.4],
  note: 'Startled, it turns its own web inside out and becomes a spined ball.',
  needs: ['vampiresquid'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.46;
  },
  update(v, t) {
    const s = v.actors.vampiresquid;
    if (!s || !s.alive) return;
    place(s, v.cx + Math.sin(t * 0.7) * 5, v.cy + Math.sin(t * 0.5) * 4, s.face);
    v.curl = phase(t, 2.4, 3.4) * (1 - phase(t, 5.4, 6.6));
    s.d.frame = v.curl > 0.5 ? 1 : undefined;
    s.alpha = 1 - v.curl * 0.35;
  },
  draw(c, v) {
    const s = v.actors.vampiresquid;
    if (!s || !s.alive || !v.curl) return;
    const x = s.sx(), y = s.sy();
    // The inverted web: a ring of spines closing over the body.
    c.fillStyle = css(P.maroon, 0.95 * v.curl);
    const r = 11 * v.curl;
    for (let a = 0; a < 14; a++) {
      const th = (a / 14) * Math.PI * 2 + v.t * 0.3;
      for (let k = 3; k < r; k++) {
        c.fillRect((x + Math.cos(th) * k) | 0, (y + Math.sin(th) * k) | 0, 1, 1);
      }
      c.fillStyle = css(P.bioCyan, 0.9 * v.curl * (1 - phase(v.t, 5.6, 6.6)));
      c.fillRect((x + Math.cos(th) * r) | 0, (y + Math.sin(th) * r) | 0, 1, 1);
      c.fillStyle = css(P.maroon, 0.95 * v.curl);
    }
  },
});

defineVignette({
  id: 'siphonophore-unfurl', zone: 4, name: 'Siphonophore unfurl', duration: 9, peak: [4.0, 6.6],
  note: 'The coil stretches to its full length and lights bead by bead down the chain.',
  needs: ['siphonophore'],
  start(v) {
    const s = v.actors.siphonophore;
    v.cx = cam.x + app.iw * (0.35 + Math.random() * 0.3);
    v.cy = cam.y + app.ih * 0.22;
    if (s && s.spineX) {
      for (let i = 0; i < s.def.tune.segments; i++) {
        s.spineX[i] = v.cx + Math.cos(i * 0.9) * 7;
        s.spineY[i] = v.cy + Math.sin(i * 0.9) * 7;
      }
    }
  },
  update(v, t) {
    const s = v.actors.siphonophore;
    if (!s || !s.alive || !s.spineX) return;
    const n = s.def.tune.segments;
    const open = phase(t, 1.0, 5.8);
    s.x = v.cx; s.y = v.cy;
    for (let i = 0; i < n; i++) {
      // The wave of straightening travels down the chain rather than snapping.
      const local = clamp01(open * n - i);
      const tx = v.cx + Math.cos(i * 0.9) * 7 * (1 - local);
      const ty = v.cy + i * s.def.tune.segLen * local + Math.sin(i * 0.9) * 7 * (1 - local);
      s.spineX[i] += (tx - s.spineX[i]) * 0.14;
      s.spineY[i] += (ty - s.spineY[i]) * 0.14;
    }
    v.lit = open;
  },
  draw(c, v) {
    const s = v.actors.siphonophore;
    if (!s || !s.alive || !s.spineX) return;
    const n = s.def.tune.segments;
    for (let i = 0; i < n; i++) {
      const on = clamp01(v.lit * n - i) * (1 - phase(v.t, 7.6, 9));
      if (on <= 0.05) continue;
      const x = screenX(s.spineX[i], s.def.layer), y = screenY(s.spineY[i], s.def.layer);
      c.fillStyle = css(i & 1 ? P.bioCyan : P.bioLime, 0.55 * on);
      c.fillRect((x - 3) | 0, (y - 3) | 0, 7, 7);
    }
  },
});

defineVignette({
  id: 'chromatophore-run', zone: 4, name: 'Chromatophore run', duration: 8, peak: [3.0, 5.0],
  note: 'Two waves of colour run the length of its body, then it is simply gone.',
  needs: ['squid'],
  start(v) {
    v.cx = cam.x + app.iw * 0.5;
    v.cy = cam.y + app.ih * 0.44;
  },
  update(v, t) {
    const s = v.actors.squid;
    if (!s || !s.alive) return;
    if (t < 5.6) {
      place(s, v.cx, v.cy + Math.sin(t * 0.9) * 3, s.face);
      s.vx = 0; s.vy = 0;
    } else if (t < 5.8) {
      s.state = 1; s.timer = 0.5; s.vx = -70; s.vy = -18;
    }
    v.wave = (t > 1.6 && t < 5.2) ? ((t - 1.6) / 1.8) % 1 : -1;
    v.runs = t > 3.4 ? 2 : 1;
  },
  draw(c, v) {
    const s = v.actors.squid;
    if (!s || !s.alive || v.wave < 0) return;
    const x = s.sx(), y = s.sy();
    for (let i = 0; i < 16; i++) {
      const u = i / 15;
      const k = 1 - Math.abs(u - v.wave) * 4;
      if (k <= 0) continue;
      c.fillStyle = css(P.bioMagenta, 0.85 * k);
      c.fillRect((x - 6) | 0, (y - 9 + i) | 0, 12, 1);
    }
  },
});
