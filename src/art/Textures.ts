import Phaser from 'phaser';
import { PRODUCT_ORDER, type ProductId } from '../config/balance';
import { Pen } from './Pen';
import { INK, PAL, TS, darken, lighten, mix } from './palette';

/**
 * Procedural art — every sprite in the game is generated here at boot.
 * Zero external image files → tiny download, instant load (CrazyGames
 * conversion metric: playable < 10 s, build < 20 MB).
 */

export const ITEM_SIZE = 44;

type Drawer = (p: Pen, w: number, h: number) => void;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: Drawer): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const p = new Pen(g, TS);
  draw(p, w, h);
  g.generateTexture(key, Math.ceil(w * TS), Math.ceil(h * TS));
  g.destroy();
}

export function itemKey(stage: ItemStage, product: ProductId): string {
  return `${stage}-${product}`;
}

export type ItemStage = 'raw' | 'part' | 'prod' | 'pack';

export function generateTextures(scene: Phaser.Scene): void {
  // ── particles / fx ────────────────────────────────────────────
  bake(scene, 'px', 4, 4, (p) => p.fill(0xffffff).rect(0, 0, 4, 4));
  bake(scene, 'dot', 16, 16, (p) => {
    for (let i = 8; i > 0; i--) p.fill(0xffffff, 0.12 + (8 - i) * 0.1).circle(8, 8, i);
  });
  bake(scene, 'puff', 40, 40, (p) => {
    p.fill(0xffffff, 0.9).circle(20, 22, 12).circle(12, 24, 8).circle(28, 24, 8).circle(20, 14, 9);
  });
  bake(scene, 'spark', 24, 24, (p) => {
    p.fill(0xffffff).poly(p.star(12, 12, 11, 3, 4));
  });
  bake(scene, 'confetti', 10, 6, (p) => p.fill(0xffffff).rrect(0, 0, 10, 6, 1.5));
  bake(scene, 'coin', 30, 30, (p) => drawCoin(p, 15, 15, 12));
  bake(scene, 'sweat', 12, 16, (p) => {
    p.fill(0x8fd8ff).poly([[6, 1], [11, 10], [6, 15], [1, 10]]);
    p.fill(0x8fd8ff).circle(6, 10, 5);
    p.line(1.5).strokeCircle(6, 10, 5);
    p.fill(0xffffff, 0.8).circle(4.5, 9, 1.5);
  });
  bake(scene, 'arrow', 40, 46, (p) => {
    const pts: Array<[number, number]> = [[12, 3], [28, 3], [28, 22], [37, 22], [20, 43], [3, 22], [12, 22]];
    p.shape(pts, PAL.gold, 3);
    p.fill(0xffffff, 0.55).rect(15, 6, 4, 14);
  });
  bake(scene, 'ring', 64, 64, (p) => {
    p.line(5, 0xffffff).strokeCircle(32, 32, 26);
  });

  // ── belt tile (scrolls horizontally) ──────────────────────────
  bake(scene, 'belt', 32, 24, (p) => {
    p.fill(PAL.beltTop).rect(0, 0, 32, 24);
    p.fill(PAL.beltSlat).rect(2, 0, 12, 24);
    p.fill(lighten(PAL.beltSlat, 0.12)).rect(2, 0, 12, 3);
    p.fill(darken(PAL.beltTop, 0.25)).rect(14, 0, 2, 24);
    p.fill(darken(PAL.beltTop, 0.25)).rect(30, 0, 2, 24);
  });
  bake(scene, 'hazard', 32, 10, (p) => {
    p.fill(PAL.hazardYellow).rect(0, 0, 32, 10);
    p.fill(INK).poly([[0, 10], [8, 0], [16, 0], [8, 10]]);
    p.fill(INK).poly([[16, 10], [24, 0], [32, 0], [24, 10]]);
  });

  // ── machines ──────────────────────────────────────────────────
  const bodies: Array<[number, number]> = [
    [PAL.machineA, PAL.machineADark],
    [PAL.machineB, PAL.machineBDark],
    [PAL.machineC, PAL.machineCDark],
  ];
  bodies.forEach(([c, d], i) => bake(scene, `machine-${i}`, 170, 190, (p) => drawMachineBody(p, c, d, i)));
  bake(scene, 'saw', 70, 70, (p) => drawSaw(p, 35, 35, 30));
  bake(scene, 'press', 76, 64, (p) => drawPress(p));
  bake(scene, 'gear', 56, 56, (p) => drawGear(p, 28, 28, 25, 10, PAL.steel));
  bake(scene, 'lamp', 22, 22, (p) => {
    p.dot(11, 11, 8, 0xffffff, 2.5);
    p.fill(0xffffff, 0.9).circle(8, 8, 2.5);
  });
  bake(scene, 'eyes-open', 64, 28, (p) => drawEyes(p, 'open'));
  bake(scene, 'eyes-happy', 64, 28, (p) => drawEyes(p, 'happy'));
  bake(scene, 'eyes-closed', 64, 28, (p) => drawEyes(p, 'closed'));
  bake(scene, 'eyes-angry', 64, 28, (p) => drawEyes(p, 'angry'));
  bake(scene, 'eyes-sleepy', 64, 28, (p) => drawEyes(p, 'sleepy'));

  // ── world props ───────────────────────────────────────────────
  bake(scene, 'hopper', 130, 190, drawHopper);
  bake(scene, 'truck', 230, 160, drawTruck);
  bake(scene, 'bg-gear', 140, 140, (p) => drawGear(p, 70, 70, 64, 14, 0xffffff, 0));
  bake(scene, 'window', 170, 120, drawWindow);
  bake(scene, 'lampshade', 70, 120, drawHangingLamp);
  bake(scene, 'pipe-v', 26, 64, (p) => {
    p.fill(PAL.wallTrim).rect(3, 0, 20, 64);
    p.fill(lighten(PAL.wallTrim, 0.2)).rect(6, 0, 5, 64);
    p.fill(darken(PAL.wallTrim, 0.2)).rect(0, 26, 26, 12);
  });

  // ── items: 4 visual stages × 5 products ───────────────────────
  for (const pid of PRODUCT_ORDER) {
    bake(scene, itemKey('raw', pid), ITEM_SIZE, ITEM_SIZE, (p) => drawRaw(p, pid));
    bake(scene, itemKey('part', pid), ITEM_SIZE, ITEM_SIZE, (p) => drawProduct(p, pid, true));
    bake(scene, itemKey('prod', pid), ITEM_SIZE, ITEM_SIZE, (p) => drawProduct(p, pid, false));
    bake(scene, itemKey('pack', pid), ITEM_SIZE, ITEM_SIZE, (p) => drawPacked(p, pid));
    bake(scene, `icon-${pid}`, 64, 64, (p) => drawProductAt(p, pid, false, 32, 32, 1.45));
  }

  // ── UI icons ──────────────────────────────────────────────────
  bake(scene, 'ic-speed', 40, 40, (p) => {
    p.shape([[23, 2], [8, 22], [19, 22], [15, 38], [32, 15], [21, 15], [25, 2]], PAL.gold, 3);
  });
  bake(scene, 'ic-room', 40, 40, (p) => {
    p.box(3, 22, 34, 12, 3, PAL.beltTop, 3);
    p.box(6, 8, 13, 13, 2, 0xf0b56b, 2.5);
    p.box(21, 8, 13, 13, 2, 0xf0b56b, 2.5);
    p.fill(INK).circle(9, 28, 2).circle(20, 28, 2).circle(31, 28, 2);
  });
  bake(scene, 'ic-value', 40, 40, (p) => {
    p.shape([[8, 14], [14, 5], [26, 5], [32, 14], [20, 36]], 0x7ae7ff, 3);
    p.line(2).seg(8, 14, 32, 14);
    p.fill(0xffffff, 0.7).poly([[14, 7], [18, 7], [15, 13], [11, 13]]);
  });
  bake(scene, 'ic-lock', 40, 40, (p) => {
    p.line(4, INK).arc(20, 17, 8, Math.PI, 0);
    p.line(2.5, 0xdfe6f5).arc(20, 17, 8, Math.PI, 0);
    p.box(9, 16, 22, 18, 4, 0xdfe6f5, 3);
    p.fill(INK).circle(20, 24, 3).rect(19, 24, 2, 6);
  });
  bake(scene, 'ic-sound', 40, 40, (p) => drawSpeaker(p, true));
  bake(scene, 'ic-mute', 40, 40, (p) => drawSpeaker(p, false));
  bake(scene, 'ic-music', 40, 40, (p) => {
    p.fill(0xffffff).rect(15, 8, 3, 21).rect(28, 5, 3, 21);
    p.fill(0xffffff).poly([[15, 8], [31, 4], [31, 10], [15, 14]]);
    p.fill(0xffffff).ellipse(12, 30, 11, 8).ellipse(25, 27, 11, 8);
  });
  bake(scene, 'ic-flag', 36, 36, (p) => {
    p.fill(INK).rect(6, 3, 4, 30);
    p.shape([[10, 4], [31, 9], [10, 18]], PAL.red, 2.5);
  });
  bake(scene, 'ic-star', 36, 36, (p) => p.shape(p.star(18, 19, 15, 7), PAL.gold, 2.5));
  bake(scene, 'ic-pile', 32, 32, (p) => {
    p.box(3, 18, 12, 11, 2, 0xf0b56b, 2.5);
    p.box(17, 18, 12, 11, 2, 0xf0b56b, 2.5);
    p.box(10, 5, 12, 11, 2, 0xf0b56b, 2.5);
  });
  bake(scene, 'mascot', 72, 72, drawMascot);
}

