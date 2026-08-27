// The glossary panel: a checklist of everything in the app, generated from the
// registry. It has to feel like a reward rather than a menu, so every row is
// the real sprite, really animating, and what you have not met is a silhouette.
import { addLayer, addTapHandler, app } from '../main.js';
import { openPanel, contentRect, panelState } from '../ui/panel.js';
import { addButton, notifyTap } from '../ui/buttons.js';
import { defineSprite, drawSprite, spriteMeta, text, textWidth } from '../sprites.js';
import { P, css } from '../palette.js';
import { cfg } from '../config.js';
import { ZONES } from '../world.js';
import { save } from '../save.js';
import { sections, total, zoneEntries } from '../registry.js';
import { isSeen, seenCount, seenState, clearFresh } from './seen.js';

defineSprite('ui-shell', {
  map: { '.': null, k: 'outline', w: 'white' },
  frames: [[
    '....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', 'kwwkwwkwwkwk',
    'kwkwwkwwkwwk', 'kwkwwkwwkwwk', 'kwwkwwkwwkwk', '.kwwkwwkwwk.',
    '.kwwwkwkwwk.', '..kwwwwwwk..', '...kwwwwk...', '....kkkk....',
  ]],
});

const ROW_H = 17, HEAD_H = 13, HEADER_H = 30, THUMB_W = 22, THUMB_H = 15;
const BANDS = { motes: 'MOTE', small: 'SML', medium: 'MED', large: 'LRG', huge: 'HUGE', mythical: 'MYTH' };

export const glossary = { open: false, expanded: null };

let scratch = null;
function silhouette(c, key, x, y) {
  const m = spriteMeta(key);
  if (!m) return;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = scratch.height = 96; }
  const g = scratch.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 96, 96);
  drawSprite(g, key, 0, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = P.silhouette;
  g.fillRect(0, 0, m.w, m.h);
  g.globalCompositeOperation = 'source-over';
  const k = fitScale(m);
  c.drawImage(scratch, 0, 0, m.w, m.h, x | 0, y | 0, Math.max(1, (m.w * k) | 0), Math.max(1, (m.h * k) | 0));
}

function fitScale(m) {
  const k = Math.min(THUMB_W / m.w, THUMB_H / m.h, 1);
  if (k >= 1) return 1;
  if (k >= 0.5) return 0.5;
  if (k >= 0.34) return 1 / 3;
  if (k >= 0.25) return 0.25;
  return k;
}

function thumb(c, e, x, y, unlocked) {
  const key = e.sprite;
  if (!key || !spriteMeta(key)) {
    // Scenes have no sprite of their own: a small mark stands in for them.
    c.fillStyle = unlocked ? P.bioCyan : P.silhouette;
    c.fillRect(x + 7, y + 5, 7, 5);
    c.fillRect(x + 9, y + 3, 3, 9);
    return;
  }
  const m = spriteMeta(key);
  const k = fitScale(m);
  const dx = x + (THUMB_W - m.w * k) * 0.5, dy = y + (THUMB_H - m.h * k) * 0.5;
  if (!unlocked) { silhouette(c, key, dx, dy); return; }
  const fr = m.n > 1 ? (Math.floor(app.time * (e.fps || 6)) % m.n) : 0;
  if (k === 1) { drawSprite(c, key, fr, dx, dy, false); return; }
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = scratch.height = 96; }
  const g = scratch.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 96, 96);
  drawSprite(g, key, fr, 0, 0);
  c.drawImage(scratch, 0, 0, m.w, m.h, dx | 0, dy | 0, Math.max(1, (m.w * k) | 0), Math.max(1, (m.h * k) | 0));
}

function dashes(n) { return '-'.repeat(Math.max(3, Math.min(14, n))); }

