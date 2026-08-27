// The vignette interface. The director owns selection, timing, staging and
// teardown; a vignette owns only what happens.
export const VIGNETTES = [];

/**
 * o = {
 *   id, zone, name, note,          identity and glossary metadata
 *   duration,                      seconds, 6-10
 *   needs: ['stingray'],           species ids to promote or spawn
 *   start(v),                      called once, actors already placed
 *   update(v, t, dt),              t counts 0..duration
 *   draw(ctx, v),                  optional, drawn above the creatures
 *   end(v),                        optional teardown beyond the standard one
 *   peak: [from, to],              the payoff window; quality is frozen inside it
 *   can(),                         optional: false when it cannot be staged now
 * }
 */
export function defineVignette(o) {
  const v = { duration: 8, needs: [], peak: null, kind: 'vignette', ...o };
  if (VIGNETTES.some((x) => x.id === v.id)) console.warn('duplicate vignette id', v.id);
  VIGNETTES.push(v);
  return v;
}

export function vignettesForZone(z) { return VIGNETTES.filter((v) => v.zone === z); }
export function vignetteById(id) { return VIGNETTES.find((v) => v.id === id) || null; }

// --- timing helpers ---------------------------------------------------------

export function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
export function ease(t) { const k = clamp01(t); return k * k * (3 - 2 * k); }
/** 0 before `a`, 1 after `b`, smoothly between. */
export function phase(t, a, b) { return ease((t - a) / Math.max(1e-6, b - a)); }
/** A 0 -> 1 -> 0 pulse across [a, b]. */
export function pulse(t, a, b) {
  const k = clamp01((t - a) / Math.max(1e-6, b - a));
  return Math.sin(k * Math.PI);
}