// ════════════════════════════════════════════════════════════════
// Drawers
// ════════════════════════════════════════════════════════════════

function drawCoin(p: Pen, x: number, y: number, r: number): void {
  p.dot(x, y + 1.5, r, PAL.goldDark, 2.5);
  p.dot(x, y, r, PAL.gold, 2.5);
  p.line(2, PAL.goldDark).strokeCircle(x, y, r * 0.68);
  p.fill(lighten(PAL.gold, 0.35)).poly(p.star(x, y + 0.5, r * 0.5, r * 0.22, 5));
  p.fill(0xffffff, 0.75).circle(x - r * 0.45, y - r * 0.45, r * 0.18);
}

function drawMachineBody(p: Pen, color: number, dark: number, variant: number): void {
  // legs
  p.box(18, 168, 26, 18, 4, PAL.steelDark, 3);
  p.box(126, 168, 26, 18, 4, PAL.steelDark, 3);
  // shadow side
  p.fill(dark).rrect(8, 26, 154, 148, 22);
  // main body
  p.box(8, 20, 154, 148, 22, color, 4);
  p.fill(lighten(color, 0.28)).rrect(18, 28, 134, 14, 7);
  // screen (eyes live here)
  p.box(33, 40, 104, 48, 14, PAL.screen, 3.5);
  p.fill(0xffffff, 0.08).rrect(38, 44, 94, 14, 7);
  // tunnel where the belt passes through
  p.fill(darken(color, 0.42)).rrect(22, 104, 126, 64, 14);
  p.fill(0xffffff, 0.08).rrect(28, 110, 114, 10, 5);
  p.line(4).strokeRrect(22, 104, 126, 64, 14);
  p.fill(0x000000, 0.25).rrect(26, 108, 118, 14, 7);
  // rivets
  for (const [x, y] of [[20, 34], [150, 34], [20, 94], [150, 94]]) {
    p.dot(x!, y!, 3.4, lighten(color, 0.4), 2);
  }
  // variant decals
  p.line(3, darken(color, 0.35));
  if (variant === 0) {
    // saw guard stripes
    for (let i = 0; i < 4; i++) p.seg(52 + i * 20, 94, 60 + i * 20, 99);
  } else if (variant === 1) {
    p.fill(darken(color, 0.3)).rrect(62, 91, 46, 9, 4);
  } else {
    p.fill(darken(color, 0.3)).circle(70, 96, 4).circle(85, 96, 4).circle(100, 96, 4);
  }
}

