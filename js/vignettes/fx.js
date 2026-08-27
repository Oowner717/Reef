// A small hard-capped particle pool for vignette beats — sand puffs, bubble
// slugs, splashes, spawn clouds. Stage 14's js/particles.js is the ambient
// system; this one exists only for the duration of a set piece.
import { screenX, screenY } from '../camera.js';
import { app } from '../main.js';
import { P, css } from '../palette.js';

const CAP = 180;
const x = new Float32Array(CAP), y = new Float32Array(CAP);
const vx = new Float32Array(CAP), vy = new Float32Array(CAP);
const life = new Float32Array(CAP), full = new Float32Array(CAP);
const grav = new Float32Array(CAP), size = new Uint8Array(CAP);
const tone = new Uint8Array(CAP);
let head = 0, live = 0;

const TONES = [P.white, P.sand1, P.sand2, P.bone, P.accCoral, P.bioCyan, P.silver, P.bioLime, P.smoker, P.palePink];

export function fxLive() { return live; }
export function fxCap() { return CAP; }

export function clearFx() { for (let i = 0; i < CAP; i++) life[i] = 0; live = 0; }

/**
 * o = { n, spread, speed, up, life, size, tone, gravity }
 * Positions are world coordinates; drawing is on the mid parallax layer.
 */
export function emit(wx, wy, o) {
  const n = Math.min(o.n || 8, 48);
  for (let k = 0; k < n; k++) {
    const i = head; head = (head + 1) % CAP;
    if (life[i] <= 0) live++;
    const a = Math.random() * Math.PI * 2;
    const sp = (o.speed || 10) * (0.35 + Math.random() * 0.9);
    x[i] = wx + (Math.random() - 0.5) * (o.spread || 6);
    y[i] = wy + (Math.random() - 0.5) * (o.spread || 6) * 0.6;
    vx[i] = Math.cos(a) * sp;
    vy[i] = Math.sin(a) * sp - (o.up || 0);
    full[i] = life[i] = (o.life || 1.6) * (0.6 + Math.random() * 0.8);
    grav[i] = o.gravity === undefined ? 6 : o.gravity;
    size[i] = o.size || 1;
    tone[i] = o.tone || 0;
  }
}

export function updateFx(dt) {
  if (!live) return;
  live = 0;
  for (let i = 0; i < CAP; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) continue;
    live++;
    vy[i] += grav[i] * dt;
    vx[i] *= 1 - Math.min(0.9, 1.4 * dt);
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }
}

export function drawFx(c) {
  if (!live) return;
  for (let i = 0; i < CAP; i++) {
    if (life[i] <= 0) continue;
    const sx = screenX(x[i], 1), sy = screenY(y[i], 1);
    if (sx < -4 || sx > app.iw + 4 || sy < -4 || sy > app.ih + 4) continue;
    const k = life[i] / full[i];
    c.fillStyle = css(TONES[tone[i]], k > 0.6 ? 0.9 : k * 1.5);
    c.fillRect(sx | 0, sy | 0, size[i], size[i]);
  }
}

export const TONE = {
  white: 0, sand: 1, darkSand: 2, bone: 3, coral: 4,
  cyan: 5, silver: 6, lime: 7, smoke: 8, pink: 9,
};
