import {
  OPTIMIZATION_CHAIN,
  PRODUCTS,
  SESSION_GOAL,
  SMARTPHONE_CAMPAIGN,
  SMARTPHONES_HORIZON,
  TOY_MASTERY,
  TOYS_MILESTONE,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import type { Factory } from './Factory';

export type GoalStageId =
  | 'throughput'
  | 'branch_throughput'
  | 'branch_margin'
  | 'convergence'
  | 'next_milestone'
  | 'toy_mastery'
  | 'smartphones';

export type ChainPhase =
  | 'idle'
  | 'stage1'
  | 'awaiting_choice'
  | 'awaiting_purchase'
  | 'branch'
  | 'convergence'
  | 'post_chain'
  | 'toy_mastery'
  | 'smartphones_horizon'
  | 'complete';

export type BranchId = 'throughput' | 'margin';
export type ToyMasteryType = 'throughput' | 'margin';

export type SessionGoalStatus =
  | 'idle'
  | 'active'
  | 'awaiting_choice'
  | 'awaiting_purchase'
  | 'success'
  | 'failed'
  | 'chain_complete';

export type PayoffKind =
  | 'bottleneck_resolved'
  | 'bottleneck_moved'
  | 'bottleneck_improved_still_limiting'
  | 'output_up'
  | 'queue_shrinking'
  | 'neutral';

export interface OptimizationOption {
  id: BranchId;
  machineId: MachineId;
  type: UpgradeType;
  cost: number;
  title: string;
  tagline: string;
  beforeLabel: string;
  afterLabel: string;
  benefit: string;
  consequence: string;
  kpi: string;
}

export interface MetricBaseline {
  outputPerMin: number;
  lineIncomePerMin: number;
  wip: number;
  blockedShare: number;
  bottleneckId: MachineId | null;
  /** Income at choice time (before strategic purchase). */
  preChoiceIncomePerMin: number;
}

export interface SessionGoalState {
  phase: ChainPhase;
  stageId: GoalStageId | null;
  status: SessionGoalStatus;
  startedAtMs: number;
  completedAtMs: number | null;
  holdProgressMs: number;
  armGraceMs: number;
  focusMachineId: MachineId | null;
  targetThroughput: number;
  completedStages: GoalStageId[];
  selectedBranch: BranchId | null;
  choiceOffered: boolean;
  purchaseDone: boolean;
  baseline: MetricBaseline | null;
  branchArmedAtMs: number | null;
  convergenceStartedAtMs: number | null;
  purchasesAfterConvergence: number;
  nextMilestoneShown: boolean;
  /** Irreversible display of lifetime earned toward Toys (floored). */
  toysEarnedDisplay: number;
  /** After Toys unlock — wait for first sale on Toys line. */
  awaitingFirstToy: boolean;
  toysOpened: boolean;
  firstToyProduced: boolean;
  toyMasteryType: ToyMasteryType | null;
  toyMasteryTarget: number;
  toyMasteryProgress: number;
  toyMasteryStartedAtMs: number | null;
  toyMasteryActions: number;
  toyMasteryCompleted: boolean;
  smartphonesMilestoneShown: boolean;
}

export interface GoalStageEvent {
  type:
    | 'stage_start'
    | 'stage_progress'
    | 'stage_complete'
    | 'choice_ready'
    | 'choice_selected'
    | 'choice_purchased'
    | 'stage_2_armed'
    | 'branch_goal_start'
    | 'branch_goal_progress'
    | 'branch_goal_complete'
    | 'convergence_goal_start'
    | 'convergence_goal_complete'
    | 'next_milestone_shown'
    | 'toy_mastery_shown'
    | 'toy_mastery_progress'
    | 'toy_mastery_complete'
    | 'smartphones_milestone_shown'
    | 'chain_complete';
  stageId: GoalStageId | null;
  stageIndex: number;
  progress?: number;
  payload?: Record<string, number | string | boolean | null>;
}

function blockedShare(factory: Factory): number {
  return factory.machines[0]!.recentStateShare(
    'BLOCKED',
    10_000,
    factory.line.clockMs,
  );
}

/**
 * M-B.1 chain: stage1 → choice → purchase → branch → convergence → Toys milestone.
 */
export class SessionGoal {
  state: SessionGoalState | null = null;
  private lastProgressBucket = -1;
  private incomeAtChoice: number | null = null;

  get status(): SessionGoalStatus {
    return this.state?.status ?? 'idle';
  }

  get phase(): ChainPhase {
    return this.state?.phase ?? 'idle';
  }

  get isActive(): boolean {
    const p = this.phase;
    return (
      p === 'stage1' ||
      p === 'branch' ||
      p === 'convergence' ||
      p === 'toy_mastery' ||
      p === 'smartphones_horizon' ||
      p === 'post_chain' ||
      this.state?.awaitingFirstToy === true
    );
  }

  get stageIndex(): number {
    const map: Record<ChainPhase, number> = {
      idle: -1,
      stage1: 0,
      awaiting_choice: 1,
      awaiting_purchase: 1,
      branch: 2,
      convergence: 3,
      post_chain: 4,
      toy_mastery: 5,
      smartphones_horizon: 6,
      complete: 7,
    };
    return map[this.phase];
  }

  get stageId(): GoalStageId | null {
    return this.state?.stageId ?? null;
  }

  get choiceOffered(): boolean {
    return this.state?.choiceOffered ?? false;
  }

  get selectedBranch(): BranchId | null {
    return this.state?.selectedBranch ?? null;
  }

  tryStart(factory: Factory, focusMachineId: MachineId | null): boolean {
    if (this.state && this.state.phase !== 'idle') return false;
    this.state = blankState(factory, focusMachineId);
    this.state.phase = 'stage1';
    this.state.stageId = 'throughput';
    this.state.status = 'active';
    this.lastProgressBucket = -1;
    return true;
  }

  tickHold(factory: Factory, dtMs: number): GoalStageEvent[] {
    if (!this.state) return [];
    const phase = this.state.phase;

    if (phase === 'stage1') return this.tickStage1(factory, dtMs);
    if (phase === 'branch') return this.tickBranch(factory, dtMs);
    if (phase === 'convergence') return this.tickConvergence(factory, dtMs);
    return [];
  }

  /** Compat alias. */
  update(factory: Factory): GoalStageEvent[] {
    return this.tickHold(factory, 50);
  }

  selectBranch(branch: BranchId, factory: Factory): GoalStageEvent[] {
    if (!this.state || this.state.phase !== 'awaiting_choice') return [];
    this.state.selectedBranch = branch;
    this.state.phase = 'awaiting_purchase';
    this.state.status = 'awaiting_purchase';
    this.incomeAtChoice = factory.lineIncomePerMin();
    return [
      {
        type: 'choice_selected',
        stageId: null,
        stageIndex: 1,
        payload: { branch, cost: 0 },
      },
    ];
  }

  /**
   * Called after a successful upgrade purchase.
   * Arms branch only when purchase matches selected option.
   */
  notifyPurchase(
    factory: Factory,
    machineId: MachineId,
    type: UpgradeType,
  ): GoalStageEvent[] {
    if (!this.state) return [];
    const ev: GoalStageEvent[] = [];

    if (this.state.phase === 'convergence') {
      this.state.purchasesAfterConvergence += 1;
      return ev;
    }

    if (this.state.phase !== 'awaiting_purchase' || !this.state.selectedBranch) {
      return ev;
    }

    const required = requiredPurchase(this.state.selectedBranch, factory);
    if (required.machineId !== machineId || required.type !== type) {
      return ev;
    }

    this.state.purchaseDone = true;
    const baseline = captureBaseline(factory, this.incomeAtChoice ?? factory.lineIncomePerMin());
    this.state.baseline = baseline;
    this.state.holdProgressMs = 0;
    this.state.armGraceMs = OPTIMIZATION_CHAIN.armGraceMs;
    this.state.branchArmedAtMs = factory.sessionMs;
    this.state.phase = 'branch';
    this.state.status = 'active';
    this.state.stageId =
      this.state.selectedBranch === 'throughput'
        ? 'branch_throughput'
        : 'branch_margin';
    this.lastProgressBucket = -1;

    ev.push({
      type: 'choice_purchased',
      stageId: this.state.stageId,
      stageIndex: 2,
      payload: {
        branch: this.state.selectedBranch,
        upgradeType: type,
        machineId,
        cost: factory.upgrades.costFor(machineId, type),
        OUTPUT: baseline.outputPerMin,
        'LINE INCOME/MIN': baseline.lineIncomePerMin,
        WIP: baseline.wip,
      },
    });
    ev.push({
      type: 'stage_2_armed',
      stageId: this.state.stageId,
      stageIndex: 2,
      payload: {
        branch: this.state.selectedBranch,
        baselineOutput: baseline.outputPerMin,
        baselineIncome: baseline.lineIncomePerMin,
      },
    });
    ev.push({
      type: 'branch_goal_start',
      stageId: this.state.stageId,
      stageIndex: 2,
      payload: {
        branch: this.state.selectedBranch,
        baselineOutput: baseline.outputPerMin,
        baselineIncome: baseline.lineIncomePerMin,
      },
    });
    return ev;
  }

  private tickStage1(factory: Factory, _dtMs: number): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state) return ev;
    const tp = factory.getThroughputPerMin();
    const target = this.state.targetThroughput;
    const bucket = Math.floor((tp / target) * 4);
    if (bucket !== this.lastProgressBucket) {
      this.lastProgressBucket = bucket;
      ev.push({
        type: 'stage_progress',
        stageId: 'throughput',
        stageIndex: 0,
        progress: Math.min(1, tp / target),
        payload: {
          throughput: tp,
          target,
          OUTPUT: tp,
          'LINE INCOME/MIN': factory.lineIncomePerMin(),
          WIP: factory.getWip(),
        },
      });
    }

    if (tp >= target) {
      this.state.completedStages.push('throughput');
      this.state.completedAtMs = factory.sessionMs;
      this.state.phase = 'awaiting_choice';
      this.state.status = 'awaiting_choice';
      this.state.choiceOffered = true;
      this.state.holdProgressMs = 0;
      this.state.stageId = null;
      ev.push({
        type: 'stage_complete',
        stageId: 'throughput',
        stageIndex: 0,
        payload: { success: true },
      });
      ev.push({
        type: 'choice_ready',
        stageId: null,
        stageIndex: 1,
      });
      return ev;
    }

    if (
      SESSION_GOAL.timeLimitMs > 0 &&
      factory.sessionMs - this.state.startedAtMs >= SESSION_GOAL.timeLimitMs
    ) {
      this.state.status = 'failed';
      this.state.phase = 'complete';
      this.state.completedAtMs = factory.sessionMs;
    }
    return ev;
  }

  private tickBranch(factory: Factory, dtMs: number): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state?.baseline || !this.state.selectedBranch) return ev;

    if (this.state.armGraceMs > 0) {
      this.state.armGraceMs = Math.max(0, this.state.armGraceMs - dtMs);
      return ev;
    }

    const ok =
      this.state.selectedBranch === 'throughput'
        ? this.throughputBranchOk(factory)
        : this.marginBranchOk(factory);

    const holdTarget =
      this.state.selectedBranch === 'throughput'
        ? OPTIMIZATION_CHAIN.branchThroughput.holdMs
        : OPTIMIZATION_CHAIN.branchMargin.holdMs;

    if (ok) this.state.holdProgressMs += dtMs;
    else this.state.holdProgressMs = Math.max(0, this.state.holdProgressMs - dtMs * 0.5);

    const progress = this.state.holdProgressMs / holdTarget;
    const bucket = Math.floor(progress * 4);
    if (bucket !== this.lastProgressBucket) {
      this.lastProgressBucket = bucket;
      ev.push({
        type: 'branch_goal_progress',
        stageId: this.state.stageId,
        stageIndex: 2,
        progress: Math.min(1, progress),
        payload: this.metricPayload(factory),
      });
    }

    if (this.state.holdProgressMs >= holdTarget) {
      const doneId = this.state.stageId!;
      this.state.completedStages.push(doneId);
      ev.push({
        type: 'branch_goal_complete',
        stageId: doneId,
        stageIndex: 2,
        payload: { branch: this.state.selectedBranch, ...this.metricPayload(factory) },
      });
      // Start convergence — reset hold, require future purchases
      this.state.phase = 'convergence';
      this.state.stageId = 'convergence';
      this.state.holdProgressMs = 0;
      this.state.armGraceMs = OPTIMIZATION_CHAIN.armGraceMs;
      this.state.convergenceStartedAtMs = factory.sessionMs;
      this.state.purchasesAfterConvergence = 0;
      this.lastProgressBucket = -1;
      ev.push({
        type: 'convergence_goal_start',
        stageId: 'convergence',
        stageIndex: 3,
        payload: this.metricPayload(factory),
      });
    }
    return ev;
  }

  private throughputBranchOk(factory: Factory): boolean {
    const b = this.state!.baseline!;
    const cfg = OPTIMIZATION_CHAIN.branchThroughput;
    const tp = factory.getThroughputPerMin();
    const lift = Math.max(b.outputPerMin * cfg.minOutputLift, cfg.minAbsoluteOutputDelta);
    const target = b.outputPerMin + lift;
    return tp >= target && factory.getWip() <= cfg.maxWip;
  }

  private marginBranchOk(factory: Factory): boolean {
    const b = this.state!.baseline!;
    const cfg = OPTIMIZATION_CHAIN.branchMargin;
    const income = factory.lineIncomePerMin();
    return (
      income >= b.lineIncomePerMin * cfg.minIncomeHoldRatio &&
      income >= b.preChoiceIncomePerMin * cfg.minIncomeVsPreChoice &&
      factory.getWip() <= cfg.maxWip
    );
  }

  private tickConvergence(factory: Factory, dtMs: number): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state) return ev;
    const cfg = OPTIMIZATION_CHAIN.convergence;

    if (this.state.armGraceMs > 0) {
      this.state.armGraceMs = Math.max(0, this.state.armGraceMs - dtMs);
      return ev;
    }

    const tp = factory.getThroughputPerMin();
    const income = factory.lineIncomePerMin();
    const wip = factory.getWip();
    const purchasesOk =
      this.state.purchasesAfterConvergence >= cfg.minPurchasesAfterStart;
    const ok =
      purchasesOk &&
      tp >= cfg.minThroughputPerMin &&
      income >= cfg.minLineIncomePerMin &&
      wip <= cfg.maxWip;

    if (ok) this.state.holdProgressMs += dtMs;
    else this.state.holdProgressMs = Math.max(0, this.state.holdProgressMs - dtMs * 0.5);

    const progress = this.state.holdProgressMs / cfg.holdMs;
    const bucket = Math.floor(progress * 4);
    if (bucket !== this.lastProgressBucket) {
      this.lastProgressBucket = bucket;
      ev.push({
        type: 'stage_progress',
        stageId: 'convergence',
        stageIndex: 3,
        progress: Math.min(1, progress),
        payload: this.metricPayload(factory),
      });
    }

    if (this.state.holdProgressMs >= cfg.holdMs) {
      this.state.completedStages.push('convergence');
      ev.push({
        type: 'convergence_goal_complete',
        stageId: 'convergence',
        stageIndex: 3,
        payload: this.metricPayload(factory),
      });
      this.state.phase = 'post_chain';
      this.state.status = 'chain_complete';
      this.state.stageId = 'next_milestone';
      this.state.nextMilestoneShown = true;
      this.state.completedAtMs = factory.sessionMs;
      this.state.toysEarnedDisplay = Math.floor(factory.economy.totalEarned);
      ev.push({
        type: 'next_milestone_shown',
        stageId: 'next_milestone',
        stageIndex: 4,
        payload: {
          productId: OPTIMIZATION_CHAIN.nextMilestone.productId,
          name: PRODUCTS[OPTIMIZATION_CHAIN.nextMilestone.productId].name,
          threshold: TOYS_MILESTONE.unlockAtEarned,
          lifetimeEarned: this.state.toysEarnedDisplay,
          freeUnlock: TOYS_MILESTONE.freeUnlock,
        },
      });
      ev.push({
        type: 'chain_complete',
        stageId: null,
        stageIndex: 5,
      });
    }
    return ev;
  }

  private metricPayload(
    factory: Factory,
  ): Record<string, number | string | boolean | null> {
    const bn = factory.line.getBottleneckId();
    return {
      OUTPUT: factory.getThroughputPerMin(),
      'LINE INCOME/MIN': factory.lineIncomePerMin(),
      WIP: factory.getWip(),
      BLOCKED: blockedShare(factory),
      bottleneck: bn,
      branch: this.state?.selectedBranch ?? null,
    };
  }

  syncToysProgress(factory: Factory): void {
    if (!this.state) return;
    const earned = Math.floor(factory.economy.totalEarned);
    if (earned > this.state.toysEarnedDisplay) {
      this.state.toysEarnedDisplay = earned;
    }
  }

  markToysOpened(): void {
    if (!this.state) return;
    this.state.toysOpened = true;
    this.state.awaitingFirstToy = true;
    this.state.phase = 'post_chain';
    this.state.stageId = 'next_milestone';
    this.state.status = 'chain_complete';
  }

  markFirstToyProduced(factory: Factory): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state?.awaitingFirstToy) return ev;
    this.state.awaitingFirstToy = false;
    this.state.firstToyProduced = true;
    this.startToyMastery(factory, ev);
    return ev;
  }

  private startToyMastery(factory: Factory, ev: GoalStageEvent[]): void {
    if (!this.state) return;
    const branch: ToyMasteryType =
      this.state.selectedBranch === 'margin' ? 'margin' : 'throughput';
    const target =
      branch === 'throughput'
        ? TOY_MASTERY.throughput.sellTarget
        : TOY_MASTERY.margin.incomeTarget;
    this.state.toyMasteryType = branch;
    this.state.toyMasteryTarget = target;
    this.state.toyMasteryProgress = 0;
    this.state.toyMasteryActions = 0;
    this.state.toyMasteryStartedAtMs = factory.sessionMs;
    this.state.toyMasteryCompleted = false;
    this.state.armGraceMs = TOY_MASTERY.armGraceMs;
    this.state.phase = 'toy_mastery';
    this.state.stageId = 'toy_mastery';
    this.state.status = 'active';
    ev.push({
      type: 'toy_mastery_shown',
      stageId: 'toy_mastery',
      stageIndex: 5,
      payload: {
        type: branch,
        target,
        plan:
          branch === 'throughput'
            ? TOY_MASTERY.throughput.planLabel
            : TOY_MASTERY.margin.planLabel,
        ...this.metricPayload(factory),
      },
    });
  }

  /** Call on each Toy sale while mastery is active. */
  noteToyMasterySale(factory: Factory, amount: number): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state || this.state.phase !== 'toy_mastery') return ev;
    if (this.state.armGraceMs > 0) return ev;

    this.state.toyMasteryActions += 1;
    if (this.state.toyMasteryType === 'throughput') {
      if (factory.getWip() <= TOY_MASTERY.throughput.maxWip) {
        this.state.toyMasteryProgress += 1;
      }
    } else {
      this.state.toyMasteryProgress += amount;
    }
    const progress =
      this.state.toyMasteryTarget > 0
        ? this.state.toyMasteryProgress / this.state.toyMasteryTarget
        : 1;
    const bucket = Math.floor(progress * 5);
    if (bucket !== this.lastProgressBucket) {
      this.lastProgressBucket = bucket;
      ev.push({
        type: 'toy_mastery_progress',
        stageId: 'toy_mastery',
        stageIndex: 5,
        progress: Math.min(1, progress),
        payload: {
          type: this.state.toyMasteryType,
          progress: this.state.toyMasteryProgress,
          target: this.state.toyMasteryTarget,
          ...this.metricPayload(factory),
        },
      });
    }
    return ev;
  }

  noteToyMasteryUpgrade(): void {
    if (!this.state || this.state.phase !== 'toy_mastery') return;
    if (this.state.armGraceMs > 0) return;
    this.state.toyMasteryActions += 1;
  }

  updateToyMastery(factory: Factory, dtMs: number): GoalStageEvent[] {
    const ev: GoalStageEvent[] = [];
    if (!this.state || this.state.phase !== 'toy_mastery') return ev;
    if (this.state.armGraceMs > 0) {
      this.state.armGraceMs = Math.max(0, this.state.armGraceMs - dtMs);
      return ev;
    }
    const done =
      this.state.toyMasteryProgress >= this.state.toyMasteryTarget &&
      this.state.toyMasteryActions >= TOY_MASTERY.minActionsAfterStart;
    if (!done) return ev;

    this.state.toyMasteryCompleted = true;
    this.state.completedStages.push('toy_mastery');
    ev.push({
      type: 'toy_mastery_complete',
      stageId: 'toy_mastery',
      stageIndex: 5,
      payload: {
        type: this.state.toyMasteryType,
        progress: this.state.toyMasteryProgress,
        target: this.state.toyMasteryTarget,
        durationMs: factory.sessionMs - (this.state.toyMasteryStartedAtMs ?? 0),
        ...this.metricPayload(factory),
      },
    });
    this.showSmartphonesHorizon(factory, ev);
    return ev;
  }

  private showSmartphonesHorizon(factory: Factory, ev: GoalStageEvent[]): void {
    if (!this.state) return;
    this.state.phase = 'smartphones_horizon';
    this.state.stageId = 'smartphones';
    this.state.status = 'chain_complete';
    this.state.smartphonesMilestoneShown = true;
    const phone = PRODUCTS.smartphones;
    ev.push({
      type: 'smartphones_milestone_shown',
      stageId: 'smartphones',
      stageIndex: 6,
      payload: {
        productId: SMARTPHONES_HORIZON.productId,
        fundTarget: SMARTPHONE_CAMPAIGN.fundTarget,
        unlockAtEarned: phone.unlockAtEarned,
        lifetimeEarned: Math.floor(factory.economy.totalEarned),
        cash: Math.floor(factory.economy.coins),
        ...this.metricPayload(factory),
      },
    });
  }

  planLabel(): string {
    if (!this.state || this.state.phase !== 'toy_mastery') return '';
    if (this.state.toyMasteryType === 'margin') return TOY_MASTERY.margin.planLabel;
    if (this.state.toyMasteryType === 'throughput') {
      return TOY_MASTERY.throughput.planLabel;
    }
    return '';
  }

  planKpiLines(factory: Factory): string[] {
    if (!this.state || this.state.phase !== 'toy_mastery') return [];
    if (this.state.toyMasteryType === 'margin') {
      return [
        `Toy $ ${Math.floor(this.state.toyMasteryProgress)}/${this.state.toyMasteryTarget}`,
        `LINE INCOME $${factory.lineIncomePerMin().toFixed(0)}/min`,
        `Value ×${factory.upgrades.totalValueMultiplier().toFixed(2)}`,
      ];
    }
    return [
      `Toys ${Math.floor(this.state.toyMasteryProgress)}/${this.state.toyMasteryTarget}`,
      `OUTPUT ${factory.getThroughputPerMin().toFixed(0)}/min`,
      `BN M${(factory.line.getBottleneckId() ?? 0) + 1}`,
    ];
  }

  /**
   * After save/load: never leave an empty/ambiguous post-toys state.
   * Does not emit telemetry (returning player).
   */
  ensurePostToysGoal(factory: Factory): void {
    if (!this.state) return;
    if (this.state.smartphonesMilestoneShown || this.state.phase === 'smartphones_horizon') {
      this.state.phase = 'smartphones_horizon';
      this.state.stageId = 'smartphones';
      return;
    }
    if (this.state.phase === 'toy_mastery' && !this.state.toyMasteryCompleted) {
      return;
    }
    if (this.state.awaitingFirstToy) {
      this.state.phase = 'post_chain';
      return;
    }
    if (
      this.state.firstToyProduced &&
      !this.state.toyMasteryCompleted &&
      this.state.phase !== 'toy_mastery'
    ) {
      const branch: ToyMasteryType =
        this.state.selectedBranch === 'margin' ? 'margin' : 'throughput';
      const target =
        branch === 'throughput'
          ? TOY_MASTERY.throughput.sellTarget
          : TOY_MASTERY.margin.incomeTarget;
      this.state.toyMasteryType = branch;
      this.state.toyMasteryTarget = target;
      this.state.phase = 'toy_mastery';
      this.state.stageId = 'toy_mastery';
      this.state.status = 'active';
      this.state.armGraceMs = 0; // already mid-run after reload
      void factory;
      return;
    }
    if (this.state.toysOpened && !this.state.firstToyProduced) {
      this.state.awaitingFirstToy = true;
      this.state.phase = 'post_chain';
    }
  }

  label(): string {
    if (!this.state) return '';
    const p = this.state.phase;
    if (p === 'awaiting_choice' || p === 'awaiting_purchase') {
      return this.state.selectedBranch
        ? `Buy your pick: ${this.state.selectedBranch === 'throughput' ? 'Speed' : 'Value'}`
        : 'CHOOSE: Throughput (Speed) or Margin (Value)';
    }
    if (p === 'stage1') {
      return `GOAL: reach OUTPUT ${this.state.targetThroughput}/min`;
    }
    if (p === 'branch' && this.state.selectedBranch === 'throughput' && this.state.baseline) {
      const cfg = OPTIMIZATION_CHAIN.branchThroughput;
      const lift = Math.max(
        this.state.baseline.outputPerMin * cfg.minOutputLift,
        cfg.minAbsoluteOutputDelta,
      );
      const target = this.state.baseline.outputPerMin + lift;
      const sec = Math.ceil(
        Math.max(0, cfg.holdMs - this.state.holdProgressMs) / 1000,
      );
      return `BRANCH: hold OUTPUT ≥ ${target.toFixed(0)}/min for ${sec}s`;
    }
    if (p === 'branch' && this.state.selectedBranch === 'margin' && this.state.baseline) {
      const cfg = OPTIMIZATION_CHAIN.branchMargin;
      const target = Math.max(
        this.state.baseline.lineIncomePerMin * cfg.minIncomeHoldRatio,
        this.state.baseline.preChoiceIncomePerMin * cfg.minIncomeVsPreChoice,
      );
      const sec = Math.ceil(
        Math.max(0, cfg.holdMs - this.state.holdProgressMs) / 1000,
      );
      return `BRANCH: hold LINE INCOME ≥ $${target.toFixed(0)}/min for ${sec}s`;
    }
    if (p === 'convergence') {
      const cfg = OPTIMIZATION_CHAIN.convergence;
      const sec = Math.ceil(
        Math.max(0, cfg.holdMs - this.state.holdProgressMs) / 1000,
      );
      return `BALANCE: OUTPUT≥${cfg.minThroughputPerMin} · INCOME≥$${cfg.minLineIncomePerMin}/min · ${sec}s`;
    }
    if (this.state.awaitingFirstToy) {
      return `NEXT: ${TOYS_MILESTONE.postUnlockObjective}`;
    }
    if (p === 'toy_mastery') {
      if (this.state.toyMasteryType === 'margin') {
        const cur = Math.floor(this.state.toyMasteryProgress);
        return `${TOY_MASTERY.margin.title} — $${cur} / $${this.state.toyMasteryTarget}`;
      }
      const cur = Math.floor(this.state.toyMasteryProgress);
      return `${TOY_MASTERY.throughput.title} — ${cur} / ${this.state.toyMasteryTarget} Toys`;
    }
    if (p === 'smartphones_horizon') {
      return `${SMARTPHONES_HORIZON.title} — Expansion Fund`;
    }
    if (p === 'post_chain') {
      const target = TOYS_MILESTONE.unlockAtEarned;
      const earned = Math.min(this.state.toysEarnedDisplay, target);
      return `TOYS — $${earned} / $${target} EARNED`;
    }
    if (p === 'complete') {
      // Should not be empty — fall through to smartphones or toys grind
      if (this.state.smartphonesMilestoneShown) {
        return `${SMARTPHONES_HORIZON.title} — Expansion Fund`;
      }
      if (this.state.toysOpened && !this.state.firstToyProduced) {
        return `NEXT: ${TOYS_MILESTONE.postUnlockObjective}`;
      }
      const target = TOYS_MILESTONE.unlockAtEarned;
      const earned = Math.min(this.state.toysEarnedDisplay, target);
      return `TOYS — $${earned} / $${target} EARNED`;
    }
    if (this.state.status === 'failed') {
      return `Goal expired — keep optimizing toward OUTPUT ${this.state.targetThroughput}/min`;
    }
    // Never return empty when we have any post-chain context
    return `TOYS — keep optimizing`;
  }

  snapshot(): SessionGoalState | null {
    if (!this.state) return null;
    return {
      ...this.state,
      completedStages: [...this.state.completedStages],
      baseline: this.state.baseline ? { ...this.state.baseline } : null,
    };
  }

  load(data: SessionGoalState | undefined): void {
    if (!data) return;
    this.state = {
      ...blankStateLite(),
      ...data,
      completedStages: [...(data.completedStages ?? [])],
      baseline: data.baseline ? { ...data.baseline } : null,
      phase: data.phase ?? migrateLegacyPhase(data),
      toysEarnedDisplay: data.toysEarnedDisplay ?? 0,
      awaitingFirstToy: data.awaitingFirstToy ?? false,
      toysOpened: data.toysOpened ?? false,
      firstToyProduced: data.firstToyProduced ?? false,
      toyMasteryType: data.toyMasteryType ?? null,
      toyMasteryTarget: data.toyMasteryTarget ?? 0,
      toyMasteryProgress: data.toyMasteryProgress ?? 0,
      toyMasteryStartedAtMs: data.toyMasteryStartedAtMs ?? null,
      toyMasteryActions: data.toyMasteryActions ?? 0,
      toyMasteryCompleted: data.toyMasteryCompleted ?? false,
      smartphonesMilestoneShown: data.smartphonesMilestoneShown ?? false,
    };
    // Migrate empty-complete from M-B.2 / mid-mastery saves
    if (
      this.state.phase === 'complete' &&
      this.state.toyMasteryCompleted &&
      !this.state.smartphonesMilestoneShown
    ) {
      this.state.phase = 'smartphones_horizon';
      this.state.smartphonesMilestoneShown = true;
    } else if (
      (this.state.phase === 'complete' || this.state.phase === 'post_chain') &&
      this.state.firstToyProduced &&
      !this.state.toyMasteryCompleted
    ) {
      const branch: ToyMasteryType =
        this.state.selectedBranch === 'margin' ? 'margin' : 'throughput';
      this.state.toyMasteryType =
        this.state.toyMasteryType ?? branch;
      this.state.toyMasteryTarget =
        this.state.toyMasteryTarget ||
        (branch === 'throughput'
          ? TOY_MASTERY.throughput.sellTarget
          : TOY_MASTERY.margin.incomeTarget);
      this.state.phase = 'toy_mastery';
      this.state.stageId = 'toy_mastery';
      this.state.status = 'active';
      this.state.armGraceMs = 0;
    }
  }

  skipAsComplete(): void {
    this.state = {
      ...blankStateLite(),
      phase: 'post_chain',
      status: 'chain_complete',
      stageId: 'next_milestone',
      completedStages: [
        'throughput',
        'branch_throughput',
        'convergence',
      ],
      nextMilestoneShown: true,
      choiceOffered: false,
      purchaseDone: true,
      selectedBranch: 'throughput',
    };
  }

  skipThroughStage1(factory: Factory): void {
    this.state = {
      ...blankState(factory, factory.line.getBottleneckId()),
      phase: 'awaiting_choice',
      status: 'awaiting_choice',
      choiceOffered: true,
      completedStages: ['throughput'],
      stageId: null,
    };
  }
}

