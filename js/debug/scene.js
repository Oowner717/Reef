// The behaviour proving ground: one crude sprite per movement type, all on
// screen at once, so the twelve can be compared side by side.
// Opened with ?debug=behaviours or the toggle in the debug menu.
import { addLayer, addUpdater, app, layer } from '../main.js';
import { defineSprite, defineVariant, text } from '../sprites.js';
import { P, css } from '../palette.js';
import { cfg } from '../config.js';
import { addToggle, addChoice } from './registry.js';
import { Creature } from '../creatures/base.js';
import * as B from '../behaviours.js';

const S = {
  '.': null, k: 'outline', y: 'accYellow', c: 'bioCyan', m: 'bioMagenta',
  l: 'bioLime', v: 'bioViolet', o: 'accOrange', w: 'white', g: 'greyPale',
};

defineSprite('dbg-fish', { map: S, frames: [
  ['k...kkk.', '.kkyyyyk', 'kyyyyoyk', '.kkyyyyk', 'k...kkk.'],
  ['.k..kkk.', 'kkkyyyyk', 'kyyyyoyk', 'kkkyyyyk', '.k..kkk.'],
] });
defineSprite('dbg-seg', { map: S, frames: [
  ['.ccc.', 'ccccc', 'ccccc', 'ccccc', '.ccc.'],
  ['.ccc.', 'cckcc', 'ccccc', 'cckcc', '.ccc.'],
] });
defineSprite('dbg-wing', { map: S, frames: [
  ['..kvvvvvvk..', '.kvvvvvvvvk.', 'kvvvvwwvvvvk', '.kvvvvvvvvk.', '..kkvvvvkk..'],
  ['....kvvk....', '..kvvvvvvk..', 'kvvvvwwvvvvk', '..kvvvvvvk..', '....kvvk....'],
] });
defineSprite('dbg-bell', { map: S, frames: [
  ['..mmm..', '.mmmmm.', 'mmmmmmm', '.m.m.m.', '.m.m.m.', '..m.m..'],
  ['.mmmmm.', 'mmmmmmm', 'mmmmmmm', '.mm.mm.', '..m.m..', '..m.m..'],
  ['...m...', '.mmmmm.', '.mmmmm.', '.m.m.m.', '.m.m.m.', '.m...m.'],
] });
defineSprite('dbg-squid', { map: S, frames: [
  ['..lll..', '.lllll.', '.lllll.', '..lll..', '.l.l.l.', 'l..l..l'],
  ['..lll..', '.lllll.', '.lllll.', '..lll..', '..lll..', '..lll..'],
] });
defineSprite('dbg-round', { map: S, frames: [
  ['.ooo.', 'ooooo', 'okoko', 'ooooo', '.ooo.'],
  ['.ooo.', 'ooooo', 'ooooo', 'ooooo', '.ooo.'],
] });
// The three round demos share a grid and swap palette maps, so they are told
// apart by colour as well as by motion.
defineVariant('dbg-round', 'graze', { ...S, o: 'bioLime' });
defineVariant('dbg-round', 'ambush', { ...S, o: 'bioMagenta' });

defineSprite('dbg-bird', { map: S, frames: [
  ['k.....k', '.kk.kk.', '..kkk..', '..kkk..', '...k...'],
  ['.......', 'kk...kk', '.kkkkk.', '..kkk..', '...k...'],
] });

const COLS = 2, ROWS = 6;
export const sceneState = { on: false, rate: 1, focus: 0 };

// Each demo: a species-shaped definition, a crude sprite, and tuning chosen to
// make its movement unmistakable against the other eleven.
const DEMOS = [
  ['schooling', B.schooling, 'dbg-fish', 2, 6, { min: 9, max: 9, spread: 16, speed: 22, travel: 5, rise: 0,
    sep: 40, sepR: 3.5, align: 1.4, cohere: 1.1, targetPull: 1.2, jitter: 6, maxTurn: 5, swirl: 12, swirlRate: 1.1 }, B.renderFlock],
  ['cruising', B.cruising, 'dbg-fish', 2, 6, { speed: 16, turnRate: 0.35, turnAmp: 0.5, agility: 1.2, vertical: 0.3, surge: 0.1 }],
  ['undulating', B.undulating, 'dbg-seg', 2, 5, { segments: 9, segLen: 3.2, speed: 13, waveRate: 2.4, waveAmp: 26, ripple: 20, lag: 0.8 }, B.renderChain],
  ['flapping', B.flapping, 'dbg-wing', 2, 6, { period: 2.4, beat: 0.4, speed: 12, lift: 16, sink: 7 }],
  ['pulsing', B.pulsing, 'dbg-bell', 3, 4, { period: 2.6, contract: 0.28, thrust: 34, drag: 2.4, sink: 5, wander: 5 }],
  ['jetting', B.jetting, 'dbg-squid', 2, 8, { rest: 1.6, burst: 0.45, speed: 62, spread: 1.1 }],
  ['hovering', B.hovering, 'dbg-round', 2, 5, { rate: 1.5, bob: 3, sway: 2, faceEvery: 2.6 }],
  ['grazing', B.grazing, 'dbg-round', 2, 6, { speed: 7, range: 34, biteEvery: 1.4, biteTime: 0.45, follow: 1.2 }, null, 'graze'],
  ['skimming', B.skimming, 'dbg-fish', 2, 8, { speed: 34, depth: 5, breaks: true, breakTime: 0.9, breakHeight: 9 }],
  ['ambush', B.ambush, 'dbg-round', 2, 5, { reach: 13, emerge: 0.5, watch: 1.4, withdraw: 0.6, hide: 2.2 }, null, 'ambush'],
  ['falling', B.falling, 'dbg-seg', 2, 3, { sink: 9, drift: 7, driftRate: 0.9, spin: 1.1 }],
  ['diving', B.diving, 'dbg-bird', 2, 6, { diveSpeed: 74, riseSpeed: 46, depth: 26, hold: 0.45, exitAbove: 16 }],
];

