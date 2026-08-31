// Zone 4 — Open Blue. Deliberately the emptiest band: a few very large animals
// and a lot of water. Everything carries a white belly or outline so it reads
// against blue.
import { defineSprite, drawSpriteC } from '../sprites.js';
import { fish, ray, bell } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import { P } from '../palette.js';
import * as B from '../behaviours.js';

/** Stamp a pattern over generated frames — used for the hammerhead's head. */
function overlay(frames, ox, oy, pattern) {
  return frames.map((rowsIn) => rowsIn.map((r, y) => {
    const py = y - oy;
    if (py < 0 || py >= pattern.length) return r;
    const p = pattern[py];
    const out = r.split('');
    for (let x = 0; x < p.length; x++) if (p[x] !== ' ' && ox + x < out.length) out[ox + x] = p[x];
    return out.join('');
  }));
}

defineSprite('whaleshark', {
  map: map({ b: 'greyDark', l: 'white', d: 'greyMid', f: 'greyDark', e: 'outline' }),
  frames: fish({ len: 170, h: 54, tail: 34, tailH: 40, dorsal: true, dorsalH: 5, spots: 90, bend: 0.6 }),
});
defineSprite('manta', {
  map: map({ b: 'silhouette', l: 'white', f: 'silhouette', e: 'white' }),
  frames: ray({ span: 80, h: 30, tail: 22 }),
});
defineSprite('sunfish', {
  map: map({ b: 'greyPale', l: 'white', f: 'greyPale', k: 'white', e: 'outline' }),
  frames: fish({ len: 40, h: 56, tail: 5, tailH: 8, dorsal: true, dorsalH: 12, anal: true, analH: 12, bend: 0.3 }),
});
defineSprite('sailfish', {
  map: map({ b: 'greyDark', l: 'white', f: 'bioViolet', e: 'white' }),
  frames: fish({ len: 50, h: 14, tail: 11, tailH: 12, snout: 'point', dorsal: true, dorsalH: 10 }),
});
defineSprite('hammerhead', {
  map: map({ b: 'silhouette', l: 'silhouette', f: 'silhouette', k: 'silhouette', e: 'silhouette' }),
  frames: overlay(fish({ len: 62, h: 18, tail: 13, tailH: 14, dorsal: true, dorsalH: 3, snout: 'point', eye: false }),
    54, 4, ['bbbbbbb', 'bbbbbbb', '  bbb  ', '  bbb  ', '  bbb  ', 'bbbbbbb', 'bbbbbbb']),
});
defineSprite('bluejelly', {
  map: map({ b: 'glass', l: 'white', f: 'glass', g: 'white', k: 'w2' }),
  frames: bell({ w: 14, h: 14, domeH: 6, arms: 4, glow: true }),
});

/** The whale shark never travels alone. */
function withEscort(c, ctx) {
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), c.sx() | 0, c.sy() | 0, c.face < 0);
  const x = c.sx(), y = c.sy(), f = c.face;
  ctx.fillStyle = P.silver;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect((x - f * (10 + i * 16)) | 0, (y + 8 + (i & 1) * 5) | 0, 4, 1);
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillRect((x + f * (86 + i * 6)) | 0, (y - 6 + i * 4 + Math.sin(c.phase * 3 + i) * 1.5) | 0, 3, 1);
  }
}

export const WHALESHARK = defineSpecies({
  id: 'whaleshark', name: 'Whale Shark', zones: [3], band: 'huge', sprite: 'whaleshark',
  size: 170, fps: 3, behaviour: B.cruising, behaviourId: 'cruising', render: withEscort,
  note: 'The largest fish alive, and it eats the smallest things in the ocean.',
  depth: [0.3, 0.7], maxAlive: 1, count: 1,
  tune: { speed: 11, turnRate: 0.12, turnAmp: 0.16, agility: 0.4, vertical: 0.1, surge: 0.05 },
});

export const MANTA = defineSpecies({
  id: 'manta', name: 'Manta Ray', zones: [3], band: 'large', sprite: 'manta',
  size: 80, fps: 4, frames: 3, behaviour: B.flapping, behaviourId: 'flapping', layer: 1.3,
  note: 'Flies rather than swims, and will loop repeatedly through a good patch of plankton.',
  depth: [0.2, 0.7], maxAlive: 1, count: 1,
  tune: { period: 4.2, beat: 0.42, speed: 14, lift: 9, sink: 5 },
});

export const SUNFISH = defineSpecies({
  id: 'sunfish', name: 'Ocean Sunfish', zones: [3], band: 'large', sprite: 'sunfish',
  size: 56, fps: 3, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'A head that gave up on having a body, drifting after jellyfish.',
  depth: [0.25, 0.6], maxAlive: 1, count: 1,
  tune: { rate: 0.45, bob: 3.5, sway: 3, faceEvery: 6 },
});

export const SAILFISH = defineSpecies({
  id: 'sailfish', name: 'Sailfish', zones: [3], band: 'large', sprite: 'sailfish',
  size: 50, fps: 8, behaviour: B.cruising, behaviourId: 'cruising',
  note: 'The fastest fish in the sea; raises its sail to herd bait into a ball.',
  depth: [0.2, 0.6], maxAlive: 1, count: 1,
  tune: { speed: 46, turnRate: 0.35, turnAmp: 0.4, agility: 1.4, vertical: 0.2, surge: 0.25 },
});

export const HAMMERHEAD = defineSpecies({
  id: 'hammerhead', name: 'Hammerhead', zones: [3], band: 'large', sprite: 'hammerhead',
  size: 66, fps: 3, behaviour: B.cruising, behaviourId: 'cruising', layer: 0.5,
  note: 'The wide head spreads its electrical sensors, and they school by the hundred.',
  depth: [0.15, 0.75], maxAlive: 5, count: [3, 5],
  tune: { speed: 9, turnRate: 0.14, turnAmp: 0.25, agility: 0.5, vertical: 0.08, surge: 0.05 },
});

export const BLUEJELLY = defineSpecies({
  id: 'bluejelly', name: 'Blue Jellyfish', zones: [3], band: 'small', sprite: 'bluejelly',
  size: 14, fps: 4, frames: 3, behaviour: B.pulsing, behaviourId: 'pulsing',
  note: 'Ninety-five per cent water, and still the most efficient swimmer in the sea.',
  depth: [0.15, 0.85], maxAlive: 4, count: [3, 6],
  tune: { period: 3.0, contract: 0.26, thrust: 20, drag: 2.2, sink: 3, wander: 3 },
});
