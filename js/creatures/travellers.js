// The ten travellers. They range across several zones and are what ties the
// column together — you meet the same turtle high up and again on the way down.
import { defineSprite, defineVariant, drawSpriteC } from '../sprites.js';
import { fish, ray, bell, blob, segment } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import { P, css } from '../palette.js';
import { screenX, screenY } from '../camera.js';
import { app } from '../main.js';
import * as B from '../behaviours.js';

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

defineSprite('silverside', { map: map({ b: 'silver', l: 'white', k: 'greyMid' }), frames: fish({ len: 5, h: 3, tail: 1, eye: false }) });
defineSprite('moonjelly', { map: map({ b: 'white', l: 'palePink', f: 'palePink', g: 'bioCyan', k: 'w2' }), frames: bell({ w: 12, h: 13, domeH: 5, arms: 4, glow: true }) });
defineSprite('turtle', {
  map: map({ b: 'olive', l: 'oliveLight', d: 'accOrange', f: 'olive', e: 'outline' }),
  frames: overlay(ray({ span: 34, h: 18, tail: 0 }), 27, 6, ['dddd', 'ddde', 'dddd']),
});
defineSprite('dolphin', { map: map({ b: 'greyMid', l: 'white', f: 'greyDark', e: 'outline', k: 'white' }), frames: fish({ len: 52, h: 16, tail: 11, tailH: 12, dorsal: true, dorsalH: 4, snout: 'point' }) });
defineSprite('combjelly', { map: map({ b: 'glass', l: 'white', f: 'bioCyan', g: 'bioMagenta', k: 'w4' }), frames: bell({ w: 8, h: 10, domeH: 4, arms: 2, glow: true, frames: 4 }) });
defineVariant('combjelly', 'lime', map({ b: 'glass', l: 'white', f: 'bioLime', g: 'bioLime', k: 'w4' }));
defineVariant('combjelly', 'violet', map({ b: 'glass', l: 'white', f: 'bioViolet', g: 'bioViolet', k: 'w4' }));
defineSprite('sixgill', { map: map({ b: 'silhouette', l: 'greyPale', f: 'silhouette', k: 'rock1', e: 'rock2' }), frames: fish({ len: 90, h: 24, tail: 19, tailH: 20, dorsal: true, dorsalH: 3, snout: 'point' }) });
defineSprite('lanternfish', { map: map({ b: 'rock1', l: 'bioCyan', d: 'bioCyan', f: 'rock2', e: 'bioCyan', k: 'silhouette' }), frames: fish({ len: 8, h: 5, tail: 2, stripes: [0.3, 0.55, 0.8] }) });
defineSprite('sipho', { map: map({ b: 'bioCyan', l: 'bioLime', g: 'white', k: 'w5' }), frames: segment({ w: 6, h: 6, glow: true }) });
defineSprite('krill', { map: map({ b: 'greyPale', l: 'white', k: 'w5' }), frames: [['bb'], ['bl']] });
defineSprite('spermwhale', {
  map: map({ b: 'silhouette', l: 'greyPale', f: 'silhouette', e: 'greyPale', k: 'rock1' }),
  frames: overlay(fish({ len: 178, h: 44, tail: 34, tailH: 30, bend: 0.5 }), 108, 6,
    ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'llllllllllllllllllllllllllllll']),
});

/**
 * A siphonophore hangs vertically: the head sinks and the chain trails above it
 * in a travelling wave. `undulating` swims along x, so this is its own update.
 */
