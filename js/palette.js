// The only place a hex value appears. Every other module names a token.
// See DESIGN.md section 1.

export const P = {
  // Water ramp, surface to floor
  w0: '#5fd6dd', w1: '#3aa6c4', w2: '#2478a8', w3: '#1a4f8a', w4: '#123068',
  w5: '#0c1440', w6: '#070a1c', w7: '#03050f', w8: '#010208',

  // Warm accents
  accOrange: '#ff8a1f', accYellow: '#ffd83d', accCoral: '#ff6b6b',
  accRed: '#d92b3a', white: '#f6f9ff', silver: '#c3d4e8', outline: '#0a0a14',

  // Bioluminescence
  bioCyan: '#4ff2ff', bioMagenta: '#ff4fa0', bioLime: '#b8ff4a',
  bioViolet: '#8f6bff', bioGold: '#ffe9a8',

  // Environment
  rock1: '#0f1633', rock2: '#1c2450', kelp1: '#1f6f4a', kelp2: '#3fae6b',
  seagrass: '#69c46a', coral1: '#c8356c', coral2: '#ff9f6b',
  gorgonian: '#e05a8a', sand1: '#c9a86a', sand2: '#8f7346', bone: '#e8e2cf',
  ventHot: '#ff5a2e', ventWarm: '#ffb03a', smoker: '#120a10',

  // Bodies
  greyDark: '#2a3350', greyMid: '#4a5878', greyPale: '#8fa2c0',
  olive: '#4e6b3a', oliveLight: '#7a9450', rust: '#7a3b1e', brown: '#4a3520',
  maroon: '#5a1f2e', palePink: '#f2b8c6', glass: '#a8d8e8',
  silhouette: '#060810',
};

// The nine water stops as an ordered ramp, for depth interpolation.
export const WATER = [P.w0, P.w1, P.w2, P.w3, P.w4, P.w5, P.w6, P.w7, P.w8];

const rgbCache = new Map();

/** '#rrggbb' or a token name -> [r, g, b] */
export function rgb(colour) {
  const hex = P[colour] || colour;
  let v = rgbCache.get(hex);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(hex, v);
  return v;
}

/** Token or hex plus alpha -> a css colour string. Cached; safe per frame. */
const cssCache = new Map();
export function css(colour, alpha = 1) {
  const key = colour + '|' + alpha;
  let v = cssCache.get(key);
  if (v) return v;
  const [r, g, b] = rgb(colour);
  v = alpha >= 1 ? (P[colour] || colour) : `rgba(${r},${g},${b},${alpha})`;
  if (cssCache.size < 512) cssCache.set(key, v);
  return v;
}

/** Linear blend of two tokens, returned as [r, g, b]. */
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return [
    (A[0] + (B[0] - A[0]) * k) | 0,
    (A[1] + (B[1] - A[1]) * k) | 0,
    (A[2] + (B[2] - A[2]) * k) | 0,
  ];
}

/** Sample the water ramp at t in 0..1 across the whole column. */
export function waterAt(t) {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const f = k * (WATER.length - 1);
  const i = Math.min(WATER.length - 2, f | 0);
  return mix(WATER[i], WATER[i + 1], f - i);
}
