// The debug panel. Rows come from js/debug/registry.js and the layer toggles
// are generated from whatever layers exist, so neither goes stale.
import { app, layerNames, layer } from '../main.js';
import { openPanel, closePanel, isOpen, activePanelId, contentRect } from '../ui/panel.js';
import { addButton, notifyTap } from '../ui/buttons.js';
import { drawList, hitList, activate, measure } from '../ui/rows.js';
import { grouped, addInfo, addChoice, addAction, addGraph, addToggle } from './registry.js';
import { addProvider, copyDiagnostics, recentErrors } from './diagnostics.js';
import { VERSION, BUILD } from '../version.js';
import { perf, setForcedTier, frameGraph, deferredChanges } from '../perf.js';
import { setFps, fpsState } from '../fps.js';
import { cam, jumpToZone, RUN } from '../camera.js';
import { ZONES, world } from '../world.js';
import { atlasBytes, atlasPageCount } from '../sprites.js';
import { stripBytes, stripSize } from '../water.js';
import { P, css } from '../palette.js';
import { cfg } from '../config.js';

/** Settings (stage 11) can force this either way; `?debug=1` always wins. */
export const debugState = { buttonOverride: null, copied: 0 };

function belowOne() {
  const [maj] = VERSION.split('.').map(Number);
  return maj < 1;
}
export function buttonVisible() {
  if (cfg.debug) return true;
  if (debugState.buttonOverride !== null) return debugState.buttonOverride;
  return belowOne();
}

// --- layer toggles, generated rather than declared --------------------------

function layerGroup() {
  return {
    section: 'layers',
    rows: layerNames().filter((n) => n !== 'ui-panel').map((name) => ({
      type: 'toggle', label: name,
      get: () => layer(name).enabled,
      set: (v) => { layer(name).enabled = v; },
    })),
  };
}

function groups() {
  const g = grouped();
  const i = g.findIndex((x) => x.section === 'state');
  const layers = layerGroup();
  if (i >= 0) g.splice(i + 1, 0, layers); else g.push(layers);
  return g;
}

// --- the panel --------------------------------------------------------------

let cached = null;
const spec = {
  id: 'debug',
  title: 'DEBUG',
  onOpen() { cached = groups(); },
  onClose() { cached = null; },
  contentHeight: () => measure(cached || (cached = groups())),
  draw(c, area, scroll) { drawList(c, area, scroll, cached || (cached = groups())); },
  onTap(x, y, scroll) {
    const row = hitList(contentRect(), scroll, cached || [], x, y);
    activate(row);
  },
};

export function openDebug() { openPanel(spec); }

// --- the frame-time graph ---------------------------------------------------

const graphBuf = new Float32Array(120);
function renderGraph(c, x, y, w, h) {
  const n = frameGraph(graphBuf, Math.min(120, w));
  c.fillStyle = css(P.w8, 0.5);
  c.fillRect(x, y, w, h);
  const budget = 16.7;
  for (let i = 0; i < n; i++) {
    const ms = graphBuf[i];
    const v = Math.min(1, ms / (budget * 2));
    const bh = Math.max(1, Math.round(v * h));
    c.fillStyle = ms <= 17.5 ? P.bioLime : ms <= 22 ? P.accYellow : P.accRed;
    c.fillRect(x + i, y + h - bh, 1, bh);
  }
  c.fillStyle = css(P.greyPale, 0.4);
  c.fillRect(x, y + h - Math.round(h * 0.5), w, 1);
}

// --- rows -------------------------------------------------------------------

const SPEEDS = [0.25, 0.5, 1, 2, 5, 10, 20].map((v) => ({ label: v + 'X', value: v }));
const TIERS = [{ label: 'AUTO', value: -1 }, { label: '0', value: 0 }, { label: '1', value: 1 },
  { label: '2', value: 2 }, { label: '3', value: 3 }];

function mb(bytes) { return (bytes / 1048576).toFixed(2) + ' MB'; }

