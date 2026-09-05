import Phaser from 'phaser';
import {
  LAYOUT,
  MACHINE_COUNT,
  MACHINE_NAMES,
  METRICS,
  SAVE,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import { AudioSystem } from '../systems/AudioSystem';
import { Factory } from '../systems/Factory';
import { Platform } from '../systems/Platform';
import { SaveSystem, type SaveData } from '../systems/SaveSystem';
import { Stats } from '../systems/Stats';
import { Telemetry } from '../systems/Telemetry';
import type { ActiveBoost } from '../systems/Events';

export interface GameRegistry {
  factory: Factory;
  stats: Stats;
  audio: AudioSystem;
  telemetry: Telemetry;
  muted: boolean;
  saveSystem: SaveSystem;
  selectedMachine: MachineId | null;
}

export class GameScene extends Phaser.Scene {
  private factory!: Factory;
  private stats!: Stats;
  private audio!: AudioSystem;
  private telemetry!: Telemetry;
  private saveSystem!: SaveSystem;
  private muted = false;
  private selectedMachine: MachineId | null = null;

  private machineViews: Phaser.GameObjects.Container[] = [];
  private progressBars: Phaser.GameObjects.Image[] = [];
  private stateLabels: Phaser.GameObjects.Text[] = [];
  private bottleneckBadges: Phaser.GameObjects.Text[] = [];
  private bufferViews: Phaser.GameObjects.Container[] = [];
  private bufferFillBars: Phaser.GameObjects.Image[] = [];
  private bufferCountTexts: Phaser.GameObjects.Text[] = [];
  private overdriveGlow: Phaser.GameObjects.Rectangle[] = [];
  private boostBanner!: Phaser.GameObjects.Text;
  private insightBanner!: Phaser.GameObjects.Text;
  private hintBanner!: Phaser.GameObjects.Text;
  private sellFlash!: Phaser.GameObjects.Rectangle;
  private tapPulse!: Phaser.GameObjects.Ellipse;

  private itemSprites: Map<number, Phaser.GameObjects.Image> = new Map();
  private itemPool: Phaser.GameObjects.Image[] = [];
  private sparkPool: Phaser.GameObjects.Image[] = [];
  private liveIds = new Set<number>();
  private machineSfxCooldownMs = 0;

  private layoutNodes: {
    machineX: number[];
    bufferX: number[];
    y: number;
  } = { machineX: [], bufferX: [], y: LAYOUT.factoryY };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.stats = new Stats();
    this.audio = new AudioSystem();
    this.telemetry = new Telemetry();
    this.factory = new Factory();
    this.drawBackground();
    this.buildFactoryView();
    this.buildBanners();

    this.saveSystem = new SaveSystem(
      {
        getState: () => this.collectSaveState(),
        applyState: (data) => this.applySaveState(data),
      },
      SAVE.autosaveIntervalMs,
    );

    const loaded = this.saveSystem.load();
    if (!loaded) this.factory.resetRuntime();
    else this.factory.prepareReturningPlayer();
    this.factory.bootMcSession(!!loaded);
    this.audio.setMuted(this.muted);

    this.registry.set('game', {
      factory: this.factory,
      stats: this.stats,
      audio: this.audio,
      telemetry: this.telemetry,
      muted: this.muted,
      saveSystem: this.saveSystem,
      selectedMachine: null,
    } satisfies GameRegistry);

    this.factory.events = {
      onSell: (amount, xHint, golden) => {
        this.stats.recordSale(amount);
        this.audio.play('sell');
        this.telemetry.once('first_sale', { amount, golden });
        this.game.events.emit('sell', { amount, xHint, golden });
        this.flashSell(golden);
        // First sale teaches once; later sales are visual +$ only
        this.offerHint({
          id: 'money_in_teach',
          text: 'Money in! Watch where products pile up…',
          priority: 'sell_feedback',
          once: true,
          ttlMs: 5_000,
        });
      },
      onClickBoost: (id) => {
        this.audio.play('click');
        this.bounceMachine(id);
      },
      onProcess: (id) => {
        if (this.machineSfxCooldownMs <= 0) {
          this.audio.play('machine');
          this.machineSfxCooldownMs = 90;
        }
        this.pulseMachine(id);
      },
      onSpawn: (golden) => {
        if (golden) this.audio.play('event');
      },
      onUnlock: (name) => {
        this.audio.play('unlock');
        this.game.events.emit('unlock', { name });
      },
      onInsight: (title, body) => {
        this.showInsight(title, body);
        this.game.events.emit('insight', { title, body });
      },
      onUpgradeImpact: (before, after, deltaPct, beforeWip, afterWip, payoff) => {
        this.telemetry.emit('upgrade_effect_shown', {
          before,
          after,
          deltaPct,
          beforeWip,
          afterWip,
          kind: payoff?.kind ?? 'neutral',
          message: payoff?.message ?? '',
          wipTrend: payoff?.wipTrend ?? 'flat',
        });
        this.playUpgradePayoff(before, after, payoff?.message ?? '');
        this.game.events.emit('upgrade-impact', {
          before,
          after,
          deltaPct,
          beforeWip,
          afterWip,
          message: payoff?.message,
          kind: payoff?.kind,
          wipTrend: payoff?.wipTrend,
        });
        if (payoff?.message) {
          this.offerHint({
            id: `payoff_${payoff.kind}`,
            text: payoff.message,
            priority: 'decision',
            ttlMs: 3_500,
          });
        }
      },
      onBottleneckShown: (machineId) => {
        this.telemetry.once('bottleneck_shown', { machineId });
        this.offerHint({
          id: 'bottleneck_teach',
          text: `Bottleneck: M${machineId + 1} — queue builds here. Speed it up!`,
          priority: 'critical',
          once: true,
          ttlMs: 8_000,
        });
        this.game.events.emit('bottleneck-shown', { machineId });
      },
      onBottleneckResolved: (machineId) => {
        this.telemetry.emit('bottleneck_resolved', { machineId });
      },
      onBottleneckPersisted: (machineId) => {
        this.telemetry.emit('bottleneck_persisted', { machineId });
      },
      onBottleneckShifted: (from, to) => {
        this.telemetry.emit('bottleneck_shifted', { from, to });
      },
      onSessionGoalStart: () => {
        if (this.telemetry.throughputInitial === null) {
          this.telemetry.throughputInitial = this.factory.getThroughputPerMin();
        }
        this.telemetry.once('session_goal_start', {
          target: this.factory.sessionGoal.snapshot()?.targetThroughput ?? 0,
        });
        this.game.events.emit('session-goal', { phase: 'start' });
        this.offerHint({
          id: 'goal_stage1',
          text: this.factory.sessionGoal.label(),
          priority: 'objective',
          ttlMs: 6_000,
        });
      },
      onSessionGoalProgress: (throughput, target) => {
        this.telemetry.emit('session_goal_progress', { throughput, target });
      },
      onSessionGoalComplete: (success) => {
        this.telemetry.throughputFinal = this.factory.getThroughputPerMin();
        this.telemetry.once('session_goal_complete', { success });
        this.game.events.emit('session-goal', {
          phase: success ? 'success' : 'failed',
        });
        if (success) {
          this.celebrateStage1();
        } else {
          this.offerHint({
            id: 'goal_failed',
            text: this.factory.sessionGoal.label(),
            priority: 'objective',
          });
        }
      },
      onSessionGoalStageStart: (stageIndex, stageId) => {
        this.telemetry.emit('session_goal_stage_start', { stageIndex, stageId });
        if (stageIndex > 0) {
          this.offerHint({
            id: `goal_stage_${stageId}`,
            text: this.factory.sessionGoal.label(),
            priority: 'objective',
            ttlMs: 7_000,
          });
          this.game.events.emit('session-goal', {
            phase: 'stage_start',
            stageIndex,
            stageId,
          });
        }
      },
      onSessionGoalStageProgress: (stageIndex, stageId, progress, payload) => {
        this.telemetry.emit('session_goal_stage_progress', {
          stageIndex,
          stageId,
          progress,
          ...(payload ?? {}),
        });
      },
      onSessionGoalStageComplete: (stageIndex, stageId) => {
        this.telemetry.emit('session_goal_stage_complete', { stageIndex, stageId });
        this.game.events.emit('session-goal', {
          phase: 'stage_complete',
          stageIndex,
          stageId,
        });
      },
      onSessionGoalChainComplete: () => {
        this.telemetry.once('session_goal_chain_complete');
        this.offerHint({
          id: 'chain_complete',
          text: 'Optimization chain complete — keep tuning the line',
          priority: 'objective',
          ttlMs: 6_000,
        });
      },
      onOptimizationChoiceReady: (options) => {
        this.telemetry.emit('optimization_choice_view', {
          a: options[0]?.id ?? '',
          b: options[1]?.id ?? '',
        });
        this.game.events.emit('optimization-choice', { options });
        this.offerHint({
          id: 'optimization_choice',
          text: 'Choose THROUGHPUT (Speed) or MARGIN (Value) — then buy it',
          priority: 'decision',
          ttlMs: 8_000,
        });
      },
      onOptimizationChoiceSelected: (branch) => {
        this.telemetry.branchSelected = branch;
        this.telemetry.emit('optimization_choice_selected', { branch });
      },
      onOptimizationChoicePurchased: (payload) => {
        this.telemetry.emit('optimization_choice_purchased', payload);
      },
      onStage2Armed: (payload) => {
        this.telemetry.emit('stage_2_armed', payload);
      },
      onBranchGoalStart: (payload) => {
        this.telemetry.emit('branch_goal_start', payload);
        this.offerHint({
          id: 'branch_goal',
          text: this.factory.sessionGoal.label(),
          priority: 'objective',
          ttlMs: 7_000,
        });
      },
      onBranchGoalProgress: (progress, payload) => {
        this.telemetry.emit('branch_goal_progress', { progress, ...payload });
      },
      onBranchGoalComplete: (payload) => {
        this.telemetry.emit('branch_goal_complete', payload);
      },
      onConvergenceGoalStart: (payload) => {
        this.telemetry.emit('convergence_goal_start', payload);
        this.offerHint({
          id: 'convergence_goal',
          text: this.factory.sessionGoal.label(),
          priority: 'objective',
          ttlMs: 7_000,
        });
      },
      onConvergenceGoalComplete: (payload) => {
        this.telemetry.emit('convergence_goal_complete', payload);
      },
      onNextMilestoneShown: (payload) => {
        this.telemetry.emit('next_milestone_shown', payload);
        this.telemetry.once('toys_milestone_shown', payload);
        if (typeof payload.threshold === 'number') {
          this.telemetry.toysThreshold = payload.threshold;
        }
        this.offerHint({
          id: 'strategy_summary',
          text:
            this.telemetry.branchSelected === 'margin'
              ? 'Margin path locked in — Value boosted LINE INCOME'
              : 'Throughput path locked in — Speed raised OUTPUT',
          priority: 'decision',
          ttlMs: 4_000,
        });
        this.offerHint({
          id: 'next_milestone',
          text: 'TOYS UNLOCK — upgrades accelerate lifetime earned; cash spend does not reset it',
          priority: 'objective',
          ttlMs: 10_000,
        });
        this.game.events.emit('next-milestone', payload);
      },
      onToysMilestoneProgress: (payload) => {
        this.telemetry.emit('toys_milestone_progress', payload);
      },
      onToysThresholdReached: (payload) => {
        this.telemetry.once('toys_threshold_reached', payload);
      },
      onToysReady: (payload) => {
        this.telemetry.once('toys_ready', payload);
        this.offerHint({
          id: 'toys_ready',
          text: 'TOYS READY — tap OPEN TOYS (free)',
          priority: 'critical',
          once: true,
          ttlMs: 8_000,
        });
      },
      onToysOpened: (payload) => {
        this.telemetry.once('toys_opened', payload);
        if (typeof payload.lifetimeEarnedAtUnlock === 'number') {
          this.telemetry.lifetimeEarnedAtUnlock = payload.lifetimeEarnedAtUnlock;
          this.telemetry.lifetimeEarnedAt650 = payload.lifetimeEarnedAtUnlock;
        }
        if (typeof payload.cashAtUnlock === 'number') {
          this.telemetry.cashAtUnlock = payload.cashAtUnlock;
        }
        this.telemetry.upgradesAtToysUnlock = this.factory.upgrades.totalPurchased;
        const branch = this.telemetry.branchSelected;
        this.telemetry.branchKpiAtToysUnlock =
          branch === 'margin'
            ? this.factory.lineIncomePerMin()
            : this.factory.getThroughputPerMin();
        this.offerHint({
          id: 'first_toy_objective',
          text: 'Produce your first Toy — line now sells Toys',
          priority: 'critical',
          once: true,
          ttlMs: 10_000,
        });
      },
      onFirstToyAction: (payload) => {
        this.telemetry.once('first_toy_action', payload);
      },
      onFirstToyProduced: (payload) => {
        this.telemetry.once('first_toy_produced', payload);
      },
      onToyMasteryShown: (payload) => {
        this.telemetry.once('toy_mastery_shown', payload);
        if (typeof payload.type === 'string') {
          this.telemetry.toyMasteryType = payload.type;
        }
        if (typeof payload.target === 'number') {
          this.telemetry.toyMasteryTarget = payload.target;
        }
        this.offerHint({
          id: 'toy_mastery',
          text: this.factory.sessionGoal.label(),
          priority: 'objective',
          ttlMs: 8_000,
        });
      },
      onToyMasteryAction: (payload) => {
        this.telemetry.emit('toy_mastery_action', payload);
      },
      onToyMasteryProgress: (payload) => {
        this.telemetry.emit('toy_mastery_progress', payload);
      },
      onToyMasteryComplete: (payload) => {
        this.telemetry.once('toy_mastery_complete', payload);
        this.offerHint({
          id: 'toy_mastery_done',
          text: 'Toy Mastery complete — next category unlocked',
          priority: 'decision',
          ttlMs: 5_000,
        });
      },
      onSmartphonesMilestoneShown: (payload) => {
        this.telemetry.once('smartphones_milestone_shown', payload);
        this.offerHint({
          id: 'smartphones_horizon',
          text: 'SMARTPHONE EXPANSION FUND — allocate income to build the next line',
          priority: 'objective',
          ttlMs: 10_000,
        });
      },
      onMcEvent: (type, payload) => {
        this.handleMcTelemetry(type, payload);
      },
      onGlobalEventSuppressed: () => {
        this.telemetry.noteSuppressedAttempt();
      },
      onGlobalEventsResumed: () => {
        this.telemetry.noteSuppressionResumed();
      },
      onOnboardingComplete: () => {
        this.telemetry.once('onboarding_complete');
      },
    };

    this.factory.eventsSys.hooks = {
      onBoostStart: (boost) => {
        this.audio.play('event');
        this.showBoost(boost);
      },
      onBoostEnd: () => this.hideBoost(),
      onSuppressedAttempt: (kind) => {
        this.factory.events.onGlobalEventSuppressed?.(kind);
      },
    };

    if (this.factory.eventsSys.active) {
      this.showBoost(this.factory.eventsSys.active);
    }

    this.input.on('pointerdown', () => this.audio.unlock());
    this.saveSystem.startAutosave();
    Platform.gameplayStart();
    this.scene.launch('UIScene');

    if (!this.factory.hasRealProgress()) {
      this.offerHint({
        id: 'first_tap',
        text: 'TAP a running machine to boost it',
        priority: 'critical',
        once: true,
        ttlMs: 12_000,
      });
      this.telemetry.once('tutorial_hint_shown', { hint: 'first_tap' });
      this.startTapPulse();
    }

    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __tfrReset?: () => void;
        __tfrOnboardingReport?: () => ReturnType<Telemetry['buildReport']>;
        __tfrSessionReport?: () => ReturnType<Telemetry['buildSessionReport']>;
        __tfrPreviewPayoff?: (
          kind: 'still_limiting' | 'resolved' | 'moved',
        ) => boolean;
      };
      w.__tfrReset = () => {
        this.saveSystem.reset();
        window.location.reload();
      };
      w.__tfrOnboardingReport = () => this.telemetry.buildReport();
      w.__tfrSessionReport = () =>
        this.telemetry.buildSessionReport(this.factory);
      const isDev =
        typeof import.meta !== 'undefined' &&
        Boolean(
          (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV,
        );
      if (isDev) {
        w.__tfrPreviewPayoff = (kind) => {
          const ok = this.factory.previewPayoff(kind);
          if (ok) {
            this.telemetry.emit('payoff_preview_used', { kind });
          }
          return ok;
        };
      }
    }

    this.events.on('shutdown', () => {
      this.factory.mc.noteSessionEnd();
      this.saveSystem?.save();
      this.saveSystem?.stopAutosave();
      Platform.gameplayStop();
    });
  }

  private handleMcTelemetry(
    type: string,
    payload: Record<string, number | string | boolean | null>,
  ): void {
    const once = new Set([
      'funding_policy_view',
      'smartphone_funding_policy_selected',
      'smartphone_fund_ready',
      'smartphone_build_pressed',
      'smartphone_first_product',
      'smartphone_launch_start',
      'smartphone_launch_complete',
      'shift_1_complete',
      'return_hook_preview',
      'return_session_start',
      'return_challenge_shown',
      'return_challenge_start',
      'return_challenge_complete',
      'free_upgrade_granted',
    ]);
    if (once.has(type)) {
      this.telemetry.once(type as Parameters<Telemetry['once']>[0], payload);
    } else {
      this.telemetry.emit(type as Parameters<Telemetry['emit']>[0], payload);
    }
    if (type === 'smartphone_build_pressed') {
      this.offerHint({
        id: 'smartphone_built',
        text: 'SMARTPHONE LINE ONLINE — new unit value',
        priority: 'decision',
        ttlMs: 5_000,
      });
      this.audio.play('unlock');
    }
    if (type === 'smartphone_first_product') {
      this.offerHint({
        id: 'first_phone_sold',
        text: `First Smartphone sold · unit $${payload.unitValue ?? 14}`,
        priority: 'decision',
        ttlMs: 4_500,
      });
      this.audio.play('sell');
    }
    if (type === 'shift_1_complete' || type === 'return_hook_preview') {
      this.offerHint({
        id: 'shift1_done',
        text: 'SHIFT 1 COMPLETE — a new challenge waits next visit',
        priority: 'objective',
        ttlMs: 8_000,
      });
    }
    if (type === 'return_challenge_shown') {
      this.offerHint({
        id: 'return_challenge',
        text: 'RETURN CHALLENGE — optimize from your Shift 1 snapshot',
        priority: 'objective',
        ttlMs: 8_000,
      });
    }
    if (type === 'free_upgrade_granted') {
      this.offerHint({
        id: 'free_upgrade',
        text: 'ONE FREE UPGRADE earned — pick any improvement',
        priority: 'decision',
        ttlMs: 8_000,
      });
    }
    this.saveSystem.save();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100);
    if (this.machineSfxCooldownMs > 0) {
      this.machineSfxCooldownMs = Math.max(0, this.machineSfxCooldownMs - dt);
    }
    this.telemetry.update(dt);
    this.factory.update(dt);
    this.stats.update(dt);
    this.telemetry.noteUpgradesAtFive(this.factory.upgrades.totalPurchased);
    this.syncVisuals();
    this.syncHintBanner();
  }

  private drawBackground(): void {
    const { width, height } = LAYOUT;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a2332, 0x1a2332, 0x0f1620, 0x0f1620, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x243447, 1);
    g.fillRect(0, height * 0.55, width, height * 0.45);

    this.add
      .text(width / 2, 36, 'TINY FACTORY RUSH', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#e8eef5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 68, 'Observe · Decide · Optimize', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#7a8fa6',
      })
      .setOrigin(0.5);
  }

  private buildBanners(): void {
    this.boostBanner = this.add
      .text(LAYOUT.width / 2, 118, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffd166',
        backgroundColor: '#15202bcc',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(50);

    this.hintBanner = this.add
      .text(LAYOUT.width / 2, 155, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '15px',
        color: '#e8eef5',
        backgroundColor: '#1a2332ee',
        padding: { x: 14, y: 8 },
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.insightBanner = this.add
      .text(LAYOUT.width / 2, 200, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#cde0f0',
        backgroundColor: '#1b4332cc',
        padding: { x: 14, y: 8 },
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(55);

    this.sellFlash = this.add
      .rectangle(LAYOUT.width - 90, LAYOUT.factoryY, 80, 80, 0xffd166, 0)
      .setDepth(40);

    this.tapPulse = this.add
      .ellipse(0, 0, LAYOUT.machineWidth + 30, LAYOUT.machineHeight + 30)
      .setStrokeStyle(3, 0x52b788, 0.9)
      .setFillStyle(0x52b788, 0.08)
      .setVisible(false)
      .setDepth(5);
  }

  private buildFactoryView(): void {
    const { width, factoryY, machineWidth, machineHeight } = LAYOUT;
    const margin = 70;
    const usable = width - margin * 2;
    // M0 Buf0 M1 Buf1 M2 Sink — 6 slots
    const slots = 6;
    const slotW = usable / slots;
    const startX = margin + slotW * 0.5;

    const positions = {
      m0: startX,
      b0: startX + slotW,
      m1: startX + slotW * 2,
      b1: startX + slotW * 3,
      m2: startX + slotW * 4,
      sink: startX + slotW * 5,
    };

    this.layoutNodes = {
      machineX: [positions.m0, positions.m1, positions.m2],
      bufferX: [positions.b0, positions.b1],
      y: factoryY,
    };

    // Source label
    this.add
      .text(positions.m0 - 55, factoryY - 90, 'SOURCE', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '11px',
        color: '#7a8fa6',
      })
      .setOrigin(0.5);

    for (let i = 0; i < MACHINE_COUNT; i++) {
      this.buildMachine(i as MachineId, this.layoutNodes.machineX[i]!);
    }

    for (let i = 0; i < 2; i++) {
      this.buildBuffer(i, this.layoutNodes.bufferX[i]!);
    }

    this.add
      .image(positions.sink, factoryY, 'coin')
      .setDisplaySize(36, 36)
      .setTint(0xffd166);
    this.add
      .text(positions.sink, factoryY + 42, 'SINK', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    void machineWidth;
    void machineHeight;
  }

  private buildMachine(id: MachineId, x: number): void {
    const { factoryY, machineWidth, machineHeight } = LAYOUT;
    const glow = this.add
      .rectangle(x, factoryY, machineWidth + 16, machineHeight + 16, 0xffd166, 0)
      .setStrokeStyle(3, 0xff9f1c, 0);
    this.overdriveGlow.push(glow);

    const container = this.add.container(x, factoryY);
    const tint = id === 0 ? 0x3d5a80 : id === 1 ? 0x457b9d : 0x2a9d8f;
    const body = this.add
      .image(0, 0, 'machine')
      .setDisplaySize(machineWidth, machineHeight)
      .setTint(tint);
    body.setInteractive(
      new Phaser.Geom.Rectangle(
        -machineWidth / 2,
        -machineHeight / 2,
        machineWidth,
        machineHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    if (body.input) body.input.cursor = 'pointer';
    body.on('pointerdown', () => this.onMachineTap(id));

    const label = this.add
      .text(0, -machineHeight / 2 - 18, `M${id + 1} ${MACHINE_NAMES[id]}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        color: '#cde0f0',
      })
      .setOrigin(0.5);

    const barBg = this.add
      .image(0, machineHeight / 2 - 18, 'bar-bg')
      .setDisplaySize(machineWidth - 16, 10);
    const barFill = this.add
      .image(-(machineWidth - 16) / 2, machineHeight / 2 - 18, 'bar-fill')
      .setOrigin(0, 0.5)
      .setDisplaySize(2, 10);
    this.progressBars.push(barFill);

    const state = this.add
      .text(0, machineHeight / 2 + 16, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#8ab4c8',
      })
      .setOrigin(0.5);
    this.stateLabels.push(state);

    const bnBadge = this.add
      .text(0, -machineHeight / 2 - 36, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ff9f1c',
        backgroundColor: '#15202bcc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.bottleneckBadges.push(bnBadge);

    container.add([body, label, barBg, barFill, state, bnBadge]);
    this.machineViews.push(container);
  }

  private buildBuffer(id: number, x: number): void {
    const { factoryY } = LAYOUT;
    const w = LAYOUT.bufferWidth;
    const h = LAYOUT.bufferHeight;
    const container = this.add.container(x, factoryY);

    const bg = this.add
      .rectangle(0, 0, w, h, 0x2d3748, 0.9)
      .setStrokeStyle(2, 0x4a5568);
    const title = this.add
      .text(0, -h / 2 - 14, id === 0 ? 'BUF AB' : 'BUF BC', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '11px',
        color: '#7a8fa6',
      })
      .setOrigin(0.5);

    const fill = this.add
      .image(-w / 2 + 4, h / 2 - 10, 'bar-fill')
      .setOrigin(0, 0.5)
      .setDisplaySize(4, 8)
      .setTint(0x52b788);
    this.bufferFillBars.push(fill);

    const count = this.add
      .text(0, 0, '0/6', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e8eef5',
      })
      .setOrigin(0.5);
    this.bufferCountTexts.push(count);

    container.add([bg, title, fill, count]);
    this.bufferViews.push(container);
  }

  private onMachineTap(id: MachineId): void {
    this.audio.unlock();
    this.stats.recordTap();
    this.telemetry.once('first_input', { machineId: id });
    this.stopTapPulse();
    this.selectedMachine = id;
    const reg = this.registry.get('game') as GameRegistry;
    if (reg) reg.selectedMachine = id;
    this.factory.clickMachine(id);
    this.game.events.emit('select-machine', { id });
    this.game.events.emit('tap');
  }

  private syncVisuals(): void {
    this.syncMachines();
    this.syncBuffers();
    this.syncItems();
    this.syncOverdriveGlow();
    this.syncBoostBanner();
  }

  private syncMachines(): void {
    const bn = this.factory.highlightedBottleneck;
    for (let i = 0; i < MACHINE_COUNT; i++) {
      const m = this.factory.machines[i]!;
      const bar = this.progressBars[i]!;
      const label = this.stateLabels[i]!;
      const badge = this.bottleneckBadges[i]!;
      const w = Math.max(2, (LAYOUT.machineWidth - 16) * m.progress);
      bar.setDisplaySize(w, 10);

      if (m.state === 'BLOCKED') {
        label.setText('BLOCKED').setColor('#e76f51');
      } else if (m.state === 'STARVED') {
        label.setText('WAITING').setColor('#f4a261');
      } else if (m.state === 'PROCESSING') {
        label.setText('RUN').setColor('#52b788');
      } else {
        label.setText('IDLE').setColor('#8ab4c8');
      }

      const isBn = bn === i;
      const mode = this.factory.bottleneckBadgeMode;
      const showBadge = isBn && mode !== 'hidden';
      badge.setVisible(showBadge);
      if (showBadge) {
        const narrow =
          typeof window !== 'undefined' && window.innerWidth < 700;
        const machineHeight = LAYOUT.machineHeight;
        const machineWidth = LAYOUT.machineWidth;
        if (mode === 'improved_still') {
          const pct = Math.max(0, this.factory.improvedBadgeDeltaPct);
          badge.setText(
            narrow
              ? `IMPROVED +${pct}%\nSTILL BOTTLENECK`
              : `IMPROVED +${pct}% — STILL LIMITING`,
          );
          badge.setColor('#ffd166');
          badge.setAlign('center');
          if (narrow) {
            badge.setFontSize('12px');
            badge.setPosition(0, -machineHeight / 2 - 48);
          } else {
            badge.setFontSize('13px');
            badge.setPosition(0, -machineHeight / 2 - 36);
          }
        } else {
          badge.setText('BOTTLENECK');
          badge.setColor('#ff9f1c');
          badge.setFontSize('13px');
          badge.setAlign('center');
          badge.setPosition(0, -LAYOUT.machineHeight / 2 - 36);
        }
        // Keep badge within machine column — avoid covering body / HUD
        const maxW = machineWidth + 24;
        if (badge.width > maxW) {
          badge.setScale(maxW / badge.width);
        } else {
          badge.setScale(1);
        }
      }

      const view = this.machineViews[i]!;
      const selected = this.selectedMachine === i;
      view.setScale(selected ? 1.05 : isBn ? 1.03 : 1);

      const glow = this.overdriveGlow[i]!;
      if (isBn) {
        glow.setFillStyle(0xff9f1c, mode === 'improved_still' ? 0.2 : 0.14);
        glow.setStrokeStyle(3, 0xff9f1c, 0.85);
      }
    }
  }

  private syncBuffers(): void {
    for (let i = 0; i < 2; i++) {
      const b = this.factory.buffers[i]!;
      const fill = this.bufferFillBars[i]!;
      const count = this.bufferCountTexts[i]!;
      const ratio = b.fillRatio;
      const maxW = LAYOUT.bufferWidth - 8;
      fill.setDisplaySize(Math.max(2, maxW * ratio), 8);
      fill.setTint(ratio > 0.85 ? 0xe76f51 : ratio > 0.55 ? 0xf4a261 : 0x52b788);
      count.setText(`${b.length}/${b.capacity}`);
      if (b.fillRatio > 0.85) {
        count.setColor('#e76f51');
      } else {
        count.setColor('#e8eef5');
      }
    }
  }

  private syncItems(): void {
    const live = this.liveIds;
    live.clear();

    for (let i = 0; i < MACHINE_COUNT; i++) {
      const m = this.factory.machines[i]!;
      if (!m.current) continue;
      live.add(m.current.id);
      const sprite = this.acquireItem(m.current.id, m.current.color, m.current.golden);
      sprite.setPosition(this.layoutNodes.machineX[i]!, this.layoutNodes.y - 8);
      sprite.setVisible(true);
    }

    for (let i = 0; i < 2; i++) {
      const b = this.factory.buffers[i]!;
      const bx = this.layoutNodes.bufferX[i]!;
      const n = b.items.length;
      for (let k = 0; k < n; k++) {
        const p = b.items[k]!;
        live.add(p.id);
        const sprite = this.acquireItem(p.id, p.color, p.golden);
        const col = k % 3;
        const row = Math.floor(k / 3);
        sprite.setPosition(bx - 18 + col * 18, this.layoutNodes.y - 10 + row * 16);
        sprite.setVisible(true);
        sprite.setScale(p.golden ? 0.9 : 0.75);
      }
    }

    for (const [id, sprite] of this.itemSprites) {
      if (!live.has(id)) {
        sprite.setVisible(false);
        this.itemPool.push(sprite);
        this.itemSprites.delete(id);
      }
    }
  }

  private acquireItem(
    id: number,
    color: number,
    golden: boolean,
  ): Phaser.GameObjects.Image {
    let sprite = this.itemSprites.get(id);
    if (!sprite) {
      sprite = this.itemPool.pop();
      if (!sprite) {
        sprite = this.add
          .image(0, 0, 'item')
          .setDisplaySize(LAYOUT.itemSize, LAYOUT.itemSize);
      }
      this.itemSprites.set(id, sprite);
    }
    sprite.setTexture('item');
    sprite.setTint(color);
    sprite.setScale(golden ? 1.15 : 1);
    sprite.setVisible(true);
    return sprite;
  }

  private bounceMachine(id: MachineId): void {
    const view = this.machineViews[id];
    if (!view) return;
    this.tweens.killTweensOf(view);
    this.tweens.add({
      targets: view,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 70,
      yoyo: true,
    });
  }

  private pulseMachine(id: MachineId): void {
    const view = this.machineViews[id];
    if (!view) return;
    const body = view.list[0] as Phaser.GameObjects.Image;
    this.tweens.killTweensOf(body);
    body.setAlpha(1);
    this.tweens.add({ targets: body, alpha: 0.7, duration: 60, yoyo: true });
  }

  private flashSell(golden: boolean): void {
    const flash = this.sellFlash;
    this.tweens.killTweensOf(flash);
    flash.setFillStyle(golden ? 0xffd700 : 0xffd166, 0.45);
    flash.setScale(1).setAlpha(0.45);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: golden ? 420 : 280,
    });
    this.spawnSparks(LAYOUT.width - 90, LAYOUT.factoryY, golden ? 0xffd700 : 0xffd166, golden ? 8 : 5);
  }

  private spawnSparks(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const spark = this.sparkPool.pop() ?? this.add.image(0, 0, 'pixel').setDepth(45);
      spark.setTexture('pixel').setTint(color).setVisible(true).setAlpha(1).setScale(1.5);
      spark.setPosition(x, y);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 40;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.4,
        duration: 280 + Math.random() * 160,
        onComplete: () => {
          spark.setVisible(false);
          this.sparkPool.push(spark);
        },
      });
    }
  }

  private showBoost(boost: ActiveBoost): void {
    const label =
      boost.kind === 'productionBoost'
        ? '⚡ PRODUCCIÓN x2'
        : `🔥 OVERDRIVE M${(boost.machineId ?? 0) + 1}`;
    this.boostBanner.setText(label).setVisible(true);
  }

  private hideBoost(): void {
    this.boostBanner.setVisible(false);
  }

  private syncBoostBanner(): void {
    const active = this.factory.eventsSys.active;
    if (!active) {
      if (this.boostBanner.visible) this.hideBoost();
      return;
    }
    const sec = Math.ceil(active.remainingMs / 1000);
    const base =
      active.kind === 'productionBoost'
        ? '⚡ PRODUCCIÓN x2'
        : `🔥 OVERDRIVE M${(active.machineId ?? 0) + 1}`;
    this.boostBanner.setText(`${base}  ${sec}s`).setVisible(true);
  }

  private syncOverdriveGlow(): void {
    const active = this.factory.eventsSys.active;
    const bn = this.factory.highlightedBottleneck;
    for (let i = 0; i < MACHINE_COUNT; i++) {
      const glow = this.overdriveGlow[i]!;
      const onOd = active?.kind === 'overdrive' && active.machineId === i;
      if (onOd) {
        glow.setFillStyle(0xffd166, 0.12);
        glow.setStrokeStyle(3, 0xff9f1c, 0.9);
      } else if (bn === i) {
        // kept by syncMachines
      } else {
        glow.setFillStyle(0xffd166, 0);
        glow.setStrokeStyle(3, 0xff9f1c, 0);
      }
    }
  }

  private offerHint(req: {
    id: string;
    text: string;
    priority: 'critical' | 'objective' | 'decision' | 'sell_feedback';
    once?: boolean;
    ttlMs?: number;
  }): void {
    const result = this.factory.hints.offer(req);
    if (result.deduped) {
      this.telemetry.recordHintDeduped(req.id);
      return;
    }
    if (!result.shown) return;
    this.hintBanner.setText(req.text).setVisible(true).setAlpha(1);
    this.telemetry.recordHintDisplayed(req.id, req.text);
  }

  private syncHintBanner(): void {
    const cur = this.factory.hints.visible;
    if (!cur) {
      // keep last text briefly; hide if queue empty and alpha faded
      return;
    }
    if (this.hintBanner.text !== cur.text) {
      this.hintBanner.setText(cur.text).setVisible(true).setAlpha(1);
    }
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private playUpgradePayoff(
    before: number,
    after: number,
    message: string,
  ): void {
    const mid = this.factory.suggestedUpgradeMachine();
    const reduced = this.prefersReducedMotion();
    if (!reduced) {
      this.pulseMachine(mid);
      this.bounceMachine(mid);
      // Brief speed-up feel on item sprites
      for (const s of this.itemSprites.values()) {
        this.tweens.add({
          targets: s,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 180,
          yoyo: true,
        });
      }
    }
    this.game.events.emit('payoff-banner', {
      before,
      after,
      message,
      reduced,
    });
  }

  private celebrateStage1(): void {
    const tp0 = this.telemetry.throughputInitial ?? 0;
    const tp1 = this.factory.getThroughputPerMin();
    const bn = this.factory.highlightedBottleneck;
    const wip = this.factory.getWip();
    this.factory.hints.clear();
    this.offerHint({
      id: 'stage1_celebrate',
      text: `OUTPUT ${tp0.toFixed(0)}→${tp1.toFixed(0)}/min · WIP ${wip} · BN M${(bn ?? 1) + 1}`,
      priority: 'objective',
      ttlMs: 1_800,
    });
    this.game.events.emit('session-goal', {
      phase: 'celebrate',
      before: tp0,
      after: tp1,
      wip,
      bottleneck: bn,
    });
    // Next goal hint is already queued via stage_start; ensure within 2s
    this.time.delayedCall(1_200, () => {
      this.offerHint({
        id: 'goal_stage_flow_stability',
        text: this.factory.sessionGoal.label(),
        priority: 'objective',
        ttlMs: 7_000,
      });
    });
  }

  private startTapPulse(): void {
    // Pulse around machine 1 (likely first busy / later bottleneck)
    const x = this.layoutNodes.machineX[1] ?? this.layoutNodes.machineX[0]!;
    this.tapPulse.setPosition(x, this.layoutNodes.y).setVisible(true);
    this.tweens.add({
      targets: this.tapPulse,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopTapPulse(): void {
    this.tweens.killTweensOf(this.tapPulse);
    this.tapPulse.setVisible(false);
  }

  private showInsight(title: string, body: string): void {
    this.insightBanner.setText(`${title}\n${body}`).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.insightBanner);
    this.tweens.add({
      targets: this.insightBanner,
      alpha: 0,
      delay: 4500,
      duration: 600,
      onComplete: () => this.insightBanner.setVisible(false),
    });
  }

  private collectSaveState(): Omit<SaveData, 'version' | 'savedAt'> {
    return {
      economy: this.factory.economy.snapshot(),
      upgrades: this.factory.upgrades.snapshot(),
      progression: this.factory.progression.snapshot(),
      factory: this.factory.toSnapshot(),
      audio: { muted: this.muted },
      stats: this.stats.snapshot(),
    };
  }

  private applySaveState(data: SaveData): void {
    this.factory.economy.coins = data.economy.coins;
    this.factory.economy.totalEarned = data.economy.totalEarned;
    this.factory.economy.productsSold = data.economy.productsSold;
    this.factory.economy.currentProduct = data.economy.currentProduct;

    this.factory.upgrades.levels = structuredClone(data.upgrades.levels);
    this.factory.upgrades.totalPurchased = data.upgrades.totalPurchased;
    this.factory.progression.unlocked = [...data.progression.unlocked];
    this.factory.loadRuntime(data.factory);

    this.muted = data.audio.muted;
    this.audio.setMuted(this.muted);
    this.stats.load(data.stats);
  }

  buyUpgrade(machineId: MachineId, type: UpgradeType): boolean {
    const before = this.factory.upgrades.totalPurchased;
    const beforeTp = this.factory.getThroughputPerMin();
    const beforeWip = this.factory.getWip();
    const ok = this.factory.buyUpgrade(machineId, type);
    if (ok && this.factory.upgrades.totalPurchased > before) {
      this.stats.recordUpgrade();
      this.audio.play('upgrade');
      this.telemetry.upgradesBought += 1;
      this.telemetry.upgradesByType[type] =
        (this.telemetry.upgradesByType[type] ?? 0) + 1;
      this.telemetry.emit('upgrade_purchase', {
        machineId,
        type,
        OUTPUT: this.factory.getThroughputPerMin(),
        'LINE INCOME/MIN': this.factory.lineIncomePerMin(),
        WIP: this.factory.getWip(),
      });
      const choiceId = this.factory.sessionGoal.selectedBranch;
      if (choiceId) {
        this.telemetry.branchSelected = choiceId;
      }
      this.telemetry.once('first_upgrade', {
        machineId,
        type,
        beforeTp,
        beforeWip,
      });
      this.saveSystem.save();
      this.game.events.emit('upgrade', { machineId, type });
      this.offerHint({
        id: 'watch_queue',
        text: 'Watch the queue…',
        priority: 'decision',
        once: true,
        ttlMs: 2_500,
      });
    }
    return ok;
  }

  tryUnlockNext(): boolean {
    const ok = this.factory.tryUnlockNext(this.stats);
    if (ok) this.saveSystem.save();
    return ok;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.audio.setMuted(muted);
    const reg = this.registry.get('game') as GameRegistry | undefined;
    if (reg) reg.muted = muted;
    this.saveSystem.save();
  }

  getSelectedMachineDetail(): {
    id: MachineId;
    name: string;
    rate: number;
    util: number;
    queue: string;
    state: string;
  } | null {
    if (this.selectedMachine === null) return null;
    const id = this.selectedMachine;
    const m = this.factory.machines[id]!;
    const util = m.recentUtilization(METRICS.utilizationWindowMs, this.factory.line.clockMs);
    let queue = 'LOW';
    if (id > 0) {
      const buf = this.factory.buffers[id - 1]!;
      if (buf.fillRatio > 0.75) queue = 'HIGH';
      else if (buf.fillRatio > 0.35) queue = 'MED';
    }
    return {
      id,
      name: MACHINE_NAMES[id],
      rate: m.effectiveRatePerMin,
      util: util * 100,
      queue,
      state: m.state,
    };
  }

  shutdown(): void {
    this.saveSystem?.save();
    this.saveSystem?.stopAutosave();
    Platform.gameplayStop();
  }
}
