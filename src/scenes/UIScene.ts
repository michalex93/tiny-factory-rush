import Phaser from 'phaser';
import {
  LAYOUT,
  MACHINE_COUNT,
  MACHINE_NAMES,
  MAX_UPGRADE_LEVEL,
  PRODUCTS,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import type { GameRegistry } from './GameScene';
import { GameScene } from './GameScene';
import { FloatingText } from '../ui/FloatingText';
import { UpgradeButton } from '../ui/UpgradeButton';

const UPGRADE_TYPES: UpgradeType[] = ['speed', 'buffer', 'value'];
const UPGRADE_LABELS: Record<UpgradeType, string> = {
  speed: 'Speed',
  buffer: 'Buffer',
  value: 'Value',
};

export class UIScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private outputText!: Phaser.GameObjects.Text;
  private wipText!: Phaser.GameObjects.Text;
  private profitText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private compareText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private unlockBg!: Phaser.GameObjects.Image;
  private unlockLabel!: Phaser.GameObjects.Text;
  private unlockContainer!: Phaser.GameObjects.Container;
  private upgradePanelBg!: Phaser.GameObjects.Rectangle;
  private upgradePanelTitle!: Phaser.GameObjects.Text;
  private choiceText!: Phaser.GameObjects.Text;
  private floating!: FloatingText;
  private buttons: UpgradeButton[] = [];
  private refreshAcc = 0;
  private upgradeViewLogged = false;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.floating = new FloatingText(this);
    this.buildHud();
    this.buildDetail();
    this.buildCompare();
    this.buildChoicePanel();
    this.buildUnlockButton();
    this.buildUpgradePanel();
    this.buildMute();

    // Start hidden — progressive disclosure
    this.setUpgradePanelVisible(false);
    this.unlockContainer.setVisible(false);
    this.detailText.setVisible(false);
    this.outputText.setVisible(false);
    this.wipText.setVisible(false);
    this.profitText.setVisible(false);
    this.goalText.setVisible(false);
    this.compareText.setVisible(false);
    this.choiceText.setVisible(false);

    this.game.events.on('sell', this.onSell, this);
    this.game.events.on('upgrade', () => this.refreshAll(), this);
    this.game.events.on('unlock', this.onUnlockFeedback, this);
    this.game.events.on('upgrade-impact', this.onImpact, this);
    this.game.events.on('select-machine', () => this.refreshDetail(), this);
    this.game.events.on('bottleneck-shown', this.onBottleneckShown, this);
    this.game.events.on('session-goal', this.onSessionGoalEvent, this);
    this.game.events.on('optimization-choice', this.onChoiceReady, this);
    this.game.events.on('payoff-banner', this.onPayoffBanner, this);

    this.events.on('shutdown', () => {
      this.game.events.off('sell', this.onSell, this);
      this.game.events.off('unlock', this.onUnlockFeedback, this);
      this.game.events.off('upgrade-impact', this.onImpact, this);
      this.game.events.off('bottleneck-shown', this.onBottleneckShown, this);
    });
  }

  update(_t: number, delta: number): void {
    this.refreshAcc += delta;
    if (this.refreshAcc >= 200) {
      this.refreshAcc = 0;
      this.refreshAll();
    }
  }

  private getRegistry(): GameRegistry | undefined {
    return this.registry.get('game') as GameRegistry | undefined;
  }

  private getGameScene(): GameScene | undefined {
    return this.scene.get('GameScene') as GameScene | undefined;
  }

  private buildHud(): void {
    this.add
      .rectangle(16, 16, 280, 56, 0x15202b, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x2a3f55);

    this.coinsText = this.add
      .text(32, 28, '$0', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0, 0);

    this.outputText = this.add
      .text(32, 80, 'OUTPUT  —/min', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4c8',
      })
      .setOrigin(0, 0);

    this.wipText = this.add
      .text(32, 102, 'WIP  —', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4c8',
      })
      .setOrigin(0, 0);

    this.profitText = this.add
      .text(170, 80, 'LINE INCOME  $—/min', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4c8',
      })
      .setOrigin(0, 0);

    this.goalText = this.add
      .text(LAYOUT.width / 2, 96, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#52b788',
        backgroundColor: '#15202bcc',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0);
  }

  private buildDetail(): void {
    this.detailText = this.add
      .text(16, 200, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        color: '#7a8fa6',
        backgroundColor: '#15202b99',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 260 },
      })
      .setOrigin(0, 0);
  }

  private buildCompare(): void {
    this.compareText = this.add
      .text(LAYOUT.width / 2, LAYOUT.height - 250, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        color: '#cde0f0',
        backgroundColor: '#15202bee',
        padding: { x: 12, y: 8 },
        align: 'center',
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5, 1)
      .setDepth(40);
  }

  private buildChoicePanel(): void {
    this.choiceText = this.add
      .text(LAYOUT.width / 2, 140, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffd166',
        backgroundColor: '#15202bee',
        padding: { x: 14, y: 10 },
        align: 'left',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5, 0)
      .setDepth(45)
      .setVisible(false);
  }

  private onSessionGoalEvent(payload: { phase?: string }): void {
    this.refreshGoal();
    if (payload.phase === 'celebrate') {
      this.floating.spawn(
        LAYOUT.width / 2,
        180,
        'GOAL 1 COMPLETE',
        '#52b788',
      );
    }
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
    const lines = ['STRATEGIC CHOICE — pick a path, then BUY it'];
    for (const o of payload.options.slice(0, 2)) {
      lines.push(
        `${o.title}: ${o.tagline ?? ''}`,
        `  $${o.cost} · ${o.beforeLabel} → ${o.afterLabel}`,
        `  + ${o.benefit}`,
        `  ! ${o.consequence}`,
      );
    }
    this.choiceText.setText(lines.join('\n')).setVisible(true);
    // Clickable: selecting text zones via upgrade buttons (highlighted)
    const reg = this.getRegistry();
    if (reg) {
      // Selecting branch when player taps the matching upgrade is enough;
      // also allow explicit select via first paint
    }
    this.refreshUpgrades();
  }

  private onPayoffBanner(payload: {
    message: string;
    before: number;
    after: number;
    reduced?: boolean;
  }): void {
    if (payload.message) {
      this.floating.spawn(LAYOUT.width / 2, 200, payload.message, '#ffd166');
    }
  }

  private buildUnlockButton(): void {
    const w = 220;
    const h = 48;
    this.unlockBg = this.add.image(0, 0, 'btn-disabled').setDisplaySize(w, h).setOrigin(0, 0);
    this.unlockBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.unlockBg.input) this.unlockBg.input.cursor = 'pointer';

    this.unlockLabel = this.add
      .text(w / 2, h / 2, 'Desbloquear…', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e8eef5',
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    this.unlockContainer = this.add.container(16, LAYOUT.height - 270, [
      this.unlockBg,
      this.unlockLabel,
    ]);
    this.unlockBg.on('pointerdown', () => {
      this.getGameScene()?.tryUnlockNext();
      this.refreshAll();
    });
  }

  private buildUpgradePanel(): void {
    const panelW = 360;
    const panelH = 210;
    const x = LAYOUT.width - panelW - 16;
    const y = LAYOUT.height - panelH - 16;

    this.upgradePanelBg = this.add
      .rectangle(x, y, panelW, panelH, 0x15202b, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x2a3f55);

    this.upgradePanelTitle = this.add
      .text(x + 12, y + 10, 'UPGRADE', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e8eef5',
      })
      .setOrigin(0, 0);

    const btnW = 108;
    const btnH = 48;
    for (let m = 0; m < MACHINE_COUNT; m++) {
      for (let t = 0; t < UPGRADE_TYPES.length; t++) {
        const type = UPGRADE_TYPES[t]!;
        const btn = new UpgradeButton(
          this,
          x + 12 + t * (btnW + 6),
          y + 40 + m * (btnH + 6),
          btnW,
          btnH,
          {
            title: `M${m + 1} ${UPGRADE_LABELS[type]}`,
            onClick: () => this.onUpgradeClick(m as MachineId, type),
          },
        );
        this.buttons.push(btn);
      }
    }
  }

  private setUpgradePanelVisible(visible: boolean): void {
    this.upgradePanelBg.setVisible(visible);
    this.upgradePanelTitle.setVisible(visible);
    for (const btn of this.buttons) {
      btn.container.setVisible(visible);
    }
  }

  private buildMute(): void {
    const size = 48;
    const x = LAYOUT.width - 16 - size;
    const y = 16;
    const hit = this.add
      .rectangle(x, y, size, size, 0x15202b, 0.55)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x2a3f55)
      .setInteractive({ useHandCursor: true });

    this.muteBtn = this.add
      .text(x + size / 2, y + size / 2, '🔊', { fontSize: '22px' })
      .setOrigin(0.5);

    hit.on('pointerdown', () => {
      const game = this.getGameScene();
      const reg = this.getRegistry();
      if (!game || !reg) return;
      const next = !reg.muted;
      game.setMuted(next);
      this.muteBtn.setText(next ? '🔇' : '🔊');
    });
  }

  private refreshAll(): void {
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

    this.setUpgradePanelVisible(showUpgrades);
    if (showUpgrades && !this.upgradeViewLogged) {
      this.upgradeViewLogged = true;
      telemetry.once('first_upgrade_view', {
        suggested: factory.suggestedUpgradeMachine(),
      });
      this.showFocusedCompare(factory.suggestedUpgradeMachine());
    }

    this.outputText.setVisible(showMetrics);
    this.wipText.setVisible(showMetrics && factory.revealWip());
    this.profitText.setVisible(showMetrics);
    this.unlockContainer.setVisible(showUnlock);
    this.detailText.setVisible(showMetrics && reg.selectedMachine !== null);
  }

  private showFocusedCompare(machineId: MachineId): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const m = reg.factory.machines[machineId]!;
    const cost = reg.factory.upgrades.costFor(machineId, 'speed');
    const name = MACHINE_NAMES[machineId];
    const can = reg.factory.economy.canAfford(cost);
    this.compareText
      .setText(
        [
          `Decision: Speed up M${machineId + 1} (${name})`,
          `Now: ${m.effectiveRatePerMin.toFixed(1)}/min · Queue builds here`,
          `Cost: $${cost}${can ? '' : ' — keep selling…'}`,
          `Expected: higher OUTPUT, shorter queue`,
        ].join('\n'),
      )
      .setVisible(true);
  }

  private onBottleneckShown(payload: { machineId: MachineId }): void {
    this.showFocusedCompare(payload.machineId);
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
      this.floating.spawn(LAYOUT.width - 180, LAYOUT.height - 230, '↑ UPGRADE', '#52b788');
      this.compareText.setVisible(false);
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

  private onUnlockFeedback(payload: { name: string }): void {
    this.floating.spawn(LAYOUT.width / 2, 220, `¡${payload.name}!`, '#9b5de5');
    this.refreshAll();
  }

  private onImpact(payload: {
    before: number;
    after: number;
    deltaPct: number;
    beforeWip?: number;
    afterWip?: number;
    message?: string;
    kind?: string;
    wipTrend?: string;
  }): void {
    const sign = payload.deltaPct >= 0 ? '+' : '';
    const color = payload.deltaPct >= 8 ? '#52b788' : '#f4a261';
    const wipBit =
      payload.beforeWip !== undefined && payload.afterWip !== undefined
        ? ` · WIP ${payload.beforeWip}→${payload.afterWip}`
        : '';
    const head = payload.message
      ? `${payload.message} · `
      : '';
    this.floating.spawn(
      LAYOUT.width / 2,
      230,
      `${head}OUTPUT ${payload.before.toFixed(1)}→${payload.after.toFixed(1)}/min (${sign}${payload.deltaPct.toFixed(0)}%)${wipBit}`,
      color,
    );
  }

  private onSell(payload: { amount: number; xHint: number; golden?: boolean }): void {
    const x = LAYOUT.width * payload.xHint;
    const color = payload.golden ? '#ffd700' : '#ffd166';
    const prefix = payload.golden ? '★ +$' : '+$';
    this.floating.spawn(x, LAYOUT.factoryY - 40, `${prefix}${payload.amount}`, color);
    this.refreshAll();
  }

  private refreshHud(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const { factory } = reg;
    this.coinsText.setText(`$${formatNumber(Math.floor(factory.economy.coins))}`);

    const tp = factory.getThroughputPerMin();
    this.outputText.setText(`OUTPUT  ${tp.toFixed(1)}/min`);
    const wip = factory.getWip();
    const wipHigh = wip >= 8;
    this.wipText.setText(wipHigh ? `WIP  ${wip}  HIGH` : `WIP  ${wip}`);
    this.wipText.setColor(wipHigh ? '#e76f51' : '#8ab4c8');

    const profitPerMin = factory.lineIncomePerMin();
    this.profitText.setText(`LINE INCOME  $${formatNumber(profitPerMin, 0)}/min`);
    this.muteBtn.setText(reg.muted ? '🔇' : '🔊');
    reg.telemetry.canonicalLineIncomePerMin = profitPerMin;
    reg.telemetry.once('economic_metric_view', { lineIncomePerMin: profitPerMin });
  }

  private refreshGoal(): void {
    const reg = this.getRegistry();
    if (!reg) return;
    const goal = reg.factory.sessionGoal;
    const mc = reg.factory.mc;
    const phase = goal.phase;
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
      const text = plan && !mc.isActive ? `${plan} · ${main}` : main;
      this.goalText.setText(text || 'Keep optimizing').setVisible(true);
      if (
        mc.phase === 'smartphone_ready' ||
        mc.phase === 'baseline_sampling' ||
        mc.phase === 'first_smartphone' ||
        mc.phase === 'smartphone_launch' ||
        mc.phase === 'return_preview' ||
        mc.phase === 'shift_1_complete' ||
        mc.phase === 'return_challenge' ||
        mc.phase === 'return_complete'
      ) {
        this.goalText.setColor('#52b788');
      } else if (
        mc.phase === 'smartphone_funding' ||
        mc.phase === 'funding_choice'
      ) {
        this.goalText.setColor('#4cc9f0');
      } else if (
        phase === 'post_chain' ||
        phase === 'smartphones_horizon' ||
        goal.status === 'chain_complete'
      ) {
        this.goalText.setColor('#52b788');
      } else if (phase === 'toy_mastery') {
        this.goalText.setColor('#ffd166');
      } else if (goal.status === 'failed') this.goalText.setColor('#e76f51');
      else this.goalText.setColor('#ffd166');
    } else {
      this.goalText.setVisible(false);
    }
  }

  private refreshDetail(): void {
    const game = this.getGameScene();
    const reg = this.getRegistry();
    if (!game || !reg || !reg.factory.revealMetrics()) {
      this.detailText.setVisible(false);
      return;
    }
    const d = game.getSelectedMachineDetail();
    if (!d) {
      this.detailText.setVisible(false);
      return;
    }
    this.detailText.setVisible(true);
    const showUtil = reg.factory.revealUtilization();
    const lines = [
      `Machine ${d.id + 1} · ${d.name}`,
      `Speed: ${d.rate.toFixed(1)}/min`,
      showUtil ? `Utilization: ${d.util.toFixed(0)}%` : undefined,
      `Queue: ${d.queue}`,
      d.state === 'BLOCKED'
        ? 'Status: BLOCKED'
        : d.state === 'STARVED'
          ? 'Status: WAITING'
          : undefined,
    ].filter(Boolean);
    this.detailText.setText(lines.join('\n'));
  }

  private refreshUnlock(): void {
    const reg = this.getRegistry();
    if (!reg || !reg.factory.revealUnlockPanel()) return;
    const { factory } = reg;
    const mc = factory.mc;

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
      const label = mc.unlockButtonLabel();
      this.unlockLabel.setText(label);
      // BUILD only when READY — funding selection uses upgrade panel
      const enabled = mc.phase === 'smartphone_ready';
      this.unlockBg.setTexture(enabled ? 'btn' : 'btn-disabled');
      return;
    }

    const next = factory.progression.nextUnlock;
    if (!next) {
      this.unlockLabel.setText('Todo desbloqueado');
      this.unlockBg.setTexture('btn-disabled');
      return;
    }
    if (next === 'smartphones' && !mc.state.smartphonesBuilt) {
      this.unlockLabel.setText('EXPANSION FUND');
      this.unlockBg.setTexture('btn-disabled');
      return;
    }
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
      this.unlockLabel.setText(
        check.ok
          ? 'OPEN TOYS'
          : `TOYS — $${formatNumber(shown)} / $${formatNumber(def.unlockAtEarned)}`,
      );
      this.unlockBg.setTexture(check.ok ? 'btn' : 'btn-disabled');
      return;
    }

    this.unlockLabel.setText(
      check.ok
        ? `→ ${def.name}  $${formatNumber(def.unlockCost)}`
        : check.reason === 'progress'
          ? `${def.name}: gana $${formatNumber(def.unlockAtEarned)}`
          : `${def.name}: $${formatNumber(def.unlockCost)}`,
    );
    this.unlockBg.setTexture(check.ok ? 'btn' : 'btn-disabled');
  }

  private refreshUpgrades(): void {
    const reg = this.getRegistry();
    if (!reg || !reg.factory.revealUpgrades()) return;
    const { factory } = reg;
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
        const level = factory.upgrades.getLevel(m as MachineId, type);
        const cost = factory.upgrades.costFor(m as MachineId, type);
        const maxed = level >= MAX_UPGRADE_LEVEL || disabledType;
        const key = `${m}:${type}`;
        const freeCredit = factory.mc.state.freeUpgradeCredits > 0;
        if (freeCredit) {
          factory.mc.state.freeUpgradeMode =
            factory.mc.computeFreeUpgradeMode(factory);
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
        } else if (full && factory.sessionGoal.phase === 'branch') {
          showBtn = relevant.has(key) || full;
        }

        let subtitle: string;
        if (fundingChoice && type === 'speed') {
          subtitle = '35% to fund · more cash left';
        } else if (fundingChoice && type === 'value') {
          subtitle = '58% to fund · faster unlock';
        } else if (disabledType) {
          subtitle = 'N/A';
        } else if (bonusTier && maxed) {
          subtitle = `Nv.${level} BONUS +1 — FREE · $0`;
        } else if (maxed) {
          subtitle = `Nv.${level} MAX`;
        } else if (freeCredit) {
          subtitle = `Nv.${level}  $${formatNumber(cost)} → FREE`;
        } else {
          subtitle = `Nv.${level}  $${formatNumber(cost)}`;
        }

        btn.container.setVisible(factory.revealUpgrades() && showBtn);
        btn.setState({
          title: fundingChoice
            ? type === 'speed'
              ? 'BALANCED 35%'
              : type === 'value'
                ? 'FAST 58%'
                : `M${m + 1} ${UPGRADE_LABELS[type]}`
            : `M${m + 1} ${UPGRADE_LABELS[type]}`,
          subtitle,
          enabled:
            showBtn &&
            !disabledType &&
            (fundingChoice
              ? type === 'speed' || type === 'value'
              : freeCredit
                ? bonusTier || !maxed
                : !maxed && factory.economy.canAfford(cost)),
        });
      }
    }

    this.upgradePanelTitle.setText(
      factory.mc.state.freeUpgradeCredits > 0
        ? factory.mc.computeFreeUpgradeMode(factory) === 'bonus_tier'
          ? 'BONUS TIER — one level above MAX · FREE'
          : 'ONE FREE UPGRADE · includes BONUS TIER if MAX'
        : fundingChoice
          ? 'SMARTPHONE FUND · BALANCED 35% or FAST 58%'
          : choiceMode
            ? 'DECISION · Throughput vs Margin'
            : full
              ? 'MEJORAS · Speed / Buffer / Value'
              : 'FIRST UPGRADE · Speed bottleneck',
    );

    if (
      factory.sessionGoal.phase === 'branch' ||
      factory.sessionGoal.phase === 'convergence' ||
      factory.sessionGoal.phase === 'post_chain' ||
      factory.sessionGoal.phase === 'toy_mastery' ||
      factory.sessionGoal.phase === 'smartphones_horizon'
    ) {
      this.choiceText.setVisible(false);
    }

    // Compact plan KPI during Toy Mastery / M-C
    const detail = factory.sessionDetailLines();
    if (detail.length && this.choiceText) {
      this.choiceText.setText(detail.join(' · ')).setVisible(true);
      this.choiceText.setColor('#8ab4c8');
    } else if (factory.sessionGoal.phase === 'toy_mastery') {
      const lines = factory.sessionGoal.planKpiLines(factory);
      if (lines.length && this.choiceText) {
        this.choiceText.setText(lines.join(' · ')).setVisible(true);
        this.choiceText.setColor('#8ab4c8');
      }
    }
  }
}

function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '∞';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(decimals);
}
