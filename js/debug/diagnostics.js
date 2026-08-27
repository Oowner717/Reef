// The feedback loop from a phone with no console back into a Claude Code
// session. Loaded before everything else (see index.html) so the ring buffer
// catches errors thrown while the rest of the app is still evaluating.

const MAX = 20;
const ring = [];
let dropped = 0;
const t0 = Date.now();

function push(kind, msg) {
  const at = ((Date.now() - t0) / 1000).toFixed(1);
  const line = at + 's ' + kind + ' ' + String(msg).slice(0, 160);
  ring.push(line);
  while (ring.length > MAX) { ring.shift(); dropped++; }
}

const realWarn = console.warn.bind(console);
const realError = console.error.bind(console);
console.warn = (...a) => { push('WARN', a.join(' ')); realWarn(...a); };
console.error = (...a) => { push('ERR', a.join(' ')); realError(...a); };
window.addEventListener('error', (e) => {
  push('ERR', (e.message || e.error) + ' @' + (e.filename || '?').split('/').pop() + ':' + e.lineno);
});
window.addEventListener('unhandledrejection', (e) => push('REJ', e.reason && e.reason.message || e.reason));

export function logEvent(kind, msg) { push(kind, msg); }
export function recentErrors() { return ring.slice(); }
export function droppedCount() { return dropped; }

// --- providers --------------------------------------------------------------
// Each stage adds its own section rather than this file importing the world.

const providers = [];
/** fn() -> string (already formatted lines) or a falsy value to skip. */
export function addProvider(name, order, fn) {
  providers.push({ name, order, fn });
  providers.sort((a, b) => a.order - b.order);
}

const LIMIT = 4000;

export function buildBlob() {
  const parts = ['REEF DIAGNOSTICS'];
  for (const p of providers) {
    let body;
    try { body = p.fn(); } catch (e) { body = 'unavailable (' + e.message + ')'; }
    if (!body) continue;
    parts.push('', '[' + p.name + ']', String(body).trim());
  }
  const errs = recentErrors();
  parts.push('', '[log] ' + (dropped ? '(' + dropped + ' older dropped)' : '(none dropped)'));
  parts.push(errs.length ? errs.join('\n') : 'no warnings or errors');
  let out = parts.join('\n');
  if (out.length > LIMIT) out = out.slice(0, LIMIT - 20) + '\n...truncated';
  return out;
}

/** Returns a promise resolving true when the blob reached the clipboard. */
export function copyDiagnostics() {
  const blob = buildBlob();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(blob).then(() => true).catch(() => fallbackCopy(blob));
  }
  return Promise.resolve(fallbackCopy(blob));
}

function fallbackCopy(blob) {
  try {
    const ta = document.createElement('textarea');
    ta.value = blob;
    ta.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch (_) { return false; }
}

addProvider('env', 0, () => {
  const s = screen;
  return [
    'ua ' + navigator.userAgent.slice(0, 120),
    'screen ' + s.width + 'x' + s.height + ' window ' + window.innerWidth + 'x' + window.innerHeight,
    'dpr ' + (window.devicePixelRatio || 1) + ' standalone ' + !!navigator.standalone,
    'url ' + location.search,
  ].join('\n');
});
