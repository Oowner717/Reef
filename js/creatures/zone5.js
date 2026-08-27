// Zone 5 — Twilight. No shafts left; silver flanks and the first faint glows.
import { defineSprite, drawSpriteC } from '../sprites.js';
import { fish, bell, blob, segment } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import * as B from '../behaviours.js';

defineSprite('hatchetfish', { map: map({ b: 'silver', l: 'bioCyan', f: 'greyPale', d: 'white' }), frames: fish({ len: 9, h: 9, tail: 2, anal: true, analH: 2 }) });
defineSprite('bristlemouth', { map: map({ b: 'silhouette', l: 'bioCyan', f: 'rock1', k: 'rock1' }), frames: fish({ len: 6, h: 4, tail: 2, eye: false }) });
defineSprite('vampiresquid', { map: map({ b: 'maroon', l: 'maroon', f: 'bioCyan', e: 'bioCyan', g: 'bioCyan' }), frames: blob({ w: 14, h: 16, arms: 6, armLen: 7, eyes: true }) });
defineSprite('salpbead', { map: map({ b: 'glass', l: 'white', g: 'bioCyan', k: 'w4' }), frames: segment({ w: 5, h: 5, glow: true }) });
defineSprite('barreljelly', { map: map({ b: 'bioViolet', l: 'bioMagenta', f: 'bioViolet', g: 'white', k: 'w5' }), frames: bell({ w: 22, h: 30, domeH: 11, arms: 5, glow: true }) });
defineSprite('squid', { map: map({ b: 'greyPale', l: 'white', f: 'bioMagenta', e: 'outline' }), frames: blob({ w: 13, h: 18, arms: 6, armLen: 8, eyes: true }) });

export const HATCHETFISH = defineSpecies({
  id: 'hatchetfish', name: 'Hatchetfish', zones: [4], band: 'small', sprite: 'hatchetfish',
  size: 9, fps: 9, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'A mirror for a body, so from the side there is nothing there to see.',
  depth: [0.2, 0.8], maxAlive: 2, count: [8, 12],
  tune: { min: 8, max: 12, spread: 16, speed: 18, travel: 5, rise: 2,
    sep: 38, sepR: 3.4, align: 1.6, cohere: 1.2, targetPull: 1.2, jitter: 6, maxTurn: 7,
    swirl: 12, swirlRate: 1.1, vertical: 0.8 },
});

export const VAMPIRESQUID = defineSpecies({
  id: 'vampiresquid', name: 'Vampire Squid', zones: [4], band: 'medium', sprite: 'vampiresquid',
  size: 20, fps: 4, behaviour: B.jetting, behaviourId: 'jetting',
  note: 'Eats marine snow, not blood, and turns itself inside out when frightened.',
  depth: [0.35, 0.85], maxAlive: 1, count: 1,
  tune: { rest: 2.4, burst: 0.5, speed: 34, spread: 1.4 },
});

export const SALPCHAIN = defineSpecies({
  id: 'salpchain', name: 'Salp Chain', zones: [4], band: 'motes', sprite: 'salpbead',
  size: 4, fps: 3, behaviour: B.undulating, behaviourId: 'undulating', render: B.renderChain,
  note: 'Clones itself into a chain that swims as one animal and eats by filtering.',
  depth: [0.2, 0.8], maxAlive: 2, count: 1,
  tune: { segments: 16, segLen: 3.4, speed: 7, waveRate: 1.3, waveAmp: 12, ripple: 12, lag: 0.55 },
});

export const BARRELJELLY = defineSpecies({
  id: 'barreljelly', name: 'Barrel Jellyfish', zones: [4], band: 'medium', sprite: 'barreljelly',
  size: 30, fps: 3, frames: 3, behaviour: B.pulsing, behaviourId: 'pulsing',
  note: 'A bell the size of a dustbin lid, trailing eight frilled arms instead of tentacles.',
  depth: [0.2, 0.8], maxAlive: 2, count: [1, 2],
  tune: { period: 3.6, contract: 0.3, thrust: 22, drag: 2.0, sink: 3, wander: 4 },
});

export const SQUID = defineSpecies({
  id: 'squid', name: 'Squid', zones: [4], band: 'medium', sprite: 'squid',
  size: 26, fps: 5, behaviour: B.jetting, behaviourId: 'jetting',
  note: 'Runs colour down its body in waves, half signal and half camouflage.',
  depth: [0.25, 0.8], maxAlive: 3, count: [3, 5],
  tune: { rest: 1.8, burst: 0.4, speed: 52, spread: 0.9 },
});

export const BRISTLEMOUTH = defineSpecies({
  id: 'bristlemouth', name: 'Bristlemouth', zones: [4], band: 'small', sprite: 'bristlemouth',
  size: 5, fps: 7, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Almost certainly the most numerous vertebrate on Earth, and almost never seen.',
  depth: [0.35, 0.9], maxAlive: 2, count: [20, 28],
  tune: { min: 20, max: 28, spread: 30, speed: 11, travel: 3, rise: 1,
    sep: 24, sepR: 2.8, align: 0.9, cohere: 0.7, targetPull: 1.0, jitter: 5, maxTurn: 5,
    swirl: 16, swirlRate: 0.7, vertical: 0.9 },
});
