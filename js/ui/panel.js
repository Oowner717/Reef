// The overlay shell all three panels are built in: the scene keeps running,
// dimmed, behind a dithered ground with a pixel border and the pixel font.
// Scrolling is native, on a transparent div laid over the content area only.
import { addLayer, addTapHandler, canvas, app } from '../main.js';
import { P, css } from '../palette.js';
import { text, textWidth, ADVANCE, GLYPH_H } from '../sprites.js';

export const ROW_H = 11;
const MARGIN_X = 5, MARGIN_Y = 8, TITLE_H = 12, PAD = 4;

let active = null;
let scroller = null, spacer = null;
let ground = null, groundPattern = null;
let dragging = false, downX = 0, downY = 0, downT = 0, moved = false;

export const panelState = { scroll: 0, maxScroll: 0 };

/** Outer rect of the panel. */
export function panelRect() {
  return { x: MARGIN_X, y: MARGIN_Y, w: app.iw - MARGIN_X * 2, h: app.ih - MARGIN_Y * 2 };
}
/** Inner content rect, below the title bar. */
export function contentRect() {
  const r = panelRect();
  return { x: r.x + PAD, y: r.y + TITLE_H, w: r.w - PAD * 2, h: r.h - TITLE_H - PAD };
}

/** A 4x4 dithered dark-blue tile, built once and reused as a fill pattern. */
function groundFill(c) {
  if (groundPattern) return groundPattern;
  if (!ground) {
    ground = document.createElement('canvas');
    ground.width = 4; ground.height = 4;
    const g = ground.getContext('2d');
    g.fillStyle = P.rock1; g.fillRect(0, 0, 4, 4);
    g.fillStyle = P.w6;
    g.fillRect(0, 0, 1, 1); g.fillRect(2, 2, 1, 1);
  }
  groundPattern = c.createPattern(ground, 'repeat');
  return groundPattern;
}

/**
 * spec = { id, title, contentHeight(), draw(ctx, area, scroll), onTap(x, y),
 *          onClose(), onOpen() }
 */
export function openPanel(spec) {
  if (active && active.id === spec.id) { closePanel(); return; }
  if (active) closePanel();
  active = spec;
  panelState.scroll = 0;
  if (spec.onOpen) spec.onOpen();
  syncScroller();
}

export function closePanel() {
  if (!active) return;
  const a = active;
  active = null;
  removeScroller();
  if (a.onClose) a.onClose();
}

export function isOpen() { return !!active; }
export function activePanelId() { return active ? active.id : null; }

// --- the native scroll surface ---------------------------------------------

function removeScroller() {
  if (scroller) { scroller.remove(); scroller = null; spacer = null; }
  scrollGeom = '';
}

let scrollGeom = '';

function syncScroller() {
  if (!active) return;
  const area = contentRect();
  const k = app.scale / app.dpr;           // internal px -> css px
  const contentH = active.contentHeight ? active.contentHeight() : area.h;
  const key = app.iw + ':' + app.ih + ':' + app.scale + ':' + app.rotated + ':' + Math.round(contentH);
  if (scroller && key === scrollGeom) {
    panelState.maxScroll = Math.max(0, contentH - area.h);
    return;
  }
  scrollGeom = key;
  const r = canvas.getBoundingClientRect();
  if (!scroller) {
    scroller = document.createElement('div');
    scroller.className = 'reef-scroll';
    scroller.style.cssText = 'position:fixed;z-index:2;overflow-y:scroll;-webkit-overflow-scrolling:touch;';
    spacer = document.createElement('div');
    spacer.style.width = '1px';
    scroller.appendChild(spacer);
    document.body.appendChild(scroller);
  }
  if (app.rotated) {
    // Rotated composition: cover the viewport rather than mis-mapping the rect.
    scroller.style.left = '0px'; scroller.style.top = '0px';
    scroller.style.width = '100%'; scroller.style.height = '100%';
  } else {
    scroller.style.left = (r.left + area.x * k) + 'px';
    scroller.style.top = (r.top + area.y * k) + 'px';
    scroller.style.width = (area.w * k) + 'px';
    scroller.style.height = (area.h * k) + 'px';
  }
  panelState.maxScroll = Math.max(0, contentH - area.h);
  spacer.style.height = ((contentH + 1) * k) + 'px';
}

// --- drawing ----------------------------------------------------------------

function draw(c) {
  if (!active) return;
  syncScroller();
  panelState.scroll = scroller ? Math.min(panelState.maxScroll, scroller.scrollTop * app.dpr / app.scale) : 0;

  c.fillStyle = css(P.w8, 0.6);
  c.fillRect(0, 0, app.iw, app.ih);

  const r = panelRect();
  c.save();
  c.globalAlpha = 0.94;
  c.fillStyle = groundFill(c);
  c.fillRect(r.x, r.y, r.w, r.h);
  c.restore();

  c.strokeStyle = css(P.greyPale, 0.55);
  c.lineWidth = 1;
  c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  if (active.title) text(c, active.title, r.x + PAD, r.y + 4, P.white, 0.9);
  text(c, 'X', r.x + r.w - PAD - 3, r.y + 4, P.greyPale, 0.8);
  c.fillStyle = css(P.greyPale, 0.3);
  c.fillRect(r.x + 1, r.y + TITLE_H - 2, r.w - 2, 1);

  const area = contentRect();
  c.save();
  c.beginPath();
  c.rect(area.x, area.y, area.w, area.h);
  c.clip();
  active.draw(c, area, panelState.scroll);
  c.restore();

  if (panelState.maxScroll > 0) {
    const th = Math.max(6, area.h * area.h / (area.h + panelState.maxScroll));
    const ty = area.y + (area.h - th) * (panelState.scroll / panelState.maxScroll);
    c.fillStyle = css(P.greyPale, 0.35);
    c.fillRect(r.x + r.w - 2, ty, 1, th);
  }
}

// --- input ------------------------------------------------------------------

function onDown(e) { downX = e.clientX; downY = e.clientY; downT = performance.now(); moved = false; dragging = true; }
function onMove(e) {
  if (!dragging) return;
  if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) moved = true;
}
function onUp() { dragging = false; }

function onTap(x, y) {
  if (!active) return false;
  if (moved || performance.now() - downT > 600) { moved = false; return true; }
  const r = panelRect();
  if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) { closePanel(); return true; }
  if (y < r.y + TITLE_H) {
    if (x > r.x + r.w - 14) closePanel();
    return true;
  }
  if (active.onTap) active.onTap(x, y, panelState.scroll);
  return true;
}

export function init() {
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('pointerup', onUp);
  addLayer('ui-panel', 200, draw);
  addTapHandler(onTap, 100);
}

export { text, textWidth, ADVANCE, GLYPH_H, PAD, TITLE_H };
