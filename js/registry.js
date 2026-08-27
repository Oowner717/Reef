// The single list the spawner, the vignette director, the encounter scheduler
// and the glossary all read. Nothing is hand-maintained twice: every creature,
// vignette and mythical module declares its own metadata where it is defined,
// and this file only groups and orders what has declared itself.
import { SPECIES } from './creatures/base.js';
import { VIGNETTES } from './vignettes/base.js';
import { ZONES } from './world.js';

/** Stage 15's mythicals register here; the glossary picks them up for free. */
export const MYTHICALS = [];
export function registerMythical(def) {
  if (MYTHICALS.some((m) => m.id === def.id)) return def;
  MYTHICALS.push({ kind: 'mythical', band: 'mythical', zones: [0, 1, 2, 3, 4, 5, 6], ...def });
  return def;
}

export function creatures() { return SPECIES.filter((s) => s.kind === 'creature'); }
export function travellers() { return SPECIES.filter((s) => s.kind === 'traveller'); }
export function spawnable() { return SPECIES; }
export function scenes() { return VIGNETTES; }
export function scenesForZone(z) { return VIGNETTES.filter((v) => v.zone === z); }
export function creaturesForZone(z) {
  return SPECIES.filter((s) => s.kind === 'creature' && s.zones.indexOf(z) >= 0);
}

/**
 * The glossary's sections, in order: creatures by zone, then travellers, then
 * scenes, then mythicals. Sections with nothing in them are dropped.
 */
export function sections() {
  const out = [];
  for (let z = 0; z < ZONES.length; z++) {
    const list = creaturesForZone(z);
    if (list.length) out.push({ id: 'zone' + z, title: ZONES[z].name, entries: list });
  }
  const t = travellers();
  if (t.length) out.push({ id: 'travellers', title: 'Travellers', entries: t });
  const s = scenes();
  if (s.length) out.push({ id: 'scenes', title: 'Scenes', entries: s });
  if (MYTHICALS.length) out.push({ id: 'mythicals', title: 'Mythicals', entries: MYTHICALS });
  return out;
}

/** Every glossary-tracked thing, flat. */
export function allEntries() {
  return [].concat(SPECIES, VIGNETTES, MYTHICALS);
}

export function entryById(id) {
  return allEntries().find((e) => e.id === id) || null;
}

export function total() { return allEntries().length; }

/** How many of a zone's creatures and scenes there are, for the per-zone bars. */
export function zoneTotals(z) {
  return creaturesForZone(z).length + scenesForZone(z).length;
}
export function zoneEntries(z) {
  return [].concat(creaturesForZone(z), scenesForZone(z));
}
