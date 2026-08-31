// Zone 7 — The Vent Field. Sediment plain, black smoker chimneys with warm
// haloes and rolling plumes, and the whale-fall skeleton.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P, css } from '../palette.js';
import { dither, strata, profile, sampleProfile, fillBelow, floorWorldY } from './common.js';

let plain = null, smokers = [], fall = null;

/**
 * Driven by the zone 7 vignettes: `billow` swells one chimney's plume and
 * `stir` brightens the bacterial mat on the bones.
 */
export const ventFx = { billow: 0, billowIndex: 0, stir: 0 };

export function smokerAt(i) { return smokers[i] || null; }
export function whaleFall() { return fall; }
export function floorScreenY(x) {
  return screenY(floorWorldY(6), 1) + sampleProfile(plain, x + cam.x, world.wrapW);
}

function build() {
  const seed = dailySeed() + 71;
  plain = profile(seed, 96, 0, 5);
  const r = rng(seed + 1);
  smokers = [];
  for (let i = 0; i < 3; i++) {
    smokers.push({ at: 0.16 + i * 0.32 + r() * 0.08, h: 62 + r() * 34, w: 9 + r() * 6, ph: r() * 6 });
  }
  // Mid-band, so the camera meets it head-on during the vent linger.
  fall = { at: 0.30 + r() * 0.34, ribs: 13, len: 186, ph: r() * 6 };
}

/** A chimney: a tapering black column, a lit crown, and a rolling plume. */
function drawSmoker(c, s) {
  const x = s.at * app.iw;
  const base = floorScreenY(x);
  if (base < -40 || base - s.h > app.ih) return;
  // The halo falls off with height and distance rather than being a flat slab,
  // so the chimney sits inside a glow instead of on a brown rectangle.
  const glow = 0.55 + 0.45 * Math.sin(cam.t * 0.7 + s.ph);
  for (let ring = 3; ring >= 1; ring--) {
    const k = ring / 3;
    c.fillStyle = css(P.ventHot, 0.055 * glow * (1 - k * 0.55));
    const hw = s.w * (0.7 + k * 1.5);
    c.fillRect((x - hw) | 0, (base - s.h * (0.45 + k * 0.75)) | 0,
      (hw * 2) | 0, (s.h * (0.5 + k * 0.75) + 6) | 0);
  }
  for (let i = 0; i < s.h; i++) {
    const t = i / s.h;
    const hw = s.w * 0.5 * (1 - t * 0.55) + Math.sin(i * 0.4 + s.ph) * 0.7;
    const w = Math.max(1, (hw * 2) | 0);
    c.fillStyle = i > s.h - 5 ? P.ventHot : P.smoker;
    c.fillRect((x - hw) | 0, (base - i) | 0, w, 1);
    if (i < s.h - 5) {
      // A rim on the vent side, or the chimney is a black hole in black water.
      c.fillStyle = css(P.ventWarm, 0.35 - t * 0.2);
      c.fillRect((x - hw) | 0, (base - i) | 0, 1, 1);
    }
  }
  c.fillStyle = css(P.ventWarm, 0.8);
  c.fillRect((x - 2) | 0, (base - s.h) | 0, 4, 1);
  // The plume: a slow dark column rolling upward, lit orange from below.
  const swell = (ventFx.billow > 0 && smokers[ventFx.billowIndex] === s) ? ventFx.billow : 0;
  for (let i = 0; i < 34; i++) {
    const t = i / 34;
    const y = base - s.h - i * 2.2;
    if (y < -6 || y > app.ih) continue;
    const drift = Math.sin(cam.t * 0.5 + s.ph + t * 3.4) * (2 + t * 9);
    const w = (3 + t * 9) * (1 + swell * 1.9);
    c.fillStyle = css(P.smoker, (0.34 + swell * 0.4) * (1 - t) * (1 - t));
    c.fillRect((x + drift - w / 2) | 0, y | 0, w | 0, 3);
    if (t < 0.28 + swell * 0.2) {
      c.fillStyle = css(P.ventHot, (0.16 + swell * 0.3) * (1 - t / 0.28));
      c.fillRect((x + drift - w / 2) | 0, y | 0, w | 0, 1);
    }
  }
}

/** The whale fall: spine, ribs, skull, and a bacterial mat that breathes. */
function drawWhaleFall(c) {
  const x = fall.at * app.iw;
  const base = floorScreenY(x);
  if (base < -30 || base > app.ih + 60) return;
  const L = fall.len, half = L / 2;
  const mat = 0.30 + 0.22 * Math.sin(cam.t * 0.45 + fall.ph) + ventFx.stir * 0.5;
  c.fillStyle = css(P.bioLime, mat * 0.5);
  c.fillRect((x - half) | 0, (base - 26) | 0, L, 26);
  for (let i = 0; i < L; i++) {
    const u = i / (L - 1);
    const sx = x - half + i;
    if (sx < -2 || sx > app.iw + 2) continue;
    const spine = base - 12 - Math.sin(u * Math.PI) * 7;
    c.fillStyle = P.bone;
    c.fillRect(sx | 0, spine | 0, 1, 2);
  }
  for (let r = 0; r < fall.ribs; r++) {
    const u = 0.16 + (r / (fall.ribs - 1)) * 0.66;
    const sx = x - half + u * L;
    if (sx < -12 || sx > app.iw + 12) continue;
    const spine = base - 12 - Math.sin(u * Math.PI) * 7;
    const span = 15 * Math.sin(u * Math.PI * 0.95) + 4;
    c.fillStyle = P.bone;
    for (let i = 0; i < span; i++) {
      const t = i / span;
      const bow = t * t * 7;
      c.fillRect((sx + bow) | 0, (spine + i) | 0, 1, 1);
      c.fillRect((sx + bow) | 0, (spine - i * 0.35) | 0, 1, 1);
    }
  }
  // The skull, with its sockets left dark.
  const skx = x - half + L * 0.90;
  const sky = base - 14;
  c.fillStyle = P.bone;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const hh = 9 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.35) / 0.7, 2)));
    c.fillRect((skx + i) | 0, (sky - hh) | 0, 1, Math.max(1, (hh * 2) | 0));
  }
  c.fillStyle = P.silhouette;
  c.fillRect((skx + 16) | 0, (sky - 3) | 0, 3, 3);
}

function draw(c) {
  if (cam.zone < 5) return;
  const fade = Math.max(0, Math.min(1, (cam.depth - 5.7 / 7) / (0.5 / 7)));
  if (fade <= 0.02) return;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * fade;
  const top = screenY(floorWorldY(6), 1);
  fillBelow(c, 0, app.iw, app.ih, (x) => top + sampleProfile(plain, x + cam.x, world.wrapW),
    dither(c, 'w8', 'maroon', 0.22), P.sand2, world.zoneH * 0.3,
    strata(c, 'vent', [[2, 'maroon', 'rust', 0.45], [5, 'maroon', 'w8', 0.5]]));
  drawWhaleFall(c);
  for (const s of smokers) drawSmoker(c, s);
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('vents', 15, draw);
}