const verticalChain = {
  id: 'undulating',
  init(c) {
    const t = c.def.tune;
    c.ensureSpine();
    for (let i = 0; i < t.segments; i++) { c.spineX[i] = c.x; c.spineY[i] = c.y - i * t.segLen; }
    c.d.w = Math.random() * 10;
  },
  update(c, dt) {
    const t = c.def.tune;
    c.d.w += dt;
    c.y += t.speed * dt;
    c.x += Math.sin(c.d.w * t.waveRate * 0.5) * t.waveAmp * dt;
    c.spineX[0] = c.x; c.spineY[0] = c.y;
    for (let i = 1; i < t.segments; i++) {
      const dx = c.spineX[i - 1] - c.spineX[i];
      const dy = c.spineY[i - 1] - c.spineY[i];
      const d = Math.hypot(dx, dy) || 1e-6;
      const k = (d - t.segLen) / d;
      c.spineX[i] += dx * k;
      c.spineY[i] += dy * k;
      c.spineX[i] += Math.sin(c.d.w * t.waveRate - i * t.lag) * t.ripple * dt;
    }
  },
};

/** Cyan and lime beads alternating down the chain, lighting in sequence. */
function renderSipho(c, ctx) {
  const t = c.def.tune;
  for (let i = t.segments - 1; i >= 0; i--) {
    const x = screenX(c.spineX[i], c.def.layer), y = screenY(c.spineY[i], c.def.layer);
    if (y < -8 || y > app.ih + 8) continue;
    drawSpriteC(ctx, 'sipho', (i + ((c.phase * 3) | 0)) % 2, x | 0, y | 0, false);
  }
}

export const SILVERSIDE = defineSpecies({
  id: 'silverside', name: 'Silverside Bait Ball', zones: [0, 1, 2, 3], band: 'motes', sprite: 'silverside',
  size: 4, fps: 10, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock, kind: 'traveller',
  note: 'Forty thousand of them behave as one animal, and that is the whole defence.',
  depth: [0.15, 0.85], maxAlive: 2, count: [40, 60],
  tune: { min: 40, max: 60, spread: 26, speed: 26, travel: 9, rise: 3,
    sep: 52, sepR: 3, align: 1.8, cohere: 1.6, targetPull: 1.6, jitter: 8, maxTurn: 9,
    swirl: 20, swirlRate: 1.3, vertical: 0.9 },
});

export const MOONJELLY = defineSpecies({
  id: 'moonjelly', name: 'Moon Jellyfish', zones: [0, 1, 2, 3, 4], band: 'small', sprite: 'moonjelly',
  size: 12, fps: 3, frames: 3, behaviour: B.pulsing, behaviourId: 'pulsing', kind: 'traveller',
  note: 'No brain, no blood, no bones — and it has been doing this for six hundred million years.',
  depth: [0.1, 0.9], maxAlive: 5, count: [1, 5],
  tune: { period: 2.9, contract: 0.27, thrust: 20, drag: 2.2, sink: 3, wander: 4 },
});

export const TURTLE = defineSpecies({
  id: 'turtle', name: 'Green Sea Turtle', zones: [0, 1, 2, 3], band: 'medium', sprite: 'turtle',
  size: 36, fps: 4, frames: 3, behaviour: B.flapping, behaviourId: 'flapping', kind: 'traveller',
  note: 'Navigates by the magnetic field of the Earth, and returns to the beach it hatched on.',
  depth: [0.12, 0.8], maxAlive: 2, count: [1, 4],
  tune: { period: 3.2, beat: 0.44, speed: 13, lift: 8, sink: 5 },
});

export const DOLPHIN = defineSpecies({
  id: 'dolphin', name: 'Bottlenose Dolphin', zones: [0, 1, 2], band: 'large', sprite: 'dolphin',
  size: 52, fps: 6, behaviour: B.cruising, behaviourId: 'cruising', kind: 'traveller',
  note: 'Sleeps one half of its brain at a time, because it has to remember to breathe.',
  depth: [0.1, 0.7], maxAlive: 2, count: [1, 3],
  tune: { speed: 30, turnRate: 0.42, turnAmp: 0.55, agility: 1.5, vertical: 0.35, surge: 0.2 },
});

