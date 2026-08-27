// Zone 3 — The Drop-off. Darker water, the wall, and the wreck.
import { defineSprite } from '../sprites.js';
import { fish, blob } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import * as B from '../behaviours.js';

defineSprite('barracuda', { map: map({ b: 'silver', l: 'white', d: 'greyDark', f: 'greyPale' }), frames: fish({ len: 46, h: 11, tail: 9, snout: 'point', stripes: [0.35, 0.5, 0.65, 0.8] }) });
defineSprite('grouper', { map: map({ b: 'brown', l: 'sand2', d: 'sand1', f: 'brown', e: 'accYellow' }), frames: fish({ len: 40, h: 17, tail: 8, dorsal: true, spots: 14 }) });
defineSprite('batfish', { map: map({ b: 'greyDark', l: 'greyPale', d: 'outline', f: 'greyDark' }), frames: fish({ len: 22, h: 20, tail: 4, dorsal: true, anal: true, stripes: [0.2] }) });
defineSprite('lionfish', { map: map({ b: 'accRed', l: 'white', d: 'white', f: 'accCoral' }), frames: fish({ len: 20, h: 13, tail: 4, dorsal: true, anal: true, stripes: [0.25, 0.45, 0.65, 0.85] }) });
defineSprite('urchin', { map: map({ b: 'bioViolet', d: 'bioViolet', l: 'rock2' }), frames: blob({ w: 7, h: 7, spikes: 10 }) });

export const BARRACUDA = defineSpecies({
  id: 'barracuda', name: 'Great Barracuda', zones: [2], band: 'medium', sprite: 'barracuda',
  size: 46, fps: 5, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Hangs motionless for minutes, then covers ten body lengths before you register it.',
  depth: [0.25, 0.65], maxAlive: 1, count: 1,
  tune: { rate: 0.5, bob: 2.2, sway: 5, faceEvery: 4.5 },
});

export const GROUPER = defineSpecies({
  id: 'grouper', name: 'Grouper', zones: [2], band: 'medium', sprite: 'grouper',
  size: 40, fps: 4, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Feeds by opening its mouth so fast the water does the work for it.',
  depth: [0.45, 0.75], maxAlive: 1, count: 1,
  tune: { rate: 0.7, bob: 1.8, sway: 2.4, faceEvery: 5.5 },
});

export const BATFISH = defineSpecies({
  id: 'batfish', name: 'Batfish School', zones: [2], band: 'medium', sprite: 'batfish',
  size: 22, fps: 5, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Drifts in slow discs around anything solid, tilting to catch the light.',
  depth: [0.3, 0.7], maxAlive: 1, count: [6, 10],
  tune: { min: 6, max: 10, spread: 30, speed: 10, travel: 4, rise: 2,
    sep: 60, sepR: 8, align: 0.7, cohere: 0.5, targetPull: 0.7, jitter: 3, maxTurn: 2.2,
    swirl: 22, swirlRate: 0.45, vertical: 0.8 },
});

export const URCHIN = defineSpecies({
  id: 'urchin', name: 'Sea Urchin', zones: [2], band: 'small', sprite: 'urchin',
  size: 7, fps: 2, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Grazes the wall on rows of tube feet; the spines are for everything else.',
  depth: [0.2, 0.85], maxAlive: 6, count: [4, 6],
  tune: { speed: 1.6, range: 12, biteEvery: 2.6, biteTime: 0.8, follow: 0.4 },
});

export const LIONFISH = defineSpecies({
  id: 'lionfish', name: 'Lionfish', zones: [2], band: 'medium', sprite: 'lionfish',
  size: 20, fps: 4, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Herds smaller fish into a corner with its fanned spines, then swallows them whole.',
  depth: [0.3, 0.8], maxAlive: 2, count: [1, 2],
  tune: { rate: 0.85, bob: 1.6, sway: 3.4, faceEvery: 3.8 },
});
