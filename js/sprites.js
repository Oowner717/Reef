// Pixel grids -> a small number of packed atlas pages, drawn with source
// rectangles. Never one canvas per sprite: WebKit's per-canvas overhead is
// what kills this on iOS. Everything here is sized in internal pixels.
import { rgb, P } from './palette.js';

const PAGE = 512;
const MAX_PAGES = 4;

const defs = new Map();     // key -> { map, frames, w, h }
const entries = new Map();  // key -> { w, h, n, f: [slot], fx: [slot] }
const pages = [];
let sx = 0, sy = 0, shelf = 0, page = -1;
let built = false;

/**
 * def = { map: { '.': null, 'k': 'outline', 'y': ['accYellow', 0.5] },
 *         frames: [ ['..k.', '.kk.'], ... ] }
 * Every frame must be the same size. Frames are rasterised as-is plus a
 * horizontally flipped copy.
 */
export function defineSprite(key, def) {
  if (built) { console.warn('sprite defined after atlas build:', key); return; }
  const f0 = def.frames[0];
  const h = f0.length, w = f0[0].length;
  for (const fr of def.frames) {
    if (fr.length !== h || fr.some((r) => r.length !== w)) {
      console.error('ragged sprite frames:', key); return;
    }
  }
  defs.set(key, { map: def.map, frames: def.frames, w, h });
}

/** Same pixel grid, a different palette map — for colour-shifting animals. */
export function defineVariant(key, variant, map) {
  const base = defs.get(key);
  if (!base) { console.error('no base sprite for variant', key, variant); return; }
  defineSprite(key + ':' + variant, { map, frames: base.frames });
}

function newPage() {
  if (pages.length >= MAX_PAGES) { console.error('sprite atlas full'); return false; }
  const c = document.createElement('canvas');
  c.width = c.height = PAGE;
  const ctx = c.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;
  pages.push({ canvas: c, ctx });
  page = pages.length - 1;
  sx = 0; sy = 0; shelf = 0;
  return true;
}

function alloc(w, h) {
  if (page < 0 && !newPage()) return null;
  if (sx + w > PAGE) { sx = 0; sy += shelf; shelf = 0; }
  if (sy + h > PAGE) { if (!newPage()) return null; }
  const slot = { p: page, x: sx, y: sy };
  sx += w; if (h > shelf) shelf = h;
  return slot;
}

function pixels(def, frame, flip) {
  const { w, h } = def;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let fy = 0; fy < h; fy++) {
    const row = frame[fy];
    for (let fx = 0; fx < w; fx++) {
      const ch = row[flip ? w - 1 - fx : fx];
      const m = def.map[ch];
      if (m === undefined || m === null) continue;
      const token = Array.isArray(m) ? m[0] : m;
      const a = Array.isArray(m) ? m[1] : 1;
      const [r, g, b] = rgb(token);
      const i = (fy * w + fx) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = (a * 255) | 0;
    }
  }
  return out;
}

function blit(def, frame, flip) {
  const slot = alloc(def.w, def.h);
  if (!slot) return { p: 0, x: 0, y: 0 };
  const img = new ImageData(pixels(def, frame, flip), def.w, def.h);
  pages[slot.p].ctx.putImageData(img, slot.x, slot.y);
  return slot;
}

/**
 * Where a sprite's bright pixels are and what colour they average to. Computed
 * once at build time so the bloom pass can light every glowing creature without
 * any species declaring anything: if a sprite has bright pixels, it glows.
 */
