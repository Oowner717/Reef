// Zone 1 — the surface ceiling, the sand flats, seagrass beds and shells.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P, css } from '../palette.js';
import { dither, strata, profile, sampleProfile, fillBelow, fillAbove, blade, floorWorldY } from './common.js';

const CEIL_Y = 5;            // world y of the mean surface film
let sand = null, grass = [], shells = [];

/**
 * A travelling gust, driven by the seagrass vignette in stage 8: `amount` is
 * how flat the bed is laid and `at` is the screen x the wave front has reached.
 */
export const gust = { amount: 0, at: 0 };

export function ceilingY() { return CEIL_Y; }

function build() {
  const seed = dailySeed();
  sand = profile(seed + 11, 96, 0, 7);
  const r = rng(seed + 12);
  grass = [];
  for (let i = 0; i < 44; i++) {
    grass.push({ x: r() * world.wrapW, n: 3 + (r() * 5) | 0, h: 6 + r() * 9, ph: r() * 6 });
  }
  shells = [];
  for (let i = 0; i < 28; i++) {
    shells.push({ x: r() * world.wrapW, w: 2 + ((r() * 2) | 0), tone: r() < 0.5 ? P.bone : P.palePink });
  }
}

function floorTopAt(x) {
  return screenY(floorWorldY(0), 1) + sampleProfile(sand, x + cam.x, world.wrapW);
}

function drawCeiling(c) {
  const base = screenY(CEIL_Y, 1);
  if (base < -12 || base > app.ih) return;
  const t = cam.t;
  // A bright film with a rippling underside, seen from below.
  fillAbove(c, 0, app.iw, -1, (x) => base
    + Math.sin((x + cam.x) * 0.21 + t * 1.6) * 2.1
    + Math.sin((x + cam.x) * 0.07 - t * 0.9) * 1.6,
  dither(c, 'w0', 'white', 0.55), P.white);
}

function drawFloor(c) {
  const top = screenY(floorWorldY(0), 1);
  if (top > app.ih + 8) return;
  fillBelow(c, 0, app.iw, app.ih, floorTopAt, dither(c, 'sand2', 'brown', 0.32), P.bone,
    world.zoneH * 0.14, strata(c, 'sand', [[3, 'sand1', 'bone', 0.4], [4, 'sand1', 'sand2', 0.45], [7, 'sand2', 'sand1', 0.35]]));
}

function drawGrass(c) {
  const top = screenY(floorWorldY(0), 1);
  if (top > app.ih + 4 || top < -40) return;
  const t = cam.t;
  for (const g of grass) {
    const x = screenX(g.x, 1);
    if (x < -10 || x > app.iw + 10) continue;
    const baseY = top + sampleProfile(sand, x + cam.x, world.wrapW);
    // The gust flattens each clump as the wave front passes over it.
    const hit = gust.amount > 0
      ? Math.max(0, 1 - Math.abs(x - gust.at) / 72) * gust.amount : 0;
    for (let i = 0; i < g.n; i++) {
      const bx = x + i * 2 - g.n;
      blade(c, bx, baseY, (g.h + (i % 3)) * (1 - hit * 0.78), 3.2 + hit * 14,
        t * 1.1 + g.ph + i * 0.7, i % 2 ? P.seagrass : P.kelp2, 1);
    }
  }
}

function drawShells(c) {
  const top = screenY(floorWorldY(0), 1);
  if (top > app.ih + 4 || top < -20) return;
  for (const s of shells) {
    const x = screenX(s.x, 1);
    if (x < -4 || x > app.iw + 4) continue;
    const y = top + sampleProfile(sand, x + cam.x, world.wrapW) + 1;
    c.fillStyle = s.tone;
    c.fillRect(x | 0, y | 0, s.w, 1);
    c.fillRect((x | 0) + (s.w > 2 ? 1 : 0), (y | 0) - 1, 1, 1);
  }
}

function draw(c) {
  if (cam.zone > 1) return;
  drawCeiling(c);
  drawFloor(c);
  drawGrass(c);
  drawShells(c);
}

export function init() {
  onResize(build);
  addLayer('shallows', 22, draw);
}
