import Phaser from 'phaser';

/**
 * Generate placeholder textures at boot — no external assets needed.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.makeTexture('pixel', 4, 4, 0xffffff);
    this.makeTexture('item', 28, 28, 0xc4a574, true);
    this.makeTexture('machine', 110, 130, 0x3d5a80);
    this.makeTexture('belt', 64, 36, 0x4a5568);
    this.makeTexture('bar-bg', 100, 10, 0x1a1a2e);
    this.makeTexture('bar-fill', 100, 10, 0x52b788);
    this.makeTexture('btn', 160, 44, 0x2d6a4f);
    this.makeTexture('btn-disabled', 160, 44, 0x3a3a4a);
    this.makeTexture('coin', 16, 16, 0xffd166, true);
    this.makeTexture('panel', 8, 8, 0x15202b);

    this.scene.start('GameScene');
  }

  private makeTexture(
    key: string,
    w: number,
    h: number,
    color: number,
    rounded = false,
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    if (rounded) {
      g.fillRoundedRect(0, 0, w, h, Math.min(6, w / 4));
    } else {
      g.fillRect(0, 0, w, h);
    }
    // Subtle border
    g.lineStyle(2, 0x000000, 0.25);
    if (rounded) {
      g.strokeRoundedRect(1, 1, w - 2, h - 2, Math.min(6, w / 4));
    } else {
      g.strokeRect(1, 1, w - 2, h - 2);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
