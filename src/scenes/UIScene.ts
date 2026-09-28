import Phaser from 'phaser';
import {
  MACHINE_COUNT,
  MAX_UPGRADE_LEVEL,
  PRODUCTS,
  type MachineId,
  type ProductId,
  type UpgradeType,
} from '../config/balance';
import { CSS, PAL } from '../art/palette';
import { img, panel, setupCamera, txt } from '../art/view';
import type { GameRegistry } from './GameScene';
import { GameScene, MACHINE_X, MACHINE_Y, TRUCK_X } from './GameScene';
import { FloatingText } from '../ui/FloatingText';
import { UpgradeButton, type UpgradeButtonMode } from '../ui/UpgradeButton';
import { MACHINE_LABELS, friendly } from '../ui/copy';

const UPGRADE_TYPES: UpgradeType[] = ['speed', 'buffer', 'value'];
const UPGRADE_LABELS: Record<UpgradeType, string> = {
  speed: 'Faster',
  buffer: 'More room',
  value: 'Worth more',
};
const UPGRADE_ICONS: Record<UpgradeType, string> = {
  speed: 'ic-speed',
  buffer: 'ic-room',
  value: 'ic-value',
};

const CARD_W = 300;
const CARD_Y = 540;
const CARD_H = 170;
const BTN_W = 88;
const BTN_H = 116;

const COIN_HUD = { x: 46, y: 42 };