function registerRows() {
  addGraph('frame', 'frame time (2x budget full)', renderGraph, 18, { sectionOrder: 0 });
  addInfo('frame', 'average', () => Math.round(perf.avg) + ' FPS');
  addInfo('frame', '1% low', () => Math.round(perf.low) + ' FPS');
  addInfo('frame', 'work per frame', () => perf.workMs.toFixed(1) + ' MS');
  addInfo('frame', 'worst frame', () => perf.worstMs.toFixed(1) + ' MS');
  addInfo('frame', 'tier', () => perf.tier + ' (' + perf.tierChanges + ' CHANGES, ' + deferredChanges() + ' DEFERRED)');

  addChoice('quality', 'force tier', TIERS, () => perf.forced, setForcedTier, { sectionOrder: 10 });
  addToggle('quality', 'fps counter', () => fpsState.on, setFps);

  addInfo('state', 'zone', () => ZONES[cam.zone].name.toUpperCase(), { sectionOrder: 20 });
  addInfo('state', 'depth', () => Math.round(cam.depth * 100) + '%');
  addInfo('state', 'run time', () => cam.t.toFixed(1) + ' / ' + RUN + ' S');
  addInfo('state', 'camera y', () => Math.round(cam.y) + ' / ' + world.travel);
  addChoice('state', 'jump to zone',
    ZONES.map((z, i) => ({ label: String(i + 1), value: i })),
    () => cam.zone, jumpToZone);
  addChoice('state', 'speed', SPEEDS, () => cam.speed, (v) => { cam.speed = v; });

  addInfo('memory', 'sprite atlas', () => atlasPageCount() + ' PAGES, ' + mb(atlasBytes()), { sectionOrder: 40 });
  addInfo('memory', 'water strip', () => stripSize().w + 'X' + stripSize().h + ', ' + mb(stripBytes()));
  addInfo('memory', 'total offscreen', () => mb(atlasBytes() + stripBytes()));

  addInfo('build', 'version', () => VERSION, { sectionOrder: 90 });
  addInfo('build', 'build', () => BUILD);
  addInfo('build', 'internal', () => app.iw + 'X' + app.ih + ' @' + app.scale + 'X');
  addInfo('build', 'errors logged', () => String(recentErrors().length));
  addAction('build', 'copy diagnostics', () => {
    copyDiagnostics().then((ok) => { debugState.copied = ok ? app.time : -1; });
  }, {
    note: () => (debugState.copied > 0 && app.time - debugState.copied < 3 ? 'COPIED'
      : debugState.copied < 0 ? 'FAILED' : 'TAP'),
  });
}

function registerProviders() {
  addProvider('frame', 10, () => [
    'avg ' + perf.avg.toFixed(1) + '  1% low ' + perf.low.toFixed(1) + '  worst ' + perf.worstMs.toFixed(1) + 'ms',
    'work ' + perf.workMs.toFixed(2) + 'ms  tier ' + perf.tier + (perf.forced >= 0 ? ' (forced)' : ''),
    'tier changes ' + perf.tierChanges + ', deferred ' + deferredChanges(),
    perf.history.length
      ? 'history ' + perf.history.map((h) => h.t + 's ' + h.from + '>' + h.to + ' low' + h.low).join(', ')
      : 'history none',
  ].join('\n'));
  addProvider('display', 5, () => 'internal ' + app.iw + 'x' + app.ih + ' scale ' + app.scale +
    ' rotated ' + app.rotated + ' reduced-motion ' + app.reduced);
  addProvider('run', 20, () => 'zone ' + ZONES[cam.zone].id + ' depth ' + (cam.depth * 100).toFixed(0) +
    '% t ' + cam.t.toFixed(1) + '/' + RUN + ' runs ' + cam.runs + ' speed ' + (cam.speed * cfg.speed));
  addProvider('memory', 30, () => 'atlas ' + atlasPageCount() + 'p ' + mb(atlasBytes()) +
    '  strip ' + stripSize().w + 'x' + stripSize().h + ' ' + mb(stripBytes()) +
    '  total ' + mb(atlasBytes() + stripBytes()));
  addProvider('layers', 40, () => layerNames().map((n) => n + (layer(n).enabled ? '' : ' OFF')).join(', '));
}

export function init() {
  registerRows();
  registerProviders();
  addButton({
    id: 'debug', order: 3, sprite: 'ui-magnifier', rest: 0.15,
    visible: buttonVisible,
    onTap: openDebug,
  });
  if (cfg.debug === 'menu') openDebug();
}
