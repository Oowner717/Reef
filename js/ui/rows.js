// Shared row list for every panel: section headings, a label on the left and a
// value or control on the right. Built once here so the debug menu, the
// glossary and the settings panel all lay out identically.
import { P, css } from '../palette.js';
import { text, textWidth } from '../sprites.js';

export const ROW_H = 11;
export const HEAD_H = 13;

function valueOf(r) {
  if (r.type === 'toggle') return r.get() ? 'ON' : 'OFF';
  if (r.type === 'choice') {
    const v = r.get();
    const o = r.options.find((x) => x.value === v);
    return o ? o.label : String(v);
  }
  if (r.type === 'action') return r.note ? r.note() : '>';
  if (r.type === 'info') return String(r.value());
  return '';
}

/** Total content height for a set of groups. */
export function measure(groups) {
  let h = 0;
  for (const g of groups) {
    if (!g.rows.length) continue;
    h += HEAD_H;
    for (const r of g.rows) h += r.type === 'graph' ? (r.height || 18) + 3 : ROW_H;
  }
  return h + 4;
}

/** Walk the layout, calling back with each row's y. Used to draw and to hit-test. */
function walk(groups, cb) {
  let y = 0;
  for (const g of groups) {
    if (!g.rows.length) continue;
    cb(null, g, y, HEAD_H);
    y += HEAD_H;
    for (const r of g.rows) {
      const h = r.type === 'graph' ? (r.height || 18) + 3 : ROW_H;
      cb(r, g, y, h);
      y += h;
    }
  }
}

export function drawList(c, area, scroll, groups) {
  walk(groups, (row, group, y, h) => {
    const sy = area.y + y - scroll;
    if (sy > area.y + area.h || sy + h < area.y) return;
    if (!row) {
      text(c, group.section.toUpperCase(), area.x, sy + 4, P.bioCyan, 0.85);
      c.fillStyle = css(P.bioCyan, 0.25);
      c.fillRect(area.x, sy + 10, area.w, 1);
      return;
    }
    if (row.type === 'graph') {
      text(c, row.label.toUpperCase(), area.x, sy + 1, P.greyPale, 0.65);
      row.render(c, area.x, sy + 7, area.w, h - 8);
      return;
    }
    const dim = row.disabled && row.disabled();
    text(c, row.label.toUpperCase(), area.x, sy + 3, P.silver, dim ? 0.35 : 0.8);
    const v = valueOf(row);
    const colour = row.type === 'action' ? P.accYellow
      : row.type === 'toggle' ? (row.get() ? P.bioLime : P.greyPale)
        : P.white;
    text(c, v, area.x + area.w - textWidth(v) - 1, sy + 3, colour, dim ? 0.35 : 0.9);
    if (row.marked && row.marked()) {
      c.fillStyle = P.accOrange;
      c.fillRect(area.x + area.w - textWidth(v) - 5, sy + 4, 2, 2);
    }
  });
}

/** The row under a tap, or null. */
export function hitList(area, scroll, groups, x, y) {
  if (x < area.x || x > area.x + area.w) return null;
  let hit = null;
  walk(groups, (row, group, ry, h) => {
    if (!row || hit) return;
    const sy = area.y + ry - scroll;
    if (y >= sy && y < sy + h) hit = row;
  });
  return hit;
}

/** The standard activation: toggles flip, choices cycle, actions run. */
export function activate(row) {
  if (!row || (row.disabled && row.disabled())) return;
  if (row.type === 'toggle') row.set(!row.get());
  else if (row.type === 'choice') {
    const v = row.get();
    let i = row.options.findIndex((o) => o.value === v);
    i = (i + 1) % row.options.length;
    row.set(row.options[i].value);
  } else if (row.type === 'action') row.run();
}
