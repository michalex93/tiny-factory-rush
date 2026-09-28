import Phaser from 'phaser';
import { CSS, PAL, darken } from '../art/palette';
import { img, txt } from '../art/view';

export type UpgradeButtonMode =
  | 'buy' // affordable
  | 'poor' // visible but can't afford yet
  | 'locked' // not revealed yet
  | 'dim' // revealed but not relevant to the current decision
  | 'max'
  | 'free'; // free-upgrade credit

export interface UpgradeButtonState {
  label: string;
  level?: string;
  cost?: string;
  mode: UpgradeButtonMode;
  highlight?: boolean;
  /** Optional ribbon above the button (e.g. "PLAN A"). */
  ribbon?: string;
}

/**
 * Chunky, readable upgrade tile: icon → name → level → price.
 * Lives directly under the machine it upgrades so cause→effect is spatial.
 */
export class UpgradeButton {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Image;
  private lock: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private costText: Phaser.GameObjects.Text;
  private coin: Phaser.GameObjects.Image;
  private ribbonBg: Phaser.GameObjects.Graphics;
  private ribbonText: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Image;
  private state: UpgradeButtonState = { label: '', mode: 'locked' };
  private hover = false;
  private pulse = 0;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly w: number,
    readonly h: number,
    iconKey: string,
    private onClick: () => void,
    private onDenied: () => void,
  ) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.icon = img(scene, w / 2, 26, iconKey).setScale(0.62);
    this.lock = img(scene, w / 2, 30, 'ic-lock').setScale(0.62).setVisible(false);
    this.labelText = txt(scene, w / 2, 55, '', { size: 14, weight: '700', color: CSS.white, align: 'center' }).setOrigin(0.5);
    this.levelText = txt(scene, w / 2, 72, '', { size: 12, weight: '600', color: CSS.muted, align: 'center' }).setOrigin(0.5);
    this.coin = img(scene, 0, h - 17, 'coin').setScale(0.45);
    this.costText = txt(scene, w / 2, h - 17, '', { size: 16, weight: '700', color: CSS.ink }).setOrigin(0, 0.5);
    this.ribbonBg = scene.add.graphics();
    this.ribbonText = txt(scene, w / 2, -12, '', { size: 12, weight: '700', color: CSS.ink }).setOrigin(0.5);
    this.arrow = img(scene, w / 2, -34, 'arrow').setScale(0.42).setVisible(false);
    scene.tweens.add({ targets: this.arrow, y: -26, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    this.container = scene.add.container(x, y, [
      this.g,
      this.icon,
      this.lock,
      this.labelText,
      this.levelText,
      this.coin,
      this.costText,
      this.ribbonBg,
      this.ribbonText,
      this.arrow,
      zone,
    ]);
    this.container.setSize(w, h);

    zone.on('pointerover', () => {
      this.hover = true;
      this.redraw();
    });
    zone.on('pointerout', () => {
      this.hover = false;
      this.redraw();
    });
    zone.on('pointerdown', () => {
      const m = this.state.mode;
      if (m === 'buy' || m === 'free') {
        scene.tweens.add({ targets: this.container, scaleX: 0.93, scaleY: 0.93, duration: 60, yoyo: true });
        this.onClick();
      } else if (m === 'poor') {
        const x0 = this.container.x;
        scene.tweens.add({
          targets: this.container,
          x: { from: x0 - 5, to: x0 },
          duration: 60,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => this.container.setX(x0),
        });
        this.onDenied();
      }
    });
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  setState(state: UpgradeButtonState): void {
    const prev = this.state;
    this.state = state;
    const changed =
      prev.mode !== state.mode ||
      prev.label !== state.label ||
      prev.level !== state.level ||
      prev.cost !== state.cost ||
      prev.highlight !== state.highlight ||
      prev.ribbon !== state.ribbon;
    if (changed) {
      if (prev.mode === 'poor' && state.mode === 'buy') {
        // just became affordable — little "ready!" hop
        this.scene.tweens.add({ targets: this.container, y: this.container.y - 6, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
      }
      this.redraw();
    }
  }

  /** Called every frame for the highlight glow. */
  tick(dt: number): void {
    if (!this.state.highlight) return;
    this.pulse += dt;
    this.redraw();
  }

  private redraw(): void {
    const { w, h } = this;
    const s = this.state;
    const g = this.g;
    g.clear();
    const locked = s.mode === 'locked';
    const dim = s.mode === 'dim';
    const buy = s.mode === 'buy' || s.mode === 'free';
    const max = s.mode === 'max';
    const top = locked || dim ? PAL.btnLocked : buy ? PAL.btnGreen : max ? PAL.gold : PAL.uiPanelLight;
    const bottom = darken(top, 0.28);

    // glow for suggested action
    if (s.highlight && !locked) {
      const a = 0.45 + 0.35 * Math.sin(this.pulse / 160);
      g.lineStyle(8, PAL.gold, a);
      g.strokeRoundedRect(-5, -5, w + 10, h + 10, 20);
    }
    // 3D base
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(0, 6, w, h, 16);
    g.fillStyle(bottom, 1);
    g.fillRoundedRect(0, 3, w, h, 16);
    g.fillStyle(this.hover && buy ? Phaser.Display.Color.ValueToColor(top).lighten(8).color : top, 1);
    g.fillRoundedRect(0, 0, w, h - 3, 16);
    g.fillStyle(0xffffff, buy ? 0.22 : 0.08);
    g.fillRoundedRect(6, 4, w - 12, 14, 7);
    g.lineStyle(3, PAL.ink, 1);
    g.strokeRoundedRect(0, 0, w, h, 16);

    // price pill
    const showCost = !locked && !!s.cost;
    if (showCost) {
      g.fillStyle(buy ? 0xffffff : max ? 0xfff3c4 : 0x9aa6c2, 1);
      g.fillRoundedRect(6, h - 30, w - 12, 24, 12);
      g.lineStyle(2, PAL.ink, 1);
      g.strokeRoundedRect(6, h - 30, w - 12, 24, 12);
    }

    this.icon.setVisible(!locked).setAlpha(dim ? 0.45 : 1);
    this.lock.setVisible(locked);
    this.labelText.setText(locked ? 'Locked' : s.label).setAlpha(dim ? 0.55 : locked ? 0.6 : 1);
    this.labelText.setY(locked ? 62 : 55);
    this.labelText.setColor(max ? CSS.ink : CSS.white);
    this.levelText.setText(locked ? '' : s.level ?? '').setAlpha(dim ? 0.5 : 1);
    this.levelText.setColor(max ? CSS.ink : buy ? '#e9fff2' : CSS.muted);

    this.costText.setVisible(showCost).setText(s.cost ?? '');
    this.costText.setColor(s.mode === 'poor' ? '#3b4561' : CSS.ink);
    const hasCoin = showCost && /^\$/.test(s.cost ?? '');
    if (hasCoin) this.costText.setText((s.cost ?? '').slice(1));
    const cw = this.costText.width + (hasCoin ? 18 : 0);
    const cx = (w - cw) / 2;
    this.coin.setVisible(hasCoin).setX(cx + 7);
    this.costText.setX(cx + (hasCoin ? 18 : 0));

    // ribbon
    this.ribbonBg.clear();
    if (s.ribbon) {
      this.ribbonText.setText(s.ribbon).setVisible(true);
      const rw = this.ribbonText.width + 18;
      this.ribbonBg.fillStyle(PAL.gold, 1);
      this.ribbonBg.fillRoundedRect(w / 2 - rw / 2, -23, rw, 22, 11);
      this.ribbonBg.lineStyle(2.5, PAL.ink, 1);
      this.ribbonBg.strokeRoundedRect(w / 2 - rw / 2, -23, rw, 22, 11);
    } else {
      this.ribbonText.setVisible(false);
    }
    this.arrow.setVisible(!!s.highlight && buy && !s.ribbon);
  }
}
