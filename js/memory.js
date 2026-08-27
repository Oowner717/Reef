// iOS Safari reclaims aggressively, silently reloads pages it thinks are too
// large, and freezes backgrounded ones. So: hard caps everywhere, a periodic
// self-check so a leak shows up as a number climbing rather than as a crash an
// hour later, and release-on-the-way-out / rebuild-on-the-way-in.
import { addUpdater, app, pause, resume } from './main.js';
import { flush } from './save.js';
import { releaseStrip, rebuildStrip, stripBytes, stripSize } from './water.js';
import { atlasBytes, atlasPageCount } from './sprites.js';
import { spawner } from './spawner.js';
import { fxLive, fxCap } from './vignettes/fx.js';
import { addInfo, addAction } from './debug/registry.js';
import { addProvider, logEvent } from './debug/diagnostics.js';

const BUDGET = 32 * 1024 * 1024;
const CHECK_EVERY = 10;
const HISTORY = 12;

export const memory = {
  released: false, checks: 0, warnings: 0,
  peakPool: 0, peakFx: 0, peakBytes: 0,
  history: [],                 // capped: this array must not grow either
};

export function offscreenBytes() { return atlasBytes() + stripBytes(); }

let checkIn = CHECK_EVERY;

/**
 * Compares every pool against its cap and records the trend. Anything that
 * keeps climbing across samples is logged once, into the same ring buffer the
 * diagnostics blob reports.
 */
function selfCheck() {
  memory.checks++;
  const pool = spawner.pool.live();
  const fx = fxLive();
  const bytes = offscreenBytes();
  if (pool > memory.peakPool) memory.peakPool = pool;
  if (fx > memory.peakFx) memory.peakFx = fx;
  if (bytes > memory.peakBytes) memory.peakBytes = bytes;

  memory.history.push(pool);
  while (memory.history.length > HISTORY) memory.history.shift();

  if (bytes > BUDGET) {
    memory.warnings++;
    logEvent('MEM', 'offscreen ' + (bytes / 1048576).toFixed(1) + ' MB over the 32 MB budget');
  }
  // A pool pinned at its cap for the whole window is the shape a leak takes.
  if (memory.history.length === HISTORY && memory.history.every((n) => n >= spawner.pool.cap)) {
    memory.warnings++;
    logEvent('MEM', 'creature pool pinned at its cap of ' + spawner.pool.cap + ' for ' +
      (HISTORY * CHECK_EVERY) + 's');
    memory.history.length = 0;
  }
  if (fx >= fxCap()) {
    memory.warnings++;
    logEvent('MEM', 'vignette fx pool at its cap of ' + fxCap());
  }
}

function tick(dt) {
  checkIn -= dt;
  if (checkIn > 0) return;
  checkIn = CHECK_EVERY;
  selfCheck();
}

// --- release and rebuild ----------------------------------------------------

function releaseAll() {
  if (memory.released) return;
  memory.released = true;
  pause();
  flush();
  // The atlas stays: it is the expensive one to rebuild and the small one to
  // hold. The water strip is the large regenerable buffer.
  releaseStrip();
}

function rebuildAll() {
  if (!memory.released) return;
  memory.released = false;
  rebuildStrip();
  resume();
}

function onPageShow(e) {
  // `persisted` means a bfcache restore: the page is still alive, so resume
  // rather than reinitialise.
  rebuildAll();
  if (!e || !e.persisted) return;
  logEvent('LIFE', 'bfcache restore, resumed');
}

export function init() {
  addUpdater(tick, 98);
  window.addEventListener('pagehide', releaseAll);
  window.addEventListener('pageshow', onPageShow);
  // `freeze` and `resume` are fired at `document` and do not bubble.
  document.addEventListener('freeze', releaseAll);
  document.addEventListener('resume', rebuildAll);

  const mb = (b) => (b / 1048576).toFixed(2) + ' MB';
  addInfo('memory', 'offscreen budget', () => mb(offscreenBytes()) + ' / ' + mb(BUDGET), { sectionOrder: 40 });
  addInfo('memory', 'peak offscreen', () => mb(memory.peakBytes));
  addInfo('memory', 'peak pool', () => memory.peakPool + ' / ' + spawner.pool.cap);
  addInfo('memory', 'peak fx', () => memory.peakFx + ' / ' + fxCap());
  addInfo('memory', 'self-checks', () => memory.checks + ' (' + memory.warnings + ' WARNINGS)');
  addAction('memory', 'release buffers now', () => { releaseAll(); setTimeout(rebuildAll, 400); });
  addProvider('memory-guard', 32, () => 'offscreen ' + mb(offscreenBytes()) + ' peak ' + mb(memory.peakBytes) +
    ' / budget ' + mb(BUDGET) +
    '\npool peak ' + memory.peakPool + '/' + spawner.pool.cap +
    '  fx peak ' + memory.peakFx + '/' + fxCap() +
    '  atlas ' + atlasPageCount() + 'p  strip ' + stripSize().w + 'x' + stripSize().h +
    '\nchecks ' + memory.checks + '  warnings ' + memory.warnings + '  released ' + memory.released);
}
