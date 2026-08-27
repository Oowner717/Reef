// A creature counts as seen after a full second visibly on screen, not merely
// spawned; a vignette when it completes; a mythical when its encounter does.
import { addUpdater } from '../main.js';
import { save, markDirty } from '../save.js';
import { cfg } from '../config.js';
import { spawner } from '../spawner.js';
import { onComplete } from '../vignettes/director.js';
import { allEntries, total } from '../registry.js';

const SEEN_AFTER = 1;

export const seenState = { fresh: 0 };   // newly seen and not yet looked at

export function isSeen(id) {
  return cfg.seenAll || save.seen[id] !== undefined;
}

export function markSeen(id) {
  if (save.seen[id] !== undefined) return false;
  save.seen[id] = Date.now();
  seenState.fresh++;
  markDirty();
  return true;
}

export function seenCount() {
  if (cfg.seenAll) return total();
  let n = 0;
  for (const e of allEntries()) if (save.seen[e.id] !== undefined) n++;
  return n;
}

export function seenIn(list) {
  let n = 0;
  for (const e of list) if (isSeen(e.id)) n++;
  return n;
}

/** Called when the glossary is opened: the notification dot has done its job. */
export function clearFresh() { seenState.fresh = 0; }

function update(dt) {
  const items = spawner.pool.items;
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c.alive) continue;
    if (c.onScreen(0)) {
      c.seenFor += dt;
      if (c.seenFor >= SEEN_AFTER && save.seen[c.def.id] === undefined) markSeen(c.def.id);
    } else if (c.seenFor) c.seenFor = 0;
  }
}

export function init() {
  addUpdater(update, 60);
  onComplete((v) => markSeen(v.id));
}
