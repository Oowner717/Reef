// The title screen, which doubles as the loading screen: the atlas, the water
// strip and the save all happen behind it, so it costs no time and buys the app
// a first impression. It reuses the real renderer rather than separate art.
import { addLayer, addUpdater, addTapHandler, app } from './main.js';
import { cam, seek, screenX, screenY } from './camera.js';
import { world } from './world.js';
import { cfg, present } from './config.js';
import { P, css } from './palette.js';
import { defineSprite, defineVariant, drawSprite, spriteMeta, text, textWidth } from './sprites.js';
import { save } from './save.js';
import { spawner, repopulate } from './spawner.js';
import { seenCount } from './glossary/seen.js';
import { total } from './registry.js';
import { VERSION } from './version.js';

const HOLD = 2.2, FADE = 0.6;
const RESUME_WINDOW = 5 * 60 * 1000;

// --- the wordmark -----------------------------------------------------------
// Built from grid data like everything else: a 6x7 block per letter, scaled up.

const GLYPHS = {
  R: ['#####.', '#....#', '#....#', '#####.', '#..##.', '#...##', '#....#'],
  E: ['######', '#.....', '#.....', '#####.', '#.....', '#.....', '######'],
  F: ['######', '#.....', '#.....', '#####.', '#.....', '#.....', '#.....'],
};
const SCALE = 3, GAP = 4;

function wordmark(word) {
  const gh = 7 * SCALE;
  const gw = 6 * SCALE;
  const w = word.length * gw + (word.length - 1) * GAP;
  const rows = [];
  for (let y = 0; y < gh; y++) {
    let line = '';
    for (let i = 0; i < word.length; i++) {
      const g = GLYPHS[word[i]];
      const src = g[(y / SCALE) | 0];
      for (let x = 0; x < gw; x++) line += src[(x / SCALE) | 0] === '#' ? 'b' : '.';
      if (i < word.length - 1) line += '.'.repeat(GAP);
    }
    rows.push(line);
  }
  return { rows, w, h: gh };
}

const WORD = wordmark('REEF');
defineSprite('title-word', { map: { '.': null, b: 'white' }, frames: [WORD.rows] });
defineVariant('title-word', 'shine', { '.': null, b: 'w0' });
defineVariant('title-word', 'shadow', { '.': null, b: 'outline' });

// --- state ------------------------------------------------------------------

export const title = { active: false, t: 0, skipped: false };
let drifters = [];
let scratch = null;

function silhouette(c, key, x, y, alpha) {
  const m = spriteMeta(key);
  if (!m) return;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = scratch.height = 256; }
  const g = scratch.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, m.w + 2, m.h + 2);
  drawSprite(g, key, 0, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = P.silhouette;
  g.fillRect(0, 0, m.w, m.h);
  g.globalCompositeOperation = 'source-over';
  const prev = c.globalAlpha;
  c.globalAlpha = prev * alpha;
  c.drawImage(scratch, 0, 0, m.w, m.h, (x - m.w / 2) | 0, (y - m.h / 2) | 0, m.w, m.h);
  c.globalAlpha = prev;
}

function pickDrifters() {
  const items = spawner.pool.items;
  const keys = [];
  for (let i = 0; i < items.length && keys.length < 3; i++) {
    const c = items[i];
    if (c.alive && c.def.band !== 'motes' && keys.indexOf(c.def.sprite) < 0) keys.push(c.def.sprite);
  }
  while (keys.length < 3) keys.push('turtle');
  drifters = keys.map((k, i) => ({
    key: k,
    x: -30 + i * (app.iw * 0.45),
    y: app.ih * (0.22 + i * 0.13),
    v: 7 + i * 4,
  }));
}

// --- drawing ----------------------------------------------------------------

/** A serpent far back in the haze — a tease for something not yet met. */
function drawTease(c, alpha) {
  // Crosses in the time the title is actually up, not on an ambient loop.
  const y = app.ih * 0.70;
  const head = (0.12 + title.t * 0.26) * app.iw;
  c.fillStyle = css(P.rock1, alpha * 0.7);
  // Overlapping segments, or the body reads as a staircase rather than a body.
  for (let i = 0; i < 40; i++) {
    const x = head - i * 5;
    if (x < -14 || x > app.iw + 14) continue;
    const wob = Math.sin(title.t * 1.1 - i * 0.23) * 10;
    const r = 4.5 - i * 0.07;
    c.fillRect((x - r) | 0, (y + wob - r * 0.6) | 0, Math.max(1, (r * 2) | 0), Math.max(1, (r * 1.2) | 0));
  }
}

function draw(c) {
  if (!title.active) return;
  const out = title.t <= HOLD ? 0 : Math.min(1, (title.t - HOLD) / FADE);
  const a = 1 - out;
  if (a <= 0.01) return;
  const reduced = app.reduced;

  // Push the real scene back into haze rather than replacing it.
  c.fillStyle = css(P.w4, 0.42 * a);
  c.fillRect(0, 0, app.iw, app.ih);
  if (!reduced) {
    drawTease(c, a);
    for (const d of drifters) silhouette(c, d.key, d.x, d.y, a * 0.55);
  }

  const x = ((app.iw - WORD.w) / 2) | 0;
  const y = (app.ih * 0.42 - WORD.h / 2) | 0;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * a;
  drawSprite(c, 'title-word:shadow', 0, x + 1, y + 1, false);
  drawSprite(c, 'title-word', 0, x, y, false);
  if (!reduced) {
    // A caustic shimmer travelling across the faces of the letters.
    const band = ((title.t / 1.8) % 1) * (WORD.w + 48) - 24;
    c.save();
    c.beginPath();
    c.rect(x + band, y, 24, WORD.h);
    c.clip();
    drawSprite(c, 'title-word:shine', 0, x, y, false);
    c.restore();
  }
  c.globalAlpha = prev;

  const seen = seenCount();
  const line = save.stats.runs > 0 ? VERSION + '   ' + seen + ' / ' + total() + ' SEEN' : VERSION;
  text(c, line, ((app.iw - textWidth(line)) / 2) | 0, y + WORD.h + 8, P.silver, a * 0.75);
}

function update(dt) {
  if (!title.active) return;
  title.t += dt;
  for (const d of drifters) {
    d.x += d.v * dt;
    if (d.x > app.iw + 40) d.x = -40;
  }
  if (title.t > HOLD + FADE) title.active = false;
}

function onTap() {
  if (!title.active || title.t >= HOLD) return false;
  title.t = HOLD;                 // skip straight to the fade, never a cut
  title.skipped = true;
  return true;
}

/**
 * If the save holds a position from the last five minutes, come back to that
 * depth. This is also what makes a silent Safari reload read as a blink.
 */
function maybeResume() {
  if (present.has('start')) return false;
  const r = save.run;
  if (!r || !r.at) return false;
  if (Date.now() - r.at > RESUME_WINDOW) return false;
  seek(r.t);
  repopulate();
  return true;
}

export function init() {
  const resumed = maybeResume();
  if (!cfg.title) return;
  title.active = true;
  title.t = 0;
  title.resumed = resumed;
  pickDrifters();
  addUpdater(update, 95);
  addLayer('title', 250, draw);
  addTapHandler(onTap, 200);
}
