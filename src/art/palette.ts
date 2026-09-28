/**
 * Tiny Factory Rush — art direction.
 *
 * Bright "toy factory" look: thick ink outlines, saturated flat colors,
 * one soft highlight per shape. Every drawn asset pulls from this file so
 * the style stays consistent (CrazyGames quality guideline: no mixed looks).
 */
export const INK = 0x1b2238;

export const PAL = {
  ink: INK,
  white: 0xffffff,
  cream: 0xfff6e0,

  wallTop: 0x5ec2e6,
  wallBottom: 0x3b93c9,
  wallPanel: 0x52acd8,
  wallTrim: 0x2e6f9e,
  windowSky: 0xbfeaff,
  windowSkyLow: 0xfff1c9,
  cloud: 0xffffff,

  floor: 0xf3c969,
  floorDark: 0xe2b44f,
  floorLine: 0xd9a843,

  beltTop: 0x3a4152,
  beltSlat: 0x4c5569,
  beltFrame: 0x6b778f,
  beltFrameDark: 0x525c73,
  hazardYellow: 0xffd23f,

  machineA: 0xff8c42, // Cutter — orange
  machineADark: 0xd9672a,
  machineB: 0xff5e7e, // Assembler — pink/coral
  machineBDark: 0xd8405f,
  machineC: 0x2ec4b6, // Packer — teal
  machineCDark: 0x1f9a8f,
  steel: 0xc9d3e3,
  steelDark: 0x8f9bb3,
  screen: 0x16213a,
  screenGlow: 0x7cf5ff,

  green: 0x3ddc84,
  greenDark: 0x23a862,
  red: 0xff4d4d,
  amber: 0xffb627,
  gold: 0xffd23f,
  goldDark: 0xe0a800,
  purple: 0x9b5de5,

  uiPanel: 0x1d2b4a,
  uiPanelLight: 0x2a3c63,
  uiPanelEdge: 0x3f5a8c,
  uiText: 0xffffff,
  uiMuted: 0xa9bbdc,
  btnGreen: 0x3ddc84,
  btnGreenDark: 0x1fa35e,
  btnLocked: 0x55627f,
  btnLockedDark: 0x3c465e,
} as const;

export const CSS = {
  ink: '#1b2238',
  white: '#ffffff',
  gold: '#ffd23f',
  green: '#3ddc84',
  red: '#ff4d4d',
  amber: '#ffb627',
  muted: '#a9bbdc',
  panel: '#1d2b4a',
  purple: '#b388ff',
} as const;

export const FONT = '"Fredoka", "Trebuchet MS", system-ui, sans-serif';

/** Texture super-sampling factor (textures drawn at 2× then displayed at 1×). */
export const TS = 2;

export function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Mix two 0xRRGGBB colors. t=0 → a, t=1 → b. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function lighten(c: number, t = 0.3): number {
  return mix(c, 0xffffff, t);
}

export function darken(c: number, t = 0.25): number {
  return mix(c, 0x000000, t);
}