function drawSaw(p: Pen, x: number, y: number, r: number): void {
  const teeth = 14;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.55) / teeth) * Math.PI * 2;
    pts.push([x + Math.cos(a0) * (r - 6), y + Math.sin(a0) * (r - 6)]);
    pts.push([x + Math.cos(a1) * r, y + Math.sin(a1) * r]);
  }
  p.shape(pts, PAL.steel, 3);
  p.dot(x, y, r * 0.55, lighten(PAL.steel, 0.3), 2.5);
  p.dot(x, y, 6, PAL.red, 2.5);
  p.fill(0xffffff, 0.7).poly([[x - 12, y - 12], [x - 4, y - 16], [x - 2, y - 12]]);
}

function drawPress(p: Pen): void {
  p.box(30, 0, 16, 34, 3, PAL.steelDark, 3);
  p.fill(lighten(PAL.steelDark, 0.3)).rect(33, 2, 4, 30);
  p.box(4, 30, 68, 26, 7, PAL.steel, 3.5);
  p.fill(0xffffff, 0.6).rrect(10, 34, 40, 6, 3);
  p.fill(PAL.hazardYellow).rrect(6, 50, 64, 5, 2);
}

function drawGear(p: Pen, x: number, y: number, r: number, teeth: number, color: number, outline = 3): void {
  const pts: Array<[number, number]> = [];
  const inner = r * 0.78;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    pts.push([x + Math.cos(a) * inner, y + Math.sin(a) * inner]);
    pts.push([x + Math.cos(a + step * 0.15) * r, y + Math.sin(a + step * 0.15) * r]);
    pts.push([x + Math.cos(a + step * 0.45) * r, y + Math.sin(a + step * 0.45) * r]);
    pts.push([x + Math.cos(a + step * 0.6) * inner, y + Math.sin(a + step * 0.6) * inner]);
  }
  p.shape(pts, color, outline);
  if (outline > 0) {
    p.dot(x, y, r * 0.42, darken(color, 0.15), outline);
    p.dot(x, y, r * 0.16, INK);
  } else {
    // silhouette version: punch a hole via darker fill (tinted later)
    p.fill(0x000000, 0.35).circle(x, y, r * 0.3);
  }
}

