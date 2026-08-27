// The vignette interface. The director owns selection, timing, staging and
// teardown; a vignette owns only what happens.
export const VIGNETTES = [];

/**
 * o = {
 *   id, zone, name, note,          identity and glossary metadata
 *   duration,                      seconds, 6-10
 *   needs: ['stingray'],           species ids to promote or spawn
 *   start(v),                      called once, actors already placed
 *   update(v, t, dt),              t counts 0..duration
 *   draw(ctx, v),                  optional, drawn above the creatures
 *   end(v),                        optional teardown beyond the standard one
 *   peak: [from, to],              the payoff window; quality is frozen inside it
 *   can(),                         optional: false when it cannot be staged now
 * }
 */
export function defineVignette(o) {
  const v = { duration: 8, needs: [], peak: null, kind: 'vignette', ...o };
  if (VIGNETTES.some((x) => x.id === v.id)) console.warn('duplicate vignette id', v.id);
  VIGNETTES.push(v);
  return v;
}

export function vignettesForZone(z) { return VIGNETTES.filter((v) => v.zone === z); }
export function vignetteById(id) { return VIGNETTES.find((v) => v.id === id) || null; }

// --- staging helpers --------------------------------------------------------

import { cam } from '../camera.js';
import { app } from '../main.js';
import { css } from '../palette.js';

/**
 * World coordinates that will land at a given screen point on a parallax layer.
 * Placing a far-layer actor with plain world coordinates puts it somewhere else
 * entirely, because a far layer moves at a fraction of the camera.
 */
export function worldAt(sx, sy, layer = 1) {
  if (layer === 1 || !layer) return { x: cam.x + sx, y: cam.y + sy };
  return { x: cam.x * layer + sx, y: cam.y + (sy - app.ih * 0.5 * (1 - layer)) / layer };
}

/** A soft glow: three nested ellipses of falling alpha, drawn in whole rows. */
export function softGlow(c, cx, cy, rx, ry, colour, alpha) {
  for (let pass = 0; pass < 3; pass++) {
    const k = 1 - pass * 0.3;
    const h = ry * k;
    c.fillStyle = css(colour, alpha * 0.3);
    for (let i = -h; i <= h; i++) {
      const hw = rx * k * Math.sqrt(Math.max(0, 1 - (i / h) * (i / h)));
      if (hw < 0.5) continue;
      c.fillRect((cx - hw) | 0, (cy + i) | 0, Math.max(1, (hw * 2) | 0), 1);
    }
  }
}

// --- timing helpers ---------------------------------------------------------

export function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
export function ease(t) { const k = clamp01(t); return k * k * (3 - 2 * k); }
/** 0 before `a`, 1 after `b`, smoothly between. */
export function phase(t, a, b) { return ease((t - a) / Math.max(1e-6, b - a)); }
/** A 0 -> 1 -> 0 pulse across [a, b]. */
export function pulse(t, a, b) {
  const k = clamp01((t - a) / Math.max(1e-6, b - a));
  return Math.sin(k * Math.PI);
}
