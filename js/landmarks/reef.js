// Zone 2 — the reef floor, coral heads, anemones, a kelp stand, rock arches and
// the cleaning station rock.
import { addLayer, onResize, app } from '../main.js';
import { cam, screenX, screenY } from '../camera.js';
import { world, dailySeed, rng } from '../world.js';
import { defineSprite, drawSpriteC } from '../sprites.js';
import { map } from '../creatures/base.js';
import { blob } from '../sprites/shapes.js';
import { P } from '../palette.js';
import { dither, profile, sampleProfile, fillBelow, blade, floorWorldY } from './common.js';

defineSprite('coral-brain', { map: map({ b: 'coral1', l: 'coral2', d: 'gorgonian' }), frames: blob({ w: 18, h: 12, frames: 2 }) });
defineSprite('coral-knob', { map: map({ b: 'coral2', l: 'accOrange', d: 'coral1' }), frames: blob({ w: 11, h: 9, frames: 2 }) });
defineSprite('station-rock', { map: map({ b: 'rock2', l: 'greyPale', d: 'rock1' }), frames: blob({ w: 22, h: 14, frames: 1 }) });

let bed = null, corals = [], anemones = [], kelp = [], arches = [], station = null;

export function stationPos() { return station; }

function build() {
  const seed = dailySeed() + 21;
  bed = profile(seed, 96, 0, 6);
  const r = rng(seed + 1);
  corals = []; anemones = []; kelp = []; arches = [];
  for (let i = 0; i < 26; i++) {
    corals.push({ x: r() * world.wrapW, big: r() < 0.45, ph: r() * 6 });
  }
  for (let i = 0; i < 18; i++) {
    anemones.push({ x: r() * world.wrapW, n: 5 + ((r() * 4) | 0), h: 4 + r() * 4, ph: r() * 6 });
  }
  for (let i = 0; i < 12; i++) {
    kelp.push({ x: r() * world.wrapW, h: 30 + r() * 34, ph: r() * 6, w: 1 + ((r() * 2) | 0) });
  }
  for (let i = 0; i < 4; i++) {
    arches.push({ x: r() * world.wrapW, w: 26 + r() * 16, h: 20 + r() * 10 });
  }
  // The cleaning station sits in the middle 40% of the band so the camera meets
  // it head-on; the vignette director stages the cleaning scene here.
  station = { x: r() * world.wrapW, y: (1 + 0.6 + r() * 0.12) * world.zoneH };
}

function floorTopAt(x) {
  return screenY(floorWorldY(1), 1) + sampleProfile(bed, x + cam.x, world.wrapW);
}

function drawArches(c) {
  const top = screenY(floorWorldY(1), 1);
  for (const a of arches) {
    const x = screenX(a.x, 1);
    if (x < -a.w - 8 || x > app.iw + a.w + 8) continue;
    const base = top + sampleProfile(bed, x + cam.x, world.wrapW);
    c.fillStyle = dither(c, 'rock1', 'rock2', 0.4);
    c.fillRect(x | 0, (base - a.h) | 0, 5, a.h);
    c.fillRect((x + a.w) | 0, (base - a.h) | 0, 5, a.h);
    c.fillRect(x | 0, (base - a.h - 5) | 0, (a.w + 5) | 0, 5);
    c.fillStyle = P.rock2;
    c.fillRect(x | 0, (base - a.h - 5) | 0, (a.w + 5) | 0, 1);
  }
}

function drawKelp(c) {
  const top = screenY(floorWorldY(1), 1);
  const t = cam.t;
  for (const k of kelp) {
    const x = screenX(k.x, 1);
    if (x < -12 || x > app.iw + 12) continue;
    const base = top + sampleProfile(bed, x + cam.x, world.wrapW);
    blade(c, x, base, k.h, 7, t * 0.7 + k.ph, P.kelp1, k.w + 1);
    blade(c, x + 1, base, k.h - 3, 6.2, t * 0.7 + k.ph + 0.4, P.kelp2, k.w);
  }
}

function drawCorals(c) {
  const top = screenY(floorWorldY(1), 1);
  for (const co of corals) {
    const x = screenX(co.x, 1);
    if (x < -14 || x > app.iw + 14) continue;
    const base = top + sampleProfile(bed, x + cam.x, world.wrapW);
    const key = co.big ? 'coral-brain' : 'coral-knob';
    drawSpriteC(c, key, (cam.t * 1.2 + co.ph) & 1, x | 0, (base - (co.big ? 5 : 4)) | 0, false);
  }
}

function drawAnemones(c) {
  const top = screenY(floorWorldY(1), 1);
  const t = cam.t;
  for (const a of anemones) {
    const x = screenX(a.x, 1);
    if (x < -8 || x > app.iw + 8) continue;
    const base = top + sampleProfile(bed, x + cam.x, world.wrapW);
    for (let i = 0; i < a.n; i++) {
      blade(c, x + i - a.n / 2, base, a.h, 2.4, t * 1.6 + a.ph + i * 0.9, i % 2 ? P.coral2 : P.gorgonian, 1);
    }
  }
}

function drawStation(c) {
  const x = screenX(station.x, 1), y = screenY(station.y, 1);
  if (x < -20 || x > app.iw + 20 || y < -20 || y > app.ih + 20) return;
  drawSpriteC(c, 'station-rock', 0, x | 0, y | 0, false);
}

function draw(c) {
  if (cam.zone < 1 || cam.zone > 2) return;
  const top = screenY(floorWorldY(1), 1);
  if (top < app.ih + 60) {
    drawArches(c);
    fillBelow(c, 0, app.iw, app.ih, floorTopAt, dither(c, 'rock2', 'sand2', 0.35), P.sand1, world.zoneH * 0.16);
    drawKelp(c);
    drawCorals(c);
    drawAnemones(c);
  }
  drawStation(c);
}

export function init() {
  onResize(build);
  addLayer('reef', 23, draw);
}
