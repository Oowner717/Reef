// Zone 5 — Twilight. One rock pinnacle in silhouette, and otherwise empty.
// It is screen-anchored: a zone's defining landmark has to actually be seen,
// and the sideways current would carry a world-anchored one out of frame.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { P } from '../palette.js';
import { profile, sampleProfile } from './common.js';

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
  c.fillStyle = P.silhouette;
  const rows = Math.min(app.ih - Math.max(0, topY), pinnacle.h);
  for (let i = 0; i < rows; i++) {
    const y = topY + i;
    if (y < 0) continue;
    const t = i / pinnacle.h;
    const hw = pinnacle.w * 0.5 * (0.12 + t * 0.88) + sampleProfile(edge, (topY + i) * 4, world.wrapW) * 0.35;
    c.fillRect((cx - hw) | 0, y | 0, Math.max(1, (hw * 2) | 0), 1);
  }
  c.globalAlpha = prev;
}

export function init() {
  onResize(build);
  addLayer('twilight', 13, draw);
}
