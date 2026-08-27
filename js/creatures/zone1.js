// Zone 1 — Surface Shallows. Warm, saturated animals against bright teal water.
import { defineSprite } from '../sprites.js';
import { fish, ray, star } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import * as B from '../behaviours.js';

const SILVER = map({ b: 'silver', l: 'white', d: 'greyMid', f: 'greyPale' });

defineSprite('needlefish', { map: SILVER, frames: fish({ len: 20, h: 5, tail: 4, snout: 'point', bend: 0.7 }) });
defineSprite('flyingfish', { map: map({ b: 'greyMid', l: 'white', f: 'white', d: 'silver' }), frames: fish({ len: 14, h: 6, tail: 3, dorsal: true }) });
defineSprite('mullet', { map: map({ b: 'olive', l: 'silver', f: 'oliveLight' }), frames: fish({ len: 10, h: 5, tail: 3 }) });
defineSprite('stingray', { map: map({ b: 'sand2', l: 'white', f: 'sand2', e: 'outline' }), frames: ray({ span: 44, h: 14, tail: 12 }) });
defineSprite('seastar', { map: map({ b: 'accCoral', l: 'coral2' }), frames: star({ w: 8 }) });
defineSprite('hermitcrab', {
  map: map({ b: 'accOrange', l: 'sand1', d: 'sand2', f: 'sand2' }),
  frames: [
    ['.kkkk.', 'kbbbbk', 'kbllbk', 'kbbbbk', '.kffk.', 'f.k.kf'],
    ['.kkkk.', 'kbbbbk', 'kbllbk', 'kbbbbk', '.kffk.', '.fkkf.'],
  ],
});
defineSprite('grassshrimp', {
  map: map({ b: 'glass', l: 'white' }),
  frames: [['.b.', 'bbb', '.b.'], ['.b.', 'bb.', 'b.b']],
});
defineSprite('seabird', {
  map: map({ b: 'silhouette', l: 'white', k: 'silhouette' }),
  frames: [
    ['..........bb..........', '.........bbbb.........', 'bb.......bbbb.......bb',
     '.bbb.....bbbb.....bbb.', '..bbbb...bbbb...bbbb..', '....bbbb.bbbb.bbbb....',
     '......bbbbbbbbbb......', '........bbbbbb........', '.........bbbb.........',
     '..........bb..........'],
    ['..........bb..........', '.........bbbb.........', '.........bbbb.........',
     '...ll....bbbb....ll...', '....lbb..bbbb..bbl....', '.....bbbbbbbbbbbb.....',
     '......bbbbbbbbbb......', '........bbbbbb........', '.........bbbb.........',
     '..........bb..........'],
  ],
});

export const NEEDLEFISH = defineSpecies({
  id: 'needlefish', name: 'Needlefish', zones: [0], band: 'medium', sprite: 'needlefish',
  size: 20, fps: 9, behaviour: B.skimming, behaviourId: 'skimming',
  note: 'Hangs just under the surface film, a silver needle waiting for something smaller.',
  depth: [0.02, 0.10], maxAlive: 3, count: [2, 4],
  tune: { speed: 26, depth: 5, breaks: false },
});

export const FLYINGFISH = defineSpecies({
  id: 'flyingfish', name: 'Flying Fish', zones: [0], band: 'small', sprite: 'flyingfish',
  size: 14, fps: 10, frames: 2, behaviour: B.skimming, behaviourId: 'skimming',
  note: 'Breaks the surface and glides on outsized pectoral fins to escape whatever is beneath it.',
  depth: [0.02, 0.12], maxAlive: 3, count: [2, 3],
  tune: { speed: 38, depth: 4, breaks: true, breakTime: 0.8, breakHeight: 10 },
});

export const MULLET = defineSpecies({
  id: 'mullet', name: 'Mullet School', zones: [0], band: 'small', sprite: 'mullet',
  size: 10, fps: 8, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Grazes the sand flats in a loose grey shoal that turns as one.',
  depth: [0.62, 0.84], maxAlive: 1, count: [12, 18],
  tune: { min: 12, max: 18, spread: 22, speed: 16, travel: 8, rise: 2,
    sep: 34, sepR: 3.6, align: 1.1, cohere: 0.8, targetPull: 0.9, jitter: 5, maxTurn: 4,
    swirl: 18, swirlRate: 0.5, vertical: 0.5 },
});

export const STINGRAY = defineSpecies({
  id: 'stingray', name: 'Southern Stingray', zones: [0], band: 'medium', sprite: 'stingray',
  size: 44, fps: 4, frames: 3, behaviour: B.flapping, behaviourId: 'flapping',
  note: 'Cruises the flats on rippling wings and vanishes under the sand in one shiver.',
  depth: [0.76, 0.86], maxAlive: 1, count: 1,
  tune: { period: 3.4, beat: 0.45, speed: 9, lift: 5, sink: 3 },
});

export const HERMITCRAB = defineSpecies({
  id: 'hermitcrab', name: 'Hermit Crab', zones: [0], band: 'small', sprite: 'hermitcrab',
  size: 6, fps: 5, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Carries a borrowed shell and trades up whenever a better one washes past.',
  depth: [0.86, 0.90], maxAlive: 3, count: [2, 3],
  tune: { speed: 4, range: 28, biteEvery: 1.8, biteTime: 0.5, follow: 0.6 },
});

export const SEASTAR = defineSpecies({
  id: 'seastar', name: 'Sea Star', zones: [0], band: 'small', sprite: 'seastar',
  size: 8, fps: 1, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Moves on hundreds of tube feet, slowly enough that you never catch it.',
  depth: [0.87, 0.91], maxAlive: 4, count: [2, 4],
  tune: { rate: 0.25, bob: 0.4, sway: 0.3, faceEvery: 8 },
});

export const GRASSSHRIMP = defineSpecies({
  id: 'grassshrimp', name: 'Seagrass Shrimp', zones: [0], band: 'motes', sprite: 'grassshrimp',
  size: 3, fps: 6, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Nearly invisible among the blades until a whole cloud of them lifts at once.',
  depth: [0.78, 0.88], maxAlive: 1, count: [20, 28],
  tune: { min: 20, max: 28, spread: 26, speed: 7, travel: 2, rise: 1,
    sep: 16, sepR: 2.2, align: 0.4, cohere: 0.5, targetPull: 1.4, jitter: 9, maxTurn: 9,
    swirl: 10, swirlRate: 1.4, vertical: 1 },
});

export const SEABIRD = defineSpecies({
  id: 'seabird', name: 'Diving Seabird', zones: [0], band: 'medium', sprite: 'seabird',
  size: 30, fps: 7, behaviour: B.diving, behaviourId: 'diving', ambient: false,
  note: 'Only ever seen from below: a shadow that punches through the ceiling and is gone.',
  depth: [0, 0.2], maxAlive: 1,
  tune: { diveSpeed: 86, riseSpeed: 54, depth: 30, hold: 0.4, exitAbove: 18 },
});
