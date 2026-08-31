// Zone 6 — Midnight. Trench walls closing in from both sides and a boulder
// field on the floor. Nothing here is lit from above.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P } from '../palette.js';
import { dither, strata, profile, sampleProfile, fillSide, fillBelow, floorWorldY } from './common.js';

let left = null, right = null, floor = null, boulders = [];

function build() {
  const seed = dailySeed() + 61;
  left = profile(seed, 96, 0, 8);
  right = profile(seed + 1, 96, 0, 8);
  floor = profile(seed + 2, 96, 0, 7);
  const r = rng(seed + 3);
  boulders = [];
  for (let i = 0; i < 20; i++) {
    boulders.push({ x: r() * world.wrapW, w: 8 + r() * 22, h: 5 + r() * 12 });
  }
}

/** The trench narrows with depth: 8% of the width at the top, 22% at the floor. */
function squeeze() {
  const t = Math.max(0, Math.min(1, (cam.depth - 5 / 7) / (1 / 7)));
  return 0.06 + t * 0.16;
}

function draw(c) {
  if (cam.zone < 4 || cam.zone > 6) return;
  // Fades in below the twilight pinnacle and back out as the vent field opens,
  // so the trench does not still be closing in over the smokers.
  const fade = Math.max(0, Math.min(1, (cam.depth - 4.75 / 7) / (0.5 / 7)))
    * Math.max(0, Math.min(1, 1 - (cam.depth - 5.95 / 7) / (0.4 / 7)));
  if (fade <= 0.02) return;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * fade;
  const k = squeeze();
  const fill = dither(c, 'silhouette', 'rock1', 0.4);
  const face = strata(c, 'trench-face', [[2, 'rock1', 'rock2', 0.5], [4, 'silhouette', 'rock1', 0.55]]);
  fillSide(c, 0, app.ih, -1, (sy) =>
    k * app.iw + sampleProfile(left, (sy + cam.y) * 2.7, world.wrapW), app.iw, fill, P.rock1, face);
  fillSide(c, 0, app.ih, 1, (sy) =>
    app.iw - k * app.iw - sampleProfile(right, (sy + cam.y) * 2.7, world.wrapW), app.iw, fill, P.rock1, face);

  const top = screenY(floorWorldY(5), 1);
  if (top < app.ih + 40) {
    fillBelow(c, 0, app.iw, app.ih, (x) => top + sampleProfile(floor, x + cam.x, world.wrapW),
      fill, P.rock1, world.zoneH * 0.2,
      strata(c, 'trench', [[2, 'rock1', 'rock2', 0.55], [5, 'silhouette', 'rock1', 0.6]]));
    for (const b of boulders) {
      const x = screenX(b.x, 1);
      if (x < -b.w || x > app.iw + b.w) continue;
      const base = top + sampleProfile(floor, x + cam.x, world.wrapW);
      for (let i = 0; i < b.h; i++) {
        const hw = b.w * 0.5 * Math.sqrt(Math.max(0, 1 - (i / b.h) * (i / b.h)));
        const x0 = (x - hw) | 0, w = Math.max(1, (hw * 2) | 0);
        c.fillStyle = fill;
        c.fillRect(x0, (base - i) | 0, w, 1);
        // A boulder is only a boulder once its crown is lighter than its foot.
        if (i > b.h - 3) { c.fillStyle = P.rock1; c.fillRect(x0, (base - i) | 0, w, 1); }
      }
    }
  }
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('midnight', 14, draw);
}
