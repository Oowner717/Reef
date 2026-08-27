// Stages register their own debug rows here rather than editing the menu, so
// the menu never goes stale and nothing has to be hand-maintained.

const rows = [];
const sectionOrder = new Map();

/**
 * row = {
 *   section, order, label,
 *   type: 'info'   value() -> string
 *       | 'toggle' get() -> bool, set(bool)
 *       | 'choice' options: [{label, value}], get(), set(value)
 *       | 'action' run(), and optionally note() -> string
 *       | 'graph'  height, render(ctx, x, y, w, h)
 * }
 */
export function addRow(row) {
  if (!sectionOrder.has(row.section)) {
    sectionOrder.set(row.section, row.sectionOrder ?? sectionOrder.size * 10);
  } else if (row.sectionOrder !== undefined) {
    sectionOrder.set(row.section, Math.min(sectionOrder.get(row.section), row.sectionOrder));
  }
  rows.push({ order: 0, ...row });
  return row;
}

export const addInfo = (section, label, value, o) => addRow({ section, label, type: 'info', value, ...o });
export const addToggle = (section, label, get, set, o) => addRow({ section, label, type: 'toggle', get, set, ...o });
export const addChoice = (section, label, options, get, set, o) => addRow({ section, label, type: 'choice', options, get, set, ...o });
export const addAction = (section, label, run, o) => addRow({ section, label, type: 'action', run, ...o });
export const addGraph = (section, label, render, height, o) => addRow({ section, label, type: 'graph', render, height, ...o });

/** All rows, grouped and ordered, as [{ section, rows: [...] }]. */
export function grouped() {
  const names = [...sectionOrder.keys()].sort((a, b) => sectionOrder.get(a) - sectionOrder.get(b));
  return names.map((section) => ({
    section,
    rows: rows.filter((r) => r.section === section).sort((a, b) => a.order - b.order),
  }));
}

export function rowCount() { return rows.length; }
