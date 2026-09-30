/**
 * M-C.3 — Adaptive Expansion Fund, Commissioning Launch, three adaptive Return
 * orders, atomic free upgrade, launch hydration barrier. Completes after Toy Mastery.
 */
import {
  SMARTPHONE_CAMPAIGN,
  computeFundTarget,
  clampReturnReference,
  roundReadableFund,
  sanitizeRate,
  returnOrderCapacityCopy,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import type { Factory } from './Factory';
import type { BranchId } from './SessionGoal';

export type FundingPolicy = 'balanced' | 'fast';

export type McPhase =
  | 'idle'
  | 'funding_choice'
  | 'smartphone_funding'
  | 'smartphone_ready'
  | 'first_smartphone'
  | 'baseline_sampling'
  | 'smartphone_launch'
  | 'shift_1_complete'
  | 'return_preview'
  | 'return_challenge'
  | 'return_complete';

export type LaunchActionGate = 'pending' | 'complete' | 'waived_at_cap';
export type FreeUpgradeMode = 'none' | 'normal' | 'bonus_tier';

export type ReturnPhase =
  | 'preview'
  | 'calibration'
  | 'order_1'
  | 'order_2'
  | 'order_3'
  | 'complete';

export interface ShiftSummary {
  branch: BranchId | null;
  fundingPolicy: FundingPolicy | null;
  outputPerMin: number;
  lineIncomePerMin: number;
  wip: number;
  bottleneckId: MachineId | null;
  unlockedProducts: string[];
  sessionMs: number;
}

export interface LaunchBaseline {
  outputPerMin: number;
  lineIncomePerMin: number;
  wip: number;
  blockedShare: number;
  bottleneckId: MachineId | null;
}

export interface CompletedOrderSummary {
  orderIndex: number;
  referenceRate: number;
  target: number;
  countedProgress: number;
  activeSimulationMs: number;
  realizedRate: number;
  realizedNeutralRate: number;
  durationMs: number;
}

export interface ReturnChallengeState {
  kind: 'flow' | 'margin';
  baselineOutput: number;
  baselineIncome: number;
  baselineWip: number;
  baselineBottleneck: MachineId | null;
  /** Cumulative phone sales (flow) or $ revenue (margin) — current order. */
  batchTarget: number;
  batchProgress: number;
  maxWip: number;
  startedAtMs: number | null;
  progress: number;
  postStartInput: boolean;
  /** Alias of returnFinalConditionHoldMs. */
  sustainOkMs: number;
  /** Counter baselines at Return show (exclusive post-start progress). */
  phonesAtReturnStart: number;
  revenueAtReturnStart: number;
  /** Realized reference rates (units/sec) after sanitize. */
  referencePhonesPerSec: number;
  referenceRevenuePerSec: number;
  canonicalPhonesPerSec: number;
  canonicalRevenuePerSec: number;
  /** orderCount * orderEquivalentSeconds. */
  expectedDurationSec: number;
  /** First-30s diagnostics (filled during challenge). */
  actualPhonesFirst30Sec: number;
  actualRevenueFirst30Sec: number;
  first30SecSampleMs: number;

  /** Internal adaptive-order phase (umbrella McPhase stays return_challenge). */
  returnPhase: ReturnPhase;
  /** 0 = calibration, 1–3 = orders. */
  returnOrderIndex: number;
  calibrationMs: number;
  calibrationPhonesStart: number;
  calibrationRevenueStart: number;
  calibrationEventWeightedMs: number;
  returnOrderReferenceRate: number;
  returnOrderTarget: number;
  returnOrderStartCounter: number;
  returnOrderProgress: number;
  returnOrderActiveSimulationMs: number;
  returnOrderEventWeightedMs: number;
  returnFinalConditionHoldMs: number;
  /** MARGIN sustain baseline OUTPUT/min at order start. */
  returnOrderOutputReference: number;
  completedOrderSummaries: CompletedOrderSummary[];
  returnInputSeen: boolean;
  capacityFeedback: string | null;
  /** Player-facing next-order copy (increased / stable / decreased). */
  capacityCopy: string | null;
}

export interface FundingPurchaseRecord {
  sessionMs: number;
  machineId: MachineId;
  upgradeType: UpgradeType;
  levelBefore: number;
  levelAfter: number;
  cost: number;
  cashBefore: number;
  cashAfter: number;
  fundBefore: number;
  fundAfter: number;
}

export interface CampaignMarkers {
  fundingChoiceCampaignMs: number | null;
  fundReadyCampaignMs: number | null;
  smartphoneBuildCampaignMs: number | null;
  firstPhoneCampaignMs: number | null;
  launchStartCampaignMs: number | null;
  launchCompleteCampaignMs: number | null;
  shift1CompleteCampaignMs: number | null;
  returnShownCampaignMs: number | null;
  returnCompleteCampaignMs: number | null;
  freeUpgradeUsedCampaignMs: number | null;
}

export interface McCampaignState {
  phase: McPhase;
  smartphoneFund: number;
  fundTarget: number;
  fundingPolicy: FundingPolicy | null;
  fundingStartedAtMs: number | null;
  fundingReferenceIncomePerSec: number;
  fundingTargetDurationSec: number;
  policyContribution: number;
  policyLocked: boolean;
  /** Rolling deposit budget for event cap ($). */
  fundDepositBudget: number;
  smartphonesBuilt: boolean;
  firstSmartphoneProduced: boolean;
  cashAtBuild: number | null;

  launchBaseline: LaunchBaseline | null;
  /** Raw (event-inclusive) sampling baseline for diagnostics. */
  rawLaunchBaseline: LaunchBaseline | null;
  /** Same as launchBaseline when targets use event-neutral basis. */
  eventNeutralLaunchBaseline: LaunchBaseline | null;
  /** Mean temporary productionMult during sampling (≥1). */
  baselineEventMultiplier: number;
  launchTargetBasis: 'event_neutral' | 'raw' | null;
  launchSampleMs: number;
  launchSampleAccumTp: number;
  launchSampleAccumIncome: number;
  launchSampleAccumTpNeutral: number;
  launchSampleAccumIncomeNeutral: number;
  launchSampleEventWeightedMs: number;
  launchSampleAccumWip: number;
  launchSampleAccumBlocked: number;
  launchSampleTicks: number;
  launchBatchTarget: number;
  launchBatchProgress: number;
  launchActionGate: LaunchActionGate;
  launchRecommended: { machineId: MachineId; type: UpgradeType; reason: string } | null;
  launchSustainOkMs: number;
  launchArmedAtMs: number | null;
  launchProgress: number;
  /** EMA of OUTPUT during commissioning (dampens tick noise). */
  launchTpEma: number;
  /** Realized sales during commissioning proof (for Return reference). */
  launchProofPhones: number;
  launchProofRevenue: number;
  launchProofMs: number;
  /** Lifetime smartphone counters (campaign-scoped, persist across reload). */
  smartphonesSoldTotal: number;
  smartphoneRevenueTotal: number;
  /** Funding liquidity diagnostics (set at policy lock). */
  cheapestRelevantUpgradeCostAtFundingStart: number | null;
  secondCheapestRelevantUpgradeCost: number | null;
  fundingPurchaseCount: number;
  fundingPurchases: FundingPurchaseRecord[];
  upgradesBoughtBeforeFunding: number | null;
  /** Legacy fields kept for v4 migration / report compat. */
  launchBaselineOutput: number;
  launchBaselineIncome: number;
  launchActions: number;
  launchMinGateReachedMs: number | null;
  launchHoldMs: number;

  /** Launch hydration barrier (blocks batch progress until first valid sim step). */
  launchHydrationActive: boolean;
  launchLastObservedCounter: number;
  launchLastObservedPhones: number;
  launchLastObservedRevenue: number;
  launchProgressBeforeSave: number | null;
  launchProgressAfterHydrate: number | null;
  launchProgressAfterFirstValidStep: number | null;
  hydrationProgressDelta: number;
  firstValidStepDelta: number;
  hydrationComplete: boolean;

  shift1Complete: boolean;
  shiftSummary: ShiftSummary | null;
  returnChallenge: ReturnChallengeState | null;
  returnChallengeStarted: boolean;
  returnChallengeComplete: boolean;

  freeUpgradeCredits: number;
  freeUpgradeGranted: boolean;
  freeUpgradeUsed: boolean;
  freeUpgradeConsumed: boolean;
  freeUpgradeRewardId: string | null;
  freeUpgradeMode: FreeUpgradeMode;
  bonusUpgradeMachineId: MachineId | null;
  bonusUpgradeType: UpgradeType | null;
  bonusUpgradeGranted: boolean;
  bonusLevelDelta: number;

  campaignMarkers: CampaignMarkers;
  lastSessionEndedAt: number | null;
  currentSessionId: string;
  fundProgressBucketsEmitted: number;
  launchProgressBucketsEmitted: number;
  returnProgressBucketsEmitted: number;
  readyCelebrated: boolean;
}

export interface McEvent {
  type: string;
  payload?: Record<string, number | string | boolean | null>;
}

export interface ApplyFreeUpgradeResult {
  ok: boolean;
  reason?: string;
  mode: FreeUpgradeMode;
  cashDelta: number;
  levelBefore: number;
  levelAfter: number;
  effectiveLevelAfter?: number;
}

function blankMarkers(): CampaignMarkers {
  return {
    fundingChoiceCampaignMs: null,
    fundReadyCampaignMs: null,
    smartphoneBuildCampaignMs: null,
    firstPhoneCampaignMs: null,
    launchStartCampaignMs: null,
    launchCompleteCampaignMs: null,
    shift1CompleteCampaignMs: null,
    returnShownCampaignMs: null,
    returnCompleteCampaignMs: null,
    freeUpgradeUsedCampaignMs: null,
  };
}

function blankReturn(): ReturnChallengeState {
  const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;
  return {
    kind: 'flow',
    baselineOutput: 0,
    baselineIncome: 0,
    baselineWip: 0,
    baselineBottleneck: null,
    batchTarget: 0,
    batchProgress: 0,
    maxWip: cfg.maxWip,
    startedAtMs: null,
    progress: 0,
    postStartInput: false,
    sustainOkMs: 0,
    phonesAtReturnStart: 0,
    revenueAtReturnStart: 0,
    referencePhonesPerSec: 0,
    referenceRevenuePerSec: 0,
    canonicalPhonesPerSec: 0,
    canonicalRevenuePerSec: 0,
    expectedDurationSec: cfg.orderCount * cfg.orderEquivalentSeconds,
    actualPhonesFirst30Sec: 0,
    actualRevenueFirst30Sec: 0,
    first30SecSampleMs: 0,
    returnPhase: 'preview',
    returnOrderIndex: 0,
    calibrationMs: 0,
    calibrationPhonesStart: 0,
    calibrationRevenueStart: 0,
    calibrationEventWeightedMs: 0,
    returnOrderReferenceRate: 0,
    returnOrderTarget: 0,
    returnOrderStartCounter: 0,
    returnOrderProgress: 0,
    returnOrderActiveSimulationMs: 0,
    returnOrderEventWeightedMs: 0,
    returnFinalConditionHoldMs: 0,
    returnOrderOutputReference: 0,
    completedOrderSummaries: [],
    returnInputSeen: false,
    capacityFeedback: null,
    capacityCopy: null,
  };
}

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankMcState(sessionId: string): McCampaignState {
  return {
    phase: 'idle',
    smartphoneFund: 0,
    fundTarget: SMARTPHONE_CAMPAIGN.fundTarget,
    fundingPolicy: null,
    fundingStartedAtMs: null,
    fundingReferenceIncomePerSec: SMARTPHONE_CAMPAIGN.refIncomeFallbackPerSec,
    fundingTargetDurationSec: SMARTPHONE_CAMPAIGN.balancedDurationSec,
    policyContribution: SMARTPHONE_CAMPAIGN.balancedPct,
    policyLocked: false,
    fundDepositBudget: 0,
    smartphonesBuilt: false,
    firstSmartphoneProduced: false,
    cashAtBuild: null,
    launchBaseline: null,
    rawLaunchBaseline: null,
    eventNeutralLaunchBaseline: null,
    baselineEventMultiplier: 1,
    launchTargetBasis: null,
    launchSampleMs: 0,
    launchSampleAccumTp: 0,
    launchSampleAccumIncome: 0,
    launchSampleAccumTpNeutral: 0,
    launchSampleAccumIncomeNeutral: 0,
    launchSampleEventWeightedMs: 0,
    launchSampleAccumWip: 0,
    launchSampleAccumBlocked: 0,
    launchSampleTicks: 0,
    launchBatchTarget: 0,
    launchBatchProgress: 0,
    launchActionGate: 'pending',
    launchRecommended: null,
    launchSustainOkMs: 0,
    launchArmedAtMs: null,
    launchProgress: 0,
    launchTpEma: 0,
    launchProofPhones: 0,
    launchProofRevenue: 0,
    launchProofMs: 0,
    smartphonesSoldTotal: 0,
    smartphoneRevenueTotal: 0,
    cheapestRelevantUpgradeCostAtFundingStart: null,
    secondCheapestRelevantUpgradeCost: null,
    fundingPurchaseCount: 0,
    fundingPurchases: [],
    upgradesBoughtBeforeFunding: null,
    launchBaselineOutput: 0,
    launchBaselineIncome: 0,
    launchActions: 0,
    launchMinGateReachedMs: null,
    launchHoldMs: 0,
    launchHydrationActive: false,
    launchLastObservedCounter: 0,
    launchLastObservedPhones: 0,
    launchLastObservedRevenue: 0,
    launchProgressBeforeSave: null,
    launchProgressAfterHydrate: null,
    launchProgressAfterFirstValidStep: null,
    hydrationProgressDelta: 0,
    firstValidStepDelta: 0,
    hydrationComplete: true,
    shift1Complete: false,
    shiftSummary: null,
    returnChallenge: null,
    returnChallengeStarted: false,
    returnChallengeComplete: false,
    freeUpgradeCredits: 0,
    freeUpgradeGranted: false,
    freeUpgradeUsed: false,
    freeUpgradeConsumed: false,
    freeUpgradeRewardId: null,
    freeUpgradeMode: 'none',
    bonusUpgradeMachineId: null,
    bonusUpgradeType: null,
    bonusUpgradeGranted: false,
    bonusLevelDelta: 0,
    campaignMarkers: blankMarkers(),
    lastSessionEndedAt: null,
    currentSessionId: sessionId,
    fundProgressBucketsEmitted: 0,
    launchProgressBucketsEmitted: 0,
    returnProgressBucketsEmitted: 0,
    readyCelebrated: false,
  };
}

function blockedShare(factory: Factory): number {
  return factory.machines[0]!.recentStateShare(
    'BLOCKED',
    10_000,
    factory.line.clockMs,
  );
}

function mark(
  state: McCampaignState,
  key: keyof CampaignMarkers,
  ms: number,
): void {
  if (state.campaignMarkers[key] == null) {
    state.campaignMarkers[key] = Math.round(ms);
  }
}

function orderPhaseForIndex(n: number): ReturnPhase {
  if (n === 1) return 'order_1';
  if (n === 2) return 'order_2';
  if (n === 3) return 'order_3';
  return 'calibration';
}

export class McCampaign {
  state: McCampaignState;

  constructor(sessionId?: string) {
    this.state = blankMcState(sessionId ?? newSessionId());
  }

  get phase(): McPhase {
    return this.state.phase;
  }

  get isActive(): boolean {
    return (
      this.state.phase !== 'idle' &&
      this.state.phase !== 'return_complete'
    );
  }

  blocksCashSmartphoneUnlock(): boolean {
    if (this.state.smartphonesBuilt) return true;
    return (
      this.state.phase !== 'idle' &&
      this.state.phase !== 'return_complete'
    );
  }

  allocationPct(): number {
    return this.state.policyContribution || 0;
  }

  /**
   * Event-neutral reference income ($/s) from canonical LINE INCOME/MIN.
   */
  captureReferenceIncome(factory: Factory): number {
    const raw = factory.lineIncomePerMin() / 60;
    let v = Number.isFinite(raw) && raw > 0 ? raw : SMARTPHONE_CAMPAIGN.refIncomeFallbackPerSec;
    v = Math.max(
      SMARTPHONE_CAMPAIGN.refIncomeMinPerSec,
      Math.min(SMARTPHONE_CAMPAIGN.refIncomeMaxPerSec, v),
    );
    return +v.toFixed(3);
  }

  beginAfterMastery(factory: Factory): McEvent[] {
    if (this.state.smartphonesBuilt || this.state.shift1Complete) return [];
    if (
      this.state.phase === 'funding_choice' ||
      this.state.phase === 'smartphone_funding' ||
      this.state.phase === 'smartphone_ready'
    ) {
      return [];
    }
    if (this.state.phase !== 'idle') {
      return [];
    }
    this.state.phase = 'funding_choice';
    this.state.fundingReferenceIncomePerSec = this.captureReferenceIncome(factory);
    mark(this.state, 'fundingChoiceCampaignMs', factory.sessionMs);
    return [
      {
        type: 'funding_policy_view',
        payload: this.metricsPayload(factory),
      },
    ];
  }

  selectPolicy(factory: Factory, policy: FundingPolicy): McEvent[] {
    if (this.state.policyLocked || this.state.phase !== 'funding_choice') return [];
    if (policy !== 'balanced' && policy !== 'fast') return [];

    const ref = this.captureReferenceIncome(factory);
    this.state.fundingReferenceIncomePerSec = ref;
    const calc = computeFundTarget(ref, policy);
    this.state.fundingPolicy = policy;
    this.state.policyLocked = true;
    this.state.policyContribution = calc.contribution;
    this.state.fundingTargetDurationSec = calc.durationSec;
    this.state.fundTarget = calc.fundTarget;
    this.state.fundDepositBudget = 0;
    this.state.phase = 'smartphone_funding';
    this.state.fundingStartedAtMs = factory.sessionMs;
    this.state.fundingPurchaseCount = 0;
    this.state.fundingPurchases = [];
    this.state.upgradesBoughtBeforeFunding = factory.upgrades.totalPurchased;
    const costs = this.relevantUpgradeCosts(factory);
    this.state.cheapestRelevantUpgradeCostAtFundingStart = costs[0] ?? null;
    this.state.secondCheapestRelevantUpgradeCost = costs[1] ?? null;

    return [
      {
        type: 'smartphone_funding_policy_selected',
        payload: this.metricsPayload(factory, {
          fundingPolicy: policy,
          fundTarget: calc.fundTarget,
          contribution: calc.contribution,
          cheapestUpgrade: costs[0] ?? null,
          secondCheapestUpgrade: costs[1] ?? null,
        }),
      },
    ];
  }

  recordFundingPurchase(
    factory: Factory,
    record: Omit<FundingPurchaseRecord, 'sessionMs' | 'fundBefore' | 'fundAfter'> & {
      sessionMs?: number;
      fundBefore?: number;
      fundAfter?: number;
    },
  ): void {
    if (this.state.phase !== 'smartphone_funding') return;
    const entry: FundingPurchaseRecord = {
      sessionMs: record.sessionMs ?? Math.round(factory.sessionMs),
      machineId: record.machineId,
      upgradeType: record.upgradeType,
      levelBefore: record.levelBefore,
      levelAfter: record.levelAfter,
      cost: record.cost,
      cashBefore: record.cashBefore,
      cashAfter: record.cashAfter,
      fundBefore: record.fundBefore ?? this.state.smartphoneFund,
      fundAfter: record.fundAfter ?? this.state.smartphoneFund,
    };
    this.state.fundingPurchases.push(entry);
    this.state.fundingPurchaseCount = this.state.fundingPurchases.length;
  }

  /** Sorted ascending costs of non-max Speed/Buffer/Value slots. */
  relevantUpgradeCosts(factory: Factory): number[] {
    const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
    const prefer =
      branch === 'margin'
        ? (['value', 'speed', 'buffer'] as UpgradeType[])
        : (['speed', 'value', 'buffer'] as UpgradeType[]);
    const costs: number[] = [];
    for (const type of prefer) {
      for (const m of [1, 0, 2] as MachineId[]) {
        if (type === 'buffer' && m === 2) continue;
        if (factory.upgrades.isMaxed(m, type)) continue;
        const c = factory.upgrades.costFor(m, type);
        if (Number.isFinite(c) && c > 0) costs.push(c);
      }
    }
    return costs.sort((a, b) => a - b);
  }

  projectedRetainedCash(factory: Factory): number {
    const cash = factory.economy.coins;
    const ref = this.state.fundingReferenceIncomePerSec;
    const contrib = this.state.policyContribution;
    const dur = this.state.fundingTargetDurationSec;
    return cash + ref * (1 - contrib) * dur;
  }

  affordableUpgradeOpportunities(factory: Factory): number {
    const cash = this.projectedRetainedCash(factory);
    const costs = this.relevantUpgradeCosts(factory);
    let n = 0;
    let remaining = cash;
    for (const c of costs) {
      if (remaining >= c) {
        n += 1;
        remaining -= c;
      } else break;
    }
    return n;
  }

  /**
   * Split sale: fund gets contribution% capped by event deposit rate;
   * overflow stays as cash. Fund never shrinks.
   * Deposit budget is topped up in update() — not per sale — so burst
   * sales cannot dump unlimited event income into the fund.
   */
  splitSale(gross: number, _dtHintMs?: number): { toCash: number; toFund: number } {
    if (gross <= 0) return { toCash: 0, toFund: 0 };
    const funding = this.state.phase === 'smartphone_funding';
    if (!funding || !this.state.fundingPolicy || !this.state.policyLocked) {
      return { toCash: gross, toFund: 0 };
    }
    if (this.state.smartphoneFund >= this.state.fundTarget) {
      return { toCash: gross, toFund: 0 };
    }

    const pct = this.allocationPct();
    const desired = gross * pct;
    const room = this.state.fundTarget - this.state.smartphoneFund;
    const toFund = Math.min(room, desired, this.state.fundDepositBudget);
    this.state.fundDepositBudget = Math.max(0, this.state.fundDepositBudget - toFund);
    this.state.smartphoneFund = Math.min(
      this.state.fundTarget,
      this.state.smartphoneFund + toFund,
    );
    return { toCash: gross - toFund, toFund };
  }

  /** Accrue fund deposit budget before sales settle this frame. */
  accrueFundBudget(dtMs: number): void {
    if (this.state.phase !== 'smartphone_funding') return;
    if (!this.state.policyLocked) return;
    const capPerSec =
      this.state.fundingReferenceIncomePerSec *
      Math.max(0.2, this.state.policyContribution) *
      SMARTPHONE_CAMPAIGN.fundDepositCapMult;
    this.state.fundDepositBudget += capPerSec * (dtMs / 1000);
    this.state.fundDepositBudget = Math.min(
      this.state.fundDepositBudget,
      capPerSec * 2,
    );
  }

  update(factory: Factory, dtMs: number): McEvent[] {
    const ev: McEvent[] = [];

    if (this.state.phase === 'smartphone_funding') {
      const ratio =
        this.state.fundTarget > 0
          ? this.state.smartphoneFund / this.state.fundTarget
          : 0;
      const buckets = SMARTPHONE_CAMPAIGN.fundProgressBuckets;
      while (
        this.state.fundProgressBucketsEmitted < buckets.length &&
        ratio >= buckets[this.state.fundProgressBucketsEmitted]!
      ) {
        const b = buckets[this.state.fundProgressBucketsEmitted]!;
        this.state.fundProgressBucketsEmitted += 1;
        ev.push({
          type: 'smartphone_fund_progress',
          payload: this.metricsPayload(factory, { bucket: b }),
        });
      }
      if (this.state.smartphoneFund >= this.state.fundTarget) {
        this.state.phase = 'smartphone_ready';
        this.state.readyCelebrated = true;
        mark(this.state, 'fundReadyCampaignMs', factory.sessionMs);
        ev.push({
          type: 'smartphone_fund_ready',
          payload: this.metricsPayload(factory),
        });
      }
    }

    if (this.state.phase === 'baseline_sampling') {
      this.updateBaselineSampling(factory, dtMs);
      if ((this.state.phase as McPhase) === 'smartphone_launch') {
        ev.push({
          type: 'smartphone_launch_start',
          payload: this.metricsPayload(factory, {
            launchTarget: this.state.launchBatchTarget,
            launchBranch: factory.sessionGoal.selectedBranch,
          }),
        });
        mark(this.state, 'launchStartCampaignMs', factory.sessionMs);
      }
    }

    if (this.state.phase === 'smartphone_launch') {
      ev.push(...this.updateCommissioning(factory, dtMs));
    }

    if (this.state.phase === 'return_challenge' && this.state.returnChallenge) {
      ev.push(...this.updateReturn(factory, dtMs));
    }

    return ev;
  }

  private updateBaselineSampling(factory: Factory, dtMs: number): void {
    const tp = factory.getThroughputPerMin();
    const income = factory.lineIncomePerMin();
    const eventMult = Math.max(1, this.eventMult(factory));
    // Ignore zero ticks from reload/render
    if (tp > 0.05 || income > 0.05) {
      this.state.launchSampleMs += dtMs;
      this.state.launchSampleAccumTp += tp;
      this.state.launchSampleAccumIncome += income;
      this.state.launchSampleAccumTpNeutral += tp / eventMult;
      this.state.launchSampleAccumIncomeNeutral += income / eventMult;
      this.state.launchSampleEventWeightedMs += dtMs * eventMult;
      this.state.launchSampleAccumWip += factory.getWip();
      this.state.launchSampleAccumBlocked += blockedShare(factory);
      this.state.launchSampleTicks += 1;
    }
    if (
      this.state.launchSampleMs >= SMARTPHONE_CAMPAIGN.launch.baselineSampleMs &&
      this.state.launchSampleTicks >= 4
    ) {
      const n = this.state.launchSampleTicks;
      const raw: LaunchBaseline = {
        outputPerMin: +(this.state.launchSampleAccumTp / n).toFixed(2),
        lineIncomePerMin: +(this.state.launchSampleAccumIncome / n).toFixed(2),
        wip: Math.round(this.state.launchSampleAccumWip / n),
        blockedShare: +(this.state.launchSampleAccumBlocked / n).toFixed(3),
        bottleneckId: factory.line.getBottleneckId(),
      };
      const neutral: LaunchBaseline = {
        outputPerMin: +(this.state.launchSampleAccumTpNeutral / n).toFixed(2),
        lineIncomePerMin: +(
          this.state.launchSampleAccumIncomeNeutral / n
        ).toFixed(2),
        wip: raw.wip,
        blockedShare: raw.blockedShare,
        bottleneckId: raw.bottleneckId,
      };
      // Floor baselines so targets never NaN
      if (raw.outputPerMin < 1) raw.outputPerMin = 8;
      if (raw.lineIncomePerMin < 1) raw.lineIncomePerMin = 40;
      if (neutral.outputPerMin < 1) neutral.outputPerMin = 8;
      if (neutral.lineIncomePerMin < 1) neutral.lineIncomePerMin = 40;

      const avgMult =
        this.state.launchSampleMs > 0
          ? this.state.launchSampleEventWeightedMs / this.state.launchSampleMs
          : 1;

      this.state.rawLaunchBaseline = raw;
      this.state.eventNeutralLaunchBaseline = neutral;
      this.state.baselineEventMultiplier = +Math.max(1, avgMult).toFixed(3);
      this.state.launchTargetBasis = 'event_neutral';
      // Active baseline for target + sustain = event-neutral
      this.state.launchBaseline = neutral;
      this.state.launchBaselineOutput = neutral.outputPerMin;
      this.state.launchBaselineIncome = neutral.lineIncomePerMin;
      this.armCommissioning(factory, neutral);
    }
  }

  private armCommissioning(factory: Factory, baseline: LaunchBaseline): void {
    const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
    const eq = SMARTPHONE_CAMPAIGN.launch.equivalentSeconds;
    if (branch === 'margin') {
      this.state.launchBatchTarget = Math.max(
        40,
        Math.round((baseline.lineIncomePerMin * eq) / 60 / 5) * 5,
      );
    } else {
      this.state.launchBatchTarget = Math.max(
        8,
        Math.ceil((baseline.outputPerMin * eq) / 60),
      );
    }
    this.state.launchBatchProgress = 0;
    this.state.launchProgress = 0;
    this.state.launchSustainOkMs = 0;
    this.state.launchTpEma = baseline.outputPerMin;
    this.state.launchProofPhones = 0;
    this.state.launchProofRevenue = 0;
    this.state.launchProofMs = 0;
    this.state.launchArmedAtMs = factory.sessionMs;
    this.state.launchRecommended = this.recommendLaunchAction(factory, branch);
    this.state.launchActionGate = this.hasRelevantUpgradeable(factory, branch)
      ? 'pending'
      : 'waived_at_cap';
    this.state.phase = 'smartphone_launch';
  }

  private hasRelevantUpgradeable(
    factory: Factory,
    branch: BranchId | 'throughput' | 'margin',
  ): boolean {
    const rec = this.recommendLaunchAction(factory, branch);
    if (!rec) return false;
    return !factory.upgrades.isMaxed(rec.machineId, rec.type);
  }

  recommendLaunchAction(
    factory: Factory,
    branch: BranchId | 'throughput' | 'margin' | null,
  ): { machineId: MachineId; type: UpgradeType; reason: string } | null {
    const bn = (factory.line.getBottleneckId() ?? 1) as MachineId;
    const wip = factory.getWip();
    const blocked = blockedShare(factory);
    if (branch === 'margin') {
      if (!factory.upgrades.isMaxed(1, 'value')) {
        return {
          machineId: 1,
          type: 'value',
          reason: 'Raise unit value → LINE INCOME',
        };
      }
      if (!factory.upgrades.isMaxed(bn, 'speed')) {
        return {
          machineId: bn,
          type: 'speed',
          reason: 'Speed bottleneck to lift income flow',
        };
      }
      return null;
    }
    // FLOW
    if (wip >= 12 || blocked > 0.15) {
      const bufM = (bn === 0 ? 0 : ((bn - 1) as MachineId));
      if (bufM !== 2 && !factory.upgrades.isMaxed(bufM, 'buffer')) {
        return {
          machineId: bufM,
          type: 'buffer',
          reason: 'Buffer before bottleneck to clear queue',
        };
      }
    }
    if (!factory.upgrades.isMaxed(bn, 'speed')) {
      return {
        machineId: bn,
        type: 'speed',
        reason: 'Speed the shown bottleneck',
      };
    }
    return null;
  }

  private updateCommissioning(factory: Factory, dtMs: number): McEvent[] {
    const ev: McEvent[] = [];
    const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
    const cfg = SMARTPHONE_CAMPAIGN.launch;
    const baseline = this.state.launchBaseline;
    if (!baseline) return ev;

    this.state.launchProofMs += dtMs;

    // Refresh waiver if somehow upgrades opened
    if (
      this.state.launchActionGate === 'waived_at_cap' &&
      this.hasRelevantUpgradeable(factory, branch)
    ) {
      this.state.launchActionGate = 'pending';
      this.state.launchRecommended = this.recommendLaunchAction(factory, branch);
    }
    if (this.state.launchActionGate === 'pending' && !this.state.launchRecommended) {
      this.state.launchRecommended = this.recommendLaunchAction(factory, branch);
      if (!this.state.launchRecommended) {
        this.state.launchActionGate = 'waived_at_cap';
      }
    }

    const ratio =
      this.state.launchBatchTarget > 0
        ? this.state.launchBatchProgress / this.state.launchBatchTarget
        : 0;
    this.state.launchProgress = Math.min(1, ratio);
    const buckets = cfg.progressBuckets;
    while (
      this.state.launchProgressBucketsEmitted < buckets.length &&
      ratio >= buckets[this.state.launchProgressBucketsEmitted]!
    ) {
      const b = buckets[this.state.launchProgressBucketsEmitted]!;
      this.state.launchProgressBucketsEmitted += 1;
      ev.push({
        type: 'smartphone_launch_progress',
        payload: this.metricsPayload(factory, { bucket: b }),
      });
    }

    const batchDone =
      this.state.launchBatchProgress >= this.state.launchBatchTarget;
    const actionDone =
      this.state.launchActionGate === 'complete' ||
      this.state.launchActionGate === 'waived_at_cap';

    // Sustain only after batch is in — avoids noise while the line is still ramping.
    // EMA ignores zero ticks from the rolling throughput window.
    const tp = factory.getThroughputPerMin();
    if (tp > 0.5) {
      if (this.state.launchTpEma <= 0) this.state.launchTpEma = tp;
      else this.state.launchTpEma = this.state.launchTpEma * 0.8 + tp * 0.2;
    }

    let sustainOk = false;
    if (batchDone && actionDone) {
      if (branch === 'margin') {
        const hold = Math.max(
          this.state.launchTpEma,
          tp,
          factory.lineIncomePerMin() /
            Math.max(1, baseline.lineIncomePerMin) *
            baseline.outputPerMin,
        );
        sustainOk = hold >= baseline.outputPerMin * cfg.marginMinOutputMult;
      } else {
        sustainOk = factory.getWip() <= cfg.maxWip;
      }
    }
    if (sustainOk) this.state.launchSustainOkMs += dtMs;
    else this.state.launchSustainOkMs = 0;

    const sustainDone = this.state.launchSustainOkMs >= cfg.sustainWindowMs;

    if (batchDone && actionDone && sustainDone) {
      ev.push(...this.completeLaunch(factory));
    }
    return ev;
  }

  armHydrationBarrier(): void {
    this.state.launchHydrationActive = true;
    this.state.hydrationComplete = false;
    this.state.launchProgressBeforeSave = this.state.launchBatchProgress;
    this.state.launchProgressAfterHydrate = this.state.launchBatchProgress;
    this.state.launchProgressAfterFirstValidStep = null;
    this.state.hydrationProgressDelta = 0;
    this.state.firstValidStepDelta = 0;
    this.state.launchLastObservedPhones = this.state.smartphonesSoldTotal;
    this.state.launchLastObservedRevenue = this.state.smartphoneRevenueTotal;
    this.state.launchLastObservedCounter = this.state.smartphonesSoldTotal;
  }

  markHydrationReady(_factory: Factory): void {
    if (!this.state.launchHydrationActive) return;
    this.state.hydrationComplete = true;
    this.state.launchProgressAfterHydrate = this.state.launchBatchProgress;
    this.state.hydrationProgressDelta = 0;
  }

  noteSmartphoneSale(factory: Factory, amount: number): McEvent[] {
    if (factory.economy.currentProduct === 'smartphones' && amount > 0) {
      this.state.smartphonesSoldTotal += 1;
      this.state.smartphoneRevenueTotal += amount;
    }

    if (
      this.state.phase === 'first_smartphone' &&
      !this.state.firstSmartphoneProduced
    ) {
      if (factory.economy.currentProduct !== 'smartphones') return [];
      this.state.firstSmartphoneProduced = true;
      mark(this.state, 'firstPhoneCampaignMs', factory.sessionMs);
      this.state.phase = 'baseline_sampling';
      this.state.launchSampleMs = 0;
      this.state.launchSampleTicks = 0;
      this.state.launchSampleAccumTp = 0;
      this.state.launchSampleAccumIncome = 0;
      this.state.launchSampleAccumTpNeutral = 0;
      this.state.launchSampleAccumIncomeNeutral = 0;
      this.state.launchSampleEventWeightedMs = 0;
      this.state.launchSampleAccumWip = 0;
      this.state.launchSampleAccumBlocked = 0;
      this.state.rawLaunchBaseline = null;
      this.state.eventNeutralLaunchBaseline = null;
      this.state.baselineEventMultiplier = 1;
      this.state.launchTargetBasis = null;
      return [
        {
          type: 'smartphone_first_product',
          payload: this.metricsPayload(factory, {
            amount,
            unitValue: factory.economy.baseProductValue,
          }),
        },
      ];
    }

    // Commissioning batch (only after baseline armed; blocked during hydration)
    if (
      this.state.phase === 'smartphone_launch' &&
      this.state.launchBaseline &&
      factory.economy.currentProduct === 'smartphones'
    ) {
      if (this.state.launchHydrationActive && !this.state.hydrationComplete) {
        // Lifetime totals already updated; skip batch until hydration ready.
        return [];
      }
      const before = this.state.launchBatchProgress;
      const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
      if (branch === 'margin') {
        this.state.launchBatchProgress += amount;
      } else {
        this.state.launchBatchProgress += 1;
      }
      this.state.launchProofPhones += 1;
      this.state.launchProofRevenue += amount;

      if (
        this.state.hydrationComplete &&
        this.state.launchProgressAfterFirstValidStep == null
      ) {
        const delta = this.state.launchBatchProgress - before;
        this.state.firstValidStepDelta = delta;
        this.state.launchProgressAfterFirstValidStep =
          this.state.launchBatchProgress;
        this.state.launchHydrationActive = false;
      }
    }

    // Return progress is derived from counters in updateReturn — do not
    // double-count sale amounts here.

    return [];
  }

  /**
   * Qualified launch action — FLOW/MARGIN relevant purchase only.
   */
  noteQualifiedLaunchAction(
    factory: Factory,
    opts: {
      actionType: UpgradeType;
      machineId: number;
      beforeOutput: number;
      afterOutput: number;
      beforeIncome: number;
      afterIncome: number;
      beforeWip: number;
      afterWip: number;
    },
  ): McEvent[] {
    if (this.state.phase === 'return_challenge' && this.state.returnChallenge) {
      this.state.returnChallenge.postStartInput = true;
      this.state.returnChallenge.returnInputSeen = true;
    }

    if (this.state.phase !== 'smartphone_launch') return [];
    if (this.state.launchActionGate === 'complete') return [];

    const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
    const qualified = this.isRelevantLaunchPurchase(
      factory,
      branch,
      opts.actionType,
      opts.machineId as MachineId,
      opts,
    );
    if (!qualified) return [];

    this.state.launchActionGate = 'complete';
    this.state.launchActions = 1;
    return [
      {
        type: 'smartphone_launch_action',
        payload: this.metricsPayload(factory, {
          actionType: opts.actionType,
          machineId: opts.machineId,
          beforeOutput: opts.beforeOutput,
          afterOutput: opts.afterOutput,
          beforeIncome: opts.beforeIncome,
          afterIncome: opts.afterIncome,
          beforeWip: opts.beforeWip,
          afterWip: opts.afterWip,
          qualified: true,
          launchActionGate: 'complete',
        }),
      },
    ];
  }

  private isRelevantLaunchPurchase(
    factory: Factory,
    branch: BranchId | 'throughput' | 'margin',
    type: UpgradeType,
    machineId: MachineId,
    opts: {
      beforeOutput: number;
      afterOutput: number;
      beforeIncome: number;
      afterIncome: number;
      beforeWip: number;
      afterWip: number;
    },
  ): boolean {
    const bn = factory.line.getBottleneckId();
    if (branch === 'margin') {
      if (type === 'value') return true;
      if (type === 'speed' && opts.afterIncome > opts.beforeIncome * 1.01) {
        return true;
      }
      return false;
    }
    // FLOW
    if (type === 'speed' && (bn === null || machineId === bn)) return true;
    if (type === 'buffer') {
      return opts.afterWip < opts.beforeWip || opts.afterOutput >= opts.beforeOutput;
    }
    if (
      type === 'speed' &&
      opts.afterOutput > opts.beforeOutput * 1.02
    ) {
      return true;
    }
    return false;
  }

  buildSmartphoneLine(factory: Factory): McEvent[] {
    if (this.state.phase !== 'smartphone_ready') return [];
    if (this.state.smartphonesBuilt) return [];
    if (this.state.smartphoneFund < this.state.fundTarget) return [];

    const cash = Math.floor(factory.economy.coins);
    this.state.cashAtBuild = cash;
    this.state.smartphoneFund = this.state.fundTarget;
    this.state.smartphonesBuilt = true;
    factory.progression.unlockProduct('smartphones', factory.economy);
    factory.line.productColor = factory.economy.productColor;
    this.state.phase = 'first_smartphone';
    mark(this.state, 'smartphoneBuildCampaignMs', factory.sessionMs);

    return [
      {
        type: 'smartphone_build_pressed',
        payload: this.metricsPayload(factory, {
          cashAtBuild: cash,
          fundingPolicy: this.state.fundingPolicy,
          fundTarget: this.state.fundTarget,
        }),
      },
    ];
  }

  private completeLaunch(factory: Factory): McEvent[] {
    const summary: ShiftSummary = {
      branch: factory.sessionGoal.selectedBranch,
      fundingPolicy: this.state.fundingPolicy,
      outputPerMin: +factory.getThroughputPerMin().toFixed(1),
      lineIncomePerMin: +factory.lineIncomePerMin().toFixed(1),
      wip: factory.getWip(),
      bottleneckId: factory.line.getBottleneckId(),
      unlockedProducts: [...factory.progression.unlocked],
      sessionMs: Math.round(factory.sessionMs),
    };
    this.state.shiftSummary = summary;
    this.state.shift1Complete = true;
    this.state.phase = 'shift_1_complete';
    this.state.returnChallenge = this.buildReturnChallenge(factory, summary);
    mark(this.state, 'launchCompleteCampaignMs', factory.sessionMs);
    mark(this.state, 'shift1CompleteCampaignMs', factory.sessionMs);
    mark(this.state, 'returnShownCampaignMs', factory.sessionMs);
    this.state.phase = 'return_preview';
    return [
      {
        type: 'smartphone_launch_complete',
        payload: this.metricsPayload(factory),
      },
      {
        type: 'shift_1_complete',
        payload: this.metricsPayload(factory, {
          branch: summary.branch,
          fundingPolicy: summary.fundingPolicy,
        }),
      },
      {
        type: 'return_hook_preview',
        payload: {
          kind: this.state.returnChallenge.kind,
          batchTarget: this.state.returnChallenge.batchTarget,
          orderCount: SMARTPHONE_CAMPAIGN.returnChallenge.orderCount,
        },
      },
    ];
  }

  private buildReturnChallenge(
    factory: Factory,
    summary: ShiftSummary,
  ): ReturnChallengeState {
    const kind = summary.branch === 'margin' ? 'margin' : 'flow';
    const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;
    const proofSec = Math.max(0.001, this.state.launchProofMs / 1000);
    const realizedPhonesPerSec =
      this.state.launchProofPhones > 0
        ? this.state.launchProofPhones / proofSec
        : 0;
    const realizedRevenuePerSec =
      this.state.launchProofRevenue > 0
        ? this.state.launchProofRevenue / proofSec
        : 0;

    // Canonical event-neutral estimate from launch baseline (or summary)
    const bl = this.state.launchBaseline;
    const canonPhones = Math.max(
      0.05,
      ((bl?.outputPerMin ?? summary.outputPerMin) || 10) / 60,
    );
    const canonRevenue = Math.max(
      0.5,
      ((bl?.lineIncomePerMin ?? summary.lineIncomePerMin) || 80) / 60,
    );

    // Provisional refs from launch proof (overwritten by calibration)
    const refPhones = clampReturnReference(realizedPhonesPerSec, canonPhones);
    const refRevenue = clampReturnReference(
      realizedRevenuePerSec,
      canonRevenue,
    );

    return {
      ...blankReturn(),
      kind,
      baselineOutput: +(refPhones * 60).toFixed(2),
      baselineIncome: +(refRevenue * 60).toFixed(2),
      baselineWip: factory.getWip(),
      baselineBottleneck: factory.line.getBottleneckId(),
      batchTarget: 0,
      batchProgress: 0,
      maxWip: cfg.maxWip,
      startedAtMs: null,
      progress: 0,
      postStartInput: false,
      sustainOkMs: 0,
      phonesAtReturnStart: 0,
      revenueAtReturnStart: 0,
      referencePhonesPerSec: +refPhones.toFixed(4),
      referenceRevenuePerSec: +refRevenue.toFixed(4),
      canonicalPhonesPerSec: +canonPhones.toFixed(4),
      canonicalRevenuePerSec: +canonRevenue.toFixed(4),
      expectedDurationSec: cfg.orderCount * cfg.orderEquivalentSeconds,
      returnPhase: 'preview',
      returnOrderIndex: 0,
    };
  }

  private beginReturnCalibration(factory: Factory): void {
    const rc = this.state.returnChallenge;
    if (!rc) return;

    // Mid-order reload: keep start counters / progress — never re-run completed orders
    if (
      rc.returnPhase === 'order_1' ||
      rc.returnPhase === 'order_2' ||
      rc.returnPhase === 'order_3'
    ) {
      if (rc.startedAtMs == null) rc.startedAtMs = factory.sessionMs;
      return;
    }
    if (rc.returnPhase === 'complete') return;

    // Incomplete calibration — continue without resetting measured ms if already started
    if (rc.returnPhase === 'calibration' && rc.startedAtMs != null) {
      return;
    }

    rc.returnPhase = 'calibration';
    rc.returnOrderIndex = 0;
    rc.startedAtMs = factory.sessionMs;
    rc.calibrationMs = 0;
    rc.calibrationEventWeightedMs = 0;
    rc.calibrationPhonesStart = this.state.smartphonesSoldTotal;
    rc.calibrationRevenueStart = this.state.smartphoneRevenueTotal;
    rc.phonesAtReturnStart = this.state.smartphonesSoldTotal;
    rc.revenueAtReturnStart = this.state.smartphoneRevenueTotal;
    rc.batchTarget = 0;
    rc.batchProgress = 0;
    rc.progress = 0;
    rc.returnFinalConditionHoldMs = 0;
    rc.sustainOkMs = 0;
    rc.postStartInput = false;
    rc.returnInputSeen = false;
    rc.capacityFeedback = null;
    rc.capacityCopy = null;
    rc.returnOrderActiveSimulationMs = 0;
    rc.returnOrderEventWeightedMs = 0;
    rc.returnOrderProgress = 0;
    rc.returnOrderTarget = 0;
    rc.actualPhonesFirst30Sec = 0;
    rc.actualRevenueFirst30Sec = 0;
    rc.first30SecSampleMs = 0;
  }

  private eventMult(factory: Factory): number {
    const m = factory.eventsSys.productionMult;
    return Number.isFinite(m) && m > 1 ? m : 1;
  }

  private currentReturnCounter(rc: ReturnChallengeState): number {
    return rc.kind === 'margin'
      ? this.state.smartphoneRevenueTotal
      : this.state.smartphonesSoldTotal;
  }

  private allNormalMaxed(factory: Factory): boolean {
    for (const type of ['speed', 'value', 'buffer'] as UpgradeType[]) {
      for (const m of [0, 1, 2] as MachineId[]) {
        if (type === 'buffer' && m === 2) continue;
        if (!factory.upgrades.isMaxed(m, type)) return false;
      }
    }
    return true;
  }

  private startOrder(
    factory: Factory,
    n: number,
    referenceRate: number,
  ): McEvent[] {
    const rc = this.state.returnChallenge;
    if (!rc) return [];
    const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;
    const eq = cfg.orderEquivalentSeconds;

    const target =
      rc.kind === 'margin'
        ? Math.max(80, roundReadableFund(referenceRate * eq))
        : Math.max(8, Math.ceil(referenceRate * eq));

    if (rc.kind === 'margin') {
      rc.referenceRevenuePerSec = +referenceRate.toFixed(4);
      rc.baselineIncome = +(referenceRate * 60).toFixed(2);
    } else {
      rc.referencePhonesPerSec = +referenceRate.toFixed(4);
      rc.baselineOutput = +(referenceRate * 60).toFixed(2);
    }

    rc.returnOrderReferenceRate = referenceRate;
    rc.returnOrderTarget = target;
    rc.returnOrderStartCounter = this.currentReturnCounter(rc);
    rc.returnOrderProgress = 0;
    rc.returnOrderActiveSimulationMs = 0;
    rc.returnOrderEventWeightedMs = 0;
    rc.returnFinalConditionHoldMs = 0;
    rc.sustainOkMs = 0;
    rc.returnOrderOutputReference = factory.getThroughputPerMin();
    rc.returnPhase = orderPhaseForIndex(n);
    rc.returnOrderIndex = n;
    rc.batchTarget = target;
    rc.batchProgress = 0;
    rc.progress = 0;

    return [
      {
        type: 'return_order_start',
        payload: this.metricsPayload(factory, {
          orderIndex: n,
          referenceRate: +referenceRate.toFixed(4),
          target,
          kind: rc.kind,
        }),
      },
    ];
  }

  private finishOrder(factory: Factory, n: number): McEvent[] {
    const rc = this.state.returnChallenge;
    if (!rc) return [];
    const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;
    const counted = rc.returnOrderProgress;
    const activeSec = Math.max(0.001, rc.returnOrderActiveSimulationMs / 1000);
    const eventSec = Math.max(0.001, rc.returnOrderEventWeightedMs / 1000);
    const realizedRate = counted / activeSec;
    const realizedNeutral = counted / eventSec;
    const beforeRate = rc.returnOrderReferenceRate;
    const after = realizedNeutral;

    rc.capacityFeedback = `${beforeRate.toFixed(2)} → ${after.toFixed(2)}`;
    const prevTarget = rc.returnOrderTarget;
    rc.completedOrderSummaries.push({
      orderIndex: n,
      referenceRate: beforeRate,
      target: rc.returnOrderTarget,
      countedProgress: counted,
      activeSimulationMs: rc.returnOrderActiveSimulationMs,
      realizedRate: +realizedRate.toFixed(4),
      realizedNeutralRate: +realizedNeutral.toFixed(4),
      durationMs: Math.round(rc.returnOrderActiveSimulationMs),
    });

    const ev: McEvent[] = [
      {
        type: 'return_order_complete',
        payload: this.metricsPayload(factory, {
          orderIndex: n,
          capacityFeedback: rc.capacityFeedback,
          realizedNeutralRate: +realizedNeutral.toFixed(4),
          referenceRate: +beforeRate.toFixed(4),
          target: rc.returnOrderTarget,
        }),
      },
    ];

    if (n < cfg.orderCount) {
      ev.push(...this.startOrder(factory, n + 1, realizedNeutral));
      const nextTarget = this.state.returnChallenge?.returnOrderTarget ?? 0;
      rc.capacityCopy = returnOrderCapacityCopy(prevTarget, nextTarget);
      ev.push({
        type: 'return_order_capacity_copy',
        payload: {
          previousTarget: prevTarget,
          nextTarget,
          capacityCopy: rc.capacityCopy,
        },
      });
    } else {
      rc.capacityCopy = null;
      ev.push(...this.completeReturn(factory));
    }
    return ev;
  }

  private updateReturn(factory: Factory, dtMs: number): McEvent[] {
    const ev: McEvent[] = [];
    const rc = this.state.returnChallenge;
    if (!rc || rc.startedAtMs == null) return ev;
    if (rc.returnPhase === 'complete') return ev;

    const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;

    // —— Calibration ——
    if (rc.returnPhase === 'calibration' || rc.returnPhase === 'preview') {
      if (rc.returnPhase === 'preview') {
        rc.returnPhase = 'calibration';
      }
      // Ignore armGrace during calibration
      const tp = factory.getThroughputPerMin();
      const income = factory.lineIncomePerMin();
      const productOk = factory.economy.currentProduct === 'smartphones';
      const salesOrOutput =
        tp > 0.5 ||
        income > 0.5 ||
        this.state.smartphonesSoldTotal > rc.calibrationPhonesStart;
      if (productOk && salesOrOutput && dtMs > 0) {
        const em = this.eventMult(factory);
        rc.calibrationMs += dtMs;
        rc.calibrationEventWeightedMs += dtMs * em;
      }

      if (rc.first30SecSampleMs < 30_000) {
        const countedPhones = Math.max(
          0,
          this.state.smartphonesSoldTotal - rc.phonesAtReturnStart,
        );
        const countedRevenue = Math.max(
          0,
          this.state.smartphoneRevenueTotal - rc.revenueAtReturnStart,
        );
        rc.first30SecSampleMs = Math.min(30_000, rc.first30SecSampleMs + dtMs);
        rc.actualPhonesFirst30Sec = countedPhones;
        rc.actualRevenueFirst30Sec = countedRevenue;
      }

      rc.progress = Math.min(1, rc.calibrationMs / Math.max(1, cfg.calibrationMs));

      // Prefer full calibrationMs; require at least calibrationMinValidMs
      if (rc.calibrationMs >= cfg.calibrationMs) {
        const phonesDelta = Math.max(
          0,
          this.state.smartphonesSoldTotal - rc.calibrationPhonesStart,
        );
        const revenueDelta = Math.max(
          0,
          this.state.smartphoneRevenueTotal - rc.calibrationRevenueStart,
        );
        const calibSec = Math.max(0.001, rc.calibrationMs / 1000);
        const eventSec = Math.max(0.001, rc.calibrationEventWeightedMs / 1000);
        const rawPhones = phonesDelta / calibSec;
        const rawRevenue = revenueDelta / calibSec;
        const neutralPhones = phonesDelta / eventSec;
        const neutralRevenue = revenueDelta / eventSec;
        const fallbackPhones = Math.max(0.05, rc.canonicalPhonesPerSec);
        const fallbackRevenue = Math.max(0.5, rc.canonicalRevenuePerSec);

        if (rc.kind === 'flow') {
          // Prefer event-neutral rate; raw kept as floor diagnostic via sanitize fallback
          const measured =
            neutralPhones > 0 ? neutralPhones : rawPhones;
          rc.referencePhonesPerSec = +sanitizeRate(
            measured,
            fallbackPhones,
          ).toFixed(4);
          ev.push(...this.startOrder(factory, 1, rc.referencePhonesPerSec));
        } else {
          const measured =
            neutralRevenue > 0 ? neutralRevenue : rawRevenue;
          rc.referenceRevenuePerSec = +sanitizeRate(
            measured,
            fallbackRevenue,
          ).toFixed(4);
          ev.push(...this.startOrder(factory, 1, rc.referenceRevenuePerSec));
        }
      }
      return ev;
    }

    // —— Active order ——
    if (
      rc.returnPhase !== 'order_1' &&
      rc.returnPhase !== 'order_2' &&
      rc.returnPhase !== 'order_3'
    ) {
      return ev;
    }

    const counter = this.currentReturnCounter(rc);
    rc.returnOrderProgress = Math.max(0, counter - rc.returnOrderStartCounter);
    rc.batchProgress = rc.returnOrderProgress;
    rc.batchTarget = rc.returnOrderTarget;

    if (dtMs > 0) {
      const em = this.eventMult(factory);
      rc.returnOrderActiveSimulationMs += dtMs;
      rc.returnOrderEventWeightedMs += dtMs * em;
    }

    if (rc.first30SecSampleMs < 30_000) {
      const countedPhones = Math.max(
        0,
        this.state.smartphonesSoldTotal - rc.phonesAtReturnStart,
      );
      const countedRevenue = Math.max(
        0,
        this.state.smartphoneRevenueTotal - rc.revenueAtReturnStart,
      );
      rc.first30SecSampleMs = Math.min(30_000, rc.first30SecSampleMs + dtMs);
      rc.actualPhonesFirst30Sec = countedPhones;
      rc.actualRevenueFirst30Sec = countedRevenue;
    }

    let sustain = false;
    if (rc.returnOrderProgress >= rc.returnOrderTarget) {
      if (rc.kind === 'margin') {
        sustain =
          factory.getThroughputPerMin() >=
          rc.returnOrderOutputReference * cfg.marginMinOutputMult;
      } else {
        sustain = factory.getWip() <= rc.maxWip;
      }
    }
    if (sustain) {
      rc.returnFinalConditionHoldMs += dtMs;
    } else {
      rc.returnFinalConditionHoldMs = 0;
    }
    rc.sustainOkMs = rc.returnFinalConditionHoldMs;

    rc.progress = Math.min(
      1,
      rc.returnOrderProgress / Math.max(1, rc.returnOrderTarget),
    );
    const buckets = cfg.progressBuckets;
    while (
      this.state.returnProgressBucketsEmitted < buckets.length &&
      rc.progress >= buckets[this.state.returnProgressBucketsEmitted]!
    ) {
      this.state.returnProgressBucketsEmitted += 1;
    }

    const inputOk = rc.returnInputSeen || this.allNormalMaxed(factory);
    if (
      rc.returnOrderProgress >= rc.returnOrderTarget &&
      rc.returnFinalConditionHoldMs >= cfg.sustainWindowMs &&
      inputOk
    ) {
      ev.push(...this.finishOrder(factory, rc.returnOrderIndex));
    }
    return ev;
  }

  private completeReturn(factory: Factory): McEvent[] {
    const rc = this.state.returnChallenge;
    if (rc) {
      rc.returnPhase = 'complete';
      rc.returnOrderIndex = SMARTPHONE_CAMPAIGN.returnChallenge.orderCount;
    }
    this.state.returnChallengeComplete = true;
    this.state.phase = 'return_complete';
    mark(this.state, 'returnCompleteCampaignMs', factory.sessionMs);
    const ev: McEvent[] = [
      {
        type: 'return_challenge_complete',
        payload: this.metricsPayload(factory),
      },
    ];
    if (!this.state.freeUpgradeGranted) {
      this.state.freeUpgradeGranted = true;
      this.state.freeUpgradeCredits = 1;
      this.state.freeUpgradeMode = this.computeFreeUpgradeMode(factory);
      if (!this.state.freeUpgradeRewardId) {
        this.state.freeUpgradeRewardId = `fu_${this.state.currentSessionId}`;
      }
      ev.push({
        type: 'free_upgrade_granted',
        payload: {
          credits: 1,
          freeUpgradeMode: this.state.freeUpgradeMode,
          freeUpgradeRewardId: this.state.freeUpgradeRewardId,
        },
      });
    }
    return ev;
  }

  computeFreeUpgradeMode(factory: Factory): FreeUpgradeMode {
    if (this.state.freeUpgradeCredits <= 0) return 'none';
    // Any non-max normal upgrade available?
    for (const type of ['speed', 'value', 'buffer'] as UpgradeType[]) {
      for (const m of [0, 1, 2] as MachineId[]) {
        if (type === 'buffer' && m === 2) continue;
        if (!factory.upgrades.isMaxed(m, type)) return 'normal';
      }
    }
    return 'bonus_tier';
  }

  /**
   * Atomic free-upgrade apply. Consumes credit only after verified success.
   */
  applyFreeUpgrade(
    factory: Factory,
    machineId: MachineId,
    type: UpgradeType,
  ): ApplyFreeUpgradeResult {
    const fail = (
      reason: string,
      mode: FreeUpgradeMode,
      levelBefore: number,
      levelAfter: number,
    ): ApplyFreeUpgradeResult => ({
      ok: false,
      reason,
      mode,
      cashDelta: 0,
      levelBefore,
      levelAfter,
    });

    if (this.state.freeUpgradeConsumed || this.state.freeUpgradeCredits <= 0) {
      return fail(
        'consumed',
        this.state.freeUpgradeMode,
        factory.upgrades.getLevel(machineId, type),
        factory.upgrades.getLevel(machineId, type),
      );
    }
    if (this.state.freeUpgradeUsed) {
      return fail(
        'duplicate',
        this.state.freeUpgradeMode,
        factory.upgrades.getLevel(machineId, type),
        factory.upgrades.getLevel(machineId, type),
      );
    }

    let mode = this.computeFreeUpgradeMode(factory);
    const cashBefore = factory.economy.coins;
    const levelBefore = factory.upgrades.getLevel(machineId, type);

    if (mode === 'normal' && factory.upgrades.isMaxed(machineId, type)) {
      mode = this.computeFreeUpgradeMode(factory);
      if (mode === 'bonus_tier') {
        // continue bonus path below
      } else if (factory.upgrades.isMaxed(machineId, type)) {
        return fail('stale_max', mode, levelBefore, levelBefore);
      }
    }

    if (mode === 'none') {
      return fail('consumed', mode, levelBefore, levelBefore);
    }

    if (mode === 'normal') {
      if (factory.upgrades.isMaxed(machineId, type)) {
        return fail('stale_max', mode, levelBefore, levelBefore);
      }
      const purchased = factory.upgrades.tryPurchase(machineId, type, () => true);
      if (!purchased) {
        return fail('purchase_failed', mode, levelBefore, levelBefore);
      }
      const levelAfter = factory.upgrades.getLevel(machineId, type);
      const cashAfter = factory.economy.coins;
      if (levelAfter !== levelBefore + 1 || cashAfter !== cashBefore) {
        // Rollback level / purchase count — never consume credit
        factory.upgrades.levels[machineId][type] = levelBefore;
        factory.upgrades.totalPurchased = Math.max(
          0,
          factory.upgrades.totalPurchased - 1,
        );
        return fail('verify_failed', mode, levelBefore, levelBefore);
      }

      this.state.freeUpgradeCredits = 0;
      this.state.freeUpgradeUsed = true;
      this.state.freeUpgradeConsumed = true;
      this.state.freeUpgradeMode = mode;
      mark(this.state, 'freeUpgradeUsedCampaignMs', factory.sessionMs);
      if (!this.state.freeUpgradeRewardId) {
        this.state.freeUpgradeRewardId = `fu_${this.state.currentSessionId}`;
      }
      return {
        ok: true,
        mode,
        cashDelta: 0,
        levelBefore,
        levelAfter,
      };
    }

    // bonus_tier — do NOT call tryPurchase / spend; level stays MAX
    this.state.bonusUpgradeGranted = true;
    this.state.bonusUpgradeMachineId = machineId;
    this.state.bonusUpgradeType = type;
    this.state.bonusLevelDelta = 1;

    const cashAfter = factory.economy.coins;
    const levelAfter = factory.upgrades.getLevel(machineId, type);
    if (cashAfter !== cashBefore || levelAfter !== levelBefore) {
      this.state.bonusUpgradeGranted = false;
      this.state.bonusUpgradeMachineId = null;
      this.state.bonusUpgradeType = null;
      this.state.bonusLevelDelta = 0;
      return fail('verify_failed', mode, levelBefore, levelBefore);
    }

    this.state.freeUpgradeCredits = 0;
    this.state.freeUpgradeUsed = true;
    this.state.freeUpgradeConsumed = true;
    this.state.freeUpgradeMode = mode;
    mark(this.state, 'freeUpgradeUsedCampaignMs', factory.sessionMs);
    if (!this.state.freeUpgradeRewardId) {
      this.state.freeUpgradeRewardId = `fu_${this.state.currentSessionId}`;
    }

    return {
      ok: true,
      mode,
      cashDelta: 0,
      levelBefore,
      levelAfter,
      effectiveLevelAfter: levelBefore + this.state.bonusLevelDelta,
    };
  }

  tryConsumeFreeUpgrade(
    factory: Factory,
    machineId: MachineId,
    type: UpgradeType,
  ): { ok: boolean; mode: FreeUpgradeMode; cashDelta: number } {
    const r = this.applyFreeUpgrade(factory, machineId, type);
    return { ok: r.ok, mode: r.mode, cashDelta: r.cashDelta };
  }

  onSessionBoot(factory: Factory, isLoadedSave: boolean): McEvent[] {
    const ev: McEvent[] = [];
    const prevId = this.state.currentSessionId;
    this.state.currentSessionId = newSessionId();

    const midCampaignPhases: McPhase[] = [
      'funding_choice',
      'smartphone_funding',
      'smartphone_ready',
      'first_smartphone',
      'baseline_sampling',
      'smartphone_launch',
    ];
    const inMidCampaign = midCampaignPhases.includes(this.state.phase);

    // Never arm Return while still in funding / launch / sampling
    if (
      isLoadedSave &&
      this.state.shift1Complete &&
      this.state.returnChallenge &&
      !this.state.returnChallengeComplete &&
      !this.state.returnChallengeStarted &&
      !inMidCampaign &&
      (this.state.phase === 'return_preview' ||
        this.state.phase === 'shift_1_complete' ||
        this.state.phase === 'idle')
    ) {
      this.state.returnChallengeStarted = true;
      this.state.phase = 'return_challenge';
      this.beginReturnCalibration(factory);
      mark(this.state, 'returnShownCampaignMs', factory.sessionMs);
      const absenceMs =
        this.state.lastSessionEndedAt != null
          ? Date.now() - this.state.lastSessionEndedAt
          : null;
      ev.push({
        type: 'return_session_start',
        payload: this.metricsPayload(factory, {
          previousSessionId: prevId,
          absenceMs,
        }),
      });
      ev.push({
        type: 'return_challenge_shown',
        payload: {
          kind: this.state.returnChallenge.kind,
          batchTarget: this.state.returnChallenge.batchTarget,
          returnPhase: this.state.returnChallenge.returnPhase,
        },
      });
      ev.push({
        type: 'return_challenge_start',
        payload: { kind: this.state.returnChallenge.kind },
      });
    } else if (
      isLoadedSave &&
      this.state.returnChallengeStarted &&
      !this.state.returnChallengeComplete &&
      this.state.returnChallenge &&
      !inMidCampaign
    ) {
      this.state.phase = 'return_challenge';
      // Resume mid-order / mid-calib without resetting counters
      if (this.state.returnChallenge.startedAtMs == null) {
        this.beginReturnCalibration(factory);
      } else if (
        this.state.returnChallenge.returnPhase === 'preview' ||
        (this.state.returnChallenge.returnPhase === 'calibration' &&
          this.state.returnChallenge.calibrationMs <
            SMARTPHONE_CAMPAIGN.returnChallenge.calibrationMinValidMs &&
          this.state.returnChallenge.startedAtMs == null)
      ) {
        this.beginReturnCalibration(factory);
      }
    }

    // Resume mid-campaign phases exactly — do not reset sampling/launch
    if (isLoadedSave && inMidCampaign) {
      // keep phase, sample accumulators, batch progress, action gate
    }

    if (this.state.freeUpgradeCredits > 0) {
      this.state.freeUpgradeMode = this.computeFreeUpgradeMode(factory);
    }

    return ev;
  }

  noteSessionEnd(): void {
    this.state.lastSessionEndedAt = Date.now();
  }

  handleUnlockTap(factory: Factory): McEvent[] {
    if (this.state.phase === 'smartphone_ready') {
      return this.buildSmartphoneLine(factory);
    }
    return [];
  }

  handleFundingChoicePick(
    factory: Factory,
    pick: 'balanced' | 'fast',
  ): McEvent[] {
    if (this.state.phase !== 'funding_choice') return [];
    return this.selectPolicy(factory, pick);
  }

  etaSeconds(factory: Factory): number | null {
    if (this.state.phase !== 'smartphone_funding') return null;
    const remaining = this.state.fundTarget - this.state.smartphoneFund;
    if (remaining <= 0) return 0;
    const pct = this.allocationPct();
    if (pct <= 0) return null;
    const ips = Math.max(
      factory.lineIncomePerMin() / 60,
      this.state.fundingReferenceIncomePerSec * 0.5,
    );
    const capped = Math.min(
      ips * pct,
      this.state.fundingReferenceIncomePerSec *
        Math.max(0.2, pct) *
        SMARTPHONE_CAMPAIGN.fundDepositCapMult,
    );
    return remaining / Math.max(0.25, capped);
  }

  private formatReturnProgress(rc: ReturnChallengeState): string {
    if (rc.kind === 'margin') {
      return `$${Math.floor(rc.batchProgress)} / $${rc.batchTarget}`;
    }
    return `${Math.floor(rc.batchProgress)} / ${rc.batchTarget} phones`;
  }

  label(factory: Factory): string {
    const s = this.state;
    switch (s.phase) {
      case 'funding_choice':
        return 'SMARTPHONE FUND — choose BALANCED or FAST';
      case 'smartphone_funding': {
        const pol = s.fundingPolicy === 'fast' ? 'FAST' : 'BALANCED';
        return `SMARTPHONE FUND — $${Math.floor(s.smartphoneFund)} / $${s.fundTarget} · ${pol}`;
      }
      case 'smartphone_ready':
        return 'SMARTPHONE READY — BUILD SMARTPHONE LINE';
      case 'first_smartphone':
        return 'FIRST SMARTPHONE — Produce and sell your first Smartphone';
      case 'baseline_sampling':
        return 'PHONE COMMISSIONING — sampling the line…';
      case 'smartphone_launch': {
        const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
        const title =
          branch === 'margin'
            ? 'PREMIUM LAUNCH — PROVE THE VALUE'
            : 'PHONE RAMP — CLEAR THE FLOW';
        const cur = Math.floor(s.launchBatchProgress);
        const tgt = s.launchBatchTarget;
        const unit = branch === 'margin' ? '$' : '';
        return `${title} — ${unit}${cur} / ${unit}${tgt}`;
      }
      case 'shift_1_complete':
      case 'return_preview':
        return 'SHIFT 1 COMPLETE · NEXT SHIFT ready on your next visit';
      case 'return_challenge': {
        const rc = s.returnChallenge;
        if (!rc) return 'RETURN CHALLENGE';
        if (
          rc.returnPhase === 'calibration' ||
          rc.returnPhase === 'preview'
        ) {
          return 'RETURN SHIFT — CALIBRATING LINE';
        }
        if (rc.returnPhase === 'order_1') {
          return `RETURN SHIFT — ORDER 1/3 — ${this.formatReturnProgress(rc)}`;
        }
        if (rc.returnPhase === 'order_2') {
          return `RETURN SHIFT — ORDER 2/3 — ${this.formatReturnProgress(rc)}`;
        }
        if (rc.returnPhase === 'order_3') {
          return `RETURN SHIFT — FINAL ORDER — ${this.formatReturnProgress(rc)}`;
        }
        return `RETURN SHIFT — ${this.formatReturnProgress(rc)}`;
      }
      case 'return_complete':
        return s.freeUpgradeCredits > 0
          ? 'RETURN COMPLETE — claim ONE FREE UPGRADE'
          : 'RETURN COMPLETE — factory ready';
      default:
        return '';
    }
  }

  detailLines(factory: Factory): string[] {
    const s = this.state;
    if (s.phase === 'funding_choice') {
      return [
        'BALANCED: Keep more cash · Build in ~3.5–4 min',
        'FAST: Invest more · Build in ~3–3.25 min',
        `Ref income ~$${s.fundingReferenceIncomePerSec.toFixed(1)}/s · ${Math.round(s.policyContribution * 100)}%`,
        `Cash $${Math.floor(factory.economy.coins)}`,
      ];
    }
    if (s.phase === 'smartphone_funding') {
      const eta = this.etaSeconds(factory);
      const etaTxt =
        eta == null
          ? '~…'
          : eta < 60
            ? `~${Math.ceil(eta)}s (approx)`
            : `~${(eta / 60).toFixed(1)} min (approx)`;
      return [
        `SMARTPHONE FUND  $${Math.floor(s.smartphoneFund)} / $${s.fundTarget}`,
        `${s.fundingPolicy === 'fast' ? 'FAST' : 'BALANCED'} locked · ${Math.round(s.policyContribution * 100)}%`,
        `Cash $${Math.floor(factory.economy.coins)}`,
        etaTxt,
      ];
    }
    if (s.phase === 'smartphone_ready') {
      return ['Fund complete — BUILD consumes the fund (no cash charge)'];
    }
    if (s.phase === 'baseline_sampling') {
      return [
        'Measuring a stable baseline…',
        `Sample ${(s.launchSampleMs / 1000).toFixed(1)}s`,
      ];
    }
    if (s.phase === 'smartphone_launch') {
      const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
      const cfg = SMARTPHONE_CAMPAIGN.launch;
      const baseline = s.launchBaseline;
      const lines: string[] = [
        `Batch ${Math.floor(s.launchBatchProgress)} / ${s.launchBatchTarget}`,
        `OUTPUT ${factory.getThroughputPerMin().toFixed(0)} · INC $${factory.lineIncomePerMin().toFixed(0)}/min · WIP ${factory.getWip()}`,
      ];
      if (s.launchActionGate === 'waived_at_cap') {
        lines.push('LINE FULLY TUNED — PROVE THE BATCH');
      } else if (s.launchActionGate === 'complete') {
        lines.push('ACTION COMPLETE');
      } else if (s.launchRecommended) {
        const r = s.launchRecommended;
        lines.push(
          `Suggested: M${r.machineId + 1} ${r.type.toUpperCase()} — ${r.reason}`,
        );
      }
      const batchDone =
        s.launchBatchTarget > 0 &&
        s.launchBatchProgress >= s.launchBatchTarget;
      const actionDone =
        s.launchActionGate === 'complete' ||
        s.launchActionGate === 'waived_at_cap';
      if (batchDone && actionDone && baseline) {
        if (branch === 'margin') {
          const need = baseline.outputPerMin * cfg.marginMinOutputMult;
          const now = Math.max(
            factory.getThroughputPerMin(),
            s.launchTpEma,
          );
          if (s.launchSustainOkMs > 0) {
            lines.push(
              `HOLD OUTPUT ≥ ${need.toFixed(0)} · ${(s.launchSustainOkMs / 1000).toFixed(1)}s`,
            );
          } else {
            lines.push(
              `NEED OUTPUT ≥ ${need.toFixed(0)} (now ${now.toFixed(0)})`,
            );
          }
        } else {
          const wip = factory.getWip();
          if (wip <= cfg.maxWip && s.launchSustainOkMs > 0) {
            lines.push(
              `HOLD WIP ≤ ${cfg.maxWip} · ${(s.launchSustainOkMs / 1000).toFixed(1)}s`,
            );
          } else {
            lines.push(`NEED WIP ≤ ${cfg.maxWip} (now ${wip})`);
          }
        }
      }
      return lines;
    }
    if (s.phase === 'return_preview' || s.phase === 'shift_1_complete') {
      const rc = s.returnChallenge;
      const kind = rc?.kind === 'margin' ? 'MARGIN' : 'FLOW';
      return [
        'SHIFT 1 COMPLETE',
        rc
          ? `Next visit: ${kind} — 3 adaptive orders after calibration`
          : 'Challenge waits for your next visit',
      ];
    }
    if (s.phase === 'return_challenge' && s.returnChallenge) {
      const rc = s.returnChallenge;
      if (
        rc.returnPhase === 'calibration' ||
        rc.returnPhase === 'preview'
      ) {
        return [
          'CALIBRATING LINE',
          `Valid sim ${(rc.calibrationMs / 1000).toFixed(1)}s / ${(SMARTPHONE_CAMPAIGN.returnChallenge.calibrationMs / 1000).toFixed(0)}s`,
          `OUTPUT ${factory.getThroughputPerMin().toFixed(0)} · WIP ${factory.getWip()}`,
        ];
      }
      const orderLabel =
        rc.returnPhase === 'order_3'
          ? 'FINAL ORDER'
          : `ORDER ${rc.returnOrderIndex}/3`;
      const lines = [
        orderLabel,
        `${this.formatReturnProgress(rc)}`,
        `WIP ≤ ${rc.maxWip} · hold ${(rc.returnFinalConditionHoldMs / 1000).toFixed(1)}s`,
      ];
      if (rc.capacityFeedback) {
        lines.push('ORDER COMPLETE');
        lines.push(`New capacity detected: ${rc.capacityFeedback}`);
        if (rc.capacityCopy) {
          lines.push(rc.capacityCopy);
        }
      }
      return lines;
    }
    if (s.phase === 'return_complete') {
      if (s.freeUpgradeCredits > 0) {
        return [
          'ONE FREE UPGRADE',
          'Choose any upgrade — includes one BONUS TIER if your line is MAX.',
        ];
      }
      return ['Shift complete'];
    }
    return [];
  }

  unlockButtonLabel(): string {
    switch (this.state.phase) {
      case 'funding_choice':
        return 'SELECT FUNDING ABOVE';
      case 'smartphone_funding':
        return `FUNDING · ${this.state.fundingPolicy === 'fast' ? 'FAST' : 'BALANCED'}`;
      case 'smartphone_ready':
        return 'BUILD SMARTPHONE LINE';
      case 'baseline_sampling':
      case 'smartphone_launch':
      case 'first_smartphone':
        return 'SMARTPHONES ONLINE';
      case 'return_preview':
      case 'shift_1_complete':
        return 'NEXT SHIFT READY';
      case 'return_challenge':
        return this.state.returnChallenge?.kind === 'margin'
          ? 'MARGIN RESTART'
          : 'FLOW RESTART';
      case 'return_complete':
        return this.state.freeUpgradeCredits > 0 ? 'FREE UPGRADE ×1' : 'COMPLETE';
      default:
        return '';
    }
  }

  metricsPayload(
    factory: Factory,
    extra: Record<string, number | string | boolean | null> = {},
  ): Record<string, number | string | boolean | null> {
    return {
      elapsedMs: Math.round(factory.sessionMs),
      branch: factory.sessionGoal.selectedBranch,
      fundingPolicy: this.state.fundingPolicy,
      fund: Math.floor(this.state.smartphoneFund),
      fundTarget: this.state.fundTarget,
      fundingReferenceIncomePerSec: this.state.fundingReferenceIncomePerSec,
      effectiveContributionRate: this.state.policyContribution,
      cash: Math.floor(factory.economy.coins),
      OUTPUT: +factory.getThroughputPerMin().toFixed(1),
      'LINE INCOME/MIN': +factory.lineIncomePerMin().toFixed(1),
      WIP: factory.getWip(),
      bottleneck: factory.line.getBottleneckId(),
      sessionId: this.state.currentSessionId,
      launchActionGate: this.state.launchActionGate,
      launchProgress: +this.state.launchProgress.toFixed(3),
      ...extra,
    };
  }

  snapshot(): McCampaignState {
    return {
      ...this.state,
      campaignMarkers: { ...this.state.campaignMarkers },
      launchBaseline: this.state.launchBaseline
        ? { ...this.state.launchBaseline }
        : null,
      launchRecommended: this.state.launchRecommended
        ? { ...this.state.launchRecommended }
        : null,
      shiftSummary: this.state.shiftSummary
        ? {
            ...this.state.shiftSummary,
            unlockedProducts: [...this.state.shiftSummary.unlockedProducts],
          }
        : null,
      returnChallenge: this.state.returnChallenge
        ? {
            ...this.state.returnChallenge,
            completedOrderSummaries:
              this.state.returnChallenge.completedOrderSummaries.map((s) => ({
                ...s,
              })),
          }
        : null,
      fundingPurchases: this.state.fundingPurchases.map((r) => ({ ...r })),
    };
  }

  load(data: Partial<McCampaignState> | undefined, sessionId?: string): void {
    if (!data) {
      this.state = blankMcState(sessionId ?? newSessionId());
      return;
    }
    const base = blankMcState(
      data.currentSessionId ?? sessionId ?? newSessionId(),
    );

    // Migrate legacy fundingPurchases number → count + empty array
    let fundingPurchases: FundingPurchaseRecord[] = [];
    let fundingPurchaseCount = 0;
    const rawPurchases = (data as { fundingPurchases?: unknown }).fundingPurchases;
    if (typeof rawPurchases === 'number') {
      fundingPurchaseCount = Math.max(0, rawPurchases);
      fundingPurchases = [];
    } else if (Array.isArray(rawPurchases)) {
      fundingPurchases = rawPurchases as FundingPurchaseRecord[];
      fundingPurchaseCount =
        data.fundingPurchaseCount ?? fundingPurchases.length;
    } else if (typeof data.fundingPurchaseCount === 'number') {
      fundingPurchaseCount = data.fundingPurchaseCount;
    }

    this.state = {
      ...base,
      ...data,
      fundTarget: data.fundTarget ?? base.fundTarget,
      smartphoneFund: Math.max(0, data.smartphoneFund ?? 0),
      fundingReferenceIncomePerSec:
        data.fundingReferenceIncomePerSec ??
        base.fundingReferenceIncomePerSec,
      fundingTargetDurationSec:
        data.fundingTargetDurationSec ?? base.fundingTargetDurationSec,
      policyContribution: data.policyContribution ?? base.policyContribution,
      policyLocked:
        data.policyLocked ??
        (data.fundingPolicy === 'balanced' || data.fundingPolicy === 'fast'),
      freeUpgradeCredits: Math.max(0, data.freeUpgradeCredits ?? 0),
      freeUpgradeMode: data.freeUpgradeMode ?? 'none',
      freeUpgradeConsumed: data.freeUpgradeConsumed ?? false,
      freeUpgradeRewardId: data.freeUpgradeRewardId ?? null,
      bonusLevelDelta: data.bonusLevelDelta ?? 0,
      fundingPurchaseCount,
      fundingPurchases,
      upgradesBoughtBeforeFunding:
        data.upgradesBoughtBeforeFunding ?? null,
      launchHydrationActive: data.launchHydrationActive ?? false,
      launchLastObservedCounter: data.launchLastObservedCounter ?? 0,
      launchLastObservedPhones: data.launchLastObservedPhones ?? 0,
      launchLastObservedRevenue: data.launchLastObservedRevenue ?? 0,
      launchProgressBeforeSave: data.launchProgressBeforeSave ?? null,
      launchProgressAfterHydrate: data.launchProgressAfterHydrate ?? null,
      launchProgressAfterFirstValidStep:
        data.launchProgressAfterFirstValidStep ?? null,
      hydrationProgressDelta: data.hydrationProgressDelta ?? 0,
      firstValidStepDelta: data.firstValidStepDelta ?? 0,
      hydrationComplete: data.hydrationComplete ?? true,
      campaignMarkers: {
        ...blankMarkers(),
        ...(data.campaignMarkers ?? {}),
      },
      launchBaseline: data.launchBaseline ?? null,
      rawLaunchBaseline: data.rawLaunchBaseline ?? null,
      eventNeutralLaunchBaseline:
        data.eventNeutralLaunchBaseline ?? data.launchBaseline ?? null,
      baselineEventMultiplier: data.baselineEventMultiplier ?? 1,
      launchTargetBasis: data.launchTargetBasis ?? null,
      launchSampleAccumTpNeutral: data.launchSampleAccumTpNeutral ?? 0,
      launchSampleAccumIncomeNeutral:
        data.launchSampleAccumIncomeNeutral ?? 0,
      launchSampleEventWeightedMs: data.launchSampleEventWeightedMs ?? 0,
      launchRecommended: data.launchRecommended ?? null,
      shiftSummary: data.shiftSummary ?? null,
      returnChallenge: data.returnChallenge
        ? {
            ...blankReturn(),
            ...data.returnChallenge,
            completedOrderSummaries: Array.isArray(
              data.returnChallenge.completedOrderSummaries,
            )
              ? data.returnChallenge.completedOrderSummaries.map((s) => ({
                  ...s,
                }))
              : [],
          }
        : null,
    };

    // Migrate legacy smartphone_launch without baseline → sampling
    if (
      this.state.phase === 'smartphone_launch' &&
      !this.state.launchBaseline &&
      this.state.firstSmartphoneProduced
    ) {
      this.state.phase = 'baseline_sampling';
    }
    // Ensure batch target if baseline exists but target missing (v4)
    if (
      this.state.phase === 'smartphone_launch' &&
      this.state.launchBaseline &&
      this.state.launchBatchTarget <= 0
    ) {
      const eq = SMARTPHONE_CAMPAIGN.launch.equivalentSeconds;
      const bl = this.state.launchBaseline;
      this.state.launchBatchTarget = Math.max(
        8,
        Math.ceil((bl.outputPerMin * eq) / 60),
      );
      this.state.launchActionGate = this.state.launchActionGate || 'pending';
    }

    // Launch hydration barrier on load mid-commissioning / sampling
    if (
      this.state.phase === 'smartphone_launch' ||
      this.state.phase === 'baseline_sampling'
    ) {
      this.armHydrationBarrier();
    }
  }
}
