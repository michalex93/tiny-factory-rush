/**
 * Dev-only cover renderer (not part of the game build).
 *   npm run dev → open /cover.html?w=1920&h=1080
 * scripts/render-covers.mjs screenshots the three CrazyGames sizes.
 */
import Phaser from 'phaser';
import '@fontsource/fredoka/latin-700.css';
import { generateTextures, itemKey } from './art/Textures';
import { CSS, FONT, PAL, lighten, mix } from './art/palette';

const q = new URLSearchParams(location.search);
const W = Number(q.get('w') ?? 1920);
const H = Number(q.get('h') ?? 1080);

class CoverScene extends Phaser.Scene {
  constructor() {
    super('Cover');
  }

  create(): void {
    generateTextures(this);
    const g = this.add.graphics();
    const floorY = H * (W < H ? 0.86 : 0.82);
    for (let i = 0; i < 48; i++) {
      g.fillStyle(mix(PAL.wallTop, PAL.wallBottom, i / 47), 1);
      g.fillRect(0, (floorY / 48) * i, W, floorY / 48 + 1);
    }
    // sunburst behind the logo
    const cx = W / 2;
    const cy = H * 0.3;
    g.fillStyle(0xffffff, 0.09);
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2;
      const a1 = a0 + Math.PI / 18;
      g.fillTriangle(cx, cy, cx + Math.cos(a0) * W, cy + Math.sin(a0) * W, cx + Math.cos(a1) * W, cy + Math.sin(a1) * W);
    }
    const unit = Math.min(W / 1920, H / 1080) * (W < H ? 1.55 : W === H ? 1.25 : 1);
    for (const [x, y, s] of [[0.08, 0.2, 1.4], [0.93, 0.14, 1.1], [0.85, 0.6, 0.8]] as const) {
      this.add.image(W * x, H * y, 'bg-gear').setAlpha(0.22).setScale(s * unit * 1.2).setRotation(x * 7);
    }
    // floor
    g.fillStyle(PAL.floor, 1);
    g.fillRect(0, floorY, W, H - floorY);
    g.fillStyle(PAL.floorDark, 1);
    g.fillRect(0, floorY, W, 10 * unit);
    g.fillStyle(PAL.wallTrim, 1);
    g.fillRect(0, floorY - 10 * unit, W, 12 * unit);

    // belt
    const beltY = floorY - 22 * unit;
    g.fillStyle(PAL.beltFrame, 1);
    g.fillRoundedRect(-20, beltY - 26 * unit, W + 40, 52 * unit, 16 * unit);
    g.lineStyle(5 * unit, PAL.ink, 1);
    g.strokeRoundedRect(-20, beltY - 26 * unit, W + 40, 52 * unit, 16 * unit);
    this.add.tileSprite(W / 2, beltY - 3 * unit, W + 40, 30 * unit, 'belt').setTileScale(unit * 0.75, unit * 0.75);

    // machines
    const ms = unit * (W < H ? 2.05 : 1.7);
    const n = W < H ? 2 : 3;
    const xs = n === 3 ? [0.22, 0.5, 0.78] : [0.27, 0.73];
    const tools = ['saw', 'press', 'gear'];
    xs.forEach((fx, i) => {
      const x = W * fx;
      const y = beltY - 80 * ms * 0.5 - 4 * unit;
      const id = n === 3 ? i : i * 2;
      const toolY = id === 1 ? -104 : -96;
      this.add.image(x, y + toolY * ms, tools[id]!).setScale(0.5 * ms);
      if (id === 2) this.add.image(x + 52 * ms, y - 92 * ms, 'gear').setScale(0.5 * ms);
      this.add.image(x, y, `machine-${id}`).setScale(0.5 * ms);
      this.add.image(x, y - 31 * ms, 'eyes-happy').setScale(0.5 * ms);
      const lg = this.add.graphics();
      lg.fillStyle(PAL.green, 1).fillCircle(x - 63 * ms, y - 62 * ms, 8 * ms);
      lg.lineStyle(2.5 * ms, PAL.ink, 1).strokeCircle(x - 63 * ms, y - 62 * ms, 8 * ms);
    });
    // products riding the belt + flying
    const prods = ['boxes', 'toys', 'smartphones', 'robots', 'spaceTech'] as const;
    const itemY = beltY - 24 * unit;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.05 + i * 0.115);
      if (xs.some((fx) => Math.abs(W * fx - x) < 112 * ms)) continue;
      const pid = prods[i % prods.length]!;
      this.add.image(x, itemY, itemKey('prod', pid)).setScale(unit * 1.25);
    }
    const flyers: Array<[number, number, string, number]> = [
      [0.1, 0.6, 'icon-toys', -12],
      [0.9, 0.5, 'icon-smartphones', 14],
      [0.08, 0.44, 'coin', 0],
      [0.92, 0.3, 'icon-spaceTech', 20],
      [0.2, 0.08, 'coin', 0],
      [0.8, 0.07, 'icon-robots', -10],
    ];
    for (const [fx, fy, key, ang] of flyers) {
      if (W < H && (fx === 0.08 || fx === 0.92)) continue;
      this.add.image(W * fx, H * fy, key).setScale(unit * (key === 'coin' ? 1.8 : 1.3)).setAngle(ang);
    }
    // confetti
    const colors = [0xff5e7e, 0xffd23f, 0x3ddc84, 0x4fc3f7, 0x9b5de5, 0xff8c42];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cg = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.66;
      const a = rnd() * Math.PI;
      const w = 10 * unit * (1 + rnd());
      const h = 6 * unit * (1 + rnd() * 0.5);
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const pts = [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ].map(([px, py]) => new Phaser.Math.Vector2(x + px! * c - py! * sn, y + px! * sn + py! * c));
      cg.fillStyle(colors[i % colors.length]!, 1);
      cg.fillPoints(pts, true);
    }
    // logo
    const size = Math.round(150 * unit * (W < H ? 0.92 : 1));
    const logoY = W < H ? H * 0.33 : H * 0.3;
    const lines = W < H || W === H ? ['TINY', 'FACTORY', 'RUSH'] : ['TINY FACTORY', 'RUSH'];
    const lh = size * 0.98;
    const top = logoY - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      const t = this.add
        .text(W / 2, top + i * lh, line, {
          fontFamily: FONT,
          fontSize: `${i === lines.length - 1 ? Math.round(size * 1.18) : size}px`,
          fontStyle: '700',
          color: i === lines.length - 1 ? CSS.gold : '#ffffff',
          stroke: CSS.ink,
          strokeThickness: Math.round(size * 0.16),
          shadow: { offsetX: 0, offsetY: Math.round(size * 0.1), color: '#1b2238', blur: 0, fill: true, stroke: true },
        })
        .setOrigin(0.5);
      t.setAngle(i === lines.length - 1 ? -3 : 0);
    });
    void lighten;
  }
}

async function boot(): Promise<void> {
  try {
    await document.fonts.load('700 40px "Fredoka"');
  } catch {
    /* ignore */
  }
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'cover',
    width: W,
    height: H,
    backgroundColor: '#3b93c9',
    scene: [CoverScene],
    render: { antialias: true },
  });
}
void boot();