function blankStateLite(): SessionGoalState {
  return {
    phase: 'idle',
    stageId: null,
    status: 'idle',
    startedAtMs: 0,
    completedAtMs: null,
    holdProgressMs: 0,
    armGraceMs: 0,
    focusMachineId: null,
    targetThroughput: SESSION_GOAL.targetThroughputPerMin,
    completedStages: [],
    selectedBranch: null,
    choiceOffered: false,
    purchaseDone: false,
    baseline: null,
    branchArmedAtMs: null,
    convergenceStartedAtMs: null,
    purchasesAfterConvergence: 0,
    nextMilestoneShown: false,
    toysEarnedDisplay: 0,
    awaitingFirstToy: false,
    toysOpened: false,
    firstToyProduced: false,
    toyMasteryType: null,
    toyMasteryTarget: 0,
    toyMasteryProgress: 0,
    toyMasteryStartedAtMs: null,
    toyMasteryActions: 0,
    toyMasteryCompleted: false,
    smartphonesMilestoneShown: false,
  };
}

function blankState(
  factory: Factory,
  focus: MachineId | null,
): SessionGoalState {
  return {
    ...blankStateLite(),
    phase: 'stage1',
    stageId: 'throughput',
    status: 'active',
    startedAtMs: factory.sessionMs,
    focusMachineId: focus,
    targetThroughput: OPTIMIZATION_CHAIN.stage1.targetThroughputPerMin,
    toysEarnedDisplay: Math.floor(factory.economy.totalEarned),
  };
}

