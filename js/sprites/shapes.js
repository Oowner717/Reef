// Pixel-grid builders. Sprites are still pixel data defined in code; these just
// generate the grids from a few measurements instead of sixty hand-typed
// character blocks, which keeps the species files short and the style uniform.
//
// Every builder emits the same alphabet, and each species supplies the map:
//   .  empty      k  outline    b  body      l  belly / light
//   d  dark mark  e  eye        f  fin       g  glow

export function grid(w, h) {
  const g = new Array(h);
  for (let y = 0; y < h; y++) g[y] = new Array(w).fill('.');
  return g;
}
export function rows(g) { return g.map((r) => r.join('')); }

function put(g, x, y, ch) {
  y = Math.round(y); x = Math.round(x);
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
  g[y][x] = ch;
}
function span(g, x, y0, y1, ch) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) put(g, x, y, ch);
}

/** Ring every filled cell with the outline colour. Call last. */
export function outline(g, ch = 'k') {
  const h = g.length, w = g[0].length;
  const add = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (g[y][x] !== '.') continue;
      if ((y > 0 && g[y - 1][x] !== '.' && g[y - 1][x] !== ch) ||
          (y < h - 1 && g[y + 1][x] !== '.' && g[y + 1][x] !== ch) ||
          (x > 0 && g[y][x - 1] !== '.' && g[y][x - 1] !== ch) ||
          (x < w - 1 && g[y][x + 1] !== '.' && g[y][x + 1] !== ch)) add.push(y, x);
    }
  }
  for (let i = 0; i < add.length; i += 2) g[add[i]][add[i + 1]] = ch;
  return g;
}

/**
 * A fish in profile, facing right.
 * o = { len, h, tail, tailH, dorsal, anal, belly, eye, stripes, spots,
 *       bend, frames, snout }
 */
export function fish(o) {
  const w = o.len, h = o.h;
  const n = o.frames || 2;
  const tail = o.tail ?? Math.max(2, Math.round(w * 0.2));
  const tailH = o.tailH ?? Math.max(2, Math.round(h * 0.62));
  const maxHH = (h - 1) / 2 - 1;
  const cy = (h - 1) / 2;
  const out = [];
  for (let f = 0; f < n; f++) {
    const bend = (o.bend ?? 0.8) * Math.sin(((f + 0.5) / n) * Math.PI * 2);
    const g = grid(w, h);
    const x0 = tail, x1 = w - 2;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      const taper = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.40) / 0.62, 2)));
      const hh = maxHH * (o.snout === 'point' ? taper * (1 - u * 0.25) : taper);
      // The head barely moves and the peduncle swings — a fish, not a see-saw.
      const yo = bend * (1 - u) * (1 - u) * h * 0.07;
      span(g, x, cy - hh + yo, cy + hh + yo, 'b');
      if (o.belly !== false) put(g, x, cy + hh + yo, 'l');
      if (o.dorsal && u > 0.24 && u < 0.66) put(g, x, cy - hh + yo - 1, 'f');
      if (o.anal && u > 0.30 && u < 0.55) put(g, x, cy + hh + yo + 1, 'f');
    }
    // tail: tallest at the tip, pinched at the peduncle, forked when big enough
    for (let x = 0; x < tail; x++) {
      const u = x / Math.max(1, tail - 1);
      const th = (tailH * (1 - u) + 1 * u) / 2;
      const yo = bend * h * 0.10 * (1 + (1 - u) * 0.7);
      span(g, x, cy - th + yo, cy + th + yo, 'f');
      if (tailH >= 5 && u < 0.3) {
        for (let y = Math.round(cy + yo - 0.6); y <= Math.round(cy + yo + 0.6); y++) put(g, x, y, '.');
      }
    }
    if (o.stripes) {
      for (const s of o.stripes) {
        const x = Math.round(x0 + (x1 - x0) * s);
        for (let y = 0; y < h; y++) if (g[y][x] === 'b') g[y][x] = 'd';
      }
    }
    if (o.spots) {
      let seed = 7;
      for (let i = 0; i < o.spots; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = x0 + (seed % Math.max(1, x1 - x0));
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const y = 1 + (seed % (h - 2));
        if (g[y] && g[y][x] === 'b') g[y][x] = 'l';
      }
    }
    if (o.eye !== false) {
      const ex = Math.round(x1 - (x1 - x0) * 0.13);
      put(g, ex, cy - Math.max(1, maxHH * 0.35), 'e');
    }
    outline(g);
    out.push(rows(g));
  }
  return out;
}

/**
 * A ray or manta, wings flapping. Wide and flat, tail trailing left.
 * o = { span, h, tail, frames, spots, belly }
 */