type EyeMood = 'open' | 'happy' | 'closed' | 'angry' | 'sleepy';

function drawEyes(p: Pen, mood: EyeMood): void {
  const c = PAL.screenGlow;
  const L = 18;
  const R = 46;
  const y = 14;
  if (mood === 'open') {
    p.fill(c).rrect(L - 7, y - 10, 14, 20, 7).rrect(R - 7, y - 10, 14, 20, 7);
    p.fill(0xffffff).circle(L + 2, y - 4, 3).circle(R + 2, y - 4, 3);
  } else if (mood === 'happy') {
    p.line(5, c);
    p.arc(L, y + 5, 8, Math.PI * 1.1, Math.PI * 1.9);
    p.arc(R, y + 5, 8, Math.PI * 1.1, Math.PI * 1.9);
  } else if (mood === 'closed') {
    p.line(5, c);
    p.seg(L - 8, y, L + 8, y);
    p.seg(R - 8, y, R + 8, y);
  } else if (mood === 'sleepy') {
    p.fill(c).rrect(L - 8, y, 16, 7, 3.5).rrect(R - 8, y, 16, 7, 3.5);
  } else {
    // angry / stressed: > <
    p.line(5, 0xff6b6b);
    p.seg(L - 7, y - 7, L + 6, y);
    p.seg(L + 6, y, L - 7, y + 7);
    p.seg(R + 7, y - 7, R - 6, y);
    p.seg(R - 6, y, R + 7, y + 7);
  }
}

