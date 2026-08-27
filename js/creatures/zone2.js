// Zone 2 — Coral Reef. The busiest band: warm reef fish over coral colour.
import { defineSprite, defineVariant } from '../sprites.js';
import { fish, blob, bell, segment } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import * as B from '../behaviours.js';

defineSprite('tang', { map: map({ b: 'accYellow', l: 'accYellow', f: 'accYellow', d: 'accOrange' }), frames: fish({ len: 11, h: 9, tail: 3, dorsal: true, anal: true }) });
defineSprite('clownfish', { map: map({ b: 'accOrange', l: 'white', d: 'white', f: 'accOrange' }), frames: fish({ len: 8, h: 6, tail: 2, stripes: [0.3, 0.7] }) });
defineSprite('damselfish', { map: map({ b: 'bioMagenta', l: 'bioLime', f: 'bioMagenta' }), frames: fish({ len: 6, h: 5, tail: 2 }) });
defineSprite('angelfish', { map: map({ b: 'accYellow', l: 'white', d: 'outline', f: 'accYellow' }), frames: fish({ len: 18, h: 14, tail: 4, dorsal: true, anal: true, stripes: [0.28, 0.52, 0.76] }) });
defineSprite('parrotfish', { map: map({ b: 'w0', l: 'bioCyan', d: 'bioMagenta', f: 'bioMagenta' }), frames: fish({ len: 24, h: 11, tail: 5, dorsal: true, stripes: [0.62] }) });
defineSprite('blacktip', { map: map({ b: 'greyMid', l: 'white', f: 'greyDark', d: 'outline' }), frames: fish({ len: 60, h: 20, tail: 13, dorsal: true, snout: 'point' }) });
defineSprite('seahorse', {
  map: map({ b: 'accCoral', l: 'coral2', f: 'coral2' }),
  frames: [
    ['.kkk..', 'kbbbk.', 'kbebk.', 'kbbkkk', '.kbbbk', '..kbbk', '..fbbk', '..kbk.', '..kbk.', '..kbbk', '...kk.'],
    ['.kkk..', 'kbbbk.', 'kbebk.', 'kbbkkk', '.kbbbk', '..kbbk', '..kbbf', '..kbk.', '..kbk.', '.kbbk.', '.kk...'],
  ],
});
defineSprite('cleanershrimp', {
  map: map({ b: 'white', d: 'accRed', l: 'white' }),
  frames: [['.dd.', 'bddb', '.bb.'], ['.dd.', 'bddb', 'b..b']],
});
defineSprite('moray', { map: map({ b: 'kelp2', l: 'kelp1', d: 'outline', e: 'accYellow' }), frames: segment({ w: 7, h: 7 }) });
defineSprite('octopus', { map: map({ b: 'coral1', l: 'coral2', f: 'coral1', e: 'accYellow' }), frames: blob({ w: 14, h: 16, eyes: true, arms: 5, armLen: 7 }) });
defineVariant('octopus', 'hot', map({ b: 'accOrange', l: 'accYellow', f: 'accOrange', e: 'outline' }));
defineVariant('octopus', 'rock', map({ b: 'rock2', l: 'rock1', f: 'rock2', e: 'accYellow' }));

export const TANG = defineSpecies({
  id: 'tang', name: 'Yellow Tang', zones: [1], band: 'small', sprite: 'tang',
  size: 11, fps: 8, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'A surgeonfish with a scalpel at the base of its tail; grazes algae all day.',
  depth: [0.25, 0.75], maxAlive: 2, count: [8, 14],
  tune: { min: 8, max: 14, spread: 20, speed: 20, travel: 7, rise: 3,
    sep: 40, sepR: 4, align: 1.3, cohere: 0.9, targetPull: 1.0, jitter: 6, maxTurn: 5,
    swirl: 16, swirlRate: 0.8, vertical: 0.7 },
});

export const CLOWNFISH = defineSpecies({
  id: 'clownfish', name: 'Clownfish Pair', zones: [1], band: 'small', sprite: 'clownfish',
  size: 8, fps: 9, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Never strays from its anemone, whose sting it is the only fish immune to.',
  depth: [0.55, 0.8], maxAlive: 2, count: 2,
  tune: { rate: 2.4, bob: 3, sway: 4, faceEvery: 1.4 },
});

