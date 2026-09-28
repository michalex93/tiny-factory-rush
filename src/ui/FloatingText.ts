import Phaser from 'phaser';
import { CSS } from '../art/palette';
import { txt } from '../art/view';

interface PooledText {
  text: Phaser.GameObjects.Text;
  inUse: boolean;
  bornAt: number;
}

/** Pooled pop-up numbers/messages with a springy rise. */
export class FloatingText {
  private pool: PooledText[] = [];
  private readonly poolSize = 24;

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < this.poolSize; i++) {
      const text = txt(scene, 0, 0, '', {
        size: 22,
        weight: '700',
        color: CSS.gold,
        stroke: CSS.ink,
        strokeThickness: 6,
        align: 'center',
      })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(1000);
      this.pool.push({ text, inUse: false, bornAt: 0 });
    }
  }

  spawn(x: number, y: number, value: string, color: string = CSS.gold, size = 22): void {
    let entry = this.pool.find((p) => !p.inUse);
    if (!entry) entry = this.pool.reduce((a, b) => (a.bornAt < b.bornAt ? a : b));
    entry.inUse = true;
    entry.bornAt = this.scene.time.now;
    const t = entry.text;
    this.scene.tweens.killTweensOf(t);
    t.setText(value).setColor(color).setFontSize(size);
    t.setPosition(x, y).setAlpha(1).setScale(0.4).setVisible(true);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: y - 56,
      alpha: 0,
      delay: 380,
      duration: 650,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        t.setVisible(false);
        entry!.inUse = false;
      },
    });
  }
}