function drawHopper(p: Pen): void {
  // stand
  p.box(26, 118, 12, 70, 3, PAL.steelDark, 3);
  p.box(92, 118, 12, 70, 3, PAL.steelDark, 3);
  // funnel
  p.shape([[6, 30], [124, 30], [86, 118], [44, 118]], PAL.purple, 4);
  p.fill(lighten(PAL.purple, 0.3)).poly([[16, 36], [60, 36], [52, 56], [24, 56]]);
  // rim
  p.box(0, 18, 130, 18, 8, darken(PAL.purple, 0.15), 4);
  // spout
  p.box(48, 112, 34, 26, 5, PAL.steel, 3.5);
  // label
  p.fill(0xffffff).rrect(44, 66, 42, 22, 6);
  p.line(3).strokeRrect(44, 66, 42, 22, 6);
  p.fill(INK).rect(52, 74, 26, 3).rect(52, 80, 18, 3);
}

function drawTruck(p: Pen): void {
  // cargo box (open side faces left)
  p.box(6, 14, 142, 108, 10, 0xffffff, 4);
  p.fill(0xe9eef8).rect(10, 94, 134, 24);
  p.fill(PAL.red).rect(10, 40, 134, 14);
  p.line(3).seg(8, 40, 146, 40).seg(8, 54, 146, 54);
  p.fill(darken(0xffffff, 0.12)).rrect(12, 60, 24, 56, 5); // open door shade
  p.line(3).strokeRrect(12, 60, 24, 56, 5);
  // cab
  p.shape([[148, 50], [196, 50], [222, 86], [222, 122], [148, 122]], PAL.gold, 4);
  p.shape([[160, 58], [192, 58], [211, 86], [160, 86]], 0xbfeaff, 3);
  p.fill(0xffffff, 0.7).poly([[166, 62], [178, 62], [168, 80], [164, 80]]);
  p.box(200, 100, 22, 8, 3, PAL.steel, 2.5); // bumper
  p.dot(214, 94, 4, 0xfff4b0, 2.5); // headlight
  // chassis
  p.box(4, 118, 220, 14, 5, PAL.steelDark, 3.5);
  // wheels
  for (const x of [44, 118, 184]) {
    p.dot(x, 134, 20, INK);
    p.dot(x, 134, 12, PAL.steel, 2.5);
    p.dot(x, 134, 4, INK);
  }
}

function drawWindow(p: Pen): void {
  p.box(4, 4, 162, 112, 10, PAL.wallTrim, 4);
  p.vgrad(14, 14, 142, 92, PAL.windowSky, PAL.windowSkyLow, 20);
  p.line(3).strokeRect(14, 14, 142, 92);
  p.fill(PAL.cloud, 0.95).circle(46, 50, 12).circle(60, 44, 15).circle(76, 51, 11).rect(40, 50, 40, 12);
  p.fill(PAL.cloud, 0.8).circle(118, 78, 9).circle(130, 74, 12).circle(142, 80, 8);
  // hill silhouette
  p.fill(0x7fd18b).poly([[14, 106], [14, 90], [50, 80], [96, 92], [130, 82], [156, 90], [156, 106]]);
  p.fill(PAL.wallTrim).rect(83, 14, 5, 92).rect(14, 58, 142, 5);
}

function drawHangingLamp(p: Pen): void {
  p.fill(INK).rect(33, 0, 4, 58);
  p.fill(0xfff2b3, 0.35).poly([[20, 78], [50, 78], [70, 120], [0, 120]]);
  p.shape([[14, 78], [56, 78], [46, 58], [24, 58]], PAL.red, 3.5);
  p.dot(35, 80, 7, 0xfff6c8, 3);
}

function drawSpeaker(p: Pen, on: boolean): void {
  p.fill(0xffffff).poly([[6, 15], [14, 15], [24, 6], [24, 34], [14, 25], [6, 25]]);
  if (on) {
    p.line(3, 0xffffff);
    p.arc(24, 20, 7, -Math.PI / 3, Math.PI / 3);
    p.arc(24, 20, 13, -Math.PI / 3, Math.PI / 3);
  } else {
    p.line(3.5, PAL.red);
    p.seg(28, 13, 38, 27);
    p.seg(38, 13, 28, 27);
  }
}

