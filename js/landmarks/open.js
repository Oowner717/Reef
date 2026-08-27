// Zone 4 — Open Blue. The landmark is the absence of one: the wall recedes into
// haze at the top of the band and after that there is only water.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P, css } from '../palette.js';
import { profile, sampleProfile, fillSide } from './common.js';
import { wallSide } from './dropoff.js';

let face = null;

function build() { face = profile(dailySeed() + 41, 96, 0, 7); }

function draw(c) {
  if (cam.zone < 2 || cam.zone > 4) return;
  const top = 3 * world.zoneH;
  // Fades in exactly where the near wall fades out, and is gone by mid-band.
  const a = Math.max(0, Math.min(1, (cam.depth - 3.0 / 7) / (0.5 / 7)))
    * Math.max(0, 1 - Math.max(0, (cam.depth - 3.5 / 7)) / (0.75 / 7));
  if (a <= 0.02) return;
  const side = wallSide();
  const y0 = Math.max(0, screenY(top - world.zoneH * 0.4, 0.5) | 0);
  const y1 = app.ih;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * a * 0.55;
  fillSide(c, y0, y1, side, (sy) => {
    const wy = sy + cam.y * 0.5;
    const out = 0.17 * app.iw + sampleProfile(face, wy * 2.3, world.wrapW) * 0.7;
    return side < 0 ? out : app.iw - out;
  }, app.iw, P.w5, null);
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('open', 12, draw);
}
