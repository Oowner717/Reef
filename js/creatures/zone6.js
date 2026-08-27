// Zone 6 — Midnight. Dark bodies and a handful of glowing pixels: the glow is
// the animal, the body is a hole in the water.
import { defineSprite, defineVariant, drawSpriteC } from '../sprites.js';
import { fish, bell, blob, segment } from '../sprites/shapes.js';
import { defineSpecies, map } from './base.js';
import { P, css } from '../palette.js';
import * as B from '../behaviours.js';

defineSprite('anglerfish', { map: map({ b: 'silhouette', l: 'rock1', f: 'silhouette', d: 'rock2', e: 'bioGold', k: 'rock1' }), frames: fish({ len: 22, h: 16, tail: 5, tailH: 7, anal: true }) });
defineSprite('gulperseg', { map: map({ b: 'silhouette', l: 'bioLime', g: 'bioLime', k: 'rock1' }), frames: segment({ w: 8, h: 8, glow: true }) });
defineSprite('barreleye', { map: map({ b: 'rock1', l: 'glass', f: 'rock2', e: 'bioLime', g: 'bioLime', k: 'rock2' }), frames: blob({ w: 15, h: 12, eyes: true, glow: true }) });
defineSprite('dragonfish', { map: map({ b: 'silhouette', l: 'rock1', f: 'silhouette', e: 'accRed', k: 'rock1' }), frames: fish({ len: 20, h: 8, tail: 5, snout: 'point' }) });
defineSprite('bigfin', { map: map({ b: 'bioViolet', l: 'bioCyan', f: 'bioViolet', e: 'bioCyan', k: 'rock1' }), frames: blob({ w: 12, h: 15, eyes: true }) });
defineSprite('glowjelly', { map: map({ b: 'bioMagenta', l: 'white', f: 'bioMagenta', g: 'white', k: 'rock1' }), frames: bell({ w: 15, h: 18, domeH: 7, arms: 4, glow: true }) });
defineVariant('glowjelly', 'cyan', map({ b: 'bioCyan', l: 'white', f: 'bioCyan', g: 'white', k: 'rock1' }));
defineSprite('snipeseg', { map: map({ b: 'rock1', l: 'rock2', k: 'silhouette' }), frames: segment({ w: 5, h: 5 }) });

/** The lure is the whole animal: a bobbing point of light on a stalk. */
function withLure(c, ctx) {
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), c.sx() | 0, c.sy() | 0, c.face < 0);
  const x = c.sx() + c.face * 9, y = c.sy() - 9;
  const swing = Math.sin(c.phase * 1.3) * 4;
  const bloom = 0.55 + 0.45 * Math.sin(c.phase * 2.1);
  ctx.fillStyle = P.rock2;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect((c.sx() + c.face * (2 + i * 1.2)) | 0, (c.sy() - 3 - i * 1.1) | 0, 1, 1);
  }
  ctx.fillStyle = css(P.bioGold, 0.35 * bloom);
  ctx.fillRect((x + swing - 2) | 0, (y - 2) | 0, 5, 5);
  ctx.fillStyle = P.bioGold;
  ctx.fillRect((x + swing) | 0, y | 0, 2, 2);
}

/** A single red beam, and nothing else in the zone is red. */
function withBeam(c, ctx) {
  const x = c.sx(), y = c.sy();
  const sweep = Math.sin(c.phase * 0.6) * 0.5;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * 0.28;
  ctx.fillStyle = P.accRed;
  for (let i = 2; i < 34; i++) {
    ctx.fillRect((x + c.face * i) | 0, (y + 2 + i * sweep) | 0, 1, 1 + (i > 20 ? 1 : 0));
  }
  ctx.globalAlpha = prev;
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), x | 0, y | 0, c.face < 0);
}

/** Impossibly long thin arms held at right angles, elbows glowing. */
function withArms(c, ctx) {
  const x = c.sx(), y = c.sy();
  const drop = 34, reach = 46;
  const sway = Math.sin(c.phase * 0.5) * 3;
  ctx.fillStyle = css(P.bioViolet, 0.75);
  for (const s of [-1, 1]) {
    for (let i = 0; i < drop; i++) ctx.fillRect((x + s * 3) | 0, (y + 6 + i) | 0, 1, 1);
    for (let i = 0; i < reach; i++) {
      ctx.fillRect((x + s * (3 + i)) | 0, (y + 6 + drop + Math.sin(i * 0.1) * 2 + sway) | 0, 1, 1);
    }
    ctx.fillStyle = P.bioCyan;
    ctx.fillRect((x + s * 3) | 0, (y + 6 + drop) | 0, 1, 1);
    ctx.fillStyle = css(P.bioViolet, 0.75);
  }
  drawSpriteC(ctx, c.spriteKey(), c.frameIndex(), x | 0, y | 0, c.face < 0);
}

