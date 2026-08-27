// Zone 1 vignettes. Each has a setup, a beat and a payoff, readable in a few
// seconds by someone who has no idea what they are looking at.
import { app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world } from '../world.js';
import { P, css } from '../palette.js';
import { defineVignette, phase, pulse, clamp01 } from './base.js';
import { emit, TONE } from './fx.js';
import { ceilingY, gust } from '../landmarks/shallows.js';
import { floorWorldY } from '../landmarks/common.js';

/** The surface has to be visible for a scene staged on it to mean anything. */
function ceilingInView() {
  const y = screenY(ceilingY(), 1);
  return y > -6 && y < app.ih * 0.45;
}

function place(c, x, y, face) {
  if (!c || !c.alive) return;
  c.x = x; c.y = y; c.homeX = x; c.homeY = y;
  if (face !== undefined) c.face = face;
}

defineVignette({
  id: 'seabird-dive', zone: 0, can: ceilingInView, name: 'Seabird dive', duration: 8, peak: [2.4, 3.6],
  note: 'A shadow punches through the ceiling in a burst of white and is gone.',
  needs: ['seabird', 'mullet'],
  start(v) {
    const b = v.actors.seabird;
    v.cx = cam.x + app.iw * (0.35 + Math.random() * 0.3);
    v.ceil = ceilingY();
    place(b, v.cx, v.ceil - 70, 1);
    v.splashed = false;
    v.caught = false;
  },
  update(v, t) {
    const b = v.actors.seabird, m = v.actors.mullet;
    const ceil = v.ceil;
    let y;
    if (t < 2.4) y = v.ceil - 70 + 70 * Math.pow(t / 2.4, 2.2);
    else if (t < 3.6) y = ceil + 40 * Math.sin(clamp01((t - 2.4) / 1.2) * Math.PI * 0.5);
    else if (t < 5.2) y = ceil + 40 * (1 - phase(t, 3.6, 5.2));
    else y = ceil - 70 * phase(t, 5.2, 7.4);
    place(b, v.cx, y, 1);
    b.alpha = t > 7 ? 1 - phase(t, 7, 8) : 1;
    if (!v.splashed && t >= 2.4) {
      v.splashed = true;
      emit(v.cx, ceil, { n: 26, spread: 10, speed: 34, up: 10, life: 1.1, tone: TONE.white, gravity: 22 });
      emit(v.cx, ceil + 6, { n: 16, spread: 12, speed: 12, up: 16, life: 2.2, tone: TONE.white, gravity: -8, size: 1 });
    }
    if (m && m.alive) {
      if (t < 3.2) { m.x += (v.cx - m.x) * 0.02; }
      else if (!v.caught) { v.caught = true; m.alpha = 0.9; }
      else { m.x = v.cx + 3; m.y = b.y + 4; m.alpha = 1 - phase(t, 5.4, 6.6); }
    }
  },
});

defineVignette({
  id: 'ray-burial', zone: 0, name: 'Ray burial', duration: 9, peak: [3.6, 5.2],
  note: 'It shivers itself under the sand until only two eyes are left.',
  needs: ['stingray'],
  start(v) {
    const r = v.actors.stingray;
    v.floor = floorWorldY(0);
    v.cx = r.x;
    v.shook = false;
  },
  update(v, t) {
    const r = v.actors.stingray;
    if (!r || !r.alive) return;
    const settle = phase(t, 0, 2.6);
    const y = v.floor - 14 + settle * 12;
    const shiver = t > 2.6 && t < 4.2 ? Math.sin(t * 34) * 1.4 : 0;
    place(r, v.cx + shiver, y, r.face);
    r.d.frame = t > 2.6 ? 1 : undefined;
    if (!v.shook && t >= 2.7) {
      v.shook = true;
      for (let i = 0; i < 3; i++) {
        emit(v.cx + (i - 1) * 12, v.floor - 3, {
          n: 26, spread: 24, speed: 16, up: 6, life: 5.2,
          tone: i === 1 ? TONE.sand : TONE.darkSand, gravity: 1.6, size: i === 1 ? 2 : 1,
        });
      }
    }
    // Buried: all that is left is a shape under the sand, two eyes and a tail.
    r.alpha = 1 - phase(t, 3.4, 5.4) * 0.74;
  },
  draw(c, v) {
    if (v.t < 4.4) return;
    const a = phase(v.t, 4.4, 5.4) * (1 - phase(v.t, 8.2, 9));
    const x = screenX(v.cx, 1), y = screenY(v.floor - 3, 1);
    // Two eyes and a tail, and a faint ridge where the body is under the sand.
    c.fillStyle = css(P.sand1, a * 0.55);
    for (let i = -16; i <= 16; i++) {
      c.fillRect((x + i) | 0, (y + 1 + Math.abs(i) * 0.09) | 0, 1, 1);
    }
    c.fillStyle = css(P.outline, a);
    c.fillRect((x - 5) | 0, y | 0, 2, 2);
    c.fillRect((x + 4) | 0, y | 0, 2, 2);
    c.fillStyle = css(P.sand2, a);
    for (let i = 0; i < 18; i++) c.fillRect((x - 18 - i) | 0, (y + 2 + i * 0.16) | 0, 1, 1);
  },
});

