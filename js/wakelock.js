// While Reef is open and on screen, the phone must not dim or lock. Built in
// layers, and nothing about it ever appears on screen.
//
//   1. The Wake Lock API, re-acquired whenever it is released and retried every
//      30 s while it is being refused.
//   2. A silent looping video, generated at runtime from a 2x2 canvas rather
//      than embedded as an asset, started on the first tap.
//   3. The README failsafe (Auto-Lock -> Never), for iOS versions where neither
//      of the above holds.
import { addUpdater, addTapHandler } from './main.js';
import { cfg } from './config.js';
import { get as setting } from './settings/settings.js';
import { addInfo } from './debug/registry.js';
import { addProvider, logEvent } from './debug/diagnostics.js';

const RETRY = 30;

export const wake = {
  supported: !!(navigator.wakeLock && navigator.wakeLock.request),
  held: false, method: 'none', refusals: 0, releases: 0, lastError: '',
  videoRunning: false,
};

let sentinel = null;
let retryIn = 0;
let tapped = false;
let video = null;

function wanted() {
  return cfg.awake && setting('awake') !== 'off';
}

function onRelease() {
  wake.releases++;
  wake.held = false;
  sentinel = null;
  retryIn = 0;                       // the lock is always dropped while hidden
}

async function acquire() {
  if (!wanted() || sentinel || !wake.supported) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    wake.held = true;
    wake.method = 'wakelock';
    wake.lastError = '';
    sentinel.addEventListener('release', onRelease);
  } catch (e) {
    sentinel = null;
    wake.held = false;
    wake.refusals++;
    wake.lastError = (e && e.name ? e.name : 'error') + ': ' + (e && e.message ? e.message : '');
    retryIn = RETRY;                 // Low Power Mode, low battery, or no gesture yet
  }
}

function release() {
  if (!sentinel) return;
  try { sentinel.release(); } catch (_) { /* already gone */ }
  sentinel = null;
  wake.held = false;
}

// --- the generated video fallback -------------------------------------------

/** A two-frame silent clip recorded from a 2x2 canvas: no asset file needed. */
async function makeClip() {
  if (!window.MediaRecorder) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d');
  g.fillStyle = '#000000'; g.fillRect(0, 0, 2, 2);
  const stream = c.captureStream ? c.captureStream(2) : null;
  if (!stream) return null;
  const chunks = [];
  const rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  await new Promise((r) => setTimeout(r, 300));
  g.fillStyle = '#010208'; g.fillRect(0, 0, 2, 2);
  await new Promise((r) => setTimeout(r, 300));
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  if (!chunks.length) return null;
  return URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || 'video/mp4' }));
}

async function startVideo() {
  if (video || !wanted()) return;
  try {
    const src = await makeClip();
    if (!src) return;
    video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none';
    video.src = src;
    document.body.appendChild(video);
    await video.play();
    wake.videoRunning = true;
    if (wake.method === 'none') wake.method = 'video';
  } catch (e) {
    wake.lastError = 'video: ' + (e && e.message ? e.message : 'refused');
    stopVideo();
  }
}

function stopVideo() {
  if (!video) return;
  try { video.pause(); if (video.src) URL.revokeObjectURL(video.src); } catch (_) { /* ignore */ }
  video.remove();
  video = null;
  wake.videoRunning = false;
}

// --- lifecycle --------------------------------------------------------------

function tick(dt) {
  if (!wanted()) {
    if (sentinel) release();
    if (video) stopVideo();
    wake.method = 'off';
    return;
  }
  if (wake.method === 'off') wake.method = 'none';
  if (document.hidden) return;
  if (sentinel) return;
  retryIn -= dt;
  if (retryIn <= 0) { retryIn = RETRY; acquire(); }
}

function onVisible() {
  if (document.hidden) return;
  // The lock is always dropped while hidden, so ask again on the way back.
  retryIn = 0;
  acquire();
  if (video && video.paused) video.play().catch(() => {});
}

function onFirstTap() {
  if (tapped) return false;
  tapped = true;
  acquire();
  // Only fall back to the video when the API is missing or keeps refusing.
  if (!wake.supported || wake.refusals > 0) startVideo();
  return false;                      // never consumes the tap
}

export function init() {
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('pagehide', () => { release(); stopVideo(); });
  document.addEventListener('freeze', () => { release(); stopVideo(); });
  document.addEventListener('resume', onVisible);
  addTapHandler(onFirstTap, -100);   // lowest priority: it consumes nothing
  addUpdater(tick, 99);
  if (wanted()) acquire();

  addInfo('wake', 'api', () => (wake.supported ? 'AVAILABLE' : 'MISSING'), { sectionOrder: 45 });
  addInfo('wake', 'holding', () => (wake.held ? 'YES (' + wake.method.toUpperCase() + ')'
    : wake.videoRunning ? 'VIDEO' : 'NO'));
  addInfo('wake', 'refused', () => wake.refusals + ' / RELEASED ' + wake.releases);
  addProvider('wake', 45, () => 'api ' + (wake.supported ? 'yes' : 'no') +
    '  held ' + wake.held + '  method ' + wake.method +
    '  refusals ' + wake.refusals + '  releases ' + wake.releases +
    '  video ' + wake.videoRunning + (wake.lastError ? '\nlast ' + wake.lastError : ''));
}
