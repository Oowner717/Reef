// Precedence: a URL parameter wins for the session and is never written to the
// save; otherwise the saved value; otherwise the default. Only values the
// person actually changed are stored, so defaults can move later without being
// pinned by an old save.
import { app, addUpdater } from '../main.js';
import { cfg, present, prefersReducedMotion, ZONE_IDS } from '../config.js';
import { save, markDirty, clearSeen, clearAll } from '../save.js';
import { cam, onRunEnd, jumpToZone } from '../camera.js';
import { spawner } from '../spawner.js';
import { setFps } from '../fps.js';
import { debugState } from '../debug/menu.js';
import { VERSION } from '../version.js';

const opt = (label, value) => ({ label, value });

/**
 * Each row: its options, its default, the URL parameter that overrides it, how
 * to derive the session value from that parameter, and what applying it does.
 */
export const ROWS = [
  { key: 'sound', label: 'sound', url: 'sound', def: 'normal',
    options: [opt('OFF', 'off'), opt('QUIET', 'quiet'), opt('NORMAL', 'normal')],
    fromUrl: () => (cfg.sound ? 'normal' : 'off'), apply() { /* stage 17 */ } },
  { key: 'awake', label: 'keep screen awake', url: 'awake', def: 'on',
    options: [opt('ON', 'on'), opt('OFF', 'off')],
    fromUrl: () => (cfg.awake ? 'on' : 'off'), apply() { /* stage 13 */ } },
  { key: 'speed', label: 'journey speed', url: 'speed', def: 1,
    options: [opt('SLOW', 0.5), opt('NORMAL', 1), opt('BRISK', 2)],
    fromUrl: () => 1, apply(v) { cam.speed = v; } },
  { key: 'start', label: 'start zone', url: 'start', def: 0,
    options: ZONE_IDS.map((id, i) => opt(id.toUpperCase(), i)),
    fromUrl: () => cfg.start, apply(v, first) { if (!first) jumpToZone(v); } },
  { key: 'density', label: 'creature density', url: 'density', def: 1,
    options: [opt('SPARSE', 0.6), opt('NORMAL', 1), opt('CROWDED', 1.4)],
    fromUrl: () => 1, apply(v) { spawner.densityMul = v; } },
  { key: 'scanlines', label: 'scanlines', url: 'crt', def: 'off',
    options: [opt('ON', 'on'), opt('OFF', 'off')],
    fromUrl: () => (cfg.crt ? 'on' : 'off'), apply() { /* stage 14 */ } },
  { key: 'fps', label: 'fps counter', url: 'fps', def: 'off',
    options: [opt('ON', 'on'), opt('OFF', 'off')],
    fromUrl: () => (cfg.fps ? 'on' : 'off'), apply(v) { setFps(v === 'on'); } },
  { key: 'motion', label: 'motion', def: 'system',
    options: [opt('FULL', 'full'), opt('REDUCED', 'reduced'), opt('SYSTEM', 'system')],
    apply() { /* pushed every frame, see syncMotion */ } },
  { key: 'myths', label: 'mythicals per run', def: 2,
    options: [opt('ONE', 1), opt('TWO', 2), opt('THREE', 3)],
    apply() { /* stage 15 */ } },
  { key: 'glossaryButton', label: 'glossary button', url: 'glossary', def: 'show',
    options: [opt('SHOW', 'show'), opt('HIDE', 'hide')],
    fromUrl: () => (cfg.glossary ? 'show' : 'hide'), apply() { /* read live */ } },
  { key: 'debugButton', label: 'debug button', url: 'debug',
    def: () => (parseInt(VERSION, 10) < 1 ? 'show' : 'hide'),
    options: [opt('SHOW', 'show'), opt('HIDE', 'hide')],
    fromUrl: () => 'show',
    apply(v) { debugState.buttonOverride = v === 'show'; } },
];

const byKey = new Map(ROWS.map((r) => [r.key, r]));
const values = Object.create(null);
const overridden = new Set();

function defaultOf(r) { return typeof r.def === 'function' ? r.def() : r.def; }

export function get(key) { return values[key]; }
export function isOverridden(key) { return overridden.has(key); }
export function overriddenKeys() { return [...overridden]; }

export function set(key, value, silent) {
  if (overridden.has(key)) return;          // the URL owns it this session
  const r = byKey.get(key);
  if (!r) return;
  values[key] = value;
  if (value === defaultOf(r)) delete save.settings[key];
  else save.settings[key] = value;
  markDirty();
  if (r.apply) r.apply(value, silent);
}

function resolve() {
  for (const r of ROWS) {
    if (r.url && present.has(r.url)) {
      overridden.add(r.key);
      const v = r.fromUrl ? r.fromUrl() : defaultOf(r);
      // `?speed=10` is not one of the three options; show the raw value.
      values[r.key] = r.key === 'speed' ? cfg.speed : r.key === 'density' ? cfg.density : v;
    } else if (save.settings[r.key] !== undefined) {
      values[r.key] = save.settings[r.key];
    } else {
      values[r.key] = defaultOf(r);
    }
  }
}

function applyAll() {
  for (const r of ROWS) {
    if (!r.apply) continue;
    // The overridden rows are already in force through `cfg`; applying the
    // session value again would double it (speed and density are multipliers).
    if (overridden.has(r.key)) continue;
    r.apply(values[r.key], true);
  }
}

// --- reduced motion ---------------------------------------------------------

function syncMotion() {
  const m = values.motion;
  app.reduced = m === 'full' ? false : m === 'reduced' ? true : prefersReducedMotion();
}

// --- stats and the run position ---------------------------------------------

let flushIn = 0;
function tick(dt) {
  syncMotion();
  const st = save.stats;
  st.watched = (st.watched || 0) + dt;
  if (cam.zone > (st.deepest || 0)) st.deepest = cam.zone;
  // The run position is what lets a silent Safari reload, or a quick return,
  // pick up at the same depth instead of restarting.
  flushIn -= dt;
  if (flushIn <= 0) {
    flushIn = 2;
    save.run.t = cam.t;
    save.run.at = Date.now();
    markDirty();
  }
}

export function resetSeen() { clearSeen(); }
export function resetEverything() {
  clearAll();
  resolve();
  applyAll();
}

export function init() {
  resolve();
  applyAll();
  syncMotion();
  addUpdater(tick, 90);
  onRunEnd(() => { save.stats.runs = (save.stats.runs || 0) + 1; markDirty(); });
}
