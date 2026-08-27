// The settings panel, in the same overlay shell as the glossary and the debug
// menu. Rows are toggles or a few discrete options — no sliders, no typing —
// and every change applies immediately and visibly.
import { app } from '../main.js';
import { openPanel, contentRect } from '../ui/panel.js';
import { addButton } from '../ui/buttons.js';
import { drawList, hitList, activate, measure } from '../ui/rows.js';
import { defineSprite, text, textWidth } from '../sprites.js';
import { P, css } from '../palette.js';
import { VERSION, BUILD } from '../version.js';
import { saveHealth, save } from '../save.js';
import { ROWS, get, set, isOverridden, overriddenKeys, resetSeen, resetEverything } from './settings.js';

defineSprite('ui-dial', {
  map: { '.': null, k: 'greyPale', w: 'white' },
  frames: [[
    '............', '..ww........', 'kkkkkkkkkkkk', '..ww........',
    '............', '.......ww...', 'kkkkkkkkkkkk', '.......ww...',
    '............', '....ww......', 'kkkkkkkkkkkk', '....ww......',
  ]],
});

// Reset always asks once, in the panel, with a plain question — never a system
// dialog. `armed` holds which of the two is waiting for confirmation.
const state = { armed: null, armedAt: 0 };

function resetRow(label, key, run) {
  return {
    type: 'action', label,
    note: () => (state.armed === key ? 'SURE?' : 'TAP'),
    run() {
      if (state.armed === key && app.time - state.armedAt < 6) {
        state.armed = null;
        run();
      } else { state.armed = key; state.armedAt = app.time; }
    },
  };
}

function groups() {
  const g = [{
    section: 'settings',
    rows: ROWS.map((r) => ({
      type: 'choice', label: r.label, options: r.options,
      get: () => get(r.key),
      set: (v) => set(r.key, v),
      marked: () => isOverridden(r.key),
      disabled: () => isOverridden(r.key),
    })),
  }];
  const over = overriddenKeys();
  if (over.length) {
    g.push({
      section: 'in force from the url',
      rows: [{ type: 'info', label: 'these rows are locked', value: () => over.join(' ').toUpperCase() }],
    });
  }
  g.push({
    section: 'reset',
    rows: [
      resetRow('clear seen', 'seen', resetSeen),
      resetRow('clear everything', 'all', resetEverything),
    ],
  });
  g.push({
    section: 'about',
    rows: [
      { type: 'info', label: 'version', value: () => VERSION },
      { type: 'info', label: 'build', value: () => BUILD },
      { type: 'info', label: 'storage', value: () => (saveHealth().storage
        ? saveHealth().bytes + ' BYTES' : 'IN MEMORY ONLY') },
      { type: 'info', label: 'nothing leaves this phone', value: () => '' },
    ],
  });
  return g;
}

let cached = null;
const FOOTER = 8;

const spec = {
  id: 'settings',
  title: 'SETTINGS',
  onOpen() { cached = groups(); state.armed = null; },
  onClose() { cached = null; state.armed = null; },
  contentHeight: () => measure(cached || (cached = groups())) + FOOTER,
  draw(c, area, scroll) {
    // Rebuilt each frame only when the override section appears or vanishes.
    if (!cached) cached = groups();
    drawList(c, area, scroll, cached);
    if (overriddenKeys().length) {
      // On its own ground, or the last scrolled row shows through it.
      const note = 'MARKED ROWS ARE SET BY THE URL AND ARE NOT SAVED';
      c.fillStyle = P.rock1;
      c.fillRect(area.x - 2, area.y + area.h - 8, area.w + 4, 8);
      text(c, note, area.x, area.y + area.h - 6, P.accOrange, 0.75);
    }
  },
  onTap(x, y, scroll) {
    const row = hitList(contentRect(), scroll, cached || [], x, y);
    if (row && row.type !== 'action') state.armed = null;
    activate(row);
    cached = groups();
  },
};

export function openSettings() { openPanel(spec); }

export function init() {
  addButton({
    id: 'settings', order: 2, sprite: 'ui-dial', rest: 0.25,
    onTap: openSettings,
  });
}
