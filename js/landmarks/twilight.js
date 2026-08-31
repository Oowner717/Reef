// Zone 5 — Twilight. One rock pinnacle in silhouette, and otherwise empty.
// It is screen-anchored: a zone's defining landmark has to actually be seen,
// and the sideways current would carry a world-anchored one out of frame.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P } from '../palette.js';
import { dither, profile, sampleProfile } from './common.js';

let pinnacle = null, edge = null;

function build() {
  const r = rng(dailySeed() + 51);
  edge = profile(dailySeed() + 52, 64, 0, 5);
  pinnacle = {
    at: 0.18 + r() * 0.24 + (r() < 0.5 ? 0 : 0.42),   // left third or right third
    top: (4 + 0.34 + r() * 0.12) * world.zoneH,
    h: world.zoneH * (0.62 + r() * 0.2),
    w: 26 + r() * 16,
  };
}

function draw(c) {
  if (cam.zone < 3 || cam.zone > 5) return;
  // Resolves out of the haze on the way in and back into it on the way down,
  // so the pinnacle belongs to zone 5 and not to its neighbours.
  const a = Math.max(0, Math.min(1, (cam.depth - 3.55 / 7) / (0.55 / 7)))
    * Math.max(0, Math.min(1, 1 - (cam.depth - 5.15 / 7) / (0.45 / 7)));
  if (a <= 0.02) return;
  const topY = screenY(pinnacle.top, 0.5);
  if (topY > app.ih || topY + pinnacle.h < 0) return;
  const cx = pinnacle.at * app.iw;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * a;
  const body = dither(c, 'silhouette', 'rock1', 0.28);
  const rows = Math.min(app.ih - Math.max(0, topY), pinnacle.h);
  for (let i = 0; i < rows; i++) {
    const y = topY + i;
    if (y < 0) continue;
    const t = i / pinnacle.h;
    const hw = pinnacle.w * 0.5 * (0.12 + t * 0.88) + sampleProfile(edge, (topY + i) * 4, world.wrapW) * 0.35;
    const x0 = (cx - hw) | 0, w = Math.max(1, (hw * 2) | 0);
    c.fillStyle = body;
    c.fillRect(x0, y | 0, w, 1);
    // What little light reaches this far still comes from above, so the rock
    // keeps a thin lit edge on one flank and the crown stays paler than the
    // base. Without it the pinnacle is a hole cut in the water.
    c.fillStyle = P.rock2;
    c.fillRect(x0, y | 0, Math.max(1, Math.min(2, w)), 1);
    if (t < 0.16) { c.fillStyle = P.rock1; c.fillRect(x0 + 1, y | 0, Math.max(1, w - 2), 1); }
  }
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('twilight', 13, draw);
}