export const COMBJELLY = defineSpecies({
  id: 'combjelly', name: 'Comb Jelly', zones: [2, 3, 4, 5, 6], band: 'small', sprite: 'combjelly',
  size: 8, fps: 5, frames: 4, behaviour: B.pulsing, behaviourId: 'pulsing', kind: 'traveller',
  note: 'Rows of beating cilia split the light into a running rainbow. It makes none of it.',
  depth: [0.1, 0.9], maxAlive: 6, count: [3, 7],
  variants: [null, 'lime', 'violet'], variantEvery: 2.2,
  tune: { period: 2.2, contract: 0.3, thrust: 14, drag: 2.6, sink: 2, wander: 5 },
});

export const SIXGILL = defineSpecies({
  id: 'sixgill', name: 'Sixgill Shark', zones: [3, 4, 5], band: 'large', sprite: 'sixgill',
  size: 90, fps: 3, behaviour: B.cruising, behaviourId: 'cruising', layer: 0.5, kind: 'traveller',
  note: 'A shape older than trees, rising at night and sinking away again before dawn.',
  depth: [0.15, 0.85], maxAlive: 1, count: 1,
  tune: { speed: 8, turnRate: 0.11, turnAmp: 0.2, agility: 0.45, vertical: 0.12, surge: 0.05 },
});

export const LANTERNFISH = defineSpecies({
  id: 'lanternfish', name: 'Lanternfish', zones: [3, 4, 5], band: 'small', sprite: 'lanternfish',
  size: 7, fps: 8, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock, kind: 'traveller',
  note: 'Rises a kilometre every night to feed and sinks again by morning — the largest migration on Earth.',
  depth: [0.1, 0.9], maxAlive: 2, count: [16, 24],
  tune: { min: 16, max: 24, spread: 20, speed: 15, travel: 5, rise: 3,
    sep: 34, sepR: 3.2, align: 1.2, cohere: 1.0, targetPull: 1.1, jitter: 7, maxTurn: 6,
    swirl: 15, swirlRate: 0.9, vertical: 0.9 },
});

export const SIPHONOPHORE = defineSpecies({
  id: 'siphonophore', name: 'Giant Siphonophore', zones: [4, 5, 6], band: 'large', sprite: 'sipho',
  size: 110, fps: 3, behaviour: verticalChain, behaviourId: 'undulating', render: renderSipho, kind: 'traveller',
  note: 'Not one animal but a colony of thousands, each with a single job, strung on one thread.',
  depth: [0.1, 0.6], maxAlive: 1, count: 1,
  tune: { segments: 18, segLen: 5.6, speed: 5, waveRate: 1.1, waveAmp: 8, ripple: 10, lag: 0.45 },
});

export const KRILL = defineSpecies({
  id: 'krill', name: 'Krill Swarm', zones: [4, 5, 6], band: 'motes', sprite: 'krill',
  size: 2, fps: 6, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock, kind: 'traveller',
  note: 'By weight, one of the most abundant animals alive, and most of the ocean depends on it.',
  depth: [0.1, 0.9], maxAlive: 2, count: [50, 62],
  tune: { min: 50, max: 62, spread: 34, speed: 8, travel: 2, rise: 1,
    sep: 18, sepR: 2.6, align: 0.5, cohere: 0.8, targetPull: 1.6, jitter: 11, maxTurn: 9,
    swirl: 14, swirlRate: 1.5, vertical: 1 },
});

export const SPERMWHALE = defineSpecies({
  id: 'spermwhale', name: 'Sperm Whale', zones: [3, 4, 5], band: 'huge', sprite: 'spermwhale',
  size: 180, fps: 2, behaviour: B.cruising, behaviourId: 'cruising', layer: 0.5, kind: 'traveller',
  note: 'Dives two kilometres on one breath and hunts squid in total darkness by sound alone.',
  depth: [0.1, 0.85], maxAlive: 1, count: 1, runChance: 0.25,
  tune: { speed: 13, turnRate: 0.09, turnAmp: 0.14, agility: 0.35, vertical: 0.42, surge: 0.04 },
});