export class UIScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private outputText!: Phaser.GameObjects.Text;
  private wipText!: Phaser.GameObjects.Text;
  private profitText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private goalGfx!: Phaser.GameObjects.Graphics;
  private goalIcon!: Phaser.GameObjects.Image;
  private goalColor: number = PAL.gold;
  private compareText!: Phaser.GameObjects.Text;
  private compareGfx!: Phaser.GameObjects.Graphics;
  private compareBox!: Phaser.GameObjects.Container;
  private detailText!: Phaser.GameObjects.Text;
  private muteIcon!: Phaser.GameObjects.Image;
  private musicIcon!: Phaser.GameObjects.Image;
  private musicSlash!: Phaser.GameObjects.Graphics;
  private unlockContainer!: Phaser.GameObjects.Container;
  private unlockGfx!: Phaser.GameObjects.Graphics;
  private unlockIcon!: Phaser.GameObjects.Image;
  private unlockLabel!: Phaser.GameObjects.Text;
  private unlockSub!: Phaser.GameObjects.Text;
  private unlockEnabled = false;
  private unlockPulse = 0;
  private choiceText!: Phaser.GameObjects.Text;
  private floating!: FloatingText;
  private buttons: UpgradeButton[] = [];
  private cardGfx: Phaser.GameObjects.Graphics[] = [];
  private cardTitles: Phaser.GameObjects.Text[] = [];
  private cardStats: Phaser.GameObjects.Text[] = [];
  private refreshAcc = 0;
  private upgradeViewLogged = false;
  private shownCoins = 0;
  private lastCoinFly = 0;
  private bannerText!: Phaser.GameObjects.Text;
  private modal: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('UIScene');
  }

  create(): void {
    setupCamera(this);
    this.floating = new FloatingText(this);
    this.buildHud();
    this.buildDetail();
    this.buildCompare();
    this.buildChoicePanel();
    this.buildUnlockButton();
    this.buildUpgradePanel();
    this.buildMute();
    this.buildBanner();

    // Progressive disclosure — metrics appear once they mean something
    this.unlockContainer.setVisible(false);
    this.detailText.setVisible(false);
    this.outputText.setVisible(false);
    this.wipText.setVisible(false);
    this.profitText.setVisible(false);
    this.goalText.setVisible(false);
    this.compareBox.setVisible(false);
    this.choiceText.setVisible(false);

    const reg = this.getRegistry();
    this.shownCoins = reg ? Math.floor(reg.factory.economy.coins) : 0;

    this.game.events.on('sell', this.onSell, this);
    this.game.events.on('upgrade', this.onUpgradeEvent, this);
    this.game.events.on('unlock', this.onUnlockFeedback, this);
    this.game.events.on('upgrade-impact', this.onImpact, this);
    this.game.events.on('select-machine', this.onSelectMachine, this);
    this.game.events.on('bottleneck-shown', this.onBottleneckShown, this);
    this.game.events.on('session-goal', this.onSessionGoalEvent, this);
    this.game.events.on('optimization-choice', this.onChoiceReady, this);
    this.game.events.on('payoff-banner', this.onPayoffBanner, this);
    this.game.events.on('coin-fly', this.onCoinFly, this);
    this.game.events.on('big-banner', this.onBigBanner, this);

    this.events.on('shutdown', () => {
      this.game.events.off('sell', this.onSell, this);
      this.game.events.off('upgrade', this.onUpgradeEvent, this);
      this.game.events.off('unlock', this.onUnlockFeedback, this);
      this.game.events.off('upgrade-impact', this.onImpact, this);
      this.game.events.off('select-machine', this.onSelectMachine, this);
      this.game.events.off('bottleneck-shown', this.onBottleneckShown, this);
      this.game.events.off('session-goal', this.onSessionGoalEvent, this);
      this.game.events.off('optimization-choice', this.onChoiceReady, this);
      this.game.events.off('payoff-banner', this.onPayoffBanner, this);
      this.game.events.off('coin-fly', this.onCoinFly, this);
      this.game.events.off('big-banner', this.onBigBanner, this);
    });

    this.refreshAll();
    this.time.delayedCall(250, () => this.maybeShowOffline());
  }

  update(_t: number, delta: number): void {
    this.refreshAcc += delta;
    if (this.refreshAcc >= 200) {
      this.refreshAcc = 0;
      this.refreshAll();
    }
    for (const b of this.buttons) b.tick(delta);
    this.tickCoins(delta);
    this.tickUnlockCard(delta);
  }

  private getRegistry(): GameRegistry | undefined {
    return this.registry.get('game') as GameRegistry | undefined;
  }

  private getGameScene(): GameScene | undefined {
    return this.scene.get('GameScene') as GameScene | undefined;
  }

  // ══════════════════════════════════════════════════════════════
  // Build
  // ══════════════════════════════════════════════════════════════

  private buildHud(): void {
    this.hudGfx = this.add.graphics();
    this.coinIcon = img(this, COIN_HUD.x, COIN_HUD.y, 'coin').setScale(0.95);
    this.coinsText = txt(this, 72, 42, '0', {
      size: 34,
      weight: '700',
      color: CSS.gold,
      stroke: CSS.ink,
      strokeThickness: 6,
    }).setOrigin(0, 0.5);

    this.outputText = txt(this, 28, 86, '', { size: 14, weight: '600', color: CSS.white }).setOrigin(0, 0.5);
    this.profitText = txt(this, 132, 86, '', { size: 14, weight: '600', color: CSS.green }).setOrigin(0, 0.5);
    this.wipText = txt(this, 28, 108, '', { size: 14, weight: '600', color: CSS.muted }).setOrigin(0, 0.5);

    this.goalGfx = this.add.graphics();
    this.goalIcon = img(this, 0, 32, 'ic-flag').setScale(0.55);
    this.goalText = txt(this, 640, 32, '', { size: 18, weight: '700', color: CSS.white }).setOrigin(0, 0.5);
    this.drawHudPanel(false);
  }

  private drawHudPanel(withMetrics: boolean): void {
    const g = this.hudGfx;
    g.clear();
    const h = withMetrics ? 108 : 62;
    panel(g, 12, 11, 262, h, 18, PAL.uiPanel, PAL.ink, 0.95, true);
    if (withMetrics) {
      g.lineStyle(2, PAL.uiPanelEdge, 1);
      g.lineBetween(24, 72, 262, 72);
    }
  }

  private buildDetail(): void {
    // kept for API parity (machine details now live on each card header)
    this.detailText = txt(this, 0, 0, '', { size: 12 }).setVisible(false);
  }

  private buildCompare(): void {
    this.compareBox = this.add.container(640, 505).setDepth(40);
    this.compareGfx = this.add.graphics();
    this.compareText = txt(this, 0, 0, '', {
      size: 15,
      weight: '600',
      color: CSS.ink,
      align: 'center',
      wrap: 360,
    }).setOrigin(0.5);
    this.compareBox.add([this.compareGfx, this.compareText]);
  }

  private buildChoicePanel(): void {
    this.choiceText = txt(this, 640, 68, '', {
      size: 14,
      weight: '600',
      color: CSS.white,
      align: 'center',
      wrap: 700,
      stroke: CSS.ink,
      strokeThickness: 4,
    })
      .setOrigin(0.5, 0)
      .setDepth(45);
  }

  private buildBanner(): void {
    this.bannerText = txt(this, 640, 262, '', {
      size: 46,
      weight: '700',
      color: CSS.gold,
      stroke: CSS.ink,
      strokeThickness: 10,
      align: 'center',
      shadow: true,
    })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);
  }

  private buildUnlockButton(): void {
    const w = 262;
    const h = 72;
    this.unlockGfx = this.add.graphics();
    this.unlockIcon = img(this, 38, h / 2, 'icon-toys').setScale(0.5);
    this.unlockLabel = txt(this, 74, 24, '', { size: 16, weight: '700', color: CSS.white }).setOrigin(0, 0.5);
    this.unlockSub = txt(this, 74, 50, '', { size: 12, weight: '600', color: CSS.muted }).setOrigin(0, 0.5);
    const zone = this.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    this.unlockContainer = this.add.container(1006, 78, [
      this.unlockGfx,
      this.unlockIcon,
      this.unlockLabel,
      this.unlockSub,
      zone,
    ]);
    zone.on('pointerdown', () => {
      const reg = this.getRegistry();
      const ok = this.getGameScene()?.tryUnlockNext();
      if (!ok && !this.unlockEnabled) reg?.audio.play('deny');
      this.tweens.add({ targets: this.unlockContainer, scale: 0.95, duration: 60, yoyo: true });
      this.refreshAll();
    });
  }

  private buildUpgradePanel(): void {
    for (let m = 0; m < MACHINE_COUNT; m++) {
      const cx = MACHINE_X[m]!;
      const g = this.add.graphics();
      panel(g, cx - CARD_W / 2, CARD_Y, CARD_W, CARD_H, 22, PAL.uiPanel, PAL.ink, 0.96, true);
      g.fillStyle(PAL.uiPanelLight, 1);
      g.fillRoundedRect(cx - CARD_W / 2 + 3, CARD_Y + 3, CARD_W - 6, 30, { tl: 19, tr: 19, bl: 0, br: 0 });
      this.cardGfx.push(g);
      const title = txt(this, cx - CARD_W / 2 + 16, CARD_Y + 18, MACHINE_LABELS[m] ?? '', {
        size: 17,
        weight: '700',
        color: CSS.white,
      }).setOrigin(0, 0.5);
      this.cardTitles.push(title);
      const stat = txt(this, cx + CARD_W / 2 - 14, CARD_Y + 18, '', {
        size: 13,
        weight: '600',
        color: CSS.muted,
      }).setOrigin(1, 0.5);
      this.cardStats.push(stat);

      const types = m === 2 ? (['speed', 'value'] as UpgradeType[]) : UPGRADE_TYPES;
      const total = types.length * BTN_W + (types.length - 1) * 10;
      const x0 = cx - total / 2;
      for (const type of UPGRADE_TYPES) {
        const idx = types.indexOf(type);
        const bx = idx >= 0 ? x0 + idx * (BTN_W + 10) : cx;
        const btn = new UpgradeButton(
          this,
          bx,
          CARD_Y + 44,
          BTN_W,
          BTN_H,
          UPGRADE_ICONS[type],
          () => this.onUpgradeClick(m as MachineId, type),
          () => this.onUpgradeDenied(m as MachineId, type),
        );
        if (idx < 0) btn.setVisible(false);
        this.buttons.push(btn);
      }
    }
  }

  private buildMute(): void {
    const mk = (x: number, icon: string, onTap: () => void) => {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.22).fillCircle(x, 44, 26);
      g.fillStyle(PAL.uiPanel, 0.95).fillCircle(x, 40, 26);
      g.lineStyle(3, PAL.ink, 1).strokeCircle(x, 40, 26);
      const i = img(this, x, 40, icon).setScale(0.6);
      const z = this.add.zone(x, 40, 56, 56).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.tweens.add({ targets: i, scale: 0.5, duration: 60, yoyo: true });
        onTap();
      });
      return i;
    };
    this.muteIcon = mk(1238, 'ic-sound', () => {
      const game = this.getGameScene();
      const reg = this.getRegistry();
      if (!game || !reg) return;
      const next = !reg.muted;
      game.setMuted(next);
      reg.audio.unlock();
      this.muteIcon.setTexture(next ? 'ic-mute' : 'ic-sound');
    });
    this.musicIcon = mk(1176, 'ic-music', () => {
      const reg = this.getRegistry();
      if (!reg) return;
      reg.audio.unlock();
      reg.audio.setMusic(!reg.audio.musicOn);
      this.syncMusicIcon();
    });
    this.musicSlash = this.add.graphics();
    this.syncMusicIcon();
  }

  private syncMusicIcon(): void {
    const reg = this.getRegistry();
    const on = reg?.audio.musicOn ?? true;
    this.musicIcon.setAlpha(on ? 1 : 0.5);
    this.musicSlash.clear();
    if (!on) {
      this.musicSlash.lineStyle(4, PAL.red, 1);
      this.musicSlash.lineBetween(1162, 26, 1190, 54);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Event handlers
  // ══════════════════════════════════════════════════════════════

  private onSessionGoalEvent(_payload: { phase?: string }): void {
    this.refreshGoal();
  }

  private onChoiceReady(payload: {
    options: Array<{
      id: string;
      title: string;
      tagline?: string;
      cost: number;
      beforeLabel: string;
      afterLabel: string;
      benefit: string;
      consequence: string;
      kpi: string;
      type: string;
      machineId: number;
    }>;
  }): void {
    const parts = payload.options
      .slice(0, 2)
      .map((o) => `${o.type === 'value' ? 'WORTH MORE' : 'FASTER'}: ${o.benefit}`);
    this.choiceText.setText(friendly(parts.join('     ·     '))).setVisible(true);
    this.refreshUpgrades();
  }

  private onPayoffBanner(payload: {
    message: string;
    before: number;
    after: number;
    reduced?: boolean;
  }): void {
    if (payload.message) {
      this.floating.spawn(640, 236, friendly(payload.message), CSS.gold, 20);
    }
  }

  private onUpgradeEvent(payload?: { machineId?: MachineId }): void {
    if (payload && typeof payload.machineId === 'number') {
      this.getGameScene()?.celebrateUpgrade(payload.machineId);
    }
    this.refreshAll();
  }

  private showFocusedCompare(machineId: MachineId, animate = true): void {
    const reg = this.getRegistry();
    if (!reg) return;
    if (reg.factory.upgrades.totalPurchased >= 3) return;
    this.compareFor = machineId;
    const cost = reg.factory.upgrades.costFor(machineId, 'speed');
    const can = reg.factory.economy.canAfford(cost);
    const name = MACHINE_LABELS[machineId];
    const msg = can
      ? `Make the ${name} FASTER — tap the lightning!`
      : `Save up $${cost} to make the ${name} faster`;
    this.compareText.setText(msg);
    const w = Math.min(380, this.compareText.width + 36);
    const h = this.compareText.height + 18;
    this.compareGfx.clear();
    panel(this.compareGfx, -w / 2, -h / 2, w, h, 14, 0xffffff, PAL.ink, 1, true);
    this.compareGfx.fillStyle(0xffffff, 1);
    this.compareGfx.fillTriangle(-10, h / 2 - 1, 10, h / 2 - 1, 0, h / 2 + 10);
    this.compareBox.setPosition(MACHINE_X[machineId]!, CARD_Y - 34).setVisible(true);
    if (animate) {
      this.compareBox.setScale(0.8);
      this.tweens.add({ targets: this.compareBox, scale: 1, duration: 200, ease: 'Back.easeOut' });
    }
  }

  private compareFor: MachineId | null = null;

  private refreshCompare(): void {
    const reg = this.getRegistry();
    if (!reg || !this.compareBox.visible || this.compareFor === null) return;
    if (reg.factory.upgrades.totalPurchased >= 3) {
      this.compareBox.setVisible(false);
      return;
    }
    const cost = reg.factory.upgrades.costFor(this.compareFor, 'speed');
    const can = reg.factory.economy.canAfford(cost);
    const name = MACHINE_LABELS[this.compareFor];
    const msg = can
      ? `Make the ${name} FASTER — tap the lightning!`
      : `Save up $${cost} to make the ${name} faster`;
    if (this.compareText.text !== msg) this.showFocusedCompare(this.compareFor, false);
  }

  private onBottleneckShown(payload: { machineId: MachineId }): void {
    this.showFocusedCompare(payload.machineId);
  }

  private onSelectMachine(payload: { id: MachineId }): void {
    const t = this.cardTitles[payload.id];
    if (t) this.tweens.add({ targets: t, scale: 1.12, duration: 90, yoyo: true });
    this.refreshDetail();
  }

  private onUpgradeClick(machineId: MachineId, type: UpgradeType): void {
    const game = this.getGameScene();
    const reg = this.getRegistry();
    if (!game || !reg) return;

    // Explicit branch select when clicking the strategic upgrade
    if (reg.factory.sessionGoal.phase === 'awaiting_choice') {
      if (type === 'speed') reg.factory.selectOptimizationBranch('throughput');
      else if (type === 'value') reg.factory.selectOptimizationBranch('margin');
    }

    if (game.buyUpgrade(machineId, type)) {
      this.compareBox.setVisible(false);
      if (reg.factory.sessionGoal.phase === 'branch') {
        this.choiceText.setVisible(false);
      }
      this.refreshAll();
    } else {
      reg.telemetry.emit('confusion_signal', {
        reason: 'upgrade_failed',
        machineId,
        type,
      });
    }
  }

  private onUpgradeDenied(machineId: MachineId, type: UpgradeType): void {
    const reg = this.getRegistry();
    if (!reg) return;
    reg.audio.play('deny');
    const cost = reg.factory.upgrades.costFor(machineId, type);
    const need = Math.max(0, Math.ceil(cost - reg.factory.economy.coins));
    this.floating.spawn(MACHINE_X[machineId]!, CARD_Y + 10, `Need $${formatNumber(need)} more`, CSS.red, 16);
    reg.telemetry.emit('confusion_signal', { reason: 'upgrade_failed', machineId, type });
  }

  private onUnlockFeedback(_payload: { name: string }): void {
    this.refreshAll();
  }

  private onImpact(payload: {
    before: number;
    after: number;
    deltaPct: number;
    message?: string;
  }): void {
    if (payload.deltaPct >= 1) {
      this.floating.spawn(640, 272, `+${payload.deltaPct.toFixed(0)}% output!`, CSS.green, 24);
    }
  }

  private pendingSell = 0;
  private lastSellText = 0;

  private onSell(payload: { amount: number; xHint: number; golden?: boolean }): void {
    if (payload.golden) {
      this.floating.spawn(TRUCK_X - 30, MACHINE_Y - 50, `★ +$${formatNumber(payload.amount)}`, CSS.gold, 32);
      return;
    }
    this.pendingSell += payload.amount;
    const now = this.time.now;
    if (now - this.lastSellText < 320) return;
    this.lastSellText = now;
    const amt = this.pendingSell;
    this.pendingSell = 0;
    this.floating.spawn(
      TRUCK_X - 30 + (Math.random() - 0.5) * 24,
      MACHINE_Y - 30,
      `+$${formatNumber(amt)}`,
      '#fff3a8',
      amt >= 100 ? 24 : 20,
    );
  }

  private onCoinFly(payload: { x: number; y: number; golden?: boolean }): void {
    const now = this.time.now;
    const n = payload.golden ? 6 : 1;
    if (!payload.golden && now - this.lastCoinFly < 110) return;
    this.lastCoinFly = now;
    for (let i = 0; i < n; i++) this.flyCoin(payload.x + (Math.random() - 0.5) * 30, payload.y, i * 60);
  }

  private flyCoin(x: number, y: number, delay: number): void {
    const c = img(this, x, y, 'coin').setScale(0.6).setDepth(150);
    const cx = x - 120 - Math.random() * 120;
    const cy = y - 200 - Math.random() * 60;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay,
      duration: 620,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const u = 1 - t;
        c.x = u * u * x + 2 * u * t * cx + t * t * COIN_HUD.x;
        c.y = u * u * y + 2 * u * t * cy + t * t * COIN_HUD.y;
        c.setScale(0.6 - t * 0.15);
      },
      onComplete: () => {
        c.destroy();
        this.tweens.killTweensOf(this.coinIcon);
        this.coinIcon.setScale(0.95);
        this.tweens.add({ targets: this.coinIcon, scale: 1.2, duration: 70, yoyo: true });
      },
    });
  }

  private onBigBanner(payload: { title: string }): void {
    const t = this.bannerText;
    this.tweens.killTweensOf(t);
    t.setText(friendly(payload.title)).setVisible(true).setAlpha(1).setScale(0.2).setAngle(-6);
    this.tweens.add({ targets: t, scale: 1, angle: 0, duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: 232, delay: 1700, duration: 450, onComplete: () => t.setVisible(false).setY(262) });
  }

  // ══════════════════════════════════════════════════════════════
  // Offline earnings modal
  // ══════════════════════════════════════════════════════════════

  private maybeShowOffline(): void {
    const reward = this.getGameScene()?.takeOfflineReward();
    if (!reward) return;
    const mins = Math.floor(reward.awaySec / 60);
    const away = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    const c = this.add.container(0, 0).setDepth(300);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x0b1020, 0.55).setInteractive();
    const g = this.add.graphics();
    panel(g, 640 - 230, 220, 460, 260, 26, PAL.uiPanel, PAL.ink, 1, true);
    const mascot = img(this, 640, 222, 'mascot').setScale(0.9);
    const title = txt(this, 640, 290, 'Welcome back!', { size: 30, weight: '700', color: CSS.gold, stroke: CSS.ink, strokeThickness: 6 }).setOrigin(0.5);
    const body = txt(this, 640, 336, `Your factory kept working for ${away}`, { size: 17, weight: '600', color: CSS.white }).setOrigin(0.5);
    const coin = img(this, 590, 380, 'coin').setScale(1.1);
    const amt = txt(this, 612, 380, `+${formatNumber(reward.amount)}`, { size: 32, weight: '700', color: CSS.gold, stroke: CSS.ink, strokeThickness: 6 }).setOrigin(0, 0.5);
    const bg = this.add.graphics();
    panel(bg, 640 - 100, 418, 200, 48, 24, PAL.btnGreen, PAL.ink, 1, true);
    const btnTxt = txt(this, 640, 442, 'COLLECT', { size: 20, weight: '700', color: CSS.ink }).setOrigin(0.5);
    const zone = this.add.zone(640, 442, 200, 52).setInteractive({ useHandCursor: true });
    c.add([dim, g, mascot, title, body, coin, amt, bg, btnTxt, zone]);
    c.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.modal = c;
    const collect = () => {
      if (!this.modal) return;
      this.modal = null;
      this.getGameScene()?.collectOffline(reward.amount);
      for (let i = 0; i < 12; i++) this.flyCoin(600 + Math.random() * 80, 380, i * 45);
      this.tweens.add({ targets: c, alpha: 0, duration: 220, onComplete: () => c.destroy() });
    };
    zone.on('pointerdown', collect);
    dim.on('pointerdown', collect);
  }

  // ══════════════════════════════════════════════════════════════
  // Refresh (logic preserved from the systems-driven UI)
  // ══════════════════════════════════════════════════════════════

  private refreshAll(): void {
    this.refreshCompare();
    this.refreshHud();
    this.refreshLayers();
    this.refreshUpgrades();
    this.refreshUnlock();
    this.refreshDetail();
    this.refreshGoal();
  }

  private refreshLayers(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const { factory, telemetry } = reg;

    const showUpgrades = factory.revealUpgrades();
    const showMetrics = factory.revealMetrics();
    const showUnlock = factory.revealUnlockPanel();

    if (showUpgrades && !this.upgradeViewLogged) {
      this.upgradeViewLogged = true;
      telemetry.once('first_upgrade_view', {
        suggested: factory.suggestedUpgradeMachine(),
      });
      this.showFocusedCompare(factory.suggestedUpgradeMachine());
    }

    const wasMetrics = this.outputText.visible;
    this.outputText.setVisible(showMetrics);
    this.wipText.setVisible(showMetrics && factory.revealWip());
    this.profitText.setVisible(showMetrics);
    if (wasMetrics !== showMetrics) this.drawHudPanel(showMetrics);
    if (showUnlock && !this.unlockContainer.visible) {
      this.unlockContainer.setVisible(true).setScale(0.6);
      this.tweens.add({ targets: this.unlockContainer, scale: 1, duration: 300, ease: 'Back.easeOut' });
    } else if (!showUnlock) {
      this.unlockContainer.setVisible(false);
    }
  }

  private refreshHud(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const { factory } = reg;
    const tp = factory.getThroughputPerMin();
    this.outputText.setText(`${tp.toFixed(0)} items/min`);
    const wip = factory.getWip();
    const wipHigh = wip >= 8;
    this.wipText.setText(wipHigh ? `Pile-up: ${wip} — too many waiting!` : `Pile-up: ${wip}`);
    this.wipText.setColor(wipHigh ? CSS.red : CSS.muted);

    const profitPerMin = factory.lineIncomePerMin();
    this.profitText.setText(`+$${formatNumber(profitPerMin, 0)}/min`);
    this.muteIcon.setTexture(reg.muted ? 'ic-mute' : 'ic-sound');
    reg.telemetry.canonicalLineIncomePerMin = profitPerMin;
    reg.telemetry.once('economic_metric_view', { lineIncomePerMin: profitPerMin });
  }

  private tickCoins(dt: number): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const target = Math.floor(reg.factory.economy.coins);
    const diff = target - this.shownCoins;
    if (diff !== 0) {
      const step = diff * Math.min(1, (dt / 1000) * 9);
      this.shownCoins += Math.abs(step) < 1 ? Math.sign(diff) : step;
      if (Math.abs(target - this.shownCoins) < 1) this.shownCoins = target;
    }
    const label = formatNumber(Math.floor(this.shownCoins));
    if (this.coinsText.text !== label) this.coinsText.setText(label);
  }

  private refreshGoal(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const goal = reg.factory.sessionGoal;
    const mc = reg.factory.mc;
    const phase = goal.phase;
    let visible = false;
    let color: number = PAL.gold;
    if (
      goal.isActive ||
      mc.isActive ||
      phase === 'awaiting_choice' ||
      phase === 'awaiting_purchase' ||
      phase === 'post_chain' ||
      phase === 'toy_mastery' ||
      phase === 'smartphones_horizon' ||
      goal.status === 'success' ||
      goal.status === 'failed' ||
      goal.status === 'chain_complete'
    ) {
      const plan = goal.planLabel();
      const main = reg.factory.sessionLabel();
      const text = friendly(plan && !mc.isActive ? `${plan} · ${main}` : main) || 'Keep improving your factory!';
      visible = true;
      if (this.goalText.text !== text) {
        this.goalText.setText(text);
        this.tweens.add({ targets: this.goalText, scale: 1.06, duration: 90, yoyo: true });
      }
      if (
        mc.phase === 'smartphone_ready' ||
        mc.phase === 'baseline_sampling' ||
        mc.phase === 'first_smartphone' ||
        mc.phase === 'smartphone_launch' ||
        mc.phase === 'return_preview' ||
        mc.phase === 'shift_1_complete' ||
        mc.phase === 'return_challenge' ||
        mc.phase === 'return_complete' ||
        phase === 'post_chain' ||
        phase === 'smartphones_horizon' ||
        goal.status === 'chain_complete'
      ) {
        color = PAL.green;
      } else if (mc.phase === 'smartphone_funding' || mc.phase === 'funding_choice') {
        color = 0x4fc3f7;
      } else if (goal.status === 'failed') color = PAL.red;
    }
    this.goalText.setVisible(visible);
    this.goalIcon.setVisible(visible);
    this.goalGfx.setVisible(visible);
    if (visible) {
      const w = this.goalText.width + 70;
      const x = 640 - w / 2;
      this.goalIcon.setX(x + 24);
      this.goalText.setX(x + 44);
      if (this.goalColor !== color || this.goalGfx.getData('w') !== w) {
        this.goalColor = color;
        this.goalGfx.setData('w', w);
        this.goalGfx.clear();
        panel(this.goalGfx, x, 12, w, 42, 21, PAL.uiPanel, PAL.ink, 0.96, true);
        this.goalGfx.lineStyle(3, color, 1);
        this.goalGfx.strokeRoundedRect(x + 4, 16, w - 8, 34, 17);
      }
    }
  }

  private refreshDetail(): void {
    const game = this.getGameScene();
    const reg = this.getRegistry();
    if (!game || !reg) return;
    const show = reg.factory.revealMetrics();
    const showUtil = reg.factory.revealUtilization();
    for (let m = 0; m < MACHINE_COUNT; m++) {
      const st = this.cardStats[m]!;
      if (!show) {
        st.setText('');
        continue;
      }
      const machine = reg.factory.machines[m]!;
      const rate = machine.effectiveRatePerMin;
      let s = `${rate.toFixed(0)}/min`;
      if (showUtil && reg.selectedMachine === m) {
        const d = game.getSelectedMachineDetail();
        if (d) s = `${s} · busy ${d.util.toFixed(0)}%`;
      }
      if (st.text !== s) st.setText(s);
    }
  }

  private refreshUnlock(): void {
    const reg = this.getRegistry();
    if (!reg || !reg.factory.revealUnlockPanel()) return;
    const { factory } = reg;
    const mc = factory.mc;
    let label = '';
    let enabled = false;
    let productIcon: ProductId | null = factory.progression.nextUnlock;

    if (
      mc.phase === 'funding_choice' ||
      mc.phase === 'smartphone_funding' ||
      mc.phase === 'smartphone_ready' ||
      mc.phase === 'first_smartphone' ||
      mc.phase === 'baseline_sampling' ||
      mc.phase === 'smartphone_launch' ||
      mc.phase === 'return_preview' ||
      mc.phase === 'shift_1_complete' ||
      mc.phase === 'return_challenge' ||
      mc.phase === 'return_complete'
    ) {
      label = mc.unlockButtonLabel();
      enabled = mc.phase === 'smartphone_ready';
      productIcon = 'smartphones';
    } else {
      const next = factory.progression.nextUnlock;
      if (!next) {
        label = 'All products unlocked!';
      } else if (next === 'smartphones' && !mc.state.smartphonesBuilt) {
        label = 'PHONE FUND';
      } else {
        const def = PRODUCTS[next];
        const check = factory.progression.canUnlock(next, factory.economy);
        const earned = Math.floor(factory.economy.totalEarned);
        const freeToys = next === 'toys' && def.unlockCost <= 0;
        if (freeToys) {
          factory.sessionGoal.syncToysProgress(factory);
          const shown = Math.min(
            factory.sessionGoal.snapshot()?.toysEarnedDisplay ?? earned,
            def.unlockAtEarned,
          );
          label = check.ok
            ? 'OPEN TOYS'
            : `TOYS — $${formatNumber(shown)} / $${formatNumber(def.unlockAtEarned)}`;
          enabled = check.ok;
        } else {
          label = check.ok
            ? `→ ${def.name}  $${formatNumber(def.unlockCost)}`
            : check.reason === 'progress'
              ? `${def.name}: earn $${formatNumber(def.unlockAtEarned)}`
              : `${def.name}: $${formatNumber(def.unlockCost)}`;
          enabled = check.ok;
        }
      }
    }
    this.drawUnlockCard(friendly(label), enabled, productIcon);
  }

  private drawUnlockCard(label: string, enabled: boolean, pid: ProductId | null): void {
    // Split "NAME — $a / $b" into title + progress
    let title = label;
    let progress: number | null = null;
    let sub = '';
    const m = label.match(/^(.*?)\s*[—:-]\s*\$([\d.]+K?M?)\s*\/\s*\$([\d.]+K?M?)/);
    if (m) {
      title = `NEXT: ${m[1]!.trim()}`;
      const a = parseShort(m[2]!);
      const b = parseShort(m[3]!);
      progress = b > 0 ? Math.min(1, a / b) : null;
      sub = `$${m[2]} / $${m[3]} earned`;
    } else if (enabled) {
      sub = 'Tap to build!';
    } else if (/FUND|SAVING|FUNDING/i.test(label)) {
      sub = 'Saving up automatically';
    }
    const key = `${title}|${sub}|${enabled}|${progress?.toFixed(3)}|${pid}`;
    if (this.unlockGfx.getData('key') === key) return;
    const becameReady = enabled && !this.unlockEnabled;
    this.unlockEnabled = enabled;
    this.unlockGfx.setData('key', key);
    const g = this.unlockGfx;
    g.clear();
    panel(g, 0, 0, 262, 72, 18, enabled ? PAL.btnGreen : PAL.uiPanel, PAL.ink, 0.97, true);
    g.fillStyle(0xffffff, enabled ? 0.9 : 0.12);
    g.fillCircle(38, 36, 26);
    if (progress !== null) {
      g.fillStyle(PAL.ink, 0.8);
      g.fillRoundedRect(74, 56, 170, 10, 5);
      g.fillStyle(PAL.gold, 1);
      g.fillRoundedRect(75, 57, Math.max(8, 168 * progress), 8, 4);
    }
    if (pid) this.unlockIcon.setTexture(`icon-${pid}`).setVisible(true);
    else this.unlockIcon.setVisible(false);
    this.unlockLabel.setText(title).setColor(enabled ? CSS.ink : CSS.white);
    this.unlockSub.setText(sub).setColor(enabled ? CSS.ink : CSS.muted).setY(progress !== null ? 42 : 50);
    this.unlockLabel.setFontSize(this.unlockLabel.width > 176 ? 13 : 16);
    if (becameReady) {
      this.getRegistry()?.audio.play('pop');
      this.tweens.add({ targets: this.unlockContainer, scale: 1.12, duration: 140, yoyo: true, repeat: 1 });
    }
  }

  private tickUnlockCard(dt: number): void {
    if (!this.unlockEnabled || !this.unlockContainer.visible) {
      this.unlockIcon.setAngle(0);
      return;
    }
    this.unlockPulse += dt;
    this.unlockIcon.setAngle(Math.sin(this.unlockPulse / 120) * 8);
  }

  private refreshUpgrades(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const { factory } = reg;
    const revealed = factory.revealUpgrades();
    const full = factory.revealFullUpgradeGrid();
    const focus = factory.suggestedUpgradeMachine();
    const relevant = factory.relevantUpgradeKeys();
    const choiceMode =
      factory.pendingChoiceOptions.length > 0 ||
      factory.sessionGoal.phase === 'awaiting_choice' ||
      factory.sessionGoal.phase === 'awaiting_purchase';
    const fundingChoice = factory.mc.phase === 'funding_choice';

    let idx = 0;
    for (let m = 0; m < MACHINE_COUNT; m++) {
      for (const type of UPGRADE_TYPES) {
        const btn = this.buttons[idx++]!;
        const disabledType = type === 'buffer' && m === 2;
        if (disabledType) continue;
        const level = factory.upgrades.getLevel(m as MachineId, type);
        const cost = factory.upgrades.costFor(m as MachineId, type);
        const maxed = level >= MAX_UPGRADE_LEVEL;
        const key = `${m}:${type}`;
        const freeCredit = factory.mc.state.freeUpgradeCredits > 0;
        if (freeCredit) {
          factory.mc.state.freeUpgradeMode = factory.mc.computeFreeUpgradeMode(factory);
        }
        const freeMode = factory.mc.state.freeUpgradeMode;
        const bonusTier =
          freeCredit && freeMode === 'bonus_tier' && !factory.mc.state.bonusUpgradeGranted;

        let showBtn = full || (type === 'speed' && m === focus);
        if (fundingChoice) {
          showBtn = (type === 'speed' || type === 'value') && m === 1;
        } else if (choiceMode) {
          showBtn = relevant.has(key);
        } else if (full && factory.sessionGoal.phase === 'convergence') {
          showBtn = relevant.has(key);
        }

        let mode: UpgradeButtonMode;
        let label = UPGRADE_LABELS[type];
        let lvl = `Lv ${level}`;
        let costLabel = `$${formatNumber(cost)}`;
        let ribbon: string | undefined;
        let highlight = false;

        if (!revealed) {
          mode = 'locked';
        } else if (!showBtn) {
          mode = full ? 'dim' : 'locked';
        } else if (fundingChoice) {
          mode = 'buy';
          label = type === 'speed' ? 'Steady' : 'Rush';
          lvl = type === 'speed' ? 'saves 35%' : 'saves 58%';
          costLabel = 'PICK';
          ribbon = type === 'speed' ? 'MORE CASH' : 'FASTER BUILD';
          highlight = true;
        } else if (bonusTier && maxed) {
          mode = 'free';
          lvl = `Lv ${level} +1`;
          costLabel = 'FREE';
          highlight = true;
        } else if (maxed) {
          mode = 'max';
          lvl = `Lv ${level}`;
          costLabel = 'MAX';
        } else if (freeCredit) {
          mode = 'free';
          costLabel = 'FREE';
          highlight = true;
        } else {
          mode = factory.economy.canAfford(cost) ? 'buy' : 'poor';
          highlight = (!full && m === focus && type === 'speed') || choiceMode;
          if (choiceMode) ribbon = type === 'value' ? 'WORTH MORE' : type === 'speed' ? 'FASTER' : undefined;
        }

        btn.setState({ label, level: lvl, cost: costLabel, mode, highlight, ribbon });
      }
    }

    if (
      factory.sessionGoal.phase === 'branch' ||
      factory.sessionGoal.phase === 'convergence' ||
      factory.sessionGoal.phase === 'post_chain' ||
      factory.sessionGoal.phase === 'toy_mastery' ||
      factory.sessionGoal.phase === 'smartphones_horizon'
    ) {
      if (!choiceMode) this.choiceText.setVisible(false);
    }

    // One short, human sub-line under the goal (never a KPI dump)
    if (!choiceMode) {
      const sub = this.subtitleFor(fundingChoice);
      if (sub) this.choiceText.setText(sub).setVisible(true);
      else this.choiceText.setVisible(false);
    }
  }

  private subtitleFor(fundingChoice: boolean): string {
    const reg = this.getRegistry();
    if (!reg) return '';
    const f = reg.factory;
    const phase = f.mc.phase;
    const lines = f.sessionDetailLines();
    if (fundingChoice) return 'STEADY keeps more cash · RUSH builds sooner — pick one on the Assembler card';
    if (phase === 'smartphone_funding') {
      const eta = lines[3] ?? '';
      return eta ? `Phone line ready in ${eta.replace(/[~()]|approx/g, '').trim()}` : '';
    }
    if (phase === 'smartphone_ready') return 'Fund complete — tap BUILD SMARTPHONE LINE!';
    if (phase === 'baseline_sampling') return 'Warming up the phone line…';
    if (phase === 'smartphone_launch') {
      const tip = lines.find((l) => l.startsWith('Suggested:'));
      if (tip) return friendly(tip.replace('Suggested:', 'Tip:').replace(/ SPEED/, ' FASTER').replace(/ VALUE/, ' WORTH MORE').replace(/ BUFFER/, ' MORE ROOM'));
      return '';
    }
    if (phase === 'return_preview' || phase === 'shift_1_complete') return friendly(lines[1] ?? '');
    return '';
  }
}

function parseShort(s: string): number {
  const n = parseFloat(s);
  if (/K$/.test(s)) return n * 1000;
  if (/M$/.test(s)) return n * 1_000_000;
  return n;
}

function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '∞';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(decimals);
}
