// Shared landmark drawing. Everything here stays on whole pixels: terrain is
// drawn as merged integer-height column runs rather than filled paths, because
// a path edge on a 215 px canvas is an anti-aliased smear once it is upscaled.
import { P } from '../palette.js';
import { rng, world } from '../world.js';

const patterns = new Map();

/**
 * Where the seabed sits inside each band, as a fraction of the band height.
 * null means open water. Zone 3's shelf ends early — that is the drop-off.
 */
export const FLOOR = [0.86, 0.86, 0.28, null, null, 0.90, 0.88];

export function floorWorldY(zoneIndex) {
  return (zoneIndex + FLOOR[zoneIndex]) * world.zoneH;
}

/** A cached 4x4 ordered-dither tile between two tokens. level is 0..1. */
export function dither(c, a, b, level) {
  const key = a + '|' + b + '|' + Math.round(level * 4);
  let p = patterns.get(key);
  if (p) return p;
  const t = document.createElement('canvas');
  t.width = t.height = 4;
  const g = t.getContext('2d');
  g.fillStyle = P[a] || a;
  g.fillRect(0, 0, 4, 4);
  g.fillStyle = P[b] || b;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if ((BAYER[y * 4 + x] + 0.5) / 16 < level) g.fillRect(x, y, 1, 1);
    }
  }
  p = c.createPattern(t, 'repeat');
  if (patterns.size < 40) patterns.set(key, p);
  return p;
}

const strataCache = new Map();

/**
 * Cached strata for `fillBelow`. spec is [[height, tokenA, tokenB, level], ...]
 * from the surface down; built once, because the patterns underneath are
 * themselves cached against one context.
 */
export function strata(c, key, spec) {
  let v = strataCache.get(key);
  if (v) return v;
  v = spec.map((b) => ({ h: b[0], fill: dither(c, b[1], b[2], b[3]) }));
  strataCache.set(key, v);
  return v;
}

/**
 * A seeded height profile: `n` samples of a summed-sine ridge line, so the
 * same date always gives the same seabed.
 */
export function profile(seed, n, base, amp) {
  const r = rng(seed);
  const a = new Float32Array(n);
  const f1 = 0.6 + r() * 0.8, f2 = 1.9 + r() * 1.4, f3 = 4.1 + r() * 2.2;
  const p1 = r() * 9, p2 = r() * 9, p3 = r() * 9;
  for (let i = 0; i < n; i++) {
    const u = i / n * Math.PI * 2;
    a[i] = base - amp * (
      0.55 * Math.sin(u * f1 + p1) +
      0.30 * Math.sin(u * f2 + p2) +
      0.15 * Math.sin(u * f3 + p3));
  }
  return a;
}

/** Sample a wrapped profile at a world x. */
export function sampleProfile(a, worldX, wrapW) {
  const n = a.length;
  let u = (worldX / wrapW) % 1;
  if (u < 0) u += 1;
  const f = u * n;
  const i = f | 0;
  const j = (i + 1) % n;
  return a[i] + (a[j] - a[i]) * (f - i);
}

/**
 * Fill everything below a top edge, as merged runs of equal integer height.
 * topAt(x) returns the screen y of the surface at screen column x.
 */
export function fillBelow(c, x0, x1, bottom, topAt, fill, rim, thickness, bands) {
  if (bottom <= 0) return;
  const th = thickness || Infinity;
  let runStart = x0, runTop = Math.round(topAt(x0));
  for (let x = x0 + 1; x <= x1; x++) {
    const t = x < x1 ? Math.round(topAt(x)) : -99999;
    if (t !== runTop) {
      // A seabed is a ledge, not a bottomless fill: bound it by `thickness` so
      // descending past it shows water again rather than a screen of rock.
      const bot = Math.min(bottom, runTop + th);
      const top = Math.max(0, runTop);
      if (top < bot) {
        c.fillStyle = fill;
        c.fillRect(runStart, top, x - runStart, bot - top);
        // Strata under the rim: the ground catches the light for a few pixels
        // and then turns away from it, which is the whole difference between a
        // seabed and a coloured rectangle.
        if (bands) {
          let at = runTop;
          for (let i = 0; i < bands.length; i++) {
            const b = bands[i];
            const y0 = Math.max(0, at), y1 = Math.min(bot, at + b.h);
            if (y1 > y0) { c.fillStyle = b.fill; c.fillRect(runStart, y0, x - runStart, y1 - y0); }
            at += b.h;
          }
        }
        if (rim && runTop >= -1) { c.fillStyle = rim; c.fillRect(runStart, runTop, x - runStart, 1); }
      }
      runStart = x; runTop = t;
    }
  }
}

/** The mirror of fillBelow, for a ceiling. */
export function fillAbove(c, x0, x1, top, bottomAt, fill, rim) {
  let runStart = x0, runBot = Math.round(bottomAt(x0));
  for (let x = x0 + 1; x <= x1; x++) {
    const b = x < x1 ? Math.round(bottomAt(x)) : -99999;
    if (b !== runBot) {
      if (runBot > top) {
        c.fillStyle = fill;
        c.fillRect(runStart, top, x - runStart, runBot - top);
        if (rim) { c.fillStyle = rim; c.fillRect(runStart, runBot - 1, x - runStart, 1); }
      }
      runStart = x; runBot = b;
    }
  }
}

/**
 * A vertical wall on one side: fill out to an edge that varies with row.
 * `bands` are strata measured inward from the edge, exactly as in fillBelow —
 * a wall face turning away from the water rather than a black rectangle.
 */
export function fillSide(c, y0, y1, side, edgeAt, iw, fill, rim, bands) {
  let runStart = y0, runEdge = Math.round(edgeAt(y0));
  for (let y = y0 + 1; y <= y1; y++) {
    const e = y < y1 ? Math.round(edgeAt(y)) : -99999;
    if (e !== runEdge) {
      const h = y - runStart;
      c.fillStyle = fill;
      if (side < 0) c.fillRect(0, runStart, runEdge, h);
      else c.fillRect(runEdge, runStart, iw - runEdge, h);
      if (bands) {
        let at = 0;
        for (let i = 0; i < bands.length; i++) {
          const b = bands[i];
          c.fillStyle = b.fill;
          if (side < 0) {
            const x1 = runEdge - at, x0 = Math.max(0, x1 - b.h);
            if (x1 > x0) c.fillRect(x0, runStart, x1 - x0, h);
          } else {
            const x0 = runEdge + at, x1 = Math.min(iw, x0 + b.h);
            if (x1 > x0) c.fillRect(x0, runStart, x1 - x0, h);
          }
          at += b.h;
        }
      }
      if (rim) {
        c.fillStyle = rim;
        c.fillRect(side < 0 ? runEdge - 1 : runEdge, runStart, 1, h);
      }
      runStart = y; runEdge = e;
    }
  }
}

/** A swaying blade — kelp, seagrass, tube worm plume. */
export function blade(c, x, baseY, len, sway, phase, colour, width) {
  c.fillStyle = colour;
  const w = width || 1;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const dx = Math.sin(phase + t * 2.1) * sway * t * t;
    c.fillRect(Math.round(x + dx), Math.round(baseY - i), w, 1);
  }
}