defineVignette({
  id: 'bait-ceiling', zone: 0, can: ceilingInView, name: 'Bait ball at the ceiling', duration: 9, peak: [4, 6.2],
  note: 'Something unseen drives the ball up until it flattens on the surface.',
  needs: ['silverside'],
  start(v) {
    v.ceil = ceilingY();
    v.cx = cam.x + app.iw * 0.5;
  },
  update(v, t) {
    const s = v.actors.silverside;
    if (!s || !s.alive || !s.flock) return;
    const f = s.flock;
    const rise = phase(t, 0.5, 3.4) * (1 - phase(t, 6.4, 8.4));
    const flat = phase(t, 2.8, 4.2) * (1 - phase(t, 6.2, 7.6));
    s.x = v.cx;
    s.y = v.ceil + 26 - rise * 12;
    f.tx = v.cx; f.ty = v.ceil + 14;
    for (let i = 0; i < f.n; i++) {
      // Squash the whole school against the ceiling into a shimmering sheet.
      // The flock's own cohesion pulls hard toward one point, so the velocities
      // are damped too or the sheet collapses back into a ball.
      const ty = v.ceil + 8 + (i % 3) * 1.6;
      const tx = v.cx + ((i + 0.5) / f.n - 0.5) * app.iw * 0.92;
      f.y[i] += (ty - f.y[i]) * flat * 0.3;
      f.x[i] += (tx - f.x[i]) * flat * 0.3;
      const damp = 1 - flat * 0.6;
      f.vx[i] *= damp; f.vy[i] *= damp;
    }
  },
});

defineVignette({
  id: 'turtle-breath', zone: 0, can: ceilingInView, name: 'Turtle breath', duration: 8, peak: [2.8, 3.9],
  note: 'It breaks the surface from underneath and glides back down on its bubbles.',
  needs: ['turtle'],
  start(v) {
    const a = v.actors.turtle;
    v.ceil = ceilingY();
    v.cx = a.x;
    v.y0 = Math.max(a.y, v.ceil + 60);
    v.broke = false;
  },
  update(v, t) {
    const a = v.actors.turtle;
    if (!a || !a.alive) return;
    let y;
    if (t < 2.8) y = v.y0 + (v.ceil + 2 - v.y0) * phase(t, 0, 2.8);
    else if (t < 4.0) y = v.ceil + 2;
    else y = v.ceil + 2 + (v.y0 - v.ceil) * phase(t, 4.0, 7.4);
    place(a, v.cx + Math.sin(t * 0.8) * 6, y, 1);
    if (!v.broke && t >= 2.8) {
      v.broke = true;
      emit(v.cx, v.ceil, { n: 22, spread: 12, speed: 26, up: 14, life: 1.2, tone: TONE.white, gravity: 26 });
    }
    if (t > 4.0 && Math.random() < 0.35) {
      emit(a.x, a.y - 2, { n: 1, spread: 3, speed: 2, up: 10, life: 2.4, tone: TONE.white, gravity: -9 });
    }
  },
});

defineVignette({
  id: 'seagrass-gust', zone: 0, name: 'Seagrass gust', duration: 7, peak: [2.2, 4],
  note: 'A pulse of current lays the whole bed flat in a travelling wave.',
  needs: ['grassshrimp'],
  start(v) {
    v.floor = floorWorldY(0);
    v.dir = Math.random() < 0.5 ? 1 : -1;
    v.lifted = false;
  },
  update(v, t) {
    const k = clamp01((t - 0.6) / 3.4);
    gust.amount = pulse(t, 0.6, 5.4);
    gust.at = v.dir > 0 ? -40 + k * (app.iw + 80) : app.iw + 40 - k * (app.iw + 80);
    if (!v.lifted && t > 1.6) {
      v.lifted = true;
      for (let i = 0; i < 5; i++) {
        emit(cam.x + app.iw * (0.1 + i * 0.2), v.floor - 6, {
          n: 8, spread: 16, speed: 9, up: 5, life: 3.6, tone: TONE.sand, gravity: 1.4,
        });
      }
    }
    const s = v.actors.grassshrimp;
    if (s && s.flock) {
      const f = s.flock;
      for (let i = 0; i < f.n; i++) f.vy[i] -= gust.amount * 14 * 0.016;
    }
  },
  end() { gust.amount = 0; },
});
