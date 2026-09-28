import Phaser from 'phaser';
import {
  MACHINE_COUNT,
  MACHINE_NAMES,
  METRICS,
  PRODUCTS,
  PRODUCT_ORDER,
  SAVE,
  LAYOUT,
  type MachineId,
  type ProductId,
  type UpgradeType,
} from '../config/balance';
import { Fx } from '../art/Fx';
import { itemKey, type ItemStage } from '../art/Textures';
import { CSS, PAL, darken, lighten, mix } from '../art/palette';
import { img, panel, setupCamera, txt } from '../art/view';
import { MACHINE_LABELS, friendly } from '../ui/copy';
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

/** World layout (logical 1280×720). */
export const MACHINE_X = [300, 640, 972] as const;
export const MACHINE_Y = 352;
export const ITEM_Y = MACHINE_Y + 52;
export const BELT_Y = MACHINE_Y + 62;
export const FLOOR_Y = 446;
export const HOPPER_X = 92;
export const TRUCK_X = 1170;
const ITEM_SCALE = 0.6;

const OFFLINE = {
  minAwaySec: 90,
  capSec: 2 * 60 * 60,
  efficiency: 0.2,
  /** Never more than this many minutes of full-speed income. */
  maxIncomeMinutes: 8,
  /** Only players who actually built something get the reward. */
  minUpgrades: 3,
} as const;

type ItemLoc = 'm0' | 'b0' | 'm1' | 'b1' | 'm2';

interface TrackedItem {
  sprite: Phaser.GameObjects.Image;
  loc: ItemLoc;
  stage: ItemStage;
  golden: boolean;
}

interface MachineParts {
  body: Phaser.GameObjects.Image;
  tool: Phaser.GameObjects.Image;
  extras: Phaser.GameObjects.Image[];
  eyes: Phaser.GameObjects.Image;
  lamp: Phaser.GameObjects.Image;
  sweat: Phaser.GameObjects.Image;
  blinkMs: number;
  moodMs: number;
  mood: string | null;
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
  private machineParts: MachineParts[] = [];
  private progressGfx: Phaser.GameObjects.Graphics[] = [];
  private stateLabels: Phaser.GameObjects.Text[] = [];
  private bottleneckBadges: Phaser.GameObjects.Container[] = [];
  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private bufferViews: Phaser.GameObjects.Container[] = [];
  private bufferChipGfx: Phaser.GameObjects.Graphics[] = [];
  private bufferCountTexts: Phaser.GameObjects.Text[] = [];
  private overdriveGlow: Phaser.GameObjects.Graphics[] = [];
  private boostBanner!: Phaser.GameObjects.Text;
  private boostBg!: Phaser.GameObjects.Graphics;
  private hintBanner!: Phaser.GameObjects.Text;
  private hintBox!: Phaser.GameObjects.Container;
  private hintGfx!: Phaser.GameObjects.Graphics;
  private hintMascot!: Phaser.GameObjects.Image;
  private hintIdleMs = 0;
  private hintHoldMs = 0;
  private hintShownMs = 0;
  private hintRetired = new Set<string>();
  private tapPulse!: Phaser.GameObjects.Container;
  private beltTile!: Phaser.GameObjects.TileSprite;
  private bgGears: Phaser.GameObjects.Image[] = [];
  private hopper!: Phaser.GameObjects.Image;
  private truck!: Phaser.GameObjects.Image;
  private truckLogo!: Phaser.GameObjects.Text;
  private fx!: Fx;
  private animTime = 0;
  private pendingOffline: { amount: number; awaySec: number } | null = null;