function wrap(s, width) {
  const words = s.toUpperCase().split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (textWidth(next) > width && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// --- layout -----------------------------------------------------------------

function walk(area, cb) {
  let y = HEADER_H;
  for (const s of sections()) {
    cb(null, s, y, HEAD_H);
    y += HEAD_H;
    for (const e of s.entries) {
      const open = glossary.expanded === e.id && isSeen(e.id);
      const h = ROW_H + (open ? wrap(noteFor(e), noteWidth(area)).length * 6 + 3 : 0);
      cb(e, s, y, h);
      y += h;
    }
  }
  return y;
}

function noteFor(e) {
  const where = e.kind === 'vignette' ? ZONES[e.zone].name
    : e.zones.map((z) => ZONES[z].name).join(', ');
  const how = e.behaviourId ? ' - ' + e.behaviourId : '';
  return where + how + ' - ' + (e.note || '');
}

/** The note is indented past the thumbnail, so it has that much less room. */
function noteWidth(area) { return area.w - THUMB_W - 8; }

function measure(area) { return walk(area, () => {}) + 6; }

// --- drawing ----------------------------------------------------------------

function drawHeader(c, area) {
  // Drawn after the rows and on its own ground, so scrolled entries pass behind
  // the counter rather than through it.
  c.fillStyle = P.rock1;
  c.fillRect(area.x - 2, area.y - 2, area.w + 4, HEADER_H - 6);
  const seen = seenCount(), all = total();
  text(c, seen + ' / ' + all + ' SEEN', area.x, area.y + 1, P.white, 0.95);
  // Seven short bars, one per zone, filled by completion.
  const bw = 5, gap = 2;
  const x0 = area.x + area.w - (bw + gap) * 7;
  for (let z = 0; z < 7; z++) {
    const list = zoneEntries(z);
    let n = 0;
    for (const e of list) if (isSeen(e.id)) n++;
    const k = list.length ? n / list.length : 0;
    const x = x0 + z * (bw + gap);
    c.fillStyle = css(P.greyPale, 0.25);
    c.fillRect(x, area.y, bw, 8);
    c.fillStyle = k >= 1 ? P.bioLime : P.bioCyan;
    c.fillRect(x, area.y + 8 - Math.round(k * 8), bw, Math.round(k * 8));
  }
  const st = save.stats;
  const mins = Math.round((st.watched || 0) / 60);
  const line = (st.runs || 0) + ' RUNS  ' + (mins >= 60 ? Math.floor(mins / 60) + 'H ' + (mins % 60) + 'M' : mins + 'M')
    + '  DEEPEST ' + ZONES[Math.min(6, st.deepest || 0)].name;
  text(c, line, area.x, area.y + 11, P.greyPale, 0.7);
  c.fillStyle = css(P.greyPale, 0.25);
  c.fillRect(area.x, area.y + 21, area.w, 1);
}

function draw(c, area, scroll) {
  walk(area, (e, s, y, h) => {
    const sy = area.y + y - scroll;
    if (sy > area.y + area.h || sy + h < area.y) return;
    if (!e) {
      text(c, s.title.toUpperCase(), area.x, sy + 4, P.bioCyan, 0.85);
      c.fillStyle = css(P.bioCyan, 0.22);
      c.fillRect(area.x, sy + 10, area.w, 1);
      return;
    }
    const on = isSeen(e.id);
    thumb(c, e, area.x, sy + 1, on);
    const nx = area.x + THUMB_W + 4;
    text(c, on ? e.name.toUpperCase() : dashes(e.name.length), nx, sy + 3,
      on ? P.silver : P.greyMid, on ? 0.92 : 0.55);
    // Zone dots, then the size band, right-aligned.
    const zones = e.kind === 'vignette' ? [e.zone] : e.zones;
    const dx = area.x + area.w - 54;
    for (let z = 0; z < 7; z++) {
      c.fillStyle = zones.indexOf(z) >= 0 ? css(P.bioCyan, on ? 0.9 : 0.4) : css(P.greyPale, 0.14);
      c.fillRect(dx + z * 3, sy + 5, 2, 2);
    }
    if (on && e.band) {
      const b = BANDS[e.band] || '';
      text(c, b, area.x + area.w - textWidth(b), sy + 3, P.greyMid, 0.7);
    }
    if (glossary.expanded === e.id && on) {
      const lines = wrap(noteFor(e), noteWidth(area));
      for (let i = 0; i < lines.length; i++) {
        text(c, lines[i], nx, sy + ROW_H - 3 + i * 6, P.greyPale, 0.75);
      }
    }
  });
  drawHeader(c, area);
}

function onTap(x, y, scroll) {
  const area = contentRect();
  let hit = null;
  walk(area, (e, s, ry, h) => {
    if (!e || hit) return;
    const sy = area.y + ry - scroll;
    if (y >= sy && y < sy + h) hit = e;
  });
  if (!hit || !isSeen(hit.id)) return;
  glossary.expanded = glossary.expanded === hit.id ? null : hit.id;
}

const spec = {
  id: 'glossary',
  title: 'GLOSSARY',
  onOpen() { glossary.open = true; clearFresh(); glossary.expanded = null; },
  onClose() { glossary.open = false; },
  contentHeight: () => measure(contentRect()),
  draw,
  onTap,
};

export function openGlossary() { openPanel(spec); }

export function init() {
  addButton({
    id: 'glossary', order: 1, sprite: 'ui-shell', rest: 0.25,
    visible: () => cfg.glossary,
    badge: () => seenState.fresh > 0,
    badgeColour: P.bioCyan,
    onTap: openGlossary,
  });
}