export const ANGLERFISH = defineSpecies({
  id: 'anglerfish', name: 'Anglerfish', zones: [5], band: 'medium', sprite: 'anglerfish',
  size: 24, fps: 3, behaviour: B.hovering, behaviourId: 'hovering', render: withLure,
  note: 'The lure is a lamp full of bacteria she farms; the male is a fraction of her size.',
  depth: [0.25, 0.8], maxAlive: 1, count: 1,
  tune: { rate: 0.55, bob: 2.4, sway: 1.6, faceEvery: 5.5 },
});

export const GULPEREEL = defineSpecies({
  id: 'gulpereel', name: 'Gulper Eel', zones: [5], band: 'medium', sprite: 'gulperseg',
  size: 46, fps: 4, behaviour: B.undulating, behaviourId: 'undulating', render: B.renderChain,
  note: 'Mostly mouth. It can swallow something larger than itself and think about it later.',
  depth: [0.3, 0.85], maxAlive: 1, count: 1,
  tune: { segments: 9, segLen: 5, speed: 9, waveRate: 1.5, waveAmp: 16, ripple: 16, lag: 0.7 },
});

export const BARRELEYE = defineSpecies({
  id: 'barreleye', name: 'Barreleye', zones: [5], band: 'small', sprite: 'barreleye',
  size: 16, fps: 3, behaviour: B.hovering, behaviourId: 'hovering',
  note: 'Its head is transparent, and the green orbs inside it look straight up through it.',
  depth: [0.25, 0.7], maxAlive: 2, count: 1,
  tune: { rate: 0.4, bob: 1.8, sway: 1.2, faceEvery: 7 },
});

export const DRAGONFISH = defineSpecies({
  id: 'dragonfish', name: 'Dragonfish', zones: [5], band: 'medium', sprite: 'dragonfish',
  size: 22, fps: 4, behaviour: B.hovering, behaviourId: 'hovering', render: withBeam,
  note: 'Shines a red beam nothing down here can see, and hunts by its own private light.',
  depth: [0.3, 0.8], maxAlive: 1, count: 1,
  tune: { rate: 0.7, bob: 1.6, sway: 2.6, faceEvery: 4 },
});

export const BIGFIN = defineSpecies({
  id: 'bigfin', name: 'Bigfin Squid', zones: [5], band: 'large', sprite: 'bigfin',
  size: 20, fps: 3, behaviour: B.hovering, behaviourId: 'hovering', render: withArms,
  note: 'Holds its arms out at right angles and waits. Fewer than twenty have ever been filmed.',
  depth: [0.2, 0.55], maxAlive: 1, count: 1,
  tune: { rate: 0.3, bob: 2.6, sway: 1.8, faceEvery: 9 },
});

export const GLOWJELLY = defineSpecies({
  id: 'glowjelly', name: 'Glow Jellyfish', zones: [5], band: 'small', sprite: 'glowjelly',
  size: 16, fps: 3, frames: 3, behaviour: B.pulsing, behaviourId: 'pulsing',
  note: 'The brightest thing down here, and it flashes to make its attacker a target too.',
  depth: [0.15, 0.85], maxAlive: 4, count: [3, 4],
  variants: [null, 'cyan'], variantEvery: 999,
  tune: { period: 2.8, contract: 0.28, thrust: 22, drag: 2.2, sink: 2, wander: 3 },
});

export const SNIPEEEL = defineSpecies({
  id: 'snipeeel', name: 'Deep-sea Snipe Eel', zones: [5], band: 'medium', sprite: 'snipeseg',
  size: 40, fps: 3, behaviour: B.undulating, behaviourId: 'undulating', render: B.renderChain,
  note: 'A ribbon with jaws that cross at the tips and cannot fully close.',
  depth: [0.3, 0.85], maxAlive: 2, count: [1, 2],
  tune: { segments: 11, segLen: 3.6, speed: 6, waveRate: 1.1, waveAmp: 14, ripple: 14, lag: 0.5 },
});
