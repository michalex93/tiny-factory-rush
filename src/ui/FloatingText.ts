import Phaser from 'phaser';

interface PooledText {
  text: Phaser.GameObjects.Text;
  inUse: boolean;
}

/**
 * Reusable floating damage/coin numbers — avoids allocating per sale.
 */
export class FloatingText {
  private pool: PooledText[] = [];
  private scene: Phaser.Scene;
  private readonly poolSize = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < this.poolSize; i++) {
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffd166',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(1000);
      this.pool.push({ text, inUse: false });
    }
  }

  spawn(x: number, y: number, value: string, color = '#ffd166'): void {
    const entry = this.pool.find((p) => !p.inUse) ?? this.pool[0]!;
    entry.inUse = true;
    const t = entry.text;
    this.scene.tweens.killTweensOf(t);
    t.setText(value);
    t.setColor(color);
    t.setPosition(x, y);
    t.setAlpha(1);
    t.setScale(1);
    t.setVisible(true);

    this.scene.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scale: 1.15,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.setVisible(false);
        entry.inUse = false;
      },
    });
  }
}
