// The bottom-right button cluster and the one fade behaviour every corner
// element shares. Stage 3 puts the magnifier in it; stages 10 and 11 add the
// shell and the dial to this same cluster rather than building their own.
import { addLayer, addTapHandler, onResize, setUiFadeSource, setStampAnchor, app } from '../main.js';
import { defineSprite, drawSprite } from '../sprites.js';
import { P } from '../palette.js';

const SIZE = 12, GAP = 4, MARGIN = 6;
const FULL_MS = 3000, FADE_MS = 1000;

defineSprite('ui-magnifier', {
  map: { '.': null, k: 'outline', w: 'white' },
  frames: [[
    '.....kkkk...',
    '...kkwwwwkk.',
    '..kwwkkkkww.',
    '..kwkk..kkwk',
    '.kwwk....kwk',
    '.kwk......kw',
    '.kwk......kw',
    '.kwwk....kwk',
    '..kwkk..kkwk',
    '..kwwkkkkww.',
    '.k.kkwwwwkk.',
    'kkk...kkkk..',
  ]],
});

const buttons = [];   // { id, order, sprite, rest, onTap, visible() }
let lastTap = -1e9;
let dim = () => 1;    // stages 8 and 15 lower this during a peak

/** Register a corner button. Order 1 is leftmost. */
export function addButton(spec) {
  buttons.push({ visible: () => true, rest: 0.25, ...spec });
  buttons.sort((a, b) => a.order - b.order);
}

/** A source of an extra multiplier — 0.1 during an encounter or vignette peak. */
export function setPeakDim(fn) { dim = fn; }

/** The shared fade: full for 3 s after any tap, then back to resting. */
export function fadeFactor(now) {
  const since = now - lastTap;
  if (since < FULL_MS) return 1;
  const k = (since - FULL_MS) / FADE_MS;
  return k >= 1 ? 0 : 1 - k;
}

export function alphaFor(rest) {
  const f = fadeFactor(app.time * 1000);
  return (rest + (1 - rest) * f) * dim();
}

export function notifyTap() { lastTap = app.time * 1000; }

let insetX = MARGIN, insetY = MARGIN;

function measureInsets() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;' +
    'padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const padR = parseFloat(cs.paddingRight) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  probe.remove();
  // The canvas overflows the viewport a little; half of that sits below.
  const overX = Math.max(0, (app.iw * app.scale / app.dpr - window.innerWidth) / 2);
  const overY = Math.max(0, (app.ih * app.scale / app.dpr - window.innerHeight) / 2);
  const toInternal = app.dpr / app.scale;
  insetX = MARGIN + Math.round((padR + overX) * toInternal);
  insetY = MARGIN + Math.round((padB + overY) * toInternal);
}

/** Screen rect of the nth visible button, right-aligned. */
function rectFor(list, i) {
  const n = list.length;
  const right = app.iw - insetX;
  const x = right - (n - i) * SIZE - (n - 1 - i) * GAP;
  const y = app.ih - insetY - SIZE;
  return { x, y, w: SIZE, h: SIZE };
}

function visibleButtons() { return buttons.filter((b) => b.visible()); }

function draw(c) {
  const list = visibleButtons();
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const a = alphaFor(b.rest);
    if (a <= 0.02) continue;
    const r = rectFor(list, i);
    const prev = c.globalAlpha;
    c.globalAlpha = prev * a;
    drawSprite(c, b.sprite, 0, r.x, r.y, false);
    if (b.badge && b.badge()) {
      c.fillStyle = b.badgeColour || P.white;
      c.fillRect(r.x + SIZE - 2, r.y, 2, 2);
    }
    c.globalAlpha = prev;
  }
}

function onTap(x, y) {
  notifyTap();
  const list = visibleButtons();
  for (let i = 0; i < list.length; i++) {
    const r = rectFor(list, i);
    // A generous hit box: the icon is 12 px, the target is 20.
    if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) {
      list[i].onTap();
      return true;
    }
  }
  return false;
}

export function init() {
  measureInsets();
  onResize(measureInsets);
  addLayer('ui-buttons', 190, draw);
  addTapHandler(onTap, 80);
  setUiFadeSource(() => alphaFor(0.15));
  // The version stamp is the left-hand end of the same corner row.
  setStampAnchor(() => [insetX, app.ih - insetY - SIZE + 4]);
}