function migrateLegacyPhase(data: SessionGoalState): ChainPhase {
  if (data.status === 'chain_complete') return 'post_chain';
  if (data.choiceOffered && !data.purchaseDone) return 'awaiting_choice';
  return data.phase ?? 'idle';
}

function captureBaseline(
  factory: Factory,
  preChoiceIncome: number,
): MetricBaseline {
  return {
    outputPerMin: factory.getThroughputPerMin(),
    lineIncomePerMin: factory.lineIncomePerMin(),
    wip: factory.getWip(),
    blockedShare: blockedShare(factory),
    bottleneckId: factory.line.getBottleneckId(),
    preChoiceIncomePerMin: preChoiceIncome,
  };
}

export function requiredPurchase(
  branch: BranchId,
  factory: Factory,
): { machineId: MachineId; type: UpgradeType } {
  if (branch === 'throughput') {
    return {
      machineId: factory.suggestedUpgradeMachine(),
      type: 'speed',
    };
  }
  return { machineId: 1, type: 'value' };
}

/** First strategic decision: Throughput (Speed) vs Margin (Value). Buffer excluded. */
export function buildOptimizationChoices(factory: Factory): OptimizationOption[] {
  const bn = factory.suggestedUpgradeMachine();
  const speedCost = factory.upgrades.costFor(bn, 'speed');
  const valueCost = factory.upgrades.costFor(1, 'value');
  const rate = factory.machines[bn]!.effectiveRatePerMin;
  const income = factory.lineIncomePerMin();

  return [
    {
      id: 'throughput',
      machineId: bn,
      type: 'speed',
      cost: speedCost,
      title: 'THROUGHPUT',
      tagline: 'More units. More pressure.',
      beforeLabel: `${rate.toFixed(1)}/min`,
      afterLabel: `~${(rate / 0.9).toFixed(1)}/min`,
      benefit: 'Raises OUTPUT; may shift bottleneck',
      consequence: 'More pressure downstream; WIP can stay high',
      kpi: 'OUTPUT',
    },
    {
      id: 'margin',
      machineId: 1,
      type: 'value',
      cost: valueCost,
      title: 'MARGIN',
      tagline: 'More value. Same flow.',
      beforeLabel: `$${income.toFixed(0)}/min`,
      afterLabel: `~$${(income * 1.12).toFixed(0)}/min`,
      benefit: 'More LINE INCOME per unit without more WIP',
      consequence: 'Flow capacity unchanged — still need Speed later',
      kpi: 'LINE INCOME/MIN',
    },
  ];
}
