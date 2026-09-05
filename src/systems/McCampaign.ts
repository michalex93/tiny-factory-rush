/**
 * M-C.1 — Adaptive Expansion Fund, Commissioning Launch, normalized Return,
 * Bonus-tier free upgrade. Completes after Toy Mastery.
 */
import {
  SMARTPHONE_CAMPAIGN,
  computeFundTarget,
  clampReturnReference,
  roundReadableFund,
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

export interface ReturnChallengeState {
  kind: 'flow' | 'margin';
  baselineOutput: number;
  baselineIncome: number;
  baselineWip: number;
  baselineBottleneck: MachineId | null;
  /** Cumulative phone sales (flow) or $ revenue (margin). */
  batchTarget: number;
  batchProgress: number;
  maxWip: number;
  startedAtMs: number | null;
  progress: number;
  postStartInput: boolean;
  sustainOkMs: number;
  /** Counter baselines at Return show (exclusive post-start progress). */
  phonesAtReturnStart: number;
  revenueAtReturnStart: number;
  /** Realized reference rates (units/sec) after clamp. */
  referencePhonesPerSec: number;
  referenceRevenuePerSec: number;
  canonicalPhonesPerSec: number;
  canonicalRevenuePerSec: number;
  expectedDurationSec: number;
  /** First-30s diagnostics (filled during challenge). */
  actualPhonesFirst30Sec: number;
  actualRevenueFirst30Sec: number;
  first30SecSampleMs: number;
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
  launchSampleMs: number;
  launchSampleAccumTp: number;
  launchSampleAccumIncome: number;
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
  fundingPurchases: number;
  /** Legacy fields kept for v4 migration / report compat. */
  launchBaselineOutput: number;
  launchBaselineIncome: number;
  launchActions: number;
  launchMinGateReachedMs: number | null;
  launchHoldMs: number;

  shift1Complete: boolean;
  shiftSummary: ShiftSummary | null;
  returnChallenge: ReturnChallengeState | null;
  returnChallengeStarted: boolean;
  returnChallengeComplete: boolean;

  freeUpgradeCredits: number;
  freeUpgradeGranted: boolean;
  freeUpgradeUsed: boolean;
  freeUpgradeMode: FreeUpgradeMode;
  bonusUpgradeMachineId: MachineId | null;
  bonusUpgradeType: UpgradeType | null;
  bonusUpgradeGranted: boolean;

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
  return {
    kind: 'flow',
    baselineOutput: 0,
    baselineIncome: 0,
    baselineWip: 0,
    baselineBottleneck: null,
    batchTarget: 1,
    batchProgress: 0,
    maxWip: SMARTPHONE_CAMPAIGN.returnChallenge.maxWip,
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
    expectedDurationSec: SMARTPHONE_CAMPAIGN.returnChallenge.equivalentSeconds,
    actualPhonesFirst30Sec: 0,
    actualRevenueFirst30Sec: 0,
    first30SecSampleMs: 0,
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
    launchSampleMs: 0,
    launchSampleAccumTp: 0,
    launchSampleAccumIncome: 0,
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
    fundingPurchases: 0,
    launchBaselineOutput: 0,
    launchBaselineIncome: 0,
    launchActions: 0,
    launchMinGateReachedMs: null,
    launchHoldMs: 0,
    shift1Complete: false,
    shiftSummary: null,
    returnChallenge: null,
    returnChallengeStarted: false,
    returnChallengeComplete: false,
    freeUpgradeCredits: 0,
    freeUpgradeGranted: false,
    freeUpgradeUsed: false,
    freeUpgradeMode: 'none',
    bonusUpgradeMachineId: null,
    bonusUpgradeType: null,
    bonusUpgradeGranted: false,
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
      this.state.phase !== 'return_challenge' &&
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
    this.state.fundingPurchases = 0;
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
    // Ignore zero ticks from reload/render
    if (tp > 0.05 || income > 0.05) {
      this.state.launchSampleMs += dtMs;
      this.state.launchSampleAccumTp += tp;
      this.state.launchSampleAccumIncome += income;
      this.state.launchSampleAccumWip += factory.getWip();
      this.state.launchSampleAccumBlocked += blockedShare(factory);
      this.state.launchSampleTicks += 1;
    }
    if (
      this.state.launchSampleMs >= SMARTPHONE_CAMPAIGN.launch.baselineSampleMs &&
      this.state.launchSampleTicks >= 4
    ) {
      const n = this.state.launchSampleTicks;
      const baseline: LaunchBaseline = {
        outputPerMin: +(this.state.launchSampleAccumTp / n).toFixed(2),
        lineIncomePerMin: +(this.state.launchSampleAccumIncome / n).toFixed(2),
        wip: Math.round(this.state.launchSampleAccumWip / n),
        blockedShare: +(this.state.launchSampleAccumBlocked / n).toFixed(3),
        bottleneckId: factory.line.getBottleneckId(),
      };
      // Floor baselines so targets never NaN
      if (baseline.outputPerMin < 1) baseline.outputPerMin = 8;
      if (baseline.lineIncomePerMin < 1) baseline.lineIncomePerMin = 40;
      this.state.launchBaseline = baseline;
      this.state.launchBaselineOutput = baseline.outputPerMin;
      this.state.launchBaselineIncome = baseline.lineIncomePerMin;
      this.armCommissioning(factory, baseline);
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
      this.state.launchSampleAccumWip = 0;
      this.state.launchSampleAccumBlocked = 0;
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

    // Commissioning batch (only after baseline armed)
    if (
      this.state.phase === 'smartphone_launch' &&
      this.state.launchBaseline &&
      factory.economy.currentProduct === 'smartphones'
    ) {
      const branch = factory.sessionGoal.selectedBranch ?? 'throughput';
      if (branch === 'margin') {
        this.state.launchBatchProgress += amount;
      } else {
        this.state.launchBatchProgress += 1;
      }
      this.state.launchProofPhones += 1;
      this.state.launchProofRevenue += amount;
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
        },
      },
    ];
  }

  private buildReturnChallenge(
    factory: Factory,
    summary: ShiftSummary,
  ): ReturnChallengeState {
    const kind = summary.branch === 'margin' ? 'margin' : 'flow';
    const eq = SMARTPHONE_CAMPAIGN.returnChallenge.equivalentSeconds;
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

    const refPhones = clampReturnReference(realizedPhonesPerSec, canonPhones);
    const refRevenue = clampReturnReference(
      realizedRevenuePerSec,
      canonRevenue,
    );

    const batchTarget =
      kind === 'margin'
        ? Math.max(80, roundReadableFund(refRevenue * eq))
        : Math.max(12, Math.ceil(refPhones * eq));

    return {
      kind,
      baselineOutput: +(refPhones * 60).toFixed(2),
      baselineIncome: +(refRevenue * 60).toFixed(2),
      baselineWip: factory.getWip(),
      baselineBottleneck: factory.line.getBottleneckId(),
      batchTarget,
      batchProgress: 0,
      maxWip: SMARTPHONE_CAMPAIGN.returnChallenge.maxWip,
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
      expectedDurationSec: eq,
      actualPhonesFirst30Sec: 0,
      actualRevenueFirst30Sec: 0,
      first30SecSampleMs: 0,
    };
  }

  private beginReturnChallenge(factory: Factory): void {
    const rc = this.state.returnChallenge;
    if (!rc) return;
    rc.startedAtMs = factory.sessionMs;
    rc.phonesAtReturnStart = this.state.smartphonesSoldTotal;
    rc.revenueAtReturnStart = this.state.smartphoneRevenueTotal;
    rc.batchProgress = 0;
    rc.progress = 0;
    rc.sustainOkMs = 0;
    rc.postStartInput = false;
    rc.actualPhonesFirst30Sec = 0;
    rc.actualRevenueFirst30Sec = 0;
    rc.first30SecSampleMs = 0;
  }

  private updateReturn(factory: Factory, dtMs: number): McEvent[] {
    const ev: McEvent[] = [];
    const rc = this.state.returnChallenge;
    if (!rc || rc.startedAtMs == null) return ev;
    const cfg = SMARTPHONE_CAMPAIGN.returnChallenge;
    const elapsed = factory.sessionMs - rc.startedAtMs;
    if (elapsed < cfg.armGraceMs) return ev;

    // Progress = exclusive delta after Return start (same units as target)
    const countedPhones = Math.max(
      0,
      this.state.smartphonesSoldTotal - rc.phonesAtReturnStart,
    );
    const countedRevenue = Math.max(
      0,
      this.state.smartphoneRevenueTotal - rc.revenueAtReturnStart,
    );
    rc.batchProgress =
      rc.kind === 'margin' ? countedRevenue : countedPhones;

    if (rc.first30SecSampleMs < 30_000) {
      rc.first30SecSampleMs = Math.min(30_000, rc.first30SecSampleMs + dtMs);
      rc.actualPhonesFirst30Sec = countedPhones;
      rc.actualRevenueFirst30Sec = countedRevenue;
    }

    let sustain = false;
    if (rc.batchProgress >= rc.batchTarget) {
      if (rc.kind === 'margin') {
        sustain =
          factory.getThroughputPerMin() >=
          rc.baselineOutput * cfg.marginMinOutputMult * 0.97;
      } else {
        sustain = factory.getWip() <= rc.maxWip;
      }
    }
    if (sustain) rc.sustainOkMs += dtMs;
    else rc.sustainOkMs = 0;

    rc.progress = Math.min(1, rc.batchProgress / Math.max(1, rc.batchTarget));
    const buckets = cfg.progressBuckets;
    while (
      this.state.returnProgressBucketsEmitted < buckets.length &&
      rc.progress >= buckets[this.state.returnProgressBucketsEmitted]!
    ) {
      this.state.returnProgressBucketsEmitted += 1;
    }

    if (
      rc.batchProgress >= rc.batchTarget &&
      rc.sustainOkMs >= cfg.sustainWindowMs &&
      rc.postStartInput
    ) {
      ev.push(...this.completeReturn(factory));
    }
    return ev;
  }

  private completeReturn(factory: Factory): McEvent[] {
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
      ev.push({
        type: 'free_upgrade_granted',
        payload: {
          credits: 1,
          freeUpgradeMode: this.state.freeUpgradeMode,
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

  tryConsumeFreeUpgrade(
    factory: Factory,
    machineId: MachineId,
    type: UpgradeType,
  ): { ok: boolean; mode: FreeUpgradeMode; cashDelta: number } {
    if (this.state.freeUpgradeCredits <= 0 || this.state.freeUpgradeUsed) {
      return { ok: false, mode: 'none', cashDelta: 0 };
    }
    const mode = this.computeFreeUpgradeMode(factory);
    this.state.freeUpgradeMode = mode;
    this.state.freeUpgradeCredits = 0;
    this.state.freeUpgradeUsed = true;
    mark(this.state, 'freeUpgradeUsedCampaignMs', factory.sessionMs);

    if (mode === 'bonus_tier') {
      this.state.bonusUpgradeGranted = true;
      this.state.bonusUpgradeMachineId = machineId;
      this.state.bonusUpgradeType = type;
    }
    return { ok: true, mode, cashDelta: 0 };
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
      this.beginReturnChallenge(factory);
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
      if (this.state.returnChallenge.startedAtMs == null) {
        this.beginReturnChallenge(factory);
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
        if (rc.kind === 'margin') {
          return `MARGIN RESTART — $${Math.floor(rc.batchProgress)} / $${rc.batchTarget}`;
        }
        return `FLOW RESTART — ${Math.floor(rc.batchProgress)} / ${rc.batchTarget} phones`;
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
      return lines;
    }
    if (s.phase === 'return_preview' || s.phase === 'shift_1_complete') {
      const rc = s.returnChallenge;
      return [
        'SHIFT 1 COMPLETE',
        rc
          ? rc.kind === 'margin'
            ? `Next visit: earn $${rc.batchTarget} from phones`
            : `Next visit: sell ${rc.batchTarget} phones`
          : 'Challenge waits for your next visit',
      ];
    }
    if (s.phase === 'return_challenge' && s.returnChallenge) {
      const rc = s.returnChallenge;
      return [
        rc.kind === 'margin' ? 'MARGIN RESTART' : 'FLOW RESTART',
        `Progress ${Math.floor(rc.progress * 100)}% · WIP ≤ ${rc.maxWip}`,
      ];
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
        ? { ...this.state.returnChallenge }
        : null,
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
      campaignMarkers: {
        ...blankMarkers(),
        ...(data.campaignMarkers ?? {}),
      },
      launchBaseline: data.launchBaseline ?? null,
      launchRecommended: data.launchRecommended ?? null,
      shiftSummary: data.shiftSummary ?? null,
      returnChallenge: data.returnChallenge
        ? { ...blankReturn(), ...data.returnChallenge }
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
  }
}
