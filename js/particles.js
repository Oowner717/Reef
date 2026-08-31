// Ambient particles: surface bubbles, dust in the beams, drifting motes, marine
// snow that thickens with depth, and vent shimmer. One fixed pool, typed
// arrays, nothing allocated per frame, and the whole thing sheds with the
// quality tier.
import { addLayer, addUpdater, app } from './main.js';
import { cam, screenX, screenY } from './camera.js';
import { world, zoneValue } from './world.js';
import { P, css } from './palette.js';
import { tierParams } from './perf.js';
import { addInfo, addToggle } from './debug/registry.js';
import { addProvider } from './debug/diagnostics.js';

const CAP = 380;
const x = new Float32Array(CAP), y = new Float32Array(CAP);
const vx = new Float32Array(CAP), vy = new Float32Array(CAP);
const life = new Float32Array(CAP), full = new Float32Array(CAP);
const wob = new Float32Array(CAP);
const kind = new Uint8Array(CAP), size = new Uint8Array(CAP);
let head = 0, live = 0;

// bubble, dust, mote, snow, shimmer, sediment
const TONE = [P.white, P.silver, P.glass, P.white, P.ventWarm, P.sand1];
const ALPHA = [0.55, 0.30, 0.34, 0.62, 0.55, 0.34];

export const particles = { on: true, budget: 1 };

export function particleCount() { return live; }
export function particleCap() { return CAP; }

function spawn(k, px, py, sp) {
  const i = head; head = (head + 1) % CAP;
  x[i] = px; y[i] = py;
  kind[i] = k;
  wob[i] = Math.random() * 6.28;
  switch (k) {
    case 0:                                   // bubble — rises, wobbles, grows
      vx[i] = 0; vy[i] = -(9 + Math.random() * 13);
      full[i] = life[i] = 4 + Math.random() * 4; size[i] = Math.random() < 0.25 ? 2 : 1;
      break;
    case 1:                                   // dust — hangs in the beams
      vx[i] = (Math.random() - 0.5) * 3; vy[i] = (Math.random() - 0.4) * 2.4;
      full[i] = life[i] = 6 + Math.random() * 6; size[i] = 1;
      break;
    case 2:                                   // mote — the empty blue
      vx[i] = (Math.random() - 0.5) * 2.2; vy[i] = (Math.random() - 0.5) * 1.6;
      full[i] = life[i] = 8 + Math.random() * 8; size[i] = 1;
      break;
    case 3:                                   // marine snow — always falling
      vx[i] = (Math.random() - 0.5) * 2.4; vy[i] = 3.5 + Math.random() * 5;
      full[i] = life[i] = 10 + Math.random() * 8; size[i] = Math.random() < 0.18 ? 2 : 1;
      break;
    case 4:                                   // vent shimmer — hot and rising
      vx[i] = (Math.random() - 0.5) * 5; vy[i] = -(16 + Math.random() * 18);
      full[i] = life[i] = 3 + Math.random() * 3; size[i] = 1;
      break;
    default:                                  // sediment — drifts near the floor
      vx[i] = (Math.random() - 0.5) * 4; vy[i] = (Math.random() - 0.6) * 2;
      full[i] = life[i] = 7 + Math.random() * 6; size[i] = 1;
  }
  if (life[i] > 0) live++;
}

/** Anything can ask for a puff — the vignettes' own fx pool stays separate. */
export function emitParticle(k, px, py, n) {
  for (let i = 0; i < (n || 1); i++) spawn(k, px, py, 1);
}

const rate = [0, 0, 0, 0, 0, 0];
let carry = 0;

function seed(dt) {
  const t = tierParams();
  // Reduced motion means less drifting in the corner of the eye, not none:
  // the water should still look like water.
  const budget = particles.budget * t.particles * (app.reduced ? 0.45 : 1);
  const depthY = cam.centre;
  const shafts = zoneValue(depthY, 'shafts');
  const dust = zoneValue(depthY, 'dust');
  const snow = zoneValue(depthY, 'snow');
  const glow = zoneValue(depthY, 'glow');
  const caust = zoneValue(depthY, 'caustics');

  rate[0] = caust * 5;                    // bubbles in the lit shallows
  rate[1] = dust * shafts * 9;            // dust, only where there are beams
  rate[2] = (1 - snow) * dust * 3;        // motes in the empty blue
  rate[3] = snow * 16;                    // marine snow
  rate[4] = Math.max(0, glow - 0.85) * 40; // vent shimmer, zone 7 only
  rate[5] = caust * 1.5;                  // stirred sediment near the sand

  const top = cam.y - 20, h = app.ih + 40;
  for (let k = 0; k < 6; k++) {
    const n = rate[k] * budget * dt + (k === 0 ? carry : 0);
    let count = Math.floor(n);
    if (k === 0) carry = n - count;
    if (Math.random() < n - Math.floor(n)) count++;
    for (let i = 0; i < count && i < 6; i++) {
      // Marine snow and bubbles enter from the edge they travel from; the rest
      // simply appear somewhere off to the side and drift in.
      const px = cam.x + (Math.random() - 0.25) * app.iw * 1.5;
      let py;
      if (k === 3) py = top - Math.random() * 24;
      else if (k === 0 || k === 4) py = top + h + Math.random() * 24;
      else py = top + Math.random() * h;
      spawn(k, px, py, 1);
    }
  }
}

function update(dt) {
  if (!particles.on) { return; }
  seed(dt);
  live = 0;
  const t = app.time;
  const slow = app.reduced ? 0.4 : 1;
  for (let i = 0; i < CAP; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) continue;
    live++;
    const k = kind[i];
    if (k === 0) { vy[i] -= 5 * dt; x[i] += Math.sin(t * 2.2 * slow + wob[i]) * 7 * slow * dt; }
    else if (k === 4) { x[i] += Math.sin(t * 5 * slow + wob[i]) * 11 * slow * dt; }
    else if (k === 3) { x[i] += Math.sin(t * 0.5 * slow + wob[i]) * 2.5 * slow * dt; }
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }
}

function draw(c) {
  if (!particles.on || !live) return;
  const top = -8, bot = app.ih + 8;
  for (let k = 0; k < 6; k++) {
    let started = false;
    for (let i = 0; i < CAP; i++) {
      if (life[i] <= 0 || kind[i] !== k) continue;
      const sx = screenX(x[i], 1), sy = screenY(y[i], 1);
      if (sx < -4 || sx > app.iw + 4 || sy < top || sy > bot) continue;
      if (!started) {
        // One style change per kind rather than per particle.
        c.fillStyle = css(TONE[k], ALPHA[k]);
        started = true;
      }
      const fade = life[i] / full[i];
      if (fade < 0.25 || fade > 0.94) {
        c.globalAlpha = fade < 0.25 ? fade / 0.25 : (1 - fade) / 0.06;
        c.fillRect(sx | 0, sy | 0, size[i], size[i]);
        c.globalAlpha = 1;
      } else {
        c.fillRect(sx | 0, sy | 0, size[i], size[i]);
      }
    }
  }
}

export function clearParticles() { for (let i = 0; i < CAP; i++) life[i] = 0; live = 0; }

export function init() {
  addUpdater(update, 40);
  addLayer('particles', 50, draw);
  addInfo('effects', 'particles', () => live + ' / ' + CAP, { sectionOrder: 36 });
  addToggle('effects', 'particles on', () => particles.on,
    (v) => { particles.on = v; if (!v) clearParticles(); });
  addProvider('particles', 36, () => 'live ' + live + '/' + CAP +
    '  budget ' + (particles.budget * tierParams().particles).toFixed(2));
}
