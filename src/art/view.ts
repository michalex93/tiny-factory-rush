import Phaser from 'phaser';
import { FONT, CSS } from './palette';

/**
 * Render zoom: the game world is authored at 1280×720 but the canvas is
 * rendered at up to 2× that, so text and baked 2× textures stay crisp in
 * fullscreen / high-DPI (CrazyGames quality: "high resolution").
 */
export const ZOOM: number = (() => {
  if (typeof window === 'undefined') return 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sw = (window.screen?.width || window.innerWidth) * dpr;
  const sh = (window.screen?.height || window.innerHeight) * dpr;
  const need = Math.min(sw / 1280, sh / 720);
  if (need >= 1.75) return 2;
  if (need >= 1.25) return 1.5;
  return 1;
})();

export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(ZOOM).centerOn(640, 360);
}

export interface TextOpts {
  size?: number;
  color?: string;
  weight?: '500' | '600' | '700';
  stroke?: string;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  shadow?: boolean;
  lineSpacing?: number;
}

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  o: TextOpts = {},
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT,
    fontSize: `${o.size ?? 16}px`,
    fontStyle: o.weight ?? '600',
    color: o.color ?? CSS.white,
    align: o.align ?? 'left',
    resolution: ZOOM,
  };
  if (o.stroke) {
    style.stroke = o.stroke;
    style.strokeThickness = o.strokeThickness ?? 4;
  }
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.shadow) {
    style.shadow = { offsetX: 0, offsetY: 3, color: 'rgba(0,0,0,0.35)', blur: 0, fill: true, stroke: true };
  }
  const t = scene.add.text(x, y, value, style);
  if (o.lineSpacing) t.setLineSpacing(o.lineSpacing);
  return t;
}

/** Baked textures are 2× — display at logical size. */
export function img(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setScale(0.5);
}

/** Rounded panel drawn into a Graphics object (logical coords). */
export function panel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  edge: number,
  alpha = 1,
  shadow = true,
): void {
  if (shadow) {
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(x, y + 5, w, h, r);
  }
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(3, edge, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}
