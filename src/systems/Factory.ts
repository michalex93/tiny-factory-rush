import {
  EVENTS,
  PRODUCTS,
  REVEAL,
  TOYS_MILESTONE,
  UPGRADE_PAYOFF,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import { ProductionLine, type LineSnapshot } from '../simulation';
import { Economy } from './Economy';
import { Events } from './Events';
import { HintQueue } from './HintQueue';
import { InsightTracker, type InsightId } from './Insights';
import { McCampaign, type McCampaignState, type McEvent } from './McCampaign';
import { Progression } from './Progression';
import {
  SessionGoal,
  buildOptimizationChoices,
  type BranchId,
  type GoalStageEvent,
  type OptimizationOption,
  type PayoffKind,
  type SessionGoalState,
} from './SessionGoal';
import { classifyUpgradePayoff } from './UpgradePayoff';
import { Upgrades } from './Upgrades';
import type { Stats } from './Stats';

export type BottleneckBadgeMode = 'hidden' | 'bottleneck' | 'improved_still';

export interface FactoryEvents {
  onSell?: (amount: number, xHint: number, golden: boolean) => void;
  onProcess?: (machineId: MachineId) => void;
  onSpawn?: (golden: boolean) => void;
  onClickBoost?: (machineId: MachineId) => void;
  onUnlock?: (productName: string) => void;
  onInsight?: (title: string, body: string) => void;
  onUpgradeImpact?: (
    before: number,
    after: number,
    deltaPct: number,
    beforeWip: number,
    afterWip: number,
    payoff?: {
      kind: PayoffKind;
      message: string;
      wipTrend: 'down' | 'up' | 'flat';
      bottleneckBefore: MachineId | null;
      bottleneckAfter: MachineId | null;
    },
  ) => void;
  onBottleneckShown?: (machineId: MachineId) => void;
  onBottleneckResolved?: (machineId: MachineId) => void;
  onBottleneckPersisted?: (machineId: MachineId) => void;
  onBottleneckShifted?: (from: MachineId, to: MachineId) => void;
  onSessionGoalStart?: () => void;
  onSessionGoalProgress?: (throughput: number, target: number) => void;
  onSessionGoalComplete?: (success: boolean) => void;
  onSessionGoalStageStart?: (stageIndex: number, stageId: string) => void;
  onSessionGoalStageProgress?: (
    stageIndex: number,
    stageId: string,
    progress: number,
    payload?: Record<string, number | string | boolean | null>,
  ) => void;
  onSessionGoalStageComplete?: (stageIndex: number, stageId: string) => void;
  onSessionGoalChainComplete?: () => void;
  onOptimizationChoiceReady?: (options: OptimizationOption[]) => void;
  onOptimizationChoiceSelected?: (branch: string) => void;
  onOptimizationChoicePurchased?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onStage2Armed?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onBranchGoalStart?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onBranchGoalProgress?: (
    progress: number,
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onBranchGoalComplete?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onConvergenceGoalStart?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onConvergenceGoalComplete?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onNextMilestoneShown?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToysMilestoneProgress?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToysThresholdReached?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToysReady?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToysOpened?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onFirstToyAction?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onFirstToyProduced?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToyMasteryShown?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToyMasteryAction?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToyMasteryProgress?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onToyMasteryComplete?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onSmartphonesMilestoneShown?: (
    payload: Record<string, number | string | boolean | null>,
  ) => void;
  onMcEvent?: (type: string, payload: Record<string, number | string | boolean | null>) => void;
  onGlobalEventSuppressed?: (kind: string) => void;
  onGlobalEventsResumed?: () => void;
  onOnboardingComplete?: () => void;
}

export interface FactorySnapshot {
  line?: LineSnapshot;
  events?: ReturnType<Events['snapshot']>;
  unlocked?: string[];
  insights?: InsightId[];
  sessionMs?: number;
  sessionGoal?: SessionGoalState | null;
  mcCampaign?: McCampaignState | null;
  hintUnderstood?: string[];
  selectedChoiceId?: string | null;
}

/**
 * Game facade: economy + progression + events + industrial ProductionLine.
 */
export class Factory {
  readonly line: ProductionLine;
  readonly economy: Economy;
  readonly upgrades: Upgrades;
  readonly eventsSys: Events;
  readonly progression: Progression;
  readonly insights = new InsightTracker();
  readonly sessionGoal = new SessionGoal();
  readonly mc = new McCampaign();
  readonly hints = new HintQueue();
  events: FactoryEvents = {};

  sessionMs = 0;

  /** Live bottleneck highlight for UI. */
  highlightedBottleneck: MachineId | null = null;
  bottleneckBadgeMode: BottleneckBadgeMode = 'hidden';
  /** Last Speed-style improvement % for IMPROVED +X% badge copy. */
  improvedBadgeDeltaPct = 0;
  private bottleneckAnnounced = false;
  private lastBottleneck: MachineId | null = null;
  private throughputBeforeUpgrade: number | null = null;
  private wipBeforeUpgrade: number | null = null;
  private bottleneckBeforeUpgrade: MachineId | null = null;
  private upgradedMachine: MachineId | null = null;
  private pendingImpactCheckMs = 0;
  private wipTrendSamples: number[] = [];
  private improvedBadgeMs = 0;
  private goalStarted = false;
  private onboardingEventsLocked = true;
  private stage1CompleteEmitted = false;
  pendingChoiceOptions: OptimizationOption[] = [];
  private toysProgressBucket = -1;
  private toysThresholdEmitted = false;
  private toysReadyEmitted = false;
  private firstToyActionEmitted = false;
  private firstToyProducedEmitted = false;
  /** Dev-only preview of badge states. */
  private previewBadgeActive = false;

  constructor(economy?: Economy, upgrades?: Upgrades, progression?: Progression) {
    this.economy = economy ?? new Economy();
    this.upgrades = upgrades ?? new Upgrades();
    this.progression = progression ?? new Progression();
    this.eventsSys = new Events();
    this.line = new ProductionLine();
    this.wireLine();
    this.upgrades.applyTo(
      this.line.machines,
      this.line.buffers,
      this.bonusSpec(),
    );
    this.eventsSys.suppress();
    this.eventsSys.hooks.onSuppressedAttempt = (kind) => {
      this.events.onGlobalEventSuppressed?.(kind);
    };
  }

  private wireLine(): void {
    this.line.productColor = this.economy.productColor;
    this.line.rollGolden = () => this.eventsSys.rollGolden();
    this.line.events = {
      onSell: (_base, golden, product) => {
        const mult = this.upgrades.totalValueMultiplier(this.bonusSpec());
        const goldenMult = golden ? EVENTS.golden.valueMult : 1;
        const amount = Math.max(
          1,
          Math.round(this.economy.baseProductValue * mult * goldenMult),
        );
        const split = this.mc.splitSale(amount);
        this.economy.creditSale(amount, split.toCash);
        this.events.onSell?.(amount, 0.92, golden);
        this.notePossibleFirstToy(amount, golden);
        for (const ev of this.mc.noteSmartphoneSale(this, amount)) {
          this.dispatchMcEvent(ev);
        }
        void product;
      },
      onProcessDone: (id) => this.events.onProcess?.(id),
      onSpawn: (g) => this.events.onSpawn?.(g),
      onClickBoost: (id) => this.events.onClickBoost?.(id),
    };
  }

  resetRuntime(): void {
    this.line.resetRuntime();
    this.upgrades.applyTo(
      this.line.machines,
      this.line.buffers,
      this.bonusSpec(),
    );
  }

  /** Deterministic income/min from line rate × value (for goals). */
  private bonusSpec(): { machineId: MachineId; type: UpgradeType } | null {
    if (!this.mc.state.bonusUpgradeGranted) return null;
    if (
      this.mc.state.bonusUpgradeMachineId == null ||
      !this.mc.state.bonusUpgradeType
    ) {
      return null;
    }
    return {
      machineId: this.mc.state.bonusUpgradeMachineId,
      type: this.mc.state.bonusUpgradeType,
    };
  }

  private reapplyUpgrades(): void {
    this.upgrades.applyTo(
      this.line.machines,
      this.line.buffers,
      this.bonusSpec(),
    );
  }

  lineIncomePerMin(): number {
    const tp = this.getThroughputPerMin();
    return (
      tp *
      this.economy.baseProductValue *
      this.upgrades.totalValueMultiplier(this.bonusSpec())
    );
  }

  update(dtMs: number): void {
    this.sessionMs += dtMs;
    this.economy.update(dtMs);
    this.eventsSys.update(dtMs);
    this.hints.update(dtMs);

    this.line.spawnRateMult = this.eventsSys.productionMult;
    this.line.machineSpeedMult = {
      0: this.eventsSys.productionMult * this.eventsSys.machineSpeedMult(0),
      1: this.eventsSys.productionMult * this.eventsSys.machineSpeedMult(1),
      2: this.eventsSys.productionMult * this.eventsSys.machineSpeedMult(2),
    };
    this.line.productColor = this.economy.productColor;

    this.mc.accrueFundBudget(dtMs);
    this.line.update(dtMs);
    this.updateBottleneckTeaching();
    this.settleUpgradeImpact(dtMs);
    this.updateSessionGoal(dtMs);
    this.updateToysMilestone();
    for (const ev of this.mc.update(this, dtMs)) {
      this.dispatchMcEvent(ev);
    }

    if (this.improvedBadgeMs > 0 && !this.previewBadgeActive) {
      this.improvedBadgeMs -= dtMs;
      if (this.improvedBadgeMs <= 0 && this.bottleneckBadgeMode === 'improved_still') {
        const live = this.line.getBottleneckId();
        if (live !== null && live === this.highlightedBottleneck) {
          this.bottleneckBadgeMode = 'bottleneck';
        }
      }
    }

    if (this.pendingImpactCheckMs > 0) {
      this.wipTrendSamples.push(this.getWip());
      if (this.wipTrendSamples.length > 12) this.wipTrendSamples.shift();
    }
  }

  revealUpgrades(): boolean {
    return (
      this.economy.productsSold >= REVEAL.upgradesAfterSales ||
      this.upgrades.totalPurchased >= 1
    );
  }

  revealFullUpgradeGrid(): boolean {
    return this.upgrades.totalPurchased >= REVEAL.fullUpgradeGridAfter;
  }

  revealMetrics(): boolean {
    return this.upgrades.totalPurchased >= REVEAL.metricsAfterUpgrades;
  }

  revealUnlockPanel(): boolean {
    return this.upgrades.totalPurchased >= REVEAL.unlockAfterUpgrades;
  }

  revealWip(): boolean {
    return this.revealMetrics() || this.sessionMs >= REVEAL.wipMs;
  }

  revealUtilization(): boolean {
    return (
      this.upgrades.totalPurchased >= 2 || this.sessionMs >= REVEAL.utilizationMs
    );
  }

  /** Highlight relevant upgrades for current stage / choice. */
  relevantUpgradeKeys(): Set<string> {
    const keys = new Set<string>();
    if (this.pendingChoiceOptions.length > 0) {
      for (const o of this.pendingChoiceOptions) {
        keys.add(`${o.machineId}:${o.type}`);
      }
      return keys;
    }
    const phase = this.sessionGoal.phase;
    if (phase === 'awaiting_purchase' && this.sessionGoal.selectedBranch) {
      const o = this.pendingChoiceOptions[0];
      void o;
      const opts = buildOptimizationChoices(this);
      const pick = opts.find((x) => x.id === this.sessionGoal.selectedBranch);
      if (pick) keys.add(`${pick.machineId}:${pick.type}`);
      return keys;
    }
    if (phase === 'stage1' || phase === 'branch') {
      const bn = this.suggestedUpgradeMachine();
      if (this.sessionGoal.selectedBranch === 'margin') {
        keys.add(`1:value`);
      } else {
        keys.add(`${bn}:speed`);
      }
    } else if (phase === 'convergence' || phase === 'post_chain') {
      keys.add(`1:value`);
      keys.add(`${this.suggestedUpgradeMachine()}:speed`);
    }
    return keys;
  }

  suggestedUpgradeMachine(): MachineId {
    return this.highlightedBottleneck ?? this.line.getBottleneckId() ?? 1;
  }

  private updateBottleneckTeaching(): void {
    const bn = this.line.getBottleneckId();

    if (
      !this.bottleneckAnnounced &&
      this.sessionMs >= REVEAL.bottleneckMinSessionMs
    ) {
      const buf0 = this.buffers[0]!;
      const fillOk = buf0.fillRatio >= REVEAL.bottleneckBufferFill;
      const utilB = this.machines[1]!.recentUtilization(10_000, this.line.clockMs);
      if (fillOk || utilB > 0.55 || (bn !== null && this.economy.productsSold >= 1)) {
        this.highlightedBottleneck = bn ?? 1;
        this.bottleneckAnnounced = true;
        this.bottleneckBadgeMode = 'bottleneck';
        this.events.onBottleneckShown?.(this.highlightedBottleneck);
      }
    }

    if (this.bottleneckAnnounced && bn !== null) {
      // Keep badge on live bottleneck (not sticky-obsolete)
      if (
        this.improvedBadgeMs <= 0 ||
        this.bottleneckBadgeMode !== 'improved_still'
      ) {
        if (this.highlightedBottleneck !== bn) {
          if (this.highlightedBottleneck !== null) {
            this.events.onBottleneckShifted?.(this.highlightedBottleneck, bn);
          }
          this.highlightedBottleneck = bn;
          this.bottleneckBadgeMode = 'bottleneck';
        }
      }

      if (
        this.lastBottleneck !== null &&
        bn !== this.lastBottleneck
      ) {
        this.events.onBottleneckResolved?.(this.lastBottleneck);
        const insight = this.insights.mark('bottleneck_cleared');
        if (insight) this.events.onInsight?.(insight.title, insight.body);
      }
    }

    this.lastBottleneck = bn;
  }

  private updateSessionGoal(dtMs: number): void {
    if (
      !this.goalStarted &&
      this.upgrades.totalPurchased >= REVEAL.sessionGoalAfterUpgrades
    ) {
      const focus = this.suggestedUpgradeMachine();
      if (this.sessionGoal.tryStart(this, focus)) {
        this.goalStarted = true;
        this.events.onSessionGoalStart?.();
        this.events.onSessionGoalStageStart?.(0, 'throughput');
      }
    }

    if (!this.sessionGoal.isActive && this.sessionGoal.status !== 'active') {
      // still tick if active via isActive
    }

    const events = this.sessionGoal.tickHold(this, dtMs);
    for (const ev of events) {
      this.dispatchGoalEvent(ev);
    }
    const masteryEv = this.sessionGoal.updateToyMastery(this, dtMs);
    for (const ev of masteryEv) {
      this.dispatchGoalEvent(ev);
    }
  }

  private dispatchGoalEvent(ev: GoalStageEvent): void {
    if (ev.type === 'stage_start' && ev.stageId) {
      this.events.onSessionGoalStageStart?.(ev.stageIndex, ev.stageId);
    }
    if (ev.type === 'stage_progress' && ev.stageId) {
      this.events.onSessionGoalStageProgress?.(
        ev.stageIndex,
        ev.stageId,
        ev.progress ?? 0,
        ev.payload,
      );
      if (ev.stageId === 'throughput' && ev.payload) {
        this.events.onSessionGoalProgress?.(
          Number(ev.payload.throughput ?? 0),
          Number(ev.payload.target ?? 0),
        );
      }
    }
    if (ev.type === 'stage_complete' && ev.stageId) {
      this.events.onSessionGoalStageComplete?.(ev.stageIndex, ev.stageId);
      if (ev.stageId === 'throughput' && !this.stage1CompleteEmitted) {
        this.stage1CompleteEmitted = true;
        this.events.onSessionGoalComplete?.(true);
        this.unlockGlobalEventsAfterOnboarding(true);
      }
    }
    if (ev.type === 'choice_ready') {
      this.pendingChoiceOptions = buildOptimizationChoices(this);
      this.events.onOptimizationChoiceReady?.(this.pendingChoiceOptions);
    }
    if (ev.type === 'choice_selected') {
      this.events.onOptimizationChoiceSelected?.(String(ev.payload?.branch ?? ''));
    }
    if (ev.type === 'choice_purchased') {
      this.pendingChoiceOptions = [];
      this.events.onOptimizationChoicePurchased?.(ev.payload ?? {});
    }
    if (ev.type === 'stage_2_armed') {
      this.events.onStage2Armed?.(ev.payload ?? {});
    }
    if (ev.type === 'branch_goal_start') {
      this.events.onBranchGoalStart?.(ev.payload ?? {});
    }
    if (ev.type === 'branch_goal_progress') {
      this.events.onBranchGoalProgress?.(ev.progress ?? 0, ev.payload ?? {});
    }
    if (ev.type === 'branch_goal_complete') {
      this.events.onBranchGoalComplete?.(ev.payload ?? {});
    }
    if (ev.type === 'convergence_goal_start') {
      this.events.onConvergenceGoalStart?.(ev.payload ?? {});
    }
    if (ev.type === 'convergence_goal_complete') {
      this.events.onConvergenceGoalComplete?.(ev.payload ?? {});
    }
    if (ev.type === 'next_milestone_shown') {
      this.events.onNextMilestoneShown?.(ev.payload ?? {});
    }
    if (ev.type === 'toy_mastery_shown') {
      this.events.onToyMasteryShown?.(ev.payload ?? {});
    }
    if (ev.type === 'toy_mastery_progress') {
      this.events.onToyMasteryProgress?.(ev.payload ?? {});
    }
    if (ev.type === 'toy_mastery_complete') {
      this.events.onToyMasteryComplete?.(ev.payload ?? {});
    }
    if (ev.type === 'smartphones_milestone_shown') {
      this.events.onSmartphonesMilestoneShown?.(ev.payload ?? {});
      // M-C: hand off to Expansion Fund campaign
      for (const mev of this.mc.beginAfterMastery(this)) {
        this.dispatchMcEvent(mev);
      }
    }
    if (ev.type === 'chain_complete') {
      this.events.onSessionGoalChainComplete?.();
    }
  }

  private dispatchMcEvent(ev: McEvent): void {
    this.events.onMcEvent?.(ev.type, ev.payload ?? {});
    if (ev.type === 'smartphones_milestone_shown') {
      this.events.onSmartphonesMilestoneShown?.(ev.payload ?? {});
    }
    if (ev.type === 'smartphone_build_pressed') {
      this.events.onUnlock?.(PRODUCTS.smartphones.name);
    }
  }

  sessionLabel(): string {
    if (this.mc.isActive) {
      const l = this.mc.label(this);
      if (l) return l;
    }
    return this.sessionGoal.label();
  }

  sessionDetailLines(): string[] {
    if (this.mc.isActive) return this.mc.detailLines(this);
    if (this.sessionGoal.phase === 'toy_mastery') {
      return this.sessionGoal.planKpiLines(this);
    }
    return [];
  }

  /** Player picks Throughput or Margin card (must still buy). */
  selectOptimizationBranch(branch: BranchId): void {
    const evs = this.sessionGoal.selectBranch(branch, this);
    for (const ev of evs) this.dispatchGoalEvent(ev);
  }

  unlockGlobalEventsAfterOnboarding(emitComplete = true): void {
    if (!this.onboardingEventsLocked) return;
    this.onboardingEventsLocked = false;
    this.eventsSys.resume();
    this.events.onGlobalEventsResumed?.();
    if (emitComplete) this.events.onOnboardingComplete?.();
  }

  get machines() {
    return this.line.machines;
  }

  get buffers() {
    return this.line.buffers;
  }

  clickMachine(machineId: MachineId): boolean {
    return this.line.clickMachine(machineId);
  }

  buyUpgrade(machineId: MachineId, type: UpgradeType): boolean {
    this.throughputBeforeUpgrade = this.line.getThroughputPerMin();
    this.wipBeforeUpgrade = this.line.getWip();
    this.bottleneckBeforeUpgrade = this.line.getBottleneckId();
    this.upgradedMachine = machineId;
    this.wipTrendSamples = [this.getWip()];
    const incomeBefore = this.lineIncomePerMin();

    // Funding choice: Speed → Balanced, Value → Fast (no purchase required)
    if (
      this.mc.phase === 'funding_choice' &&
      (type === 'speed' || type === 'value')
    ) {
      const pick = type === 'speed' ? 'balanced' : 'fast';
      for (const ev of this.mc.handleFundingChoicePick(this, pick)) {
        this.dispatchMcEvent(ev);
      }
      this.throughputBeforeUpgrade = null;
      this.wipBeforeUpgrade = null;
      return false;
    }

    // Free upgrade / BONUS TIER
    if (this.mc.state.freeUpgradeCredits > 0 && !this.mc.state.freeUpgradeUsed) {
      const mode = this.mc.computeFreeUpgradeMode(this);
      this.mc.state.freeUpgradeMode = mode;
      if (mode === 'bonus_tier' || this.upgrades.isMaxed(machineId, type)) {
        if (mode !== 'bonus_tier') {
          // Still space elsewhere — don't force bonus on a maxed slot
          /* fall through to normal purchase attempt */
        } else {
          const consumed = this.mc.tryConsumeFreeUpgrade(this, machineId, type);
          if (!consumed.ok) return false;
          this.reapplyUpgrades();
          this.dispatchMcEvent({
            type: 'free_upgrade_used',
            payload: this.mc.metricsPayload(this, {
              machineId,
              upgradeType: type,
              freeUpgradeMode: 'bonus_tier',
              freeUpgradeCashDelta: 0,
            }),
          });
          this.pendingImpactCheckMs = UPGRADE_PAYOFF.settleMs;
          return true;
        }
      }
      if (mode === 'normal' && !this.upgrades.isMaxed(machineId, type)) {
        const consumed = this.mc.tryConsumeFreeUpgrade(this, machineId, type);
        if (!consumed.ok) return false;
        const ok = this.upgrades.tryPurchase(machineId, type, () => true);
        if (!ok) {
          // restore credit if purchase failed somehow
          this.mc.state.freeUpgradeCredits = 1;
          this.mc.state.freeUpgradeUsed = false;
          return false;
        }
        this.reapplyUpgrades();
        this.dispatchMcEvent({
          type: 'free_upgrade_used',
          payload: this.mc.metricsPayload(this, {
            machineId,
            upgradeType: type,
            freeUpgradeMode: 'normal',
            freeUpgradeCashDelta: 0,
          }),
        });
        this.pendingImpactCheckMs = UPGRADE_PAYOFF.settleMs;
        return true;
      }
    }

    const ok = this.upgrades.tryPurchase(machineId, type, (cost) =>
      this.economy.spend(cost),
    );
    if (!ok) return false;

    if (this.mc.phase === 'smartphone_funding') {
      this.mc.state.fundingPurchases += 1;
    }

    this.reapplyUpgrades();
    const afterTp = this.line.getThroughputPerMin();
    const afterWip = this.line.getWip();
    const afterIncome = this.lineIncomePerMin();
    for (const ev of this.mc.noteQualifiedLaunchAction(this, {
      actionType: type,
      machineId,
      beforeOutput: this.throughputBeforeUpgrade ?? afterTp,
      afterOutput: afterTp,
      beforeIncome: incomeBefore,
      afterIncome,
      beforeWip: this.wipBeforeUpgrade ?? afterWip,
      afterWip,
    })) {
      this.dispatchMcEvent(ev);
    }

    if (type === 'buffer') {
      const insight = this.insights.mark('buffer_tradeoff');
      if (insight) this.events.onInsight?.(insight.title, insight.body);
    }

    if (this.sessionGoal.phase === 'awaiting_choice') {
      if (type === 'speed') this.selectOptimizationBranch('throughput');
      else if (type === 'value') this.selectOptimizationBranch('margin');
    }

    const purchaseEvents = this.sessionGoal.notifyPurchase(this, machineId, type);
    for (const ev of purchaseEvents) this.dispatchGoalEvent(ev);
    this.sessionGoal.noteToyMasteryUpgrade();
    if (this.sessionGoal.phase === 'toy_mastery') {
      this.events.onToyMasteryAction?.({
        action: 'upgrade',
        machineId,
        type,
        ...this.toysMilestonePayload(),
      });
    }

    this.pendingImpactCheckMs = UPGRADE_PAYOFF.settleMs;
    return true;
  }

  private settleUpgradeImpact(dtMs: number): void {
    if (this.pendingImpactCheckMs <= 0) return;
    this.pendingImpactCheckMs -= dtMs;
    if (this.pendingImpactCheckMs > 0) return;

    const before = this.throughputBeforeUpgrade ?? 0;
    const after = this.line.getThroughputPerMin();
    const beforeWip = this.wipBeforeUpgrade ?? 0;
    const afterWip = this.line.getWip();
    const deltaPct = before > 0.05 ? ((after - before) / before) * 100 : 0;
    const bnAfter = this.line.getBottleneckId();
    const upgraded = this.upgradedMachine ?? 1;

    const payoff = classifyUpgradePayoff({
      beforeTp: before,
      afterTp: after,
      beforeWip,
      afterWip,
      wipSamples: [...this.wipTrendSamples],
      bottleneckBefore: this.bottleneckBeforeUpgrade,
      bottleneckAfter: bnAfter,
      upgradedMachine: upgraded,
    });

    if (payoff.improvedStillLimiting && bnAfter !== null) {
      this.highlightedBottleneck = bnAfter;
      this.bottleneckBadgeMode = 'improved_still';
      this.improvedBadgeDeltaPct = Math.max(0, Math.round(deltaPct));
      this.improvedBadgeMs = UPGRADE_PAYOFF.improvedBadgeMs;
      this.events.onBottleneckPersisted?.(bnAfter);
    } else if (
      payoff.bottleneckAfter !== null &&
      payoff.bottleneckBefore !== null &&
      payoff.bottleneckAfter !== payoff.bottleneckBefore
    ) {
      this.highlightedBottleneck = payoff.bottleneckAfter;
      this.bottleneckBadgeMode = 'bottleneck';
    }

    this.events.onUpgradeImpact?.(
      before,
      after,
      deltaPct,
      beforeWip,
      afterWip,
      {
        kind: payoff.kind,
        message: payoff.message,
        wipTrend: payoff.wipTrend,
        bottleneckBefore: payoff.bottleneckBefore,
        bottleneckAfter: payoff.bottleneckAfter,
      },
    );

    if (deltaPct < 5 && before > 0.5) {
      const insight = this.insights.mark('low_impact_upgrade');
      if (insight) this.events.onInsight?.(insight.title, insight.body);
    }
    this.throughputBeforeUpgrade = null;
    this.wipBeforeUpgrade = null;
    this.wipTrendSamples = [];
  }

  private toysMilestonePayload(): Record<
    string,
    number | string | boolean | null
  > {
    const bn = this.line.getBottleneckId();
    return {
      elapsedMs: Math.round(this.sessionMs),
      lifetimeEarned: Math.floor(this.economy.totalEarned),
      threshold: TOYS_MILESTONE.unlockAtEarned,
      cash: Math.floor(this.economy.coins),
      branchSelected: this.sessionGoal.selectedBranch,
      upgradesBought: this.upgrades.totalPurchased,
      OUTPUT: this.getThroughputPerMin(),
      'LINE INCOME/MIN': this.lineIncomePerMin(),
      eventState: this.eventsSys.suppressed
        ? 'suppressed'
        : this.eventsSys.active?.kind ?? 'idle',
      bottleneck: bn,
    };
  }

  private updateToysMilestone(): void {
    if (!this.sessionGoal.snapshot()?.nextMilestoneShown) return;
    if (this.progression.isUnlocked(TOYS_MILESTONE.productId)) return;

    this.sessionGoal.syncToysProgress(this);
    const earned = Math.floor(this.economy.totalEarned);
    const thr = TOYS_MILESTONE.unlockAtEarned;
    const ratio = thr > 0 ? earned / thr : 1;

    let crossed = this.toysProgressBucket;
    for (let i = 0; i < TOYS_MILESTONE.progressBuckets.length; i++) {
      const b = TOYS_MILESTONE.progressBuckets[i]!;
      if (ratio >= b && i > crossed) {
        crossed = i;
      }
    }
    if (crossed > this.toysProgressBucket) {
      this.toysProgressBucket = crossed;
      this.events.onToysMilestoneProgress?.({
        ...this.toysMilestonePayload(),
        bucket: TOYS_MILESTONE.progressBuckets[crossed] ?? 1,
        ratio,
      });
    }

    if (earned >= thr && !this.toysThresholdEmitted) {
      this.toysThresholdEmitted = true;
      this.events.onToysThresholdReached?.(this.toysMilestonePayload());
    }

    const ready = this.progression.canUnlock(
      TOYS_MILESTONE.productId,
      this.economy,
    ).ok;
    if (ready && !this.toysReadyEmitted) {
      this.toysReadyEmitted = true;
      this.events.onToysReady?.(this.toysMilestonePayload());
    }
  }

  private notePossibleFirstToy(amount: number, golden: boolean): void {
    if (!this.progression.isUnlocked(TOYS_MILESTONE.productId)) return;
    if (this.economy.currentProduct !== TOYS_MILESTONE.productId) return;

    if (!this.firstToyProducedEmitted) {
      this.firstToyProducedEmitted = true;
      const masteryEvents = this.sessionGoal.markFirstToyProduced(this);
      this.events.onFirstToyProduced?.({
        ...this.toysMilestonePayload(),
        amount,
        golden,
      });
      for (const ev of masteryEvents) this.dispatchGoalEvent(ev);
      return;
    }

    // Subsequent Toy sales feed mastery
    const saleEv = this.sessionGoal.noteToyMasterySale(this, amount);
    if (saleEv.length > 0) {
      this.events.onToyMasteryAction?.({
        action: 'sale',
        amount,
        ...this.toysMilestonePayload(),
      });
    }
    for (const ev of saleEv) this.dispatchGoalEvent(ev);
  }

  tryUnlockNext(stats?: Stats): boolean {
    const next = this.progression.nextUnlock;

    // M-C: unlock button builds ONLY when READY — never selects funding
    if (this.mc.phase === 'smartphone_ready') {
      const beforeBuilt = this.mc.state.smartphonesBuilt;
      const policyBefore = this.mc.state.fundingPolicy;
      for (const ev of this.mc.handleUnlockTap(this)) {
        this.dispatchMcEvent(ev);
      }
      // BUILD must not mutate policy
      if (this.mc.state.fundingPolicy !== policyBefore) {
        this.mc.state.fundingPolicy = policyBefore;
      }
      return this.mc.state.smartphonesBuilt && !beforeBuilt;
    }
    if (
      this.mc.phase === 'funding_choice' ||
      this.mc.phase === 'smartphone_funding'
    ) {
      return false;
    }
    if (next === 'smartphones' && !this.mc.state.smartphonesBuilt) {
      return false;
    }

    if (!next) return false;

    const cashBefore = this.economy.coins;
    const earned = Math.floor(this.economy.totalEarned);
    const result = this.progression.tryUnlock(next, this.economy, stats);
    if (!result.ok) return false;

    if (next === TOYS_MILESTONE.productId) {
      this.sessionGoal.markToysOpened();
      this.line.productColor = this.economy.productColor;
      const payload = {
        ...this.toysMilestonePayload(),
        lifetimeEarnedAtUnlock: earned,
        cashAtUnlock: Math.floor(cashBefore),
        cashAfter: Math.floor(this.economy.coins),
        cashDelta: Math.floor(this.economy.coins - cashBefore),
      };
      this.events.onToysOpened?.(payload);
      if (!this.firstToyActionEmitted) {
        this.firstToyActionEmitted = true;
        this.events.onFirstToyAction?.({
          ...payload,
          action: 'open_toys',
        });
      }
    }
    this.events.onUnlock?.(PRODUCTS[next].name);
    return true;
  }

  /**
   * Dev-only: force bottleneck badge visuals for responsive QA.
   * Returns false outside development builds.
   */
  previewPayoff(
    kind: 'still_limiting' | 'resolved' | 'moved',
  ): boolean {
    const isDev =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
    if (!isDev) return false;

    this.previewBadgeActive = true;
    const bn = this.line.getBottleneckId() ?? 1;
    if (kind === 'still_limiting') {
      this.highlightedBottleneck = bn;
      this.bottleneckBadgeMode = 'improved_still';
      this.improvedBadgeDeltaPct = 12;
      this.improvedBadgeMs = 60_000;
    } else if (kind === 'resolved') {
      this.highlightedBottleneck = null;
      this.bottleneckBadgeMode = 'hidden';
      this.improvedBadgeMs = 0;
    } else {
      const next = (((bn + 1) % 3) as MachineId);
      this.highlightedBottleneck = next;
      this.bottleneckBadgeMode = 'bottleneck';
      this.improvedBadgeMs = 60_000;
    }
    return true;
  }

  clearPayoffPreview(): void {
    this.previewBadgeActive = false;
    this.improvedBadgeMs = 0;
    const live = this.line.getBottleneckId();
    this.highlightedBottleneck = live;
    this.bottleneckBadgeMode = live !== null ? 'bottleneck' : 'hidden';
  }

  estimateIncomePerSecond(): number {
    // Canonical: LINE INCOME/MIN / 60 — same as SessionGoal
    return this.lineIncomePerMin() / 60;
  }

  getThroughputPerMin(): number {
    return this.line.getThroughputPerMin();
  }

  getWip(): number {
    return this.line.getWip();
  }

  hasRealProgress(): boolean {
    return this.upgrades.totalPurchased >= 1;
  }

  prepareReturningPlayer(): boolean {
    if (!this.hasRealProgress()) {
      this.eventsSys.suppress();
      this.onboardingEventsLocked = true;
      return false;
    }
    this.bottleneckAnnounced = true;
    this.highlightedBottleneck = this.line.getBottleneckId();
    this.bottleneckBadgeMode =
      this.highlightedBottleneck !== null ? 'bottleneck' : 'hidden';
    this.goalStarted = true;
    this.stage1CompleteEmitted = true;
    this.onboardingEventsLocked = false;

    const sg = this.sessionGoal.snapshot();
    const hasPostToys =
      !!sg &&
      (sg.toysOpened ||
        sg.firstToyProduced ||
        sg.toyMasteryCompleted ||
        sg.smartphonesMilestoneShown ||
        sg.phase === 'toy_mastery' ||
        sg.phase === 'smartphones_horizon' ||
        this.mc.isActive ||
        this.mc.state.smartphonesBuilt ||
        (sg.nextMilestoneShown &&
          (sg.phase === 'post_chain' || sg.phase === 'complete')));

    if (!hasPostToys) {
      // Legacy returning player: skip onboarding chain
      this.sessionGoal.skipAsComplete();
    } else {
      if (sg.toysOpened || this.progression.isUnlocked(TOYS_MILESTONE.productId)) {
        this.toysThresholdEmitted = true;
        this.toysReadyEmitted = true;
      }
      if (sg.firstToyProduced) {
        this.firstToyProducedEmitted = true;
        this.firstToyActionEmitted = true;
      }
      this.sessionGoal.syncToysProgress(this);
      this.sessionGoal.ensurePostToysGoal(this);
      // Resume M-C if mastery done but campaign idle (legacy horizon saves)
      if (
        sg.smartphonesMilestoneShown &&
        !this.mc.state.smartphonesBuilt &&
        this.mc.phase === 'idle'
      ) {
        for (const ev of this.mc.beginAfterMastery(this)) {
          this.dispatchMcEvent(ev);
        }
      }
    }

    this.eventsSys.resume();
    return true;
  }

  toSnapshot(): FactorySnapshot {
    return {
      line: this.line.toSnapshot(),
      events: this.eventsSys.snapshot(),
      unlocked: this.progression.snapshot().unlocked,
      insights: this.insights.snapshot(),
      sessionMs: this.sessionMs,
      sessionGoal: this.sessionGoal.snapshot(),
      mcCampaign: this.mc.snapshot(),
      hintUnderstood: this.hints.snapshot().understood,
      selectedChoiceId: this.sessionGoal.snapshot()?.selectedBranch ?? null,
    };
  }

  loadRuntime(snapshot: FactorySnapshot | undefined): void {
    this.resetRuntime();
    if (!snapshot) return;
    this.sessionMs = snapshot.sessionMs ?? 0;
    this.insights.load(snapshot.insights);
    this.line.loadSnapshot(snapshot.line);
    this.eventsSys.load(snapshot.events);
    this.upgrades.applyTo(
      this.line.machines,
      this.line.buffers,
      this.bonusSpec(),
    );
    if (snapshot.sessionGoal) {
      this.sessionGoal.load(snapshot.sessionGoal);
      this.goalStarted = snapshot.sessionGoal.status !== 'idle';
      this.stage1CompleteEmitted =
        (snapshot.sessionGoal.completedStages ?? []).includes('throughput') ||
        snapshot.sessionGoal.status === 'chain_complete';
    }
    if (snapshot.mcCampaign) {
      this.mc.load(snapshot.mcCampaign);
    } else if (snapshot.sessionGoal?.smartphonesMilestoneShown) {
      // Migrate M-B.3 horizon saves into funding_choice
      this.mc.beginAfterMastery(this);
    }
    this.hints.load({ understood: snapshot.hintUnderstood });
    if (this.hasRealProgress()) {
      this.eventsSys.resume();
      this.onboardingEventsLocked = false;
    } else {
      this.eventsSys.suppress();
      this.onboardingEventsLocked = true;
    }
  }

  /** Boot hook after save apply — starts return challenge on new session. */
  bootMcSession(isLoadedSave: boolean): void {
    for (const ev of this.mc.onSessionBoot(this, isLoadedSave)) {
      this.dispatchMcEvent(ev);
    }
  }
}
