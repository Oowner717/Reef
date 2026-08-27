// Zone 3 — the shelf that ends, the wall that falls away, gorgonian fans, and
// the wreck wedged on the slope. The wall is locked to a screen side rather
// than a world x: a drop-off has no far end to drift past.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P, css } from '../palette.js';
import { dither, profile, sampleProfile, fillSide, blade, floorWorldY } from './common.js';

let side = 1;                 // +1 wall on the right, -1 on the left
let face = null, fans = [], wreck = null, shelfTop = 0;

export function wallSide() { return side; }
export function wreckPos() { return wreck; }

function build() {
  const seed = dailySeed() + 31;
  const r = rng(seed);
  side = r() < 0.5 ? -1 : 1;
  face = profile(seed + 1, 128, 0, 9);
  shelfTop = floorWorldY(2);
  fans = [];
  for (let i = 0; i < 22; i++) {
    fans.push({ y: (2 + 0.1 + r() * 0.85) * world.zoneH, n: 5 + ((r() * 4) | 0), h: 8 + r() * 12, ph: r() * 6 });
  }
  // Mid-band, so the camera meets it head-on, and out from the wall enough to
  // read as a silhouette against open water.
  wreck = {
    y: (2 + 0.48 + r() * 0.08) * world.zoneH,
    out: 0.30 + r() * 0.10,
    tilt: 0.16 + r() * 0.10,
    ph: r() * 6,
  };
}

/** Screen x of the wall face at a screen row. */
function edgeAt(sy) {
  const wy = sy + cam.y;
  const wob = sampleProfile(face, wy * 3.1, world.wrapW);
  let out = 0.30;                                  // base wall thickness
  if (wy > shelfTop) {
    // Below the shelf lip the cliff recedes until it merges with the wall.
    const below = wy - shelfTop;
    out = Math.max(0.30, 0.74 - below / (world.zoneH * 0.34) * 0.44);
  } else {
    out = 0.74;                                    // still on the shelf
  }
  const px = out * app.iw + wob;
  return side < 0 ? px : app.iw - px;
}

function drawFans(c) {
  const t = cam.t;
  for (const f of fans) {
    const y = screenY(f.y, 1);
    if (y < -20 || y > app.ih + 20) continue;
    const x = edgeAt(y) + side * 2;
    for (let i = 0; i < f.n; i++) {
      const bx = x - side * i * 1.6;
      blade(c, bx, y + i, f.h, 2.6 * -side, t * 0.8 + f.ph + i * 0.5, P.gorgonian, 1);
    }
  }
}

/** The wreck: a tilted hull silhouette with rust, a deck line and portholes. */
function drawWreck(c) {
  const cy = screenY(wreck.y, 1);
  if (cy < -60 || cy > app.ih + 60) return;
  const L = 118, H = 30;
  const cx = side < 0 ? wreck.out * app.iw + L * 0.1 : app.iw - wreck.out * app.iw - L * 0.1;
  const x0 = cx - L / 2;
  const tilt = wreck.tilt * side;
  const hull = dither(c, 'silhouette', 'rock1', 0.45);
  for (let i = 0; i < L; i++) {
    const u = i / (L - 1);
    const half = (H / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.44) / 0.60, 2)));
    if (half < 0.5) continue;
    const x = Math.round(x0 + (side < 0 ? i : L - 1 - i));
    if (x < -2 || x > app.iw + 2) continue;
    const yo = (i - L / 2) * tilt;
    const top = Math.round(cy + yo - half);
    const bot = Math.round(cy + yo + half * 0.75);
    c.fillStyle = hull;
    c.fillRect(x, top, 1, Math.max(1, bot - top));
    c.fillStyle = P.rust;
    c.fillRect(x, top, 1, 1);
    if (u > 0.2 && u < 0.85 && ((i + 3) % 14 === 0)) {
      c.fillStyle = P.accYellow;
      c.fillRect(x, Math.round(cy + yo - half * 0.15), 2, 2);
    }
  }
  // The broken mast, leaning off the high end of the tilt.
  c.fillStyle = P.silhouette;
  for (let i = 0; i < 22; i++) {
    const x = Math.round(cx + side * (L * 0.16) - side * i * 0.55);
    c.fillRect(x, Math.round(cy - L / 2 * Math.abs(tilt) - 6 - i), 1, 1);
  }
}

function draw(c) {
  if (cam.zone < 2 || cam.zone > 3) return;
  const topRow = Math.max(0, screenY(2 * world.zoneH, 1));
  if (topRow > app.ih) return;
  // The wall dissolves into haze as zone 4 opens up beneath it.
  const alpha = 1 - Math.max(0, Math.min(1, (cam.depth - 3.05 / 7) / (0.6 / 7)));
  if (alpha <= 0.02) return;
  const prev = c.globalAlpha;
  if (alpha < 1) c.globalAlpha = prev * alpha;
  fillSide(c, topRow | 0, app.ih, side, edgeAt, app.iw,
    dither(c, 'rock1', 'rock2', 0.4), P.rock2);
  drawFans(c);
  drawWreck(c);
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('dropoff', 24, draw);
}