function analyse(def) {
  const frame = def.frames[0];
  const px = [];
  let sr = 0, sg = 0, sb = 0;
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const m = def.map[frame[y][x]];
      if (m === undefined || m === null) continue;
      const token = Array.isArray(m) ? m[0] : m;
      const [r, g, b] = rgb(token);
      // Bright, and either near-white or strongly coloured. A mid grey belly is
      // not a lamp.
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (luma < 205 && !(luma > 140 && sat > 90)) continue;
      px.push(x, y);
      sr += r; sg += g; sb += b;
    }
  }
  const n = px.length >> 1;
  if (n < 3) return null;
  let cx = 0, cy = 0;
  for (let i = 0; i < px.length; i += 2) { cx += px[i]; cy += px[i + 1]; }
  cx /= n; cy /= n;
  let spread = 0;
  for (let i = 0; i < px.length; i += 2) spread += Math.hypot(px[i] - cx, px[i + 1] - cy);
  spread /= n;
  // Scattered highlights — a whale shark's spot grid, a rim light — are not a
  // glow. Only pixels clustered into a lamp are.
  if (spread > 3.4 + Math.sqrt(n) * 0.9) return null;
  const area = def.w * def.h;
  const colour = nearestGlow(sr / n, sg / n, sb / n);
  return {
    n,
    cx: cx + 0.5, cy: cy + 0.5,
    // The halo belongs to the animal: never wider than the animal itself, or a
    // jellyfish stops being a jellyfish and becomes a ball of light.
    r: Math.min(spread * 1.6 + 2.5, Math.max(def.w, def.h) * 0.55),
    weight: Math.min(0.8, 0.16 + n / Math.max(20, area * 0.9)) * GLOW_WEIGHT[colour],
    colour,
  };
}

/** Rasterise every registered sprite. Called once, from the loading step. */
export function rasteriseAll() {
  for (const [key, def] of defs) {
    const f = [], fx = [];
    for (const frame of def.frames) {
      f.push(blit(def, frame, false));
      fx.push(blit(def, frame, true));
    }
    entries.set(key, { w: def.w, h: def.h, n: def.frames.length, f, fx, bright: analyse(def) });
  }
  built = true;
}

// Glow colours are quantised to a handful of palette tokens so the bloom pass
// can pre-render one soft blob per colour instead of tinting per draw.
export const GLOW_TOKENS = ['white', 'bioCyan', 'bioMagenta', 'bioLime',
  'bioViolet', 'bioGold', 'ventWarm', 'accYellow', 'accOrange'];

// A white belly is lit; a bioluminescent organ is a lamp. Same pass, different
// conviction, so pale animals keep their silhouette and the bio colours sing.
const GLOW_WEIGHT = [0.5, 1, 1, 1, 1, 0.8, 0.95, 0.7, 0.7];

