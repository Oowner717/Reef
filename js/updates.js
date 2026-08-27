// The service worker installs a new version in the background. Because this app
// is ambient and often left running, the reload waits for the end of the current
// run — the moment the camera returns to the surface — and never happens while
// a panel is open.
import { addUpdater } from './main.js';
import { onRunEnd } from './camera.js';
import { isOpen } from './ui/panel.js';
import { addInfo } from './debug/registry.js';
import { addProvider } from './debug/diagnostics.js';

export const updates = { registered: false, pending: false, armed: false, error: '' };

function tick() {
  if (!updates.armed) return;
  if (isOpen()) return;                 // wait until the panel closes
  location.reload();
}

export function init() {
  addUpdater(tick, 100);
  onRunEnd(() => { if (updates.pending) updates.armed = true; });

  addInfo('build', 'service worker', () => (updates.registered
    ? (updates.armed ? 'RELOAD ARMED' : updates.pending ? 'UPDATE WAITING' : 'ACTIVE')
    : updates.error ? 'FAILED' : 'NOT REGISTERED'));
  addProvider('sw', 50, () => 'registered ' + updates.registered +
    '  pending ' + updates.pending + '  armed ' + updates.armed +
    (updates.error ? '  error ' + updates.error : ''));

  if (!('serviceWorker' in navigator)) return;
  // On a first install the worker claims an uncontrolled page, which fires
  // `controllerchange` even though nothing was updated. Only a change of
  // controller on a page that already had one is an actual new version.
  const hadController = !!navigator.serviceWorker.controller;
  // Relative, so it works from https://<user>.github.io/reef/ as well as root.
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(() => { updates.registered = true; })
    .catch((e) => { updates.error = e && e.message ? e.message : 'refused'; });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) updates.pending = true;
  });
}
