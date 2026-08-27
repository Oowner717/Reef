// A shuffled bag: play through every item before any repeats, and never let a
// reshuffle put the last-played item first. Bags live in the save blob, so the
// rotation survives closing the app. The mythical encounters reuse this.
import { save, markDirty } from './save.js';

function shuffle(list, avoidFirst) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  // Never open a new shuffle with the one that just played.
  if (a.length > 1 && a[0] === avoidFirst) {
    const j = 1 + ((Math.random() * (a.length - 1)) | 0);
    a[0] = a[j]; a[j] = avoidFirst;
  }
  return a;
}

export function createBag(key, items) {
  function slot() {
    let s = save.bags[key];
    if (!s || !Array.isArray(s.order)) {
      s = { order: shuffle(items, null), i: 0, last: null };
      save.bags[key] = s;
      markDirty();
    }
    return s;
  }

  return {
    key,
    /** Keep the stored order valid when the item list grows between versions. */
    sync() {
      const s = slot();
      const known = new Set(items);
      s.order = s.order.filter((id) => known.has(id));
      for (const id of items) if (s.order.indexOf(id) < 0) s.order.push(id);
      if (s.i > s.order.length) s.i = s.order.length;
      markDirty();
      return this;
    },
    peek() {
      const s = slot();
      return s.i < s.order.length ? s.order[s.i] : null;
    },
    next() {
      const s = slot();
      if (s.i >= s.order.length) {
        s.order = shuffle(items, s.last);
        s.i = 0;
      }
      const id = s.order[s.i++];
      s.last = id;
      markDirty();
      return id;
    },
    /** Take the next item that passes a test, without disturbing the order. */
    nextWhere(ok, tries) {
      const n = Math.min(tries || items.length, items.length);
      for (let k = 0; k < n; k++) {
        const id = this.next();
        if (ok(id)) return id;
      }
      return null;
    },
    last() { return slot().last; },
    reset() { save.bags[key] = { order: shuffle(items, null), i: 0, last: null }; markDirty(); },
    remaining() { const s = slot(); return s.order.length - s.i; },
  };
}
