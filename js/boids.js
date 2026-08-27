// Flocking core, used by every schooling species. Members live in typed arrays
// so a school of sixty allocates nothing per frame.

export function createFlock(cap) {
  return {
    cap, n: 0,
    x: new Float32Array(cap), y: new Float32Array(cap),
    vx: new Float32Array(cap), vy: new Float32Array(cap),
    ph: new Float32Array(cap),
    tx: 0, ty: 0, wander: 0,
  };
}

export function seedFlock(f, n, cx, cy, spread, speed, rnd) {
  f.n = Math.min(n, f.cap);
  for (let i = 0; i < f.n; i++) {
    f.x[i] = cx + (rnd() - 0.5) * spread;
    f.y[i] = cy + (rnd() - 0.5) * spread * 0.6;
    const a = rnd() * Math.PI * 2;
    f.vx[i] = Math.cos(a) * speed;
    f.vy[i] = Math.sin(a) * speed * 0.4;
    f.ph[i] = rnd() * 6;
  }
  f.tx = cx; f.ty = cy; f.wander = rnd() * 100;
}

/**
 * p = { sep, sepR, align, cohere, speed, maxTurn, jitter, target, targetPull,
 *       vertical } — vertical scales how freely the school changes depth.
 * Neighbours are sampled in a rotating window so cost stays linear in n.
 */
export function updateFlock(f, dt, p, frame) {
  const n = f.n;
  if (!n) return;
  const sepR2 = p.sepR * p.sepR;
  const nbR2 = (p.sepR * 3.5) * (p.sepR * 3.5);
  const window = n > 24 ? 10 : n;
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, cn = 0;
    const start = n > 24 ? (i * 7 + frame) % n : 0;
    for (let k = 0; k < window; k++) {
      const j = n > 24 ? (start + k) % n : k;
      if (j === i) continue;
      const dx = f.x[j] - f.x[i], dy = f.y[j] - f.y[i];
      const d2 = dx * dx + dy * dy;
      if (d2 > nbR2 || d2 === 0) continue;
      if (d2 < sepR2) { sx -= dx / d2; sy -= dy / d2; }
      ax += f.vx[j]; ay += f.vy[j];
      cx += f.x[j]; cy += f.y[j];
      cn++;
    }
    let fx = sx * p.sep, fy = sy * p.sep;
    if (cn) {
      fx += (ax / cn - f.vx[i]) * p.align;
      fy += (ay / cn - f.vy[i]) * p.align;
      fx += (cx / cn - f.x[i]) * p.cohere;
      fy += (cy / cn - f.y[i]) * p.cohere;
    }
    fx += (f.tx - f.x[i]) * p.targetPull;
    fy += (f.ty - f.y[i]) * p.targetPull * (p.vertical ?? 1);
    fx += (Math.sin(f.ph[i] * 3.1 + i) ) * p.jitter;
    fy += (Math.cos(f.ph[i] * 2.7 + i * 1.7)) * p.jitter;

    let vx = f.vx[i] + fx * dt, vy = f.vy[i] + fy * dt;
    // Cap the turn rate so a school banks rather than snapping.
    const sp = Math.hypot(vx, vy) || 1e-6;
    const want = Math.min(sp, p.speed * 1.6);
    vx = vx / sp * want; vy = vy / sp * want;
    const cur = Math.hypot(f.vx[i], f.vy[i]);
    if (cur > 1e-4) {
      const dot = (vx * f.vx[i] + vy * f.vy[i]) / (want * cur);
      const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      const max = p.maxTurn * dt;
      if (ang > max) {
        const t = max / ang;
        vx = f.vx[i] / cur * want * (1 - t) + vx * t;
        vy = f.vy[i] / cur * want * (1 - t) + vy * t;
        const s2 = Math.hypot(vx, vy) || 1e-6;
        vx = vx / s2 * want; vy = vy / s2 * want;
      }
    }
    f.vx[i] = vx; f.vy[i] = vy;
    f.x[i] += vx * dt; f.y[i] += vy * dt;
    f.ph[i] += dt;
  }
}

/** Move the school's shared target on a slow wander. */
export function driftTarget(f, dt, cx, cy, rx, ry, rate) {
  f.wander += dt * rate;
  f.tx = cx + Math.sin(f.wander) * rx + Math.sin(f.wander * 0.37) * rx * 0.4;
  f.ty = cy + Math.sin(f.wander * 0.61) * ry;
}

/** Bounding box of the school, for culling and for vignette staging. */
export function flockBounds(f, out) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < f.n; i++) {
    if (f.x[i] < x0) x0 = f.x[i];
    if (f.x[i] > x1) x1 = f.x[i];
    if (f.y[i] < y0) y0 = f.y[i];
    if (f.y[i] > y1) y1 = f.y[i];
  }
  out.x0 = x0; out.y0 = y0; out.x1 = x1; out.y1 = y1;
  return out;
}
