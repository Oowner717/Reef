// The dithered water column: one strip, pre-rendered at internal resolution
// once per resize, scrolled through by the camera. Never dithered per frame.
import { addLayer, onResize, app } from './main.js';
import { world, rampStopsAt, ventCast, colourDepth } from './world.js';
import { rgb, P } from './palette.js';
import { cam } from './camera.js';

// 4x4 ordered Bayer, the classic 16-bit water dither.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

let strip = null;
let stripW = 0, stripH = 0;

function warm(colour, k) {
  if (k <= 0) return rgb(colour);
  const a = rgb(colour), b = rgb(P.ventHot);
  return [
    (a[0] + (b[0] - a[0]) * k) | 0,
    (a[1] + (b[1] - a[1]) * k) | 0,
    (a[2] + (b[2] - a[2]) * k) | 0,
  ];
}

function build(iw) {
  // Drop the old one before allocating: never hold two columns at once.
  strip = null;
  const h = world.columnH;
  if (!iw || !h) return;
  const c = document.createElement('canvas');
  c.width = iw; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(iw, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const depth = colourDepth(y);
    const st = rampStopsAt(depth);
    const cast = ventCast(depth) * 0.16;
    const A = warm(st.a, cast), B = warm(st.b, cast);
    const f = st.f;
    const brow = (y & 3) * 4;
    let o = y * iw * 4;
    for (let x = 0; x < iw; x++) {
      const th = (BAYER[brow + (x & 3)] + 0.5) / 16;
      const col = f > th ? B : A;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      o += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  strip = c;
  stripW = iw; stripH = h;
}

function draw(c) {
  if (!strip) return;
  let y = Math.round(cam.y);
  const maxY = Math.max(0, stripH - app.ih);
  if (y < 0) y = 0; else if (y > maxY) y = maxY;
  const sh = Math.min(app.ih, stripH - y);
  c.drawImage(strip, 0, y, stripW, sh, 0, 0, stripW, sh);
  if (sh < app.ih) {
    c.fillStyle = P.w8;
    c.fillRect(0, sh, app.iw, app.ih - sh);
  }
  if (stripW < app.iw) {
    c.fillStyle = P.w8;
    c.fillRect(stripW, 0, app.iw - stripW, app.ih);
  }
}

/** Dropped on pagehide/freeze and rebuilt on resume — it is regenerable. */
export function releaseStrip() { strip = null; stripW = 0; stripH = 0; }
export function rebuildStrip() { if (!strip && app.iw) build(app.iw); }

export function stripBytes() { return stripW * stripH * 4; }
export function stripSize() { return { w: stripW, h: stripH }; }

export function init() {
  onResize((iw) => build(iw));
  addLayer('water', 0, draw);
}