function drawMascot(p: Pen): void {
  // "Bolt" the foreman robot
  p.line(3).seg(36, 14, 36, 4);
  p.dot(36, 5, 4.5, PAL.red, 2.5);
  p.box(8, 14, 56, 46, 14, PAL.gold, 4);
  p.fill(lighten(PAL.gold, 0.4)).rrect(14, 18, 40, 8, 4);
  p.box(14, 26, 44, 24, 9, PAL.screen, 3);
  p.fill(PAL.screenGlow).rrect(22, 31, 8, 12, 4).rrect(42, 31, 8, 12, 4);
  p.line(3, PAL.screenGlow).arc(36, 42, 5, 0.2, Math.PI - 0.2);
  // hard hat brim
  p.box(4, 60, 64, 8, 4, PAL.steel, 3);
  p.dot(8, 38, 5, PAL.steel, 2.5);
  p.dot(64, 38, 5, PAL.steel, 2.5);
}

// ── items ──────────────────────────────────────────────────────

function drawRaw(p: Pen, pid: ProductId): void {
  const c = ITEM_SIZE / 2;
  switch (pid) {
    case 'boxes':
      // stack of cardboard sheets
      p.box(6, 24, 32, 8, 2, 0xd9a066, 2.5);
      p.box(9, 17, 30, 8, 2, 0xe8b57a, 2.5);
      p.box(5, 10, 32, 8, 2, 0xf0c48d, 2.5);
      break;
    case 'toys':
      // plastic pellets
      p.dot(15, 27, 8, 0xffd23f, 2.5);
      p.dot(29, 27, 8, 0xff8c42, 2.5);
      p.dot(22, 15, 8, 0xff5e7e, 2.5);
      p.fill(0xffffff, 0.7).circle(19, 12, 2.2).circle(12, 24, 2.2).circle(26, 24, 2.2);
      break;
    case 'smartphones':
      // circuit chip
      p.line(2.5, INK);
      for (let i = 0; i < 4; i++) {
        p.seg(13 + i * 6, 6, 13 + i * 6, 38);
        p.seg(6, 13 + i * 6, 38, 13 + i * 6);
      }
      p.box(10, 10, 24, 24, 4, 0x2f8f5b, 3);
      p.box(16, 16, 12, 12, 2, 0x1b2238, 2);
      p.fill(0xffd23f).rect(18, 18, 3, 3);
      break;
    case 'robots':
      // steel ingot
      p.shape([[5, 32], [11, 14], [33, 14], [39, 32]], PAL.steel, 3);
      p.fill(0xffffff, 0.6).poly([[13, 17], [22, 17], [19, 28], [10, 28]]);
      p.line(2.5).seg(5, 32, 39, 32);
      break;
    case 'spaceTech':
      // energy crystal
      p.shape([[c, 4], [34, 16], [30, 38], [14, 38], [10, 16]], 0xb388ff, 3);
      p.fill(0xe3d4ff).poly([[c, 7], [c + 5, 16], [c, 34], [c - 5, 16]]);
      break;
  }
}

function drawProduct(p: Pen, pid: ProductId, unfinished: boolean): void {
  drawProductAt(p, pid, unfinished, ITEM_SIZE / 2, ITEM_SIZE / 2, 1);
}

/**
 * Product icon; `unfinished` renders the "part" stage — same silhouette in
 * primer grey (the Assembler then paints/assembles it).
 */
