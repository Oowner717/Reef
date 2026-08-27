// Loop, integer scaling, portrait handling, visibility, layer compositing.
//
// Feature modules register into this file rather than this file importing a
// growing list of them. Because those registrations happen while this module
// is still evaluating, a feature module may only touch `app` from inside a
// callback, never at module top level.
import { cfg, prefersReducedMotion } from './config.js';
import { P, css } from './palette.js';
import { defineSprite, rasteriseAll, drawSpriteC, text, textWidth } from './sprites.js';
import { VERSION } from './version.js';
// --- stage wiring: feature modules, imported so their sprite grids register
// before the atlas is built. Initialised in MODULES at the foot of this file.
import * as camera from './camera.js';
import * as water from './water.js';
import * as perfMod from './perf.js';
import * as fps from './fps.js';
import * as buttons from './ui/buttons.js';
import * as panel from './ui/panel.js';
import * as debugMenu from './debug/menu.js';
import * as debugScene from './debug/scene.js';
import './creatures/zone1.js';
import './creatures/zone2.js';
import './creatures/zone3.js';
import './creatures/zone4.js';
import './creatures/zone5.js';
import './creatures/zone6.js';
import './creatures/zone7.js';
import * as shallows from './landmarks/shallows.js';
import * as reefLand from './landmarks/reef.js';
import * as dropoff from './landmarks/dropoff.js';
import * as openLand from './landmarks/open.js';
import * as twilight from './landmarks/twilight.js';
import * as midnight from './landmarks/midnight.js';
import * as vents from './landmarks/vents.js';
import './creatures/travellers.js';
import * as spawner from './spawner.js';

export const app = {
  iw: 0, ih: 0, scale: 1, dpr: 1, rotated: false,
  time: 0, dt: 0, frame: 0, running: false, reduced: false, tier: 0,
};

const canvas = document.getElementById('reef');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

// --- registries -------------------------------------------------------------

const layers = [];    // { name, order, enabled, draw }
const updaters = [];  // { order, fn }
const resizers = [];
const taps = [];      // { order, fn(x, y) -> true if consumed }
let perfHook = null;
let uiFade = () => 0.15;
let stampAnchor = null;

/** Register a draw layer. Order is back-to-front; see DESIGN.md section 2. */
export function addLayer(name, order, draw) {
  const l = { name, order, enabled: true, draw };
  layers.push(l);
  layers.sort((a, b) => a.order - b.order);
  return l;
}
export function layer(name) { return layers.find((l) => l.name === name) || null; }
export function layerNames() { return layers.map((l) => l.name); }
export function addUpdater(fn, order = 0) {
  updaters.push({ order, fn });
  updaters.sort((a, b) => a.order - b.order);
}
export function onResize(fn) { resizers.push(fn); if (app.iw) fn(app.iw, app.ih); }
/** Higher order runs first; return true to consume the tap. */
export function addTapHandler(fn, order = 0) {
  taps.push({ order, fn });
  taps.sort((a, b) => b.order - a.order);
}
export function setPerfHook(fn) { perfHook = fn; }
/** Stage 3's button cluster owns the shared fade; the version stamp joins it. */
export function setUiFadeSource(fn) { uiFade = fn; }
/** ...and the same safe-area inset, so the stamp clears the home indicator. */
export function setStampAnchor(fn) { stampAnchor = fn; }

// --- layout -----------------------------------------------------------------

function pickScale(deviceW) {
  let best = 0, bestErr = Infinity;
  for (let s = 2; s <= 12; s++) {
    const iw = Math.ceil(deviceW / s);
    if (iw < 190 || iw > 290) continue;
    const err = Math.abs(iw - 228);
    if (err < bestErr) { bestErr = err; best = s; }
  }
  return best || Math.max(1, Math.round(deviceW / 228));
}

function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rotated = window.innerWidth > window.innerHeight;
  const vw = rotated ? window.innerHeight : window.innerWidth;
  const vh = rotated ? window.innerWidth : window.innerHeight;
  const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
  const s = pickScale(W);
  const iw = Math.ceil(W / s), ih = Math.ceil(H / s);
  if (iw === app.iw && ih === app.ih && s === app.scale && rotated === app.rotated) return;

  canvas.width = iw; canvas.height = ih;
  ctx.imageSmoothingEnabled = false;
  canvas.style.width = (iw * s / dpr) + 'px';
  canvas.style.height = (ih * s / dpr) + 'px';
  canvas.style.transform = 'translate(-50%,-50%)' + (rotated ? ' rotate(90deg)' : '');

  app.iw = iw; app.ih = ih; app.scale = s; app.dpr = dpr; app.rotated = rotated;
  for (const fn of resizers) fn(iw, ih);
}