export function ray(o) {
  const w = o.span, h = o.h;
  const n = o.frames || 3;
  const cy = (h - 1) / 2;
  const maxHH = (h - 1) / 2 - 1;
  const out = [];
  for (let f = 0; f < n; f++) {
    const bend = Math.sin(((f + 0.5) / n) * Math.PI * 2);
    const g = grid(w, h);
    const x0 = 1, x1 = w - 2;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      const d = Math.abs(u - 0.42) / 0.58;
      const hh = Math.max(0, maxHH * (1 - d * d * 0.93));
      const lift = bend * d * d * h * 0.22;
      span(g, x, cy - hh - lift, cy + hh - lift, 'b');
      if (o.belly !== false) put(g, x, cy + hh - lift, 'l');
    }
    if (o.tail) {
      // A thin whip trailing behind the wings, curving with the flap.
      for (let x = 0; x < o.tail && x < w; x++) {
        put(g, x, cy + bend * (1 - x / o.tail) * 2.2 + 0.5, 'f');
      }
    }
    put(g, Math.round(x0 + (x1 - x0) * 0.72), cy - 1, 'e');
    if (o.spots) {
      let seed = 31;
      for (let i = 0; i < o.spots; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = x0 + (seed % Math.max(1, x1 - x0));
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const y = 1 + (seed % (h - 2));
        if (g[y] && g[y][x] === 'b') g[y][x] = 'l';
      }
    }
    outline(g);
    out.push(rows(g));
  }
  return out;
}

/** A jellyfish: dome plus trailing arms. Frame 0 relaxed, 1 contracting, 2 open. */
export function bell(o) {
  const w = o.w, h = o.h;
  const domeH = o.domeH ?? Math.round(h * 0.45);
  const arms = o.arms ?? 3;
  const out = [];
  const n = o.frames || 3;
  for (let f = 0; f < n; f++) {
    const squeeze = [0, 0.32, -0.16][f % 3];
    const g = grid(w, h);
    const cx = (w - 1) / 2;
    const rw = (w - 3) / 2 * (1 - squeeze * 0.45);
    const rh = domeH * (1 + squeeze * 0.55);
    for (let y = 0; y <= rh; y++) {
      const k = y / Math.max(1, rh);
      const hw = rw * Math.sqrt(Math.max(0, 1 - k * k * 0.86));
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) put(g, x, 1 + (rh - y), 'b');
    }
    for (let x = Math.round(cx - rw); x <= Math.round(cx + rw); x++) put(g, x, 1 + rh, 'l');
    for (let a = 0; a < arms; a++) {
      const ax = cx + (a - (arms - 1) / 2) * Math.max(1, rw / arms * 1.6);
      for (let y = Math.round(2 + rh); y < h; y++) {
        const wob = Math.sin(y * 0.9 + f * 1.9 + a) * (1 - squeeze) * 0.9;
        put(g, ax + wob, y, 'f');
      }
    }
    if (o.glow) put(g, cx, 1 + Math.round(rh * 0.55), 'g');
    outline(g);
    out.push(rows(g));
  }
  return out;
}

/** A soft round body — octopus heads, urchins, boulders, sea cucumbers. */
export function blob(o) {
  const w = o.w, h = o.h;
  const n = o.frames || 2;
  const out = [];
  for (let f = 0; f < n; f++) {
    const g = grid(w, h);
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const rx = (w - 2) / 2, ry = (h - 2) / 2;
    const wob = f === 0 ? 0 : 0.12;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / (rx * (1 + wob)), dy = (y - cy) / (ry * (1 - wob));
        if (dx * dx + dy * dy <= 1) g[y][x] = 'b';
      }
    }
    if (o.spikes) {
      for (let a = 0; a < o.spikes; a++) {
        const th = (a / o.spikes) * Math.PI * 2 + f * 0.2;
        put(g, cx + Math.cos(th) * (rx + 1.4), cy + Math.sin(th) * (ry + 1.4), 'd');
      }
    }
    if (o.arms) {
      // Trailing arms: each one a continuous curve, spread wider when jetting.
      const len = o.armLen || Math.round(h * 0.5);
      const spread = f === 0 ? 1.35 : 0.7;
      for (let a = 0; a < o.arms; a++) {
        const k = (a / Math.max(1, o.arms - 1) - 0.5) * 2;
        for (let t = 0; t <= len; t += 0.5) {
          const th = t / len;
          put(g, cx + k * rx * (0.55 + th * spread) + Math.sin(th * 3 + a * 1.7 + f * 2) * 1.1,
            cy + ry * 0.45 + t, 'f');
        }
      }
    }
    if (o.eyes) { put(g, cx - rx * 0.4, cy - ry * 0.25, 'e'); put(g, cx + rx * 0.35, cy - ry * 0.25, 'e'); }
    if (o.glow) put(g, cx, cy, 'g');
    outline(g);
    out.push(rows(g));
  }
  return out;
}

/** A five-armed star, one arm curling. */
export function star(o) {
  const s = o.w;
  const out = [];
  for (let f = 0; f < (o.frames || 2); f++) {
    const g = grid(s, s);
    const c = (s - 1) / 2, r = c - 0.2;
    for (let a = 0; a < 5; a++) {
      const th = -Math.PI / 2 + a * (Math.PI * 2 / 5);
      const len = r * (a === 0 && f === 1 ? 0.7 : 1);
      for (let t = 0; t <= len; t += 0.5) {
        const wdt = Math.max(0, 1.4 * (1 - t / (r + 0.001)));
        for (let o2 = -wdt; o2 <= wdt; o2 += 0.6) {
          put(g, c + Math.cos(th) * t - Math.sin(th) * o2, c + Math.sin(th) * t + Math.cos(th) * o2, 'b');
        }
      }
    }
    put(g, c, c, 'l');
    outline(g);
    out.push(rows(g));
  }
  return out;
}

/** A short chain segment — eels, siphonophores, worms. */
export function segment(o) {
  const w = o.w, h = o.h;
  return blob({ w, h, frames: o.frames || 2, glow: o.glow });
}