function drawProductAt(p: Pen, pid: ProductId, unfinished: boolean, cx: number, cy: number, s: number): void {
  const col = (c: number) => (unfinished ? mix(c, 0xb9c2d3, 0.78) : c);
  const X = (v: number) => cx + v * s;
  const Y = (v: number) => cy + v * s;
  const S = (v: number) => v * s;
  const ow = 2.6 * Math.max(1, s * 0.8);
  switch (pid) {
    case 'boxes': {
      p.shape([[X(-16), Y(-6)], [X(16), Y(-6)], [X(16), Y(16)], [X(-16), Y(16)]], col(0xe8b57a), ow);
      p.shape([[X(-16), Y(-6)], [X(-10), Y(-15)], [X(10), Y(-15)], [X(16), Y(-6)]], col(0xf5cb96), ow);
      p.fill(col(0xc98d52)).rect(X(-3), Y(-15), S(6), S(31));
      if (!unfinished) p.fill(0xffffff, 0.8).rect(X(-12), Y(2), S(9), S(3));
      break;
    }
    case 'toys': {
      // rubber duck
      p.fill(col(0xffd23f)).ellipse(X(1), Y(7), S(32), S(20));
      p.line(ow).strokeEllipse(X(1), Y(7), S(32), S(20));
      p.dot(X(-5), Y(-7), S(10), col(0xffd23f), ow);
      p.shape([[X(-15), Y(-7)], [X(-23), Y(-4)], [X(-15), Y(-1)]], col(0xff8c42), ow * 0.8);
      p.fill(INK).circle(X(-7), Y(-9), S(2.2));
      p.fill(col(0xffe680)).ellipse(X(4), Y(5), S(14), S(7));
      break;
    }
    case 'smartphones': {
      p.box(X(-11), Y(-17), S(22), S(34), S(5), col(0x2b3350), ow);
      p.fill(unfinished ? 0x8f99ad : 0x4fc3f7).rrect(X(-8), Y(-13), S(16), S(24), S(2));
      if (!unfinished) {
        p.fill(0xffffff, 0.55).poly([[X(-8), Y(-6)], [X(1), Y(-13)], [X(6), Y(-13)], [X(-8), Y(0)]]);
        p.fill(0xff5e7e).rrect(X(-5), Y(2), S(4), S(4), S(1)).fill(0x3ddc84).rrect(X(1), Y(2), S(4), S(4), S(1));
      }
      p.fill(INK).circle(X(0), Y(14), S(1.6));
      break;
    }
    case 'robots': {
      p.line(ow).seg(X(0), Y(-19), X(0), Y(-13));
      p.dot(X(0), Y(-19), S(3), col(PAL.red), ow * 0.8);
      p.box(X(-12), Y(-13), S(24), S(16), S(5), col(0x9fb4d8), ow);
      p.fill(unfinished ? 0x6e7890 : PAL.screenGlow).circle(X(-5), Y(-5), S(3)).circle(X(5), Y(-5), S(3));
      p.box(X(-10), Y(4), S(20), S(14), S(4), col(0x7d93bb), ow);
      p.dot(X(0), Y(11), S(2.5), col(PAL.gold), ow * 0.6);
      break;
    }
    case 'spaceTech': {
      p.shape([[X(-12), Y(10)], [X(-18), Y(18)], [X(-8), Y(16)]], col(PAL.red), ow);
      p.shape([[X(12), Y(10)], [X(18), Y(18)], [X(8), Y(16)]], col(PAL.red), ow);
      p.shape(
        [[X(0), Y(-20)], [X(8), Y(-8)], [X(9), Y(12)], [X(5), Y(17)], [X(-5), Y(17)], [X(-9), Y(12)], [X(-8), Y(-8)]],
        col(0xf4f7ff),
        ow,
      );
      p.dot(X(0), Y(-2), S(4.5), unfinished ? 0x8f99ad : 0x4fc3f7, ow * 0.8);
      p.fill(col(PAL.red)).poly([[X(0), Y(-20)], [X(5), Y(-12)], [X(-5), Y(-12)]]);
      break;
    }
  }
}

function drawPacked(p: Pen, pid: ProductId): void {
  // clear blister pack + ribbon — "ready to ship"
  drawProductAt(p, pid, false, ITEM_SIZE / 2, ITEM_SIZE / 2 + 1, 0.82);
  p.fill(0xbfeaff, 0.35).rrect(3, 3, 38, 38, 8);
  p.line(3).strokeRrect(3, 3, 38, 38, 8);
  p.fill(0xffffff, 0.75).poly([[7, 7], [16, 7], [7, 20]]);
  p.fill(PAL.red).rect(3, 30, 38, 5);
  p.line(2).seg(3, 30, 41, 30).seg(3, 35, 41, 35);
  p.shape([[22, 30], [15, 25], [15, 34]], PAL.red, 2);
  p.shape([[22, 30], [29, 25], [29, 34]], PAL.red, 2);
}