  private tracked: Map<number, TrackedItem> = new Map();
  private itemSprites: Map<number, Phaser.GameObjects.Image> = new Map();
  private itemPool: Phaser.GameObjects.Image[] = [];
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
    setupCamera(this);
    this.fx = new Fx(this, 90);
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
    if (loaded && typeof loaded === 'object' && 'savedAt' in loaded) {
      this.grantOfflineEarnings((loaded as SaveData).savedAt);
    }
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
        if (!golden) this.audio.play('sell');
        this.telemetry.once('first_sale', { amount, golden });
        this.game.events.emit('sell', { amount, xHint, golden });
        this.flashSell(golden);
        // First sale teaches once; later sales are visual +$ only
        this.offerHint({
          id: 'money_in_teach',
          text: 'Cha-ching! Now watch where items PILE UP…',
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
          this.audio.play('machine', id);
          this.machineSfxCooldownMs = 90;
        }
        this.pulseMachine(id);
      },
      onSpawn: (golden) => {
        if (golden) this.audio.play('event');
      },
      onUnlock: (name) => {
        this.audio.play('unlock');
        this.celebrate(`NEW PRODUCT: ${name}!`);
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
          text: `The ${MACHINE_LABELS[machineId]} is the SLOWEST — items pile up in front of it. Speed it up!`,
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
          text: 'TOYS are ready! Tap OPEN TOYS (free)',
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
          text: 'Your line now makes Toys — watch the first one roll out!',
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
        text: 'TAP a machine to give it a boost!',
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
        text: 'SMARTPHONE LINE ONLINE — phones sell for way more!',
        priority: 'decision',
        ttlMs: 5_000,
      });
      this.audio.play('unlock');
      this.celebrate('SMARTPHONE LINE BUILT!');
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
        text: 'SHIFT 1 COMPLETE! Come back later for a new challenge',
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
    this.syncVisuals(dt);
    this.syncHintBanner(dt);
  }

  // ══════════════════════════════════════════════════════════════
  // World construction
  // ══════════════════════════════════════════════════════════════

  private drawBackground(): void {
    const W = LAYOUT.width;
    const H = LAYOUT.height;
    const g = this.add.graphics().setDepth(-100);
    // wall
    const bands = 40;
    for (let i = 0; i < bands; i++) {
      g.fillStyle(mix(PAL.wallTop, PAL.wallBottom, i / (bands - 1)), 1);
      g.fillRect(0, (FLOOR_Y / bands) * i, W, FLOOR_Y / bands + 1);
    }
    // wall panels
    g.lineStyle(3, PAL.wallPanel, 0.9);
    for (let x = 0; x <= W; x += 160) g.lineBetween(x, 0, x, FLOOR_Y);
    // big slow gears (parallax silhouettes)
    this.bgGears = [
      img(this, 70, 210, 'bg-gear').setTint(PAL.wallTrim).setAlpha(0.35).setScale(0.9),
      img(this, 1230, 150, 'bg-gear').setTint(PAL.wallTrim).setAlpha(0.3).setScale(0.7),
      img(this, 560, 70, 'bg-gear').setTint(PAL.wallTrim).setAlpha(0.18).setScale(0.55),
    ];
    this.bgGears.forEach((gear) => gear.setDepth(-99));
    // windows
    for (const x of [470, 810]) img(this, x, 176, 'window').setDepth(-98).setScale(0.4);
    // wall pipe
    g.fillStyle(PAL.wallTrim, 1);
    g.fillRect(0, 238, W, 12);
    g.fillStyle(lighten(PAL.wallTrim, 0.25), 1);
    g.fillRect(0, 240, W, 3);
    for (const x of [150, 470, 810, 1130]) {
      g.fillStyle(darken(PAL.wallTrim, 0.2), 1);
      g.fillRoundedRect(x - 10, 234, 20, 20, 4);
    }

    // floor
    const fg = this.add.graphics().setDepth(-90);
    fg.fillStyle(PAL.floor, 1);
    fg.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    fg.lineStyle(2, PAL.floorLine, 0.7);
    for (let y = FLOOR_Y + 40; y < H; y += 56) fg.lineBetween(0, y, W, y);
    for (let x = 0; x < W; x += 120) {
      for (let y = FLOOR_Y; y < H; y += 56) {
        const off = ((y - FLOOR_Y) / 56) % 2 === 0 ? 0 : 60;
        fg.lineBetween(x + off, y, x + off, Math.min(H, y + 40));
      }
    }
    // skirting + hazard strip
    fg.fillStyle(PAL.wallTrim, 1);
    fg.fillRect(0, FLOOR_Y - 8, W, 10);
    this.add
      .tileSprite(W / 2, FLOOR_Y + 5, W, 10, 'hazard')
      .setTileScale(0.5, 0.5)
      .setDepth(-89);
  }

  private buildFactoryView(): void {
    this.layoutNodes = {
      machineX: [...MACHINE_X],
      bufferX: [(MACHINE_X[0] + MACHINE_X[1]) / 2, (MACHINE_X[1] + MACHINE_X[2]) / 2],
      y: ITEM_Y,
    };

    // shadows
    const sh = this.add.graphics().setDepth(-5);
    sh.fillStyle(0x000000, 0.14);
    for (const x of MACHINE_X) sh.fillEllipse(x, MACHINE_Y + 94, 170, 22);
    sh.fillEllipse(HOPPER_X, MACHINE_Y + 94, 110, 18);
    sh.fillEllipse(TRUCK_X + 5, MACHINE_Y + 96, 200, 22);

    // belt (one long belt — machines sit on top of it)
    const beltLeft = HOPPER_X - 20;
    const beltRight = TRUCK_X - 70;
    const bw = beltRight - beltLeft;
    const bg = this.add.graphics().setDepth(-4);
    bg.fillStyle(PAL.beltFrameDark, 1);
    for (let x = beltLeft + 30; x < beltRight; x += 110) {
      bg.fillRect(x, BELT_Y + 10, 10, FLOOR_Y + 36 - BELT_Y - 10);
    }
    bg.fillStyle(PAL.beltFrame, 1);
    bg.fillRoundedRect(beltLeft - 6, BELT_Y - 16, bw + 12, 34, 10);
    bg.lineStyle(3, PAL.ink, 1);
    bg.strokeRoundedRect(beltLeft - 6, BELT_Y - 16, bw + 12, 34, 10);
    this.beltTile = this.add
      .tileSprite(beltLeft + bw / 2, BELT_Y - 2, bw, 20, 'belt')
      .setTileScale(0.5, 0.5)
      .setDepth(-3);
    const bl = this.add.graphics().setDepth(-3);
    bl.fillStyle(PAL.ink, 0.25);
    bl.fillRect(beltLeft, BELT_Y + 6, bw, 3);
    // end rollers
    for (const x of [beltLeft - 2, beltRight + 2]) {
      bl.fillStyle(PAL.steel, 1);
      bl.fillCircle(x, BELT_Y, 13);
      bl.lineStyle(3, PAL.ink, 1);
      bl.strokeCircle(x, BELT_Y, 13);
      bl.fillStyle(PAL.ink, 1);
      bl.fillCircle(x, BELT_Y, 3);
    }

    // hopper (source)
    this.hopper = img(this, HOPPER_X, MACHINE_Y - 20, 'hopper').setDepth(2);

    // truck (sink)
    this.truck = img(this, TRUCK_X, MACHINE_Y + 36, 'truck').setDepth(2).setScale(0.44);
    this.truckLogo = txt(this, TRUCK_X - 33, MACHINE_Y - 10, 'TINY FACTORY', {
      size: 12,
      weight: '700',
      color: CSS.ink,
    })
      .setOrigin(0.5)
      .setDepth(3);

    for (let i = 0; i < MACHINE_COUNT; i++) this.buildMachine(i as MachineId, MACHINE_X[i]!);

    // pile-size chips under each belt segment
    for (let i = 0; i < 2; i++) this.buildBuffer(i, this.layoutNodes.bufferX[i]!);
  }

  private buildMachine(id: MachineId, x: number): void {
    const glow = this.add
      .graphics()
      .setPosition(x, MACHINE_Y)
      .setDepth(0);
    this.overdriveGlow.push(glow);

    const container = this.add.container(x, MACHINE_Y).setDepth(1);
    const body = img(this, 0, 0, `machine-${id}`);
    const W = 170;
    const Hh = 190;
    const hit = this.add
      .zone(0, -10, W, Hh + 40)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onMachineTap(id, ptr));
    hit.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.03, duration: 90 }));
    hit.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 120 }));

    // animated tool on top
    let tool: Phaser.GameObjects.Image;
    const extras: Phaser.GameObjects.Image[] = [];
    if (id === 0) {
      tool = img(this, 0, -96, 'saw');
    } else if (id === 1) {
      tool = img(this, 0, -104, 'press');
    } else {
      tool = img(this, -52, -92, 'gear');
      extras.push(img(this, 52, -92, 'gear').setFlipX(true));
    }

    const eyes = img(this, 0, -31, 'eyes-open');
    const lamp = img(this, -63, -62, 'lamp').setTint(PAL.green);
    const sweat = img(this, 58, -60, 'sweat').setVisible(false);

    // progress bar (drawn each frame)
    const bar = this.add.graphics();
    this.progressGfx.push(bar);

    const stateTxt = txt(this, 0, 88, '', { size: 13, weight: '700', color: CSS.white, stroke: CSS.ink, strokeThickness: 4 })
      .setOrigin(0.5)
      .setVisible(false);
    this.stateLabels.push(stateTxt);

    // SLOWEST marker
    const badge = this.add.container(0, -170).setVisible(false);
    const bgfx = this.add.graphics();
    panel(bgfx, -62, -16, 124, 30, 15, PAL.amber, PAL.ink, 1, false);
    const btxt = txt(this, 0, -1, 'SLOWEST!', { size: 15, weight: '700', color: CSS.ink }).setOrigin(0.5);
    const arrow = img(this, 0, 32, 'arrow').setScale(0.45);
    badge.add([bgfx, btxt, arrow]);
    this.bottleneckBadges.push(badge);
    this.badgeTexts.push(btxt);
    this.tweens.add({ targets: badge, y: -160, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    container.add([tool, ...extras, body, eyes, lamp, sweat, bar, stateTxt, hit, badge]);
    this.machineViews.push(container);
    this.machineParts.push({ body, tool, extras, eyes, lamp, sweat, blinkMs: 1500 + Math.random() * 2500, moodMs: 0, mood: null });
  }

  private buildBuffer(id: number, x: number): void {
    const c = this.add.container(x, FLOOR_Y + 22).setDepth(3);
    const g = this.add.graphics();
    const icon = img(this, -24, 0, 'ic-pile').setScale(0.4);
    const t = txt(this, 8, 0, '0/6', { size: 14, weight: '700', color: CSS.white }).setOrigin(0.5);
    c.add([g, icon, t]);
    this.bufferViews.push(c);
    this.bufferChipGfx.push(g);
    this.bufferCountTexts.push(t);
    void id;
  }

  private buildBanners(): void {
    // Boost pill (under the coin HUD)
    this.boostBanner = txt(this, 150, 132, '', {
      size: 17,
      weight: '700',
      color: CSS.ink,
    })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(60);
    this.boostBg = this.add.graphics().setDepth(59).setVisible(false);

    // Foreman "Bolt" speech bubble for hints
    this.hintBox = this.add.container(640, 112).setDepth(70).setAlpha(0);
    this.hintGfx = this.add.graphics();
    this.hintMascot = img(this, 0, 0, 'mascot').setScale(0.5);
    this.hintBanner = txt(this, 0, 0, '', {
      size: 17,
      weight: '600',
      color: CSS.ink,
      align: 'left',
      wrap: 520,
    }).setOrigin(0, 0.5);
    this.hintBox.add([this.hintGfx, this.hintMascot, this.hintBanner]);

    // first-tap tutorial: ring + bouncing arrow on the Assembler
    this.tapPulse = this.add.container(0, 0).setDepth(80).setVisible(false);
    const ring = img(this, 0, 10, 'ring').setScale(1.5).setAlpha(0.8).setTint(PAL.gold);
    const arrow = img(this, 0, -140, 'arrow').setScale(0.7);
    const tapTxt = txt(this, 0, -190, 'TAP!', { size: 26, weight: '700', color: CSS.gold, stroke: CSS.ink, strokeThickness: 6 }).setOrigin(0.5);
    this.tapPulse.add([ring, arrow, tapTxt]);
    this.tweens.add({ targets: arrow, y: -125, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, scale: 1.9, alpha: 0.1, duration: 750, repeat: -1 });

  }

  // ══════════════════════════════════════════════════════════════
  // Input
  // ══════════════════════════════════════════════════════════════

  private onMachineTap(id: MachineId, ptr?: Phaser.Input.Pointer): void {
    this.audio.unlock();
    this.stats.recordTap();
    this.telemetry.once('first_input', { machineId: id });
    this.stopTapPulse();
    this.selectedMachine = id;
    const reg = this.registry.get('game') as GameRegistry;
    if (reg) reg.selectedMachine = id;
    const boosted = this.factory.clickMachine(id);
    this.game.events.emit('select-machine', { id });
    this.game.events.emit('tap');
    const px = ptr ? ptr.worldX : MACHINE_X[id]!;
    const py = ptr ? ptr.worldY : MACHINE_Y;
    this.fx.burst(px, py, 'spark', boosted ? 7 : 3, [PAL.gold, 0xffffff], 70, 380);
    this.setMood(id, 'eyes-happy', 380);
    if (!boosted) this.bounceMachine(id);
  }

  // ══════════════════════════════════════════════════════════════
  // Per-frame visuals
  // ══════════════════════════════════════════════════════════════

  private syncVisuals(dt: number): void {
    const s = dt / 1000;
    this.animTime += dt;
    this.beltTile.tilePositionX -= 60 * s * this.beltSpeedMult();
    for (const [i, gear] of this.bgGears.entries()) gear.rotation += (i % 2 === 0 ? 0.12 : -0.16) * s;
    this.syncMachines(dt);
    this.syncBuffers();
    this.syncItems(dt);
    this.syncOverdriveGlow();
    this.syncBoostBanner();
  }

  private beltSpeedMult(): number {
    const a = this.factory.eventsSys.active;
    return a?.kind === 'productionBoost' ? 2 : 1;
  }

  private syncMachines(dt: number): void {
    const bn = this.factory.highlightedBottleneck;
    const mode = this.factory.bottleneckBadgeMode;
    const blink = Math.floor(this.animTime / 280) % 2 === 0;
    for (let i = 0; i < MACHINE_COUNT; i++) {
      const m = this.factory.machines[i]!;
      const parts = this.machineParts[i]!;
      const bar = this.progressGfx[i]!;
      const label = this.stateLabels[i]!;
      const badge = this.bottleneckBadges[i]!;
      const speed = m.effectiveRatePerMin;
      const working = m.state === 'PROCESSING';

      // progress bar on the machine face
      bar.clear();
      bar.fillStyle(PAL.ink, 0.85);
      bar.fillRoundedRect(-54, -2, 108, 12, 6);
      if (m.progress > 0.01) {
        bar.fillStyle(m.state === 'BLOCKED' ? PAL.red : PAL.green, 1);
        bar.fillRoundedRect(-52, 0, Math.max(8, 104 * Math.min(1, m.progress)), 8, 4);
      }

      // tool animation
      const turn = (dt / 1000) * (working ? 2 + speed / 6 : 0);
      if (i === 0) parts.tool.rotation += turn * 2.2;
      else if (i === 1) parts.tool.y = -104 + (working ? Math.sin(m.progress * Math.PI) * 14 : 0);
      else {
        parts.tool.rotation += turn;
        for (const e of parts.extras) e.rotation -= turn;
      }

      // mood / eyes
      parts.blinkMs -= dt;
      if (parts.moodMs > 0) parts.moodMs -= dt;
      let eyes = 'eyes-open';
      if (m.state === 'BLOCKED') eyes = 'eyes-angry';
      else if (m.state === 'STARVED' || (m.state === 'IDLE' && i > 0)) eyes = 'eyes-sleepy';
      if (parts.moodMs > 0 && parts.mood) eyes = parts.mood;
      else if (parts.blinkMs < 0) {
        eyes = 'eyes-closed';
        if (parts.blinkMs < -110) parts.blinkMs = 1800 + Math.random() * 2600;
      }
      if (parts.eyes.texture.key !== eyes) parts.eyes.setTexture(eyes);

      // status lamp + sweat
      if (m.state === 'BLOCKED') {
        parts.lamp.setTint(blink ? PAL.red : darken(PAL.red, 0.5));
        parts.sweat.setVisible(true);
        parts.sweat.y = -60 + Math.sin(this.animTime / 120) * 3;
        label.setText('JAMMED!').setColor(CSS.red).setVisible(true);
      } else if (m.state === 'STARVED' || (m.state === 'IDLE' && i > 0)) {
        parts.lamp.setTint(PAL.amber);
        parts.sweat.setVisible(false);
        label.setText('waiting…').setColor(CSS.muted).setVisible(i > 0);
      } else {
        parts.lamp.setTint(working ? PAL.green : PAL.amber);
        parts.sweat.setVisible(false);
        label.setVisible(false);
      }

      // SLOWEST marker
      const isBn = bn === i && mode !== 'hidden';
      badge.setVisible(isBn);
      if (isBn) {
        const t = this.badgeTexts[i]!;
        if (mode === 'improved_still') {
          const pct = Math.max(0, this.factory.improvedBadgeDeltaPct);
          t.setText(`+${pct}% · STILL SLOWEST`).setFontSize(13);
        } else {
          t.setText('SLOWEST!').setFontSize(15);
        }
      }
      const glow = this.overdriveGlow[i]!;
      glow.clear();
      if (isBn) {
        const pulse = 0.55 + 0.45 * Math.sin(this.animTime / 180);
        glow.lineStyle(6, PAL.amber, pulse);
        glow.strokeRoundedRect(-92, -84, 184, 184, 28);
      }
    }
  }

  private syncBuffers(): void {
    for (let i = 0; i < 2; i++) {
      const b = this.factory.buffers[i]!;
      const g = this.bufferChipGfx[i]!;
      const count = this.bufferCountTexts[i]!;
      const ratio = b.fillRatio;
      const full = b.length >= b.capacity;
      const color = full ? PAL.red : ratio > 0.6 ? PAL.amber : PAL.uiPanel;
      const label = full ? 'FULL!' : `${b.length}/${b.capacity}`;
      if (count.text !== label) count.setText(label);
      count.setColor(full || ratio > 0.6 ? CSS.ink : CSS.white);
      g.clear();
      g.fillStyle(color, 1);
      g.fillRoundedRect(-44, -14, 88, 28, 14);
      g.lineStyle(3, PAL.ink, 1);
      g.strokeRoundedRect(-44, -14, 88, 28, 14);
      const shake = full ? Math.sin(this.animTime / 40) * 1.5 : 0;
      this.bufferViews[i]!.x = this.layoutNodes.bufferX[i]! + shake;
    }
  }

  /** Product id for a line item (golden items keep the current product art). */
  private productOf(color: number, golden: boolean): ProductId {
    if (golden) return this.factory.economy.currentProduct;
    for (const pid of PRODUCT_ORDER) if (PRODUCTS[pid].color === color) return pid;
    return this.factory.economy.currentProduct;
  }

  private itemTarget(loc: ItemLoc, k: number): { x: number; y: number } {
    if (loc === 'm0' || loc === 'm1' || loc === 'm2') {
      const idx = Number(loc[1]);
      return { x: MACHINE_X[idx]!, y: ITEM_Y };
    }
    // buffer: queue up from the next machine's intake, then pile upward
    const idx = Number(loc[1]);
    const right = MACHINE_X[idx + 1]! - 102;
    const left = MACHINE_X[idx]! + 100;
    const perRow = Math.max(3, Math.floor((right - left) / 30));
    const row = Math.floor(k / perRow);
    const col = k % perRow;
    return {
      x: right - col * 30 - (row % 2) * 14,
      y: ITEM_Y - row * 24,
    };
  }

  private syncItems(dt: number): void {
    const live = this.liveIds;
    live.clear();
    const s = dt / 1000;

    const place = (id: number, color: number, golden: boolean, loc: ItemLoc, k: number) => {
      live.add(id);
      let tr = this.tracked.get(id);
      const pid = this.productOf(color, golden);
      if (!tr) {
        const sprite = this.itemPool.pop() ?? this.add.image(0, 0, 'raw-boxes');
        sprite.setScale(ITEM_SCALE).setAlpha(1).setVisible(true).setDepth(golden ? 6 : 5).setAngle(0);
        sprite.setTexture(itemKey('raw', pid));
        if (golden) sprite.setTint(PAL.gold);
        else sprite.clearTint();
        // drop in from the hopper spout
        sprite.setPosition(HOPPER_X, MACHINE_Y + 40);
        this.tweens.add({ targets: this.hopper, scaleX: 0.53, scaleY: 0.47, duration: 70, yoyo: true });
        tr = { sprite, loc, stage: 'raw', golden };
        this.tracked.set(id, tr);
        this.itemSprites.set(id, sprite);
      }
      if (tr.loc !== loc) {
        const next: ItemStage = loc === 'b0' || loc === 'm1' ? 'part' : loc === 'b1' || loc === 'm2' ? 'prod' : 'raw';
        if (next !== tr.stage) {
          tr.stage = next;
          tr.sprite.setTexture(itemKey(next, pid));
          this.popItem(tr.sprite);
          this.fx.burst(tr.sprite.x + 20, tr.sprite.y - 6, 'puff', 2, [0xffffff], 22, 380, 0.25);
        }
        tr.loc = loc;
      }
      const tgt = this.itemTarget(loc, k);
      const sp = tr.sprite;
      const speed = 460 * this.beltSpeedMult();
      const dx = tgt.x - sp.x;
      const dy = tgt.y - sp.y;
      sp.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * s);
      sp.y += Math.sign(dy) * Math.min(Math.abs(dy), 520 * s);
      // wobble while being processed
      if (loc[0] === 'm') {
        const m = this.factory.machines[Number(loc[1])]!;
        const wob = m.state === 'PROCESSING' ? Math.sin(this.animTime / 50) * 3 : 0;
        sp.setAngle(wob);
      } else sp.setAngle(0);
      if (golden) sp.setTint(PAL.gold);
    };

    for (let i = 0; i < MACHINE_COUNT; i++) {
      const m = this.factory.machines[i]!;
      if (m.current) place(m.current.id, m.current.color, m.current.golden, `m${i}` as ItemLoc, 0);
    }
    for (let i = 0; i < 2; i++) {
      const b = this.factory.buffers[i]!;
      b.items.forEach((p, k) => place(p.id, p.color, p.golden, `b${i}` as ItemLoc, k));
    }

    for (const [id, tr] of this.tracked) {
      if (live.has(id)) continue;
      this.tracked.delete(id);
      this.itemSprites.delete(id);
      if (tr.loc === 'm2') this.shipItem(tr);
      else {
        tr.sprite.setVisible(false);
        this.itemPool.push(tr.sprite);
      }
    }
  }

  /** Finished product leaves the Packer and hops into the truck. */
  private shipItem(tr: TrackedItem): void {
    const sp = tr.sprite;
    const pid = this.productOf(0, false);
    sp.setTexture(itemKey('pack', pid));
    if (tr.golden) sp.setTint(PAL.gold);
    const sx = sp.x;
    const sy = sp.y;
    const tx = TRUCK_X - 30 + Math.random() * 20;
    const ty = MACHINE_Y + 20;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 360,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        sp.x = sx + (tx - sx) * t;
        sp.y = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 70;
        sp.setAngle(t * 200);
        sp.setScale(ITEM_SCALE * (1 - t * 0.35));
      },
      onComplete: () => {
        sp.setVisible(false).setScale(ITEM_SCALE).setAngle(0);
        this.itemPool.push(sp);
        this.truckBump();
      },
    });
  }

  private truckBump(): void {
    this.tweens.killTweensOf([this.truck, this.truckLogo]);
    this.truck.setY(MACHINE_Y + 36);
    this.truckLogo.setY(MACHINE_Y - 10);
    this.tweens.add({ targets: [this.truck, this.truckLogo], y: '+=4', duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    if (Math.random() < 0.35) this.fx.burst(TRUCK_X + 100, MACHINE_Y + 70, 'puff', 1, [0xdde3ee], 16, 520, 0.35);
  }

  private popItem(sp: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: sp, scaleX: ITEM_SCALE * 1.3, scaleY: ITEM_SCALE * 1.3, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  private setMood(id: MachineId, mood: string, ms: number): void {
    const p = this.machineParts[id];
    if (!p) return;
    p.mood = mood;
    p.moodMs = ms;
  }

  private bounceMachine(id: MachineId): void {
    const view = this.machineViews[id];
    if (!view) return;
    this.tweens.killTweensOf(view);
    view.setScale(1);
    this.tweens.add({
      targets: view,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private pulseMachine(id: MachineId): void {
    const p = this.machineParts[id];
    if (!p) return;
    this.setMood(id, 'eyes-happy', 160);
    this.tweens.killTweensOf(p.body);
    p.body.setScale(0.5);
    this.tweens.add({ targets: p.body, scaleX: 0.515, scaleY: 0.485, duration: 70, yoyo: true });
  }

  private flashSell(golden: boolean): void {
    const x = TRUCK_X - 20;
    const y = MACHINE_Y + 10;
    this.game.events.emit('coin-fly', { x, y, golden });
    if (golden) {
      this.audio.play('golden');
      this.fx.burst(x, y, 'spark', 14, [PAL.gold, 0xffffff], 110, 650);
      this.cameras.main.shake(160, 0.004);
    }
  }

  private showBoost(boost: ActiveBoost): void {
    this.drawBoostPill(this.boostLabel(boost));
    this.boostBanner.setScale(0.3);
    this.tweens.add({ targets: this.boostBanner, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.fx.burst(this.boostBanner.x, this.boostBanner.y, 'spark', 10, [PAL.gold, 0xffffff], 90, 500);
  }

  private boostLabel(boost: ActiveBoost): string {
    return boost.kind === 'productionBoost'
      ? 'PRODUCTION x2'
      : `OVERDRIVE: ${MACHINE_LABELS[boost.machineId ?? 0]}`;
  }

  private drawBoostPill(label: string): void {
    this.boostBanner.setText(label).setVisible(true);
    const w = this.boostBanner.width + 36;
    this.boostBg.clear().setVisible(true);
    panel(this.boostBg, 150 - w / 2, 132 - 17, w, 34, 17, PAL.gold, PAL.ink, 1, true);
  }

  private hideBoost(): void {
    this.boostBanner.setVisible(false);
    this.boostBg.setVisible(false);
  }

  private syncBoostBanner(): void {
    const active = this.factory.eventsSys.active;
    if (!active) {
      if (this.boostBanner.visible) this.hideBoost();
      return;
    }
    const sec = Math.ceil(active.remainingMs / 1000);
    const label = `${this.boostLabel(active)}  ${sec}s`;
    if (this.boostBanner.text !== label) this.drawBoostPill(label);
  }

  private syncOverdriveGlow(): void {
    const active = this.factory.eventsSys.active;
    for (let i = 0; i < MACHINE_COUNT; i++) {
      const onOd = active?.kind === 'overdrive' && active.machineId === i;
      if (onOd && Math.random() < 0.25) {
        this.fx.burst(MACHINE_X[i]! + (Math.random() - 0.5) * 120, MACHINE_Y - 90, 'puff', 1, [0xffb627, 0xff5e3a], 30, 500, 0.4);
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
    this.showHintText(req.text);
    this.telemetry.recordHintDisplayed(req.id, req.text);
  }

  private showHintText(raw: string): void {
    const text = friendly(raw);
    // Don't echo the goal pill — say something only when it adds information
    if (this.hintRetired.has(text) || this.echoesGoal(text)) {
      if (this.hintBox.alpha > 0) this.tweens.add({ targets: this.hintBox, alpha: 0, duration: 200 });
      return;
    }
    if (this.hintBanner.text === text && this.hintBox.alpha > 0.5) return;
    this.hintBanner.setText(text);
    const tw = Math.min(540, this.hintBanner.width);
    const th = Math.max(46, this.hintBanner.height + 18);
    const total = tw + 72;
    const left = -total / 2;
    this.hintMascot.setPosition(left + 26, 0);
    this.hintBanner.setPosition(left + 58, 0);
    this.hintGfx.clear();
    panel(this.hintGfx, left + 44, -th / 2, tw + 30, th, 16, 0xffffff, PAL.ink, 1, true);
    this.hintGfx.fillStyle(0xffffff, 1);
    this.hintGfx.fillTriangle(left + 46, -6, left + 46, 8, left + 36, 2);
    this.tweens.killTweensOf(this.hintBox);
    this.hintBox.setScale(0.85).setAlpha(1);
    this.tweens.add({ targets: this.hintBox, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.hintIdleMs = 0;
    this.hintShownMs = 0;
  }

  private echoesGoal(text: string): boolean {
    return (
      text === friendly(this.factory.sessionLabel()) ||
      text === friendly(this.factory.sessionGoal.label())
    );
  }

  private syncHintBanner(dt: number): void {
    if (this.hintBox.alpha > 0.5) {
      this.hintShownMs += dt;
      // Any single message stays at most ~9 s, then Bolt goes quiet
      if (this.hintShownMs > 9000 && this.hintHoldMs <= 0) {
        this.hintRetired.add(this.hintBanner.text);
        this.tweens.add({ targets: this.hintBox, alpha: 0, duration: 300 });
        return;
      }
    }
    const cur = this.factory.hints.visible;
    if (this.hintHoldMs > 0) {
      this.hintHoldMs -= dt;
      return;
    }
    if (!cur) {
      this.hintIdleMs += dt;
      if (this.hintIdleMs > 900 && this.hintBox.alpha > 0 && !this.tweens.isTweening(this.hintBox)) {
        this.tweens.add({ targets: this.hintBox, alpha: 0, duration: 300 });
      }
      return;
    }
    this.hintIdleMs = 0;
    const want = friendly(cur.text);
    if (this.hintRetired.has(want) || this.echoesGoal(want)) return;
    if (this.hintBanner.text !== want || this.hintBox.alpha < 0.5) {
      this.showHintText(cur.text);
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
    }
    this.game.events.emit('payoff-banner', {
      before,
      after,
      message,
      reduced,
    });
  }

  /** Called by UIScene right after a successful purchase. */
  celebrateUpgrade(machineId: MachineId): void {
    const x = MACHINE_X[machineId]!;
    this.bounceMachine(machineId);
    this.setMood(machineId, 'eyes-happy', 700);
    this.fx.burst(x, MACHINE_Y - 40, 'spark', 12, [PAL.green, PAL.gold, 0xffffff], 110, 560);
    this.fx.ring(x, MACHINE_Y - 10, PAL.green);
  }

  private celebrateStage1(): void {
    const tp0 = this.telemetry.throughputInitial ?? 0;
    const tp1 = this.factory.getThroughputPerMin();
    const bn = this.factory.highlightedBottleneck;
    const wip = this.factory.getWip();
    this.factory.hints.clear();
    this.offerHint({
      id: 'stage1_celebrate',
      text: `Goal done! Output ${tp0.toFixed(0)} → ${tp1.toFixed(0)} per minute`,
      priority: 'objective',
      ttlMs: 1_800,
    });
    this.celebrate('GOAL COMPLETE!');
    this.game.events.emit('session-goal', {
      phase: 'celebrate',
      before: tp0,
      after: tp1,
      wip,
      bottleneck: bn,
    });
    this.time.delayedCall(1_200, () => {
      this.offerHint({
        id: 'goal_stage_flow_stability',
        text: this.factory.sessionGoal.label(),
        priority: 'objective',
        ttlMs: 7_000,
      });
    });
  }

  /** Big moment: confetti + shake + jingle. */
  celebrate(title: string): void {
    this.audio.play('goal');
    Platform.happytime();
    this.fx.confetti(90);
    if (!this.prefersReducedMotion()) this.cameras.main.shake(220, 0.005);
    this.game.events.emit('big-banner', { title });
  }

  private startTapPulse(): void {
    const x = this.layoutNodes.machineX[1] ?? this.layoutNodes.machineX[0]!;
    this.tapPulse.setPosition(x, MACHINE_Y - 20).setVisible(true);
  }

  private stopTapPulse(): void {
    this.tapPulse.setVisible(false);
  }

  private showInsight(title: string, body: string): void {
    // Insights are spoken by the foreman, then the bubble stays a few seconds
    this.showHintText(`${body}`);
    this.hintHoldMs = 5000;
    void title;
  }

  /** "While you were away" — idle-game staple for day-1 retention. */
  private grantOfflineEarnings(savedAt: number | undefined): void {
    if (!savedAt) return;
    const awaySec = (Date.now() - savedAt) / 1000;
    if (!Number.isFinite(awaySec) || awaySec < OFFLINE.minAwaySec) return;
    if (this.factory.upgrades.totalPurchased < OFFLINE.minUpgrades) return;
    const rates = this.factory.machines.map((m) => m.effectiveRatePerMin);
    const perMin = Math.min(...rates);
    const unit = PRODUCTS[this.factory.economy.currentProduct].baseValue;
    const secs = Math.min(awaySec, OFFLINE.capSec);
    const amount = Math.floor(
      Math.min((perMin / 60) * unit * secs * OFFLINE.efficiency, perMin * unit * OFFLINE.maxIncomeMinutes),
    );
    if (amount < 5) return;
    this.pendingOffline = { amount, awaySec };
  }

  /** UIScene asks for (and consumes) the pending offline reward. */
  takeOfflineReward(): { amount: number; awaySec: number } | null {
    const r = this.pendingOffline;
    this.pendingOffline = null;
    return r;
  }

  collectOffline(amount: number): void {
    this.factory.economy.coins += amount;
    this.audio.unlock();
    this.audio.play('unlock');
    this.saveSystem.save();
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
        text: 'Watch the pile shrink…',
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
