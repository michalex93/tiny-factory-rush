import Phaser from 'phaser';

/**
 * Pooled tween-driven particles — sparks, puffs, rings, confetti.
 * ("Juice it or lose it": every action should answer with motion.)
 */
export class Fx {
  private pool: Phaser.GameObjects.Image[] = [];
  private reduced: boolean;

  constructor(
    private scene: Phaser.Scene,
    private depth = 90,
  ) {
    this.reduced =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private get(key: string): Phaser.GameObjects.Image {
    const img = this.pool.pop() ?? this.scene.add.image(0, 0, key);
    this.scene.tweens.killTweensOf(img);
    return img
      .setTexture(key)
      .setVisible(true)
      .setAlpha(1)
      .setAngle(0)
      .setDepth(this.depth)
      .clearTint();
  }

  private release(img: Phaser.GameObjects.Image): void {
    img.setVisible(false);
    if (this.pool.length < 220) this.pool.push(img);
    else img.destroy();
  }

  burst(
    x: number,
    y: number,
    key: string,
    count: number,
    colors: number[],
    speed = 80,
    life = 450,
    scale = 0.5,
  ): void {
    const n = this.reduced ? Math.min(2, count) : count;
    for (let i = 0; i < n; i++) {
      const p = this.get(key);
      const a = Math.random() * Math.PI * 2;
      const d = speed * (0.4 + Math.random() * 0.8);
      const s0 = scale * (0.6 + Math.random() * 0.6);
      p.setPosition(x, y).setScale(s0).setTint(colors[i % colors.length]!);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d - 10,
        scale: s0 * 0.2,
        alpha: 0,
        angle: (Math.random() - 0.5) * 240,
        duration: life * (0.7 + Math.random() * 0.5),
        ease: 'Cubic.easeOut',
        onComplete: () => this.release(p),
      });
    }
  }

  ring(x: number, y: number, color: number): void {
    const p = this.get('ring');
    p.setPosition(x, y).setScale(0.6).setTint(color).setAlpha(0.9);
    this.scene.tweens.add({
      targets: p,
      scale: 3.2,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => this.release(p),
    });
  }

  confetti(count: number): void {
    const colors = [0xff5e7e, 0xffd23f, 0x3ddc84, 0x4fc3f7, 0x9b5de5, 0xff8c42];
    const n = this.reduced ? 12 : count;
    for (let i = 0; i < n; i++) {
      const p = this.get('confetti');
      const x = 640 + (Math.random() - 0.5) * 900;
      const y = -20 - Math.random() * 120;
      p.setPosition(x, y).setScale(0.8 + Math.random() * 0.6).setTint(colors[i % colors.length]!);
      p.setDepth(this.depth + 20);
      this.scene.tweens.add({
        targets: p,
        y: 560 + Math.random() * 180,
        x: x + (Math.random() - 0.5) * 260,
        angle: (Math.random() - 0.5) * 900,
        duration: 1500 + Math.random() * 1100,
        ease: 'Sine.easeIn',
        onComplete: () => this.release(p),
      });
      this.scene.tweens.add({ targets: p, alpha: 0, delay: 1300, duration: 900 });
    }
  }
}