const demos = [];

function cellFor(i) {
  const w = app.iw / COLS, h = (app.ih - 16) / ROWS;
  return { x: (i % COLS) * w, y: 12 + Math.floor(i / COLS) * h, w, h };
}

function place(d, i, reset) {
  const cell = cellFor(i);
  const cx = cell.x + cell.w * 0.5, cy = cell.y + cell.h * 0.62;
  if (reset) {
    d.c.spawn(d.def, cx, cy, d.id === 'diving' ? { ceilY: cell.y + 16 } :
      d.id === 'skimming' ? { ceilY: cell.y + 14 } : undefined);
    d.c.face = 1;
  }
  d.cell = cell;
}

function build() {
  demos.length = 0;
  DEMOS.forEach(([id, behaviour, sprite, frames, fps, tune, render, variant], i) => {
    const def = { id, sprite, frames, fps, behaviour, tune, layer: 0, render, variant, size: 12 };
    const d = { id, def, c: new Creature() };
    demos.push(d);
    place(d, i, true);
  });
}

let hidden = null;
function update(dt) {
  // The stage 1 test fish would otherwise drift through the proving ground.
  const tf = layer('testfish');
  if (tf) {
    if (sceneState.on && hidden === null) { hidden = tf.enabled; tf.enabled = false; }
    else if (!sceneState.on && hidden !== null) { tf.enabled = hidden; hidden = null; }
  }
  if (!sceneState.on) return;
  if (!demos.length) build();
  const k = dt * sceneState.rate;
  demos.forEach((d, i) => {
    place(d, i, false);
    d.c.update(k);
    const cell = d.cell;
    // Keep each demo inside its own cell so the twelve can be compared.
    const pad = 10;
    if (d.c.x < cell.x + pad) { d.c.x = cell.x + pad; d.c.face = 1; d.c.d.a = 0; d.c.vx = Math.abs(d.c.vx); }
    if (d.c.x > cell.x + cell.w - pad) { d.c.x = cell.x + cell.w - pad; d.c.face = -1; d.c.d.a = Math.PI; d.c.vx = -Math.abs(d.c.vx); }
    if (d.c.y < cell.y + 8) { d.c.y = cell.y + 8; d.c.vy = Math.abs(d.c.vy); }
    if (d.c.y > cell.y + cell.h - 4) { d.c.y = cell.y + cell.h - 4; d.c.vy = -Math.abs(d.c.vy) * 0.5; }
    d.c.homeX = cell.x + cell.w * 0.5;
    d.c.homeY = cell.y + cell.h * 0.55;
    if (d.id === 'diving' && !d.c.alive) place(d, i, true);
    if (d.c.flock) {
      for (let j = 0; j < d.c.flock.n; j++) {
        d.c.flock.x[j] = Math.min(cell.x + cell.w - 4, Math.max(cell.x + 4, d.c.flock.x[j]));
        d.c.flock.y[j] = Math.min(cell.y + cell.h - 4, Math.max(cell.y + 6, d.c.flock.y[j]));
      }
    }
  });
}

function draw(c) {
  if (!sceneState.on || !demos.length) return;
  c.fillStyle = css(P.w6, 0.82);
  c.fillRect(0, 0, app.iw, app.ih);
  text(c, 'BEHAVIOUR LIBRARY', 3, 3, P.bioCyan, 0.9);
  demos.forEach((d, i) => {
    const cell = d.cell;
    c.fillStyle = css(P.greyPale, i === sceneState.focus ? 0.22 : 0.08);
    c.fillRect(cell.x + 1, cell.y, cell.w - 2, 1);
    text(c, d.id, cell.x + 3, cell.y + 3, i === sceneState.focus ? P.accYellow : P.silver, 0.75);
    d.c.draw(c);
  });
}

export function init() {
  if (cfg.debug === 'behaviours') sceneState.on = true;
  addUpdater(update, 50);
  addLayer('debug-scene', 150, draw);
  layer('debug-scene').enabled = true;
  addToggle('behaviours', 'debug scene', () => sceneState.on,
    (v) => { sceneState.on = v; if (v && !demos.length) build(); }, { sectionOrder: 30 });
  addChoice('behaviours', 'tuning: focus',
    DEMOS.map((d, i) => ({ label: d[0], value: i })),
    () => sceneState.focus, (v) => { sceneState.focus = v; });
  addChoice('behaviours', 'tuning: rate',
    [0.25, 0.5, 1, 2, 4].map((v) => ({ label: v + 'X', value: v })),
    () => sceneState.rate, (v) => { sceneState.rate = v; });
}
