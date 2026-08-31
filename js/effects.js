// Light: a low-resolution additive buffer that everything bright writes into,
// composited back once per frame. Sprites feed it automatically through the
// atlas's bright-pixel analysis, so a creature glows because it has glowing
// pixels, not because someone remembered to declare it.
import { addLayer, onResize, app } from './main.js';
import { cam, screenY } from './camera.js';
import { world, zoneValue } from './world.js';
import { P, css, rgb } from './palette.js';
import { setGlowSink, GLOW_TOKENS } from './sprites.js';
import { tierParams } from './perf.js';
import { floorWorldY, FLOOR } from './landmarks/common.js';
import { get as setting } from './settings/settings.js';
import { cfg } from './config.js';
import { addInfo, addToggle } from './debug/registry.js';
import { addProvider } from './debug/diagnostics.js';

export const effects = { bloom: true, shafts: true, caustics: true, glows: 0, div: 2 };

let buf = null, bctx = null, bw = 0, bh = 0;
let shaftTile = null, caustic = [], vignette = null, scanTile = null, blobs = null;

// --- offscreen surfaces, all in internal pixels ------------------------------

/** One soft radial blob per glow colour, so a glow is a single drawImage. */
function makeBlobs() {
  const R = 24, size = R * 2;
  return GLOW_TOKENS.map((token) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const [r, gg, b] = rgb(P[token]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - R + 0.5, y - R + 0.5) / R;
        if (d >= 1) continue;
        const a = Math.pow(1 - d, 3.2);
        const o = (y * size + x) * 4;
        img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b;
        img.data[o + 3] = (a * 255) | 0;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

function makeShaftTile() {
  const w = 32, h = 96;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const [r, gg, b] = rgb(P.w0);
  for (let y = 0; y < h; y++) {
    const fy = 1 - y / h;
    for (let x = 0; x < w; x++) {
      const u = Math.abs(x / (w - 1) - 0.5) * 2;
      // Soft edges, a brighter core, and a fade down the length of the beam.
      const a = Math.pow(1 - u, 2.1) * Math.pow(fy, 1.35);
      const o = (y * w + x) * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b;
      img.data[o + 3] = (a * 235) | 0;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function makeCaustics() {
  const w = 48, h = 32, frames = [];
  const [r, g, b] = rgb(P.w0);
  for (let f = 0; f < 4; f++) {
    const ph = (f / 4) * Math.PI * 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
        // Interfering waves, sharpened into thin veins of light.
        const s = Math.sin(u * 2 + Math.sin(v * 3 + ph)) + Math.sin(v * 2 + Math.sin(u * 3 - ph));
        const a = Math.pow(Math.max(0, s * 0.5 + 0.5), 7);
        const o = (y * w + x) * 4;
        img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
        img.data[o + 3] = (a * 255) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}

function makeVignette(iw, ih) {
  const w = Math.max(8, iw >> 2), h = Math.max(8, ih >> 2);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x / (w - 1) - 0.5) * 2, dy = (y / (h - 1) - 0.5) * 2;
      const d = Math.sqrt(dx * dx * 0.82 + dy * dy);
      const a = Math.pow(Math.max(0, d - 0.44) / 0.62, 1.7);
      const o = (y * w + x) * 4;
      img.data[o + 3] = Math.min(255, a * 88) | 0;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function makeScanlines() {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 3;
  const g = c.getContext('2d');
  g.fillStyle = css(P.w8, 0.30);
  g.fillRect(0, 2, 1, 1);
  return c;
}

function build(iw, ih) {
  releaseEffects();
  effects.div = tierParams().bloom >= 1 ? 2 : 3;
  bw = Math.max(8, Math.ceil(iw / effects.div));
  bh = Math.max(8, Math.ceil(ih / effects.div));
  buf = document.createElement('canvas');
  buf.width = bw; buf.height = bh;
  bctx = buf.getContext('2d');
  blobs = makeBlobs();
  shaftTile = makeShaftTile();
  caustic = makeCaustics();
  vignette = makeVignette(iw, ih);
  scanTile = makeScanlines();
}

export function releaseEffects() {
  buf = null; bctx = null; shaftTile = null; caustic = []; vignette = null;
  scanTile = null; blobs = null; bw = 0; bh = 0;
}
export function rebuildEffects() { if (!buf && app.iw) build(app.iw, app.ih); }
export function effectsBytes() {
  if (!buf) return 0;
  const blobArea = GLOW_TOKENS.length * 48 * 48;
  return (bw * bh + blobArea + 32 * 96 + 48 * 32 * 4 + (app.iw >> 2) * (app.ih >> 2)) * 4;
}

// --- the glow buffer --------------------------------------------------------

let gain = 0;

/** The sink every sprite draw offers its bright pixels to. */
function glow(sx, sy, r, colourIndex, weight) {
  if (!bctx || !blobs || gain <= 0.02) return;
  if (sx < -40 || sx > app.iw + 40 || sy < -40 || sy > app.ih + 40) return;
  const d = effects.div;
  const rr = Math.max(1.5, (r * 2.2) / d);
  effects.glows++;
  bctx.globalAlpha = Math.min(0.5, weight * gain);
  bctx.drawImage(blobs[colourIndex] || blobs[0], sx / d - rr, sy / d - rr, rr * 2, rr * 2);
  bctx.globalAlpha = 1;
}

/** An expanding ring of light. The mythicals' signature move reuses this. */
export function ring(cx, cy, radius, thickness, colour, alpha) {
  if (!bctx) return;
  const d = effects.div;
  const x = cx / d, y = cy / d, r = radius / d, th = Math.max(1, thickness / d);
  bctx.globalAlpha = Math.min(1, alpha);
  bctx.strokeStyle = colour;
  bctx.lineWidth = th;
  bctx.beginPath();
  bctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  bctx.stroke();
  bctx.globalAlpha = 1;
}

function startFrame() {
  if (!bctx) rebuildEffects();
  if (!bctx) return;
  const t = tierParams();
  effects.glows = 0;
  // Almost nothing blooms in daylight; in the dark the glow is the animal.
  gain = (effects.bloom && t.bloom > 0)
    ? (0.10 + zoneValue(cam.centre, 'glow') * 1.05) * t.bloom : 0;
  bctx.clearRect(0, 0, bw, bh);
}

// --- light shafts -----------------------------------------------------------

function drawShafts() {
  if (!bctx || !effects.shafts || !shaftTile) return;
  const t = tierParams();
  const strength = zoneValue(cam.centre, 'shafts');
  if (strength <= 0.01 || t.maxShafts === 0) return;
  const n = Math.min(7, t.maxShafts === Infinity ? 7 : t.maxShafts);
  const d = effects.div;
  const slow = app.reduced ? 0.35 : 1;
  bctx.save();
  for (let i = 0; i < n; i++) {
    const seedX = (i / n + 0.06) * world.wrapW;
    // Beams sit far away, so they barely move with the sideways current.
    const x = ((seedX - cam.x * 0.12) % world.wrapW + world.wrapW) % world.wrapW;
    let sx = (x / world.wrapW) * (app.iw * 1.35) - app.iw * 0.2;
    const sway = Math.sin(app.time * 0.18 * slow + i * 2.1) * 7;
    const w = (6 + Math.abs(Math.sin(i * 1.7)) * 10) * (1 + Math.sin(app.time * 0.3 * slow + i) * 0.14);
    // A beam hangs from the surface, but only until the surface is half a
    // screen above the view; past that it hangs from just off the top instead.
    // Anchoring it to a ceiling two zones up would put the whole beam off
    // screen, and the reef would lose its light the moment the ceiling did.
    const top = Math.min(0, Math.max(-app.ih * 0.5, screenY(4, 1)));
    const len = (app.ih - top) * (0.85 + (i % 3) * 0.18);
    bctx.globalAlpha = strength * (0.11 + (i % 3) * 0.05);
    bctx.translate((sx + sway) / d, top / d);
    bctx.rotate(0.10 + (i % 2) * 0.05);
    bctx.drawImage(shaftTile, 0, 0, 32, 96, 0, 0, w / d, len / d);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  bctx.restore();
  bctx.globalAlpha = 1;
}

// --- composite and the surface passes ---------------------------------------

function composite(c) {
  if (!buf || gain <= 0 && !effects.shafts) return;
  const prev = c.globalCompositeOperation;
  c.imageSmoothingEnabled = true;
  c.globalCompositeOperation = 'lighter';
  c.drawImage(buf, 0, 0, bw, bh, 0, 0, app.iw, app.ih);
  c.globalCompositeOperation = prev;
  c.imageSmoothingEnabled = false;
}

function drawCaustics(c) {
  if (!effects.caustics || !caustic.length) return;
  const t = tierParams();
  if (!t.caustics) return;
  const strength = zoneValue(cam.centre, 'caustics');
  if (strength <= 0.02) return;
  const zone = cam.zone;
  const frame = caustic[(app.time * (app.reduced ? 3 : 7)) % 4 | 0];
  const drift = -cam.x * 0.6;
  const prev = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter';

  // On the seabed, where the light actually lands. Zone 3 is skipped: its
  // "floor" is a shelf that ends halfway across, so a band of caustics at that
  // depth would be light landing on open water.
  if (zone !== 2 && FLOOR[zone] !== null && FLOOR[zone] !== undefined) {
    const fy = screenY(floorWorldY(zone), 1);
    if (fy < app.ih && fy > -40) {
      c.globalAlpha = strength * 0.34;
      for (let x = -48; x < app.iw + 48; x += 48) {
        c.drawImage(frame, (x + (drift % 48)) | 0, (fy - 3) | 0, 48, 22);
      }
    }
  }
  // And the faintest dapple in the water just under the surface film — enough
  // to feel the light moving, never enough to read as texture.
  const top = screenY(6, 1);
  const reach = app.ih * 0.46;
  if (top > -reach) {
    const other = caustic[(app.time * 5 + 2) % 4 | 0];
    let row = 0;
    for (let y = top; y < top + reach; y += 40, row++) {
      // Light thins with every metre it travels, so the dapple has to run out
      // rather than stop: no horizon line where the effect simply ends.
      const k = 1 - (y - top) / reach;
      c.globalAlpha = strength * 0.055 * k * k;
      if (c.globalAlpha < 0.004) break;
      for (let x = -72; x < app.iw + 72; x += 72) {
        c.drawImage(other, (x + (drift * 0.45 % 72)) | 0, y | 0, 72, 40);
      }
    }
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = prev;
}

/** The darkened edge of the frame. Named for the lens, not for the scenes. */
function drawVignette(c) {
  if (!vignette) return;
  c.imageSmoothingEnabled = true;
  c.drawImage(vignette, 0, 0, vignette.width, vignette.height, 0, 0, app.iw, app.ih);
  c.imageSmoothingEnabled = false;
}

function scanlinesOn() {
  return cfg.crt || setting('scanlines') === 'on';
}

function drawScanlines(c) {
  if (!scanTile || !scanlinesOn()) return;
  const p = c.createPattern(scanTile, 'repeat');
  c.fillStyle = p;
  c.fillRect(0, 0, app.iw, app.ih);
}

export function init() {
  onResize(build);
  setGlowSink(glow);
  addLayer('fx-clear', -5, startFrame);
  addLayer('caustics', 26, drawCaustics);
  addLayer('shafts', 58, () => drawShafts());
  addLayer('bloom', 62, composite);
  addLayer('edge-shade', 66, drawVignette);
  addLayer('scanlines', 68, drawScanlines);

  addInfo('effects', 'glows this frame', () => String(effects.glows), { sectionOrder: 36 });
  addInfo('effects', 'bloom buffer', () => bw + 'X' + bh + ' (1/' + effects.div + ')');
  addToggle('effects', 'bloom', () => effects.bloom, (v) => { effects.bloom = v; });
  addToggle('effects', 'shafts', () => effects.shafts, (v) => { effects.shafts = v; });
  addToggle('effects', 'caustics', () => effects.caustics, (v) => { effects.caustics = v; });
  addProvider('effects', 34, () => 'bloom ' + effects.bloom + ' gain ' + gain.toFixed(2) +
    ' buffer ' + bw + 'x' + bh + '  glows ' + effects.glows +
    '  shafts ' + effects.shafts + '  caustics ' + effects.caustics +
    '  scanlines ' + scanlinesOn());
}
