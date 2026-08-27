#!/usr/bin/env node
// Renders the icons from the same sprite and palette data the app uses, and
// writes the PNGs. A maintenance script, not a build step — the app never runs
// this, and the PNGs are committed.
//
//   node tools/make-icons.mjs
//
// The icon is the whole descent in one square: a dithered column from sunlit
// teal to near-black, one light shaft, and a single bold yellow tang mid-frame.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { P, rgb } from '../js/palette.js';
import { rampStopsAt, ventCast } from '../js/world.js';
import { fish } from '../js/sprites/shapes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'icons');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// --- a minimal PNG writer ---------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePng(file, w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                       // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

// --- the icon, drawn on a grid of whole pixels -------------------------------

function drawIcon(grid, safe) {
  const cells = new Array(grid * grid);
  const put = (x, y, c) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= grid || y >= grid) return;
    cells[y * grid + x] = c;
  };

  // The column: the app's own ramp, dithered with the app's own Bayer matrix.
  for (let y = 0; y < grid; y++) {
    const d = y / (grid - 1);
    const st = rampStopsAt(d);
    const cast = ventCast(d) * 0.16;
    const A = warm(st.a, cast), B = warm(st.b, cast);
    for (let x = 0; x < grid; x++) {
      const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      put(x, y, st.f > th ? B : A);
    }
  }

  // One light shaft, leaning as it falls: a solid core with dithered fringes,
  // so it reads as a beam rather than as scattered sparkle.
  const shaftTop = grid * 0.19, shaftW = grid * 0.16;
  const depth = grid * 0.56;
  for (let y = 0; y < depth; y++) {
    const t = y / depth;
    const cx = shaftTop + y * 0.20;
    const half = shaftW * (0.5 + t * 0.45);
    const strength = 1 - t * t * 0.95;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const edge = 1 - Math.abs(x - cx) / Math.max(1, half);
      const v = strength * edge;
      if (v > 0.55) { put(x, y, rgb(P.w0)); continue; }
      const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (v > th * 0.9) put(x, y, rgb(P.w0));
    }
  }

  // The tang, mid-frame, facing right, at about 40% of the icon's width.
  const scale = safe ? 0.34 : 0.42;
  const len = Math.max(9, Math.round(grid * scale));
  const frames = fish({ len, h: Math.round(len * 0.66), tail: Math.round(len * 0.26),
    dorsal: true, anal: true, frames: 1, bend: 0, stripes: [0.66] });
  const rows = frames[0];
  const fw = rows[0].length, fh = rows.length;
  const ox = Math.round((grid - fw) / 2), oy = Math.round(grid * 0.46 - fh / 2);
  const MAP = { k: rgb(P.outline), b: rgb(P.accYellow), l: rgb(P.accYellow),
    d: rgb(P.outline), f: rgb(P.accOrange), e: rgb(P.outline) };
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const c = MAP[rows[y][x]];
      if (c) put(ox + x, oy + y, c);
    }
  }
  // A second outline ring, so the shape holds against both the bright top and
  // the dark floor at 60 px.
  const ring = rgb(P.outline);
  for (let y = -1; y <= fh; y++) {
    for (let x = -1; x <= fw; x++) {
      const inside = (yy, xx) => yy >= 0 && yy < fh && xx >= 0 && xx < fw && rows[yy][xx] !== '.';
      if (inside(y, x)) continue;
      if (inside(y - 1, x) || inside(y + 1, x) || inside(y, x - 1) || inside(y, x + 1)) {
        put(ox + x, oy + y, ring);
      }
    }
  }
  return cells;
}

function warm(token, k) {
  const a = rgb(token), b = rgb(P.ventHot);
  if (k <= 0) return a;
  return [(a[0] + (b[0] - a[0]) * k) | 0, (a[1] + (b[1] - a[1]) * k) | 0, (a[2] + (b[2] - a[2]) * k) | 0];
}

function render(size, safe) {
  const px = Math.max(1, Math.round(size / 64));
  if (size % px !== 0) throw new Error(`${size} is not a whole multiple of its pixel size`);
  const grid = size / px;
  const cells = drawIcon(grid, safe);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = cells[((y / px) | 0) * grid + ((x / px) | 0)] || [0, 0, 0];
      const o = (y * size + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  return { buf: out, size };
}

mkdirSync(OUT, { recursive: true });
for (const [name, size, safe] of [
  ['icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
]) {
  const { buf } = render(size, safe);
  writePng(join(OUT, name), size, size, buf);
  console.log('wrote icons/' + name + '  ' + size + 'x' + size);
}
