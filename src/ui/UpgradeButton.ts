import Phaser from 'phaser';

export interface UpgradeButtonState {
  title: string;
  subtitle?: string;
  enabled: boolean;
}

/**
 * Compact interactive upgrade button for the HUD panel.
 */
export class UpgradeButton {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Image;
  private titleText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;
  private enabled = false;
  private onClick: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { title: string; onClick: () => void },
  ) {
    this.onClick = opts.onClick;
    this.bg = scene.add
      .image(0, 0, 'btn-disabled')
      .setDisplaySize(w, h)
      .setOrigin(0, 0);

    // Hit area must match display size (texture is larger by default)
    this.bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.bg.input!.cursor = 'pointer';

    this.titleText = scene.add
      .text(w / 2, h * 0.32, opts.title, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '11px',
        color: '#e8eef5',
        align: 'center',
      })
      .setOrigin(0.5);

    this.subtitleText = scene.add
      .text(w / 2, h * 0.68, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.bg, this.titleText, this.subtitleText]);
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.add({
        targets: this.container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 50,
        yoyo: true,
      });
      this.onClick();
    });
  }

  setState(state: UpgradeButtonState): void {
    this.enabled = state.enabled;
    this.titleText.setText(state.title);
    if (state.subtitle !== undefined) {
      this.subtitleText.setText(state.subtitle);
    }
    this.bg.setTexture(state.enabled ? 'btn' : 'btn-disabled');
    this.bg.setAlpha(state.enabled ? 1 : 0.7);
  }
}