function toInternal(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  let px, py;
  if (app.rotated) {
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    px = dy + (app.iw * app.scale / app.dpr) / 2;
    py = -dx + (app.ih * app.scale / app.dpr) / 2;
  } else {
    px = clientX - r.left; py = clientY - r.top;
  }
  return [px * app.dpr / app.scale, py * app.dpr / app.scale];
}

// --- the loop ---------------------------------------------------------------

const MAX_DT = 1 / 20;
let last = 0, raf = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const t0 = now;
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0) || dt > MAX_DT) dt = dt > MAX_DT ? MAX_DT : 1 / 60;
  app.dt = dt; app.time += dt; app.frame++;

  for (let i = 0; i < updaters.length; i++) updaters[i].fn(dt);

  ctx.fillStyle = P.w1;
  ctx.fillRect(0, 0, app.iw, app.ih);
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].enabled) layers[i].draw(ctx);
  }
  drawVersionStamp();

  if (perfHook) perfHook(performance.now() - t0, now);
}

function start() {
  if (app.running) return;
  app.running = true;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function stop() {
  app.running = false;
  cancelAnimationFrame(raf);
}

// --- the version stamp ------------------------------------------------------

function drawVersionStamp() {
  const a = uiFade();
  if (a <= 0.01) return;
  const at = stampAnchor ? stampAnchor() : null;
  text(ctx, VERSION, at ? at[0] : 3, at ? at[1] : app.ih - 8, P.silver, a);
}

// --- stage 1 test sprite ----------------------------------------------------

defineSprite('testfish', {
  map: { '.': null, k: 'outline', y: 'accYellow', o: 'outline' },
  frames: [
    ['..............',
     'k....kkkkk....',
     'kk.kkyyyyykk..',
     'kkkyyyyyyyyyk.',
     'kkkyyyyyyoyyk.',
     'kkkyyyyyyyyyk.',
     'kk.kkyyyyykk..',
     'k....kkkkk....'],
    ['k.............',
     'kk...kkkkk....',
     'kkkkkyyyyykk..',
     '.kkyyyyyyyyyk.',
     '.kkyyyyyyoyyk.',
     '.kkyyyyyyyyyk.',
     'kkkkkyyyyykk..',
     'kk...kkkkk....'],
  ],
});

const fish = { x: 20, y: 60, vx: 14, phase: 0 };
addUpdater((dt) => {
  fish.x += fish.vx * dt;
  fish.phase += dt;
  if (fish.x > app.iw + 20) fish.x = -20;
  fish.y = app.ih * 0.42 + Math.sin(fish.phase * 0.7) * app.ih * 0.06;
});
addLayer('testfish', 40, (c) => {
  drawSpriteC(c, 'testfish', (fish.phase * 7) | 0, fish.x | 0, fish.y | 0, false);
});

// --- input blocking and lifecycle -------------------------------------------

function blockDefault(e) { e.preventDefault(); }
window.addEventListener('touchmove', blockDefault, { passive: false });
window.addEventListener('gesturestart', blockDefault, { passive: false });
window.addEventListener('gesturechange', blockDefault, { passive: false });
window.addEventListener('contextmenu', blockDefault);
window.addEventListener('dblclick', blockDefault);
window.addEventListener('dragstart', blockDefault);

function handleTap(clientX, clientY) {
  const [x, y] = toInternal(clientX, clientY);
  for (let i = 0; i < taps.length; i++) if (taps[i].fn(x, y)) return;
}
window.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  handleTap(e.clientX, e.clientY);
});

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 60));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop(); else { layout(); start(); }
});

const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function readMotion() { app.reduced = prefersReducedMotion(); }
readMotion();
if (mq && mq.addEventListener) mq.addEventListener('change', readMotion);

// --- boot -------------------------------------------------------------------
//
// Stage wiring. Feature modules are imported at the top of this file, so their
// sprite grids are registered before the atlas is built, and each exports an
// `init()` that runs here once the canvas exists. Registering from a module's
// top level instead would touch this file's bindings while they are still in
// their temporal dead zone. Each stage adds one import and one entry below.
const MODULES = [camera, water, shallows, reefLand, dropoff, openLand, twilight, midnight, vents, spawner,
  panel, buttons, fps, debugMenu, debugScene];

try {
  if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
} catch (_) { /* iOS ignores orientation lock; the canvas rotates instead */ }

setPerfHook(perfMod.sample);
rasteriseAll();
layout();
for (const m of MODULES) m.init(app);
if (!document.hidden) start();

// Reachable for later stages that compose over the same context.
export { ctx, canvas, css, textWidth, cfg };