function nearestGlow(r, g, b) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < GLOW_TOKENS.length; i++) {
    const [tr, tg, tb] = rgb(P[GLOW_TOKENS[i]]);
    const d = (tr - r) * (tr - r) + (tg - g) * (tg - g) + (tb - b) * (tb - b);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Stage 14's bloom registers here. Every sprite draw offers its bright pixels;
// the sink decides whether the depth makes them worth lighting.
let glowSink = null;
export function setGlowSink(fn) { glowSink = fn; }

export function drawSprite(ctx, key, frame, x, y, flip) {
  const e = entries.get(key);
  if (!e) return;
  const n = e.n;
  const s = (flip ? e.fx : e.f)[((frame % n) + n) % n];
  ctx.drawImage(pages[s.p].canvas, s.x, s.y, e.w, e.h, x | 0, y | 0, e.w, e.h);
  if (glowSink && e.bright) {
    const b = e.bright;
    glowSink(x + (flip ? e.w - b.cx : b.cx), y + b.cy, b.r, b.colour, b.weight);
  }
}

/** Centred draw — the common case, since positions are creature centres. */
export function drawSpriteC(ctx, key, frame, cx, cy, flip) {
  const e = entries.get(key);
  if (!e) return;
  drawSprite(ctx, key, frame, cx - (e.w >> 1), cy - (e.h >> 1), flip);
}

export function spriteMeta(key) { return entries.get(key) || null; }
export function spriteKeys() { return [...entries.keys()]; }
export function atlasPage(i) { return pages[i] ? pages[i].canvas : null; }
export function atlasBytes() { return pages.length * PAGE * PAGE * 4; }
export function atlasPageCount() { return pages.length; }

// ---------------------------------------------------------------------------
// The 3x5 pixel font. One glyph strip per colour, built on demand and capped.

const FONT = {
  ' ': ['...', '...', '...', '...', '...'], 'A': ['###', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
  'C': ['###', '#..', '#..', '#..', '###'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'], 'E': ['###', '#..', '###', '#..', '###'],
  'F': ['###', '#..', '###', '#..', '#..'], 'G': ['###', '#..', '#.#', '#.#', '###'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
  'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '###'], 'K': ['#.#', '#.#', '##.', '#.#', '#.#'],
  'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#.#', '###', '###', '#.#', '#.#'], 'N': ['##.', '#.#', '#.#', '#.#', '#.#'],
  'O': ['###', '#.#', '#.#', '#.#', '###'], 'P': ['###', '#.#', '###', '#..', '#..'], 'Q': ['###', '#.#', '#.#', '###', '..#'],
  'R': ['###', '#.#', '###', '##.', '#.#'], 'S': ['###', '#..', '###', '..#', '###'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
  'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'], 'W': ['#.#', '#.#', '###', '###', '#.#'],
  'X': ['#.#', '#.#', '.#.', '#.#', '#.#'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'Z': ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '..#', '..#'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'], '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'], '+': ['...', '.#.', '###', '.#.', '...'], '*': ['#.#', '.#.', '#.#', '...', '...'],
  '(': ['..#', '.#.', '.#.', '.#.', '..#'], ')': ['#..', '.#.', '.#.', '.#.', '#..'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['###', '..#', '.#.', '...', '.#.'], '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '=': ['...', '###', '...', '###', '...'], '_': ['...', '...', '...', '...', '###'], '#': ['#.#', '###', '#.#', '###', '#.#'],
  '[': ['##.', '#..', '#..', '#..', '##.'], ']': ['.##', '..#', '..#', '..#', '.##'], "'": ['.#.', '.#.', '...', '...', '...'],
};
const ORDER = Object.keys(FONT);
const INDEX = new Map(ORDER.map((c, i) => [c, i]));
export const GLYPH_W = 3, GLYPH_H = 5, ADVANCE = 4;

const fontPages = new Map();
function fontFor(colour) {
  let fp = fontPages.get(colour);
  if (fp) return fp;
  if (fontPages.size >= 10) fontPages.delete(fontPages.keys().next().value);
  const c = document.createElement('canvas');
  c.width = ORDER.length * ADVANCE; c.height = GLYPH_H;
  const ctx = c.getContext('2d');
  const [r, g, b] = rgb(colour);
  const data = new Uint8ClampedArray(c.width * c.height * 4);
  ORDER.forEach((ch, i) => {
    const rows = FONT[ch];
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (rows[y][x] !== '#') continue;
        const o = (y * c.width + i * ADVANCE + x) * 4;
        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
      }
    }
  });
  ctx.putImageData(new ImageData(data, c.width, c.height), 0, 0);
  fp = c;
  fontPages.set(colour, fp);
  return fp;
}

export function textWidth(s, scale = 1) { return (s.length * ADVANCE - 1) * scale; }

/** Draw uppercase pixel text. `s` is uppercased; unknown glyphs become spaces. */
export function text(ctx, s, x, y, colour = P.silver, alpha = 1, scale = 1) {
  if (alpha <= 0.004) return;
  const fp = fontFor(colour);
  const prev = ctx.globalAlpha;
  if (alpha < 1) ctx.globalAlpha = prev * alpha;
  let px = x | 0;
  for (let i = 0; i < s.length; i++) {
    const idx = INDEX.get(s[i]) ?? INDEX.get(s[i].toUpperCase());
    if (idx !== undefined && s[i] !== ' ') {
      ctx.drawImage(fp, idx * ADVANCE, 0, GLYPH_W, GLYPH_H,
        px, y | 0, GLYPH_W * scale, GLYPH_H * scale);
    }
    px += ADVANCE * scale;
  }
  ctx.globalAlpha = prev;
}

/** Integer draw with no string allocation — for the per-frame fps counter. */
export function drawInt(ctx, v, x, y, colour, alpha = 1, scale = 1) {
  const fp = fontFor(colour);
  const prev = ctx.globalAlpha;
  if (alpha < 1) ctx.globalAlpha = prev * alpha;
  let n = v < 0 ? 0 : v | 0;
  let digits = 1, t = n;
  while (t >= 10) { t = (t / 10) | 0; digits++; }
  let px = (x | 0) + (digits - 1) * ADVANCE * scale;
  do {
    const idx = INDEX.get(String.fromCharCode(48 + (n % 10)));
    ctx.drawImage(fp, idx * ADVANCE, 0, GLYPH_W, GLYPH_H, px, y | 0, GLYPH_W * scale, GLYPH_H * scale);
    px -= ADVANCE * scale;
    n = (n / 10) | 0;
  } while (n > 0);
  ctx.globalAlpha = prev;
  return digits * ADVANCE * scale - scale;
}
