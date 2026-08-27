// One versioned JSON blob under one key. Everything is held in memory and the
// blob is the mirror: writes are debounced, never per frame. If storage is
// unavailable the app falls back to an in-memory save and says nothing —
// the aquarium must never fail to run because it could not save.
import { cfg } from './config.js';

const KEY = 'reef.save.v1';
const BACKUP = 'reef.save.backup';
const SCHEMA = 1;
const DEBOUNCE = 2000;

function blank() {
  return {
    version: SCHEMA,
    settings: {},              // only what the person actually changed
    seen: {},                  // id -> first-seen timestamp
    bags: {},                  // vignette and mythical rotations
    stats: { runs: 0, watched: 0, deepest: 0, first: 0, last: 0 },
    run: { t: 0, at: 0 },      // position in the run, for a silent reload
  };
}

export const save = blank();

const state = { storage: true, loaded: false, bytes: 0, writes: 0, failed: false };
export function saveHealth() { return state; }

function store() {
  if (!cfg.save) return null;
  try {
    const s = window.localStorage;
    // Touch it: private browsing can throw on write rather than on access.
    s.setItem('reef.probe', '1');
    s.removeItem('reef.probe');
    return s;
  } catch (_) {
    state.storage = false;
    return null;
  }
}

function adopt(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
  if (parsed.version !== SCHEMA) throw new Error('version ' + parsed.version);
  const fresh = blank();
  for (const k of Object.keys(fresh)) {
    if (parsed[k] && typeof parsed[k] === 'object') Object.assign(fresh[k], parsed[k]);
  }
  Object.assign(save, fresh);
}

export function load() {
  if (state.loaded) return save;
  state.loaded = true;
  const s = store();
  if (!s) return save;
  let raw = null;
  try { raw = s.getItem(KEY); } catch (_) { state.storage = false; return save; }
  if (!raw) return save;
  state.bytes = raw.length;
  try {
    adopt(raw);
  } catch (e) {
    // An unknown or corrupt save is backed up rather than thrown away, and the
    // app carries on from a blank one.
    console.warn('save unreadable (' + e.message + '), starting fresh');
    try { s.setItem(BACKUP, raw); } catch (_) { /* out of quota; nothing to do */ }
    Object.assign(save, blank());
    state.failed = true;
  }
  return save;
}

let timer = 0, dirty = false;

export function markDirty() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => { timer = 0; flush(); }, DEBOUNCE);
}

export function flush() {
  if (!dirty) return;
  dirty = false;
  if (timer) { clearTimeout(timer); timer = 0; }
  const s = store();
  if (!s) return;
  try {
    const raw = JSON.stringify(save);
    s.setItem(KEY, raw);
    state.bytes = raw.length;
    state.writes++;
  } catch (_) {
    state.storage = false;      // quota or private mode: in-memory from here on
  }
}

export function clearSeen() { save.seen = {}; markDirty(); }

export function clearAll() {
  Object.assign(save, blank());
  const s = store();
  if (s) { try { s.removeItem(KEY); } catch (_) { /* nothing to do */ } }
  markDirty();
}

export function init() {
  load();
  const now = Date.now();
  if (!save.stats.first) save.stats.first = now;
  save.stats.last = now;
  markDirty();
  const onHide = () => flush();
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', onHide);
  window.addEventListener('freeze', onHide);
}