export const DAMSELFISH = defineSpecies({
  id: 'damselfish', name: 'Damselfish', zones: [1], band: 'small', sprite: 'damselfish',
  size: 6, fps: 10, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Tiny, electric and absurdly aggressive about its patch of coral.',
  depth: [0.4, 0.8], maxAlive: 2, count: [10, 16],
  tune: { min: 10, max: 16, spread: 14, speed: 30, travel: 4, rise: 2,
    sep: 46, sepR: 3, align: 1.5, cohere: 1.4, targetPull: 1.8, jitter: 14, maxTurn: 11,
    swirl: 9, swirlRate: 1.9, vertical: 1 },
});

export const ANGELFISH = defineSpecies({
  id: 'angelfish', name: 'Angelfish', zones: [1], band: 'medium', sprite: 'angelfish',
  size: 18, fps: 6, behaviour: B.cruising, behaviourId: 'cruising',
  note: 'Tall and flat, built to turn on the spot between coral heads.',
  depth: [0.3, 0.75], maxAlive: 2, count: [1, 2],
  tune: { speed: 11, turnRate: 0.5, turnAmp: 0.6, agility: 1.6, vertical: 0.4, surge: 0.15 },
});

export const PARROTFISH = defineSpecies({
  id: 'parrotfish', name: 'Parrotfish', zones: [1], band: 'medium', sprite: 'parrotfish',
  size: 24, fps: 6, frames: 2, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Bites coral with a beak of fused teeth; most of the sand below you is its work.',
  depth: [0.72, 0.84], maxAlive: 2, count: [1, 2],
  tune: { speed: 7, range: 40, biteEvery: 1.6, biteTime: 0.5, follow: 1.4 },
});

export const OCTOPUS = defineSpecies({
  id: 'octopus', name: 'Octopus', zones: [1], band: 'medium', sprite: 'octopus',
  size: 22, fps: 4, frames: 2, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Changes colour in under a second using pigment sacs it controls one by one.',
  depth: [0.7, 0.84], maxAlive: 1, count: 1,
  variants: [null, 'hot', 'rock'], variantEvery: 3.5,
  tune: { rate: 0.9, bob: 1.6, sway: 2.2, faceEvery: 3.2 },
});

export const MORAY = defineSpecies({
  id: 'moray', name: 'Moray Eel', zones: [1], band: 'medium', sprite: 'moray',
  size: 26, fps: 5, behaviour: B.ambush, behaviourId: 'ambush', render: B.renderChain,
  note: 'Holds its mouth open to breathe, which is why it always looks like a threat.',
  depth: [0.74, 0.86], maxAlive: 1, count: 1,
  tune: { reach: 16, emerge: 0.5, watch: 1.8, withdraw: 0.7, hide: 3.2, segments: 5, segLen: 4 },
});

export const SEAHORSE = defineSpecies({
  id: 'seahorse', name: 'Seahorse', zones: [1], band: 'small', sprite: 'seahorse',
  size: 10, fps: 4, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Anchors by its tail and lets the current bring dinner; the male carries the eggs.',
  depth: [0.6, 0.82], maxAlive: 2, count: [1, 2],
  tune: { rate: 1.1, bob: 1.4, sway: 0.8, faceEvery: 5 },
});

export const CLEANERSHRIMP = defineSpecies({
  id: 'cleanershrimp', name: 'Cleaner Shrimp', zones: [1], band: 'motes', sprite: 'cleanershrimp',
  size: 4, fps: 7, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Runs a station bigger fish queue at, and picks parasites out of their mouths.',
  depth: [0.78, 0.86], maxAlive: 5, count: [3, 5],
  tune: { speed: 3, range: 10, biteEvery: 0.8, biteTime: 0.3, follow: 0.4 },
});

export const BLACKTIP = defineSpecies({
  id: 'blacktip', name: 'Blacktip Reef Shark', zones: [1], band: 'large', sprite: 'blacktip',
  size: 60, fps: 4, behaviour: B.cruising, behaviourId: 'cruising', layer: 1,
  note: 'Patrols the outer edge of the reef on a circuit it repeats for years.',
  depth: [0.3, 0.6], maxAlive: 1, count: 1,
  tune: { speed: 17, turnRate: 0.19, turnAmp: 0.34, agility: 0.7, vertical: 0.14, surge: 0.08 },
});
