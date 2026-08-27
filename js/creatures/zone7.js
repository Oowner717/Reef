// Zone 7 — The Vent Field. Warm and alien: everything is lit from below by the
// smokers rather than from above.
import { defineSprite, drawSpriteC } from '../sprites.js';
import { fish, ray, blob, star, segment } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import { P, css } from '../palette.js';
import * as B from '../behaviours.js';

defineSprite('dumbo', { map: map({ b: 'palePink', l: 'white', f: 'palePink', e: 'outline', k: 'maroon' }), frames: ray({ span: 20, h: 14, tail: 0 }) });
defineSprite('tripodfish', {
  map: map({ b: 'greyPale', l: 'white', f: 'bone', e: 'outline', k: 'rock1' }),
  frames: fish({ len: 15, h: 7, tail: 3, eye: true }),
});
defineSprite('seacucumber', { map: map({ b: 'maroon', l: 'accCoral', d: 'accRed', k: 'rock1' }), frames: blob({ w: 13, h: 6 }) });
defineSprite('brittlestar', { map: map({ b: 'greyPale', l: 'white', k: 'rock1' }), frames: star({ w: 11 }) });
defineSprite('hagseg', { map: map({ b: 'greyPale', l: 'white', k: 'rock1' }), frames: segment({ w: 4, h: 4 }) });
defineSprite('ventshrimp', { map: map({ b: 'palePink', l: 'white', k: 'maroon' }), frames: [['.b.', 'bbb', '.b.'], ['.b.', 'bb.', 'b.b']] });
defineSprite('wormtube', {
  map: map({ b: 'bone', l: 'white', f: 'accRed', d: 'coral1', k: 'rock1' }),
  frames: [
    ['.ff.', 'ffff', '.ff.', '.bb.', '.bb.', '.bb.', '.bb.', 'lbbl'],
    ['....', '.ff.', '.ff.', '.bb.', '.bb.', '.bb.', '.bb.', 'lbbl'],
    ['....', '....', '.bb.', '.bb.', '.bb.', '.bb.', '.bb.', 'lbbl'],
  ],
});

/** Three fin stilts holding it clear of the sediment, facing the current. */
function onStilts(c, ctx) {
  const x = c.sx(), y = c.sy();
  ctx.fillStyle = P.bone;
  for (const s of [-4, 0, 5]) {
    for (let i = 0; i < 11; i++) ctx.fillRect((x + s + i * 0.18 * Math.sign(s || 1)) | 0, (y + 4 + i) | 0, 1, 1);
  }
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), x | 0, y | 0, c.face < 0);
}

/** A bed of tubes; the plumes snap in when something crosses. */
function wormBed(c, ctx) {
  const x = c.sx(), y = c.sy();
  const n = c.d.n || 7;
  const retract = c.d.retract || 0;
  const fr = retract > 0.66 ? 2 : retract > 0.33 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 4;
    const oy = Math.sin(i * 1.7) * 2;
    const sway = Math.sin(c.phase * 1.1 + i) * 1.2 * (1 - retract);
    drawSpriteC(ctx, 'wormtube', fr, (x + ox + sway) | 0, (y + oy) | 0, (i & 1) === 1);
  }
}

/** The vent glow behind anything drifting through it. */
function backlit(c, ctx) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * 0.85;
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), c.sx() | 0, c.sy() | 0, c.face < 0);
  ctx.globalAlpha = prev;
}

export const TUBEWORM = defineSpecies({
  id: 'tubeworm', name: 'Tube Worm Bed', zones: [6], band: 'medium', sprite: 'wormtube',
  size: 20, fps: 3, frames: 3, behaviour: B.grazing, behaviourId: 'grazing', render: wormBed,
  note: 'Has no mouth or gut; bacteria inside it live on vent chemicals and feed it.',
  depth: [0.82, 0.9], maxAlive: 4, count: [3, 5],
  tune: { speed: 0.3, range: 3, biteEvery: 3, biteTime: 1.2, follow: 0 },
});

export const VENTSHRIMP = defineSpecies({
  id: 'ventshrimp', name: 'Vent Shrimp Swarm', zones: [6], band: 'motes', sprite: 'ventshrimp',
  size: 3, fps: 6, behaviour: B.schooling, behaviourId: 'schooling', render: B.renderFlock,
  note: 'Blind, but with a light-sensing patch on its back that finds the glow of a vent.',
  depth: [0.7, 0.88], maxAlive: 2, count: [30, 40],
  tune: { min: 30, max: 40, spread: 22, speed: 12, travel: 2, rise: 1,
    sep: 22, sepR: 2.4, align: 0.6, cohere: 1.0, targetPull: 2.0, jitter: 12, maxTurn: 10,
    swirl: 10, swirlRate: 1.7, vertical: 1 },
});

export const DUMBO = defineSpecies({
  id: 'dumbo', name: 'Dumbo Octopus', zones: [6], band: 'medium', sprite: 'dumbo',
  size: 18, fps: 4, frames: 3, behaviour: B.flapping, behaviourId: 'flapping', render: backlit,
  note: 'Flaps two ear-like fins to hover, and swallows its prey whole.',
  depth: [0.4, 0.82], maxAlive: 2, count: [1, 2],
  tune: { period: 2.6, beat: 0.45, speed: 8, lift: 6, sink: 4 },
});

export const TRIPODFISH = defineSpecies({
  id: 'tripodfish', name: 'Tripod Fish', zones: [6], band: 'small', sprite: 'tripodfish',
  size: 14, fps: 2, behaviour: B.hovering, behaviourId: 'hovering', render: onStilts,
  note: 'Stands on three stiffened fin rays and faces the current, waiting for it to deliver.',
  depth: [0.8, 0.86], maxAlive: 2, count: [1, 2],
  tune: { rate: 0.2, bob: 0.5, sway: 0.3, faceEvery: 12 },
});

export const SEACUCUMBER = defineSpecies({
  id: 'seacucumber', name: 'Sea Cucumber', zones: [6], band: 'small', sprite: 'seacucumber',
  size: 12, fps: 2, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Eats the sediment, passes it, and in doing so turns over the whole abyssal floor.',
  depth: [0.85, 0.9], maxAlive: 3, count: [2, 3],
  tune: { speed: 1.4, range: 16, biteEvery: 2.4, biteTime: 0.9, follow: 0.3 },
});

export const BRITTLESTAR = defineSpecies({
  id: 'brittlestar', name: 'Brittle Star', zones: [6], band: 'small', sprite: 'brittlestar',
  size: 10, fps: 2, behaviour: B.grazing, behaviourId: 'grazing',
  note: 'Drops an arm to escape and grows it back; carpets some patches of seabed entirely.',
  depth: [0.84, 0.9], maxAlive: 5, count: [3, 5],
  tune: { speed: 1.8, range: 14, biteEvery: 2, biteTime: 0.7, follow: 0.4 },
});

export const HAGFISH = defineSpecies({
  id: 'hagfish', name: 'Hagfish', zones: [6], band: 'medium', sprite: 'hagseg',
  size: 16, fps: 4, behaviour: B.undulating, behaviourId: 'undulating', render: B.renderChain,
  note: 'Ties itself in a knot to tear off a mouthful, and can fill a bucket with slime in seconds.',
  depth: [0.6, 0.88], maxAlive: 4, count: [3, 6],
  tune: { segments: 8, segLen: 2.6, speed: 8, waveRate: 2.2, waveAmp: 14, ripple: 14, lag: 0.9 },
});
