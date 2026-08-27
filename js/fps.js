// The frame counter: average and 1% low, top-left, colour-coded.
// Costs one pre-rasterised glyph draw per digit and builds no strings.
import { addLayer, app } from './main.js';
import { drawInt, text } from './sprites.js';
import { perf } from './perf.js';
import { P } from './palette.js';
import { cfg } from './config.js';

export const fpsState = { on: false };

function colourFor(v) {
  return v >= 58 ? P.white : v >= 45 ? P.accYellow : P.accRed;
}

function draw(c) {
  if (!fpsState.on) return;
  const avg = Math.round(perf.avg);
  const low = Math.round(perf.low);
  let x = 3;
  x += drawInt(c, avg, x, 3, colourFor(avg), 0.85) + 3;
  text(c, '/', x, 3, P.greyPale, 0.5);
  x += 5;
  drawInt(c, low, x, 3, colourFor(low), 0.85);
}

export function setFps(on) { fpsState.on = !!on; }

export function init() {
  fpsState.on = cfg.fps;
  addLayer('fps', 210, draw);
}
