/**
 * Local funnel telemetry — no external network.
 * Inspect via window.__tfrTelemetry / window.__tfrOnboardingReport().
 */

export type TelemetryEventName =
  | 'first_input'
  | 'first_sale'
  | 'first_upgrade_view'
  | 'first_upgrade'
  | 'bottleneck_shown'
  | 'bottleneck_resolved'
  | 'bottleneck_persisted'
  | 'bottleneck_shifted'
  | 'session_goal_start'
  | 'session_goal_progress'
  | 'session_goal_complete'
  | 'session_goal_stage_start'
  | 'session_goal_stage_progress'
  | 'session_goal_stage_complete'
  | 'session_goal_chain_complete'
  | 'upgrade_effect_shown'
  | 'upgrade_purchase'
  | 'optimization_choice_view'
  | 'optimization_choice_selected'
  | 'optimization_choice_purchased'
  | 'stage_2_armed'
  | 'branch_goal_start'
  | 'branch_goal_progress'
  | 'branch_goal_complete'
  | 'convergence_goal_start'
  | 'convergence_goal_complete'
  | 'next_milestone_shown'
  | 'next_milestone_progress'
  | 'toys_milestone_shown'
  | 'toys_milestone_progress'
  | 'toys_threshold_reached'
  | 'toys_ready'
  | 'toys_opened'
  | 'first_toy_action'
  | 'first_toy_produced'
  | 'toy_mastery_shown'
  | 'toy_mastery_action'
  | 'toy_mastery_progress'
  | 'toy_mastery_complete'
  | 'smartphones_milestone_shown'
  | 'funding_policy_view'
  | 'smartphone_funding_policy_selected'
  | 'smartphone_fund_progress'
  | 'smartphone_fund_ready'
  | 'smartphone_build_pressed'
  | 'smartphone_first_product'
  | 'smartphone_launch_start'
  | 'smartphone_launch_progress'
  | 'smartphone_launch_action'
  | 'smartphone_launch_complete'
  | 'shift_1_complete'
  | 'return_hook_preview'
  | 'return_session_start'
  | 'return_challenge_shown'
  | 'return_challenge_start'
  | 'return_challenge_complete'
  | 'free_upgrade_granted'
  | 'free_upgrade_used'
  | 'payoff_preview_used'
  | 'economic_metric_view'
  | 'hint_displayed'
  | 'hint_deduplicated'
  | 'global_events_suppression_started'
  | 'global_events_suppression_summary'
  | 'global_events_resumed'
  | 'global_event_suppressed_onboarding'
  | 'onboarding_complete'
  | 'tutorial_hint_shown'
  | 'tutorial_skip'
  | 'confusion_signal';

export interface TelemetryEvent {
  name: TelemetryEventName;
  elapsedMs: number;
  payload?: Record<string, number | string | boolean | null>;
  at: number;
}

export interface OnboardingReport {
  timeToFirstInputMs: number | null;
  timeToFirstSaleMs: number | null;
  timeToFirstUpgradeMs: number | null;
  timeToBottleneckShownMs: number | null;
  timeToSessionGoalStartMs: number | null;
  timeToSessionGoalCompleteMs: number | null;
  upgradesBought: number;
  throughputInitial: number | null;
  throughputFinal: number | null;
  hintsShown: string[];
  globalEventsSuppressed: number;
  globalEventsSuppressedCount: number;
  onboardingComplete: boolean;
  branchSelected: string | null;
  branchPurchaseTime: number | null;
  branchGoalCompletionTime: number | null;
  convergenceCompletionTime: number | null;
  nextMilestoneShownTime: number | null;
  toysMilestoneShownMs: number | null;
  toysThreshold: number | null;
  toysThresholdReachedMs: number | null;
  toysOpenedMs: number | null;
  firstToyActionMs: number | null;
  firstToyProducedMs: number | null;
  toyMasteryShownMs: number | null;
  toyMasteryCompleteMs: number | null;
  toyMasteryType: string | null;
  toyMasteryTarget: number | null;
  smartphonesMilestoneShownMs: number | null;
  lifetimeEarnedAtUnlock: number | null;
  lifetimeEarnedAt650: number | null;
  cashAtUnlock: number | null;
  upgradesAtFiveMinutes: number | null;
  upgradesAtToysUnlock: number | null;
  branchKpiAtToysUnlock: number | null;
  upgradesByType: Record<string, number>;
  canonicalLineIncomePerMin: number | null;
  events: TelemetryEvent[];
}

export class Telemetry {
  readonly events: TelemetryEvent[] = [];
  private fired = new Set<TelemetryEventName>();
  private elapsedMs = 0;
  hintsShown: string[] = [];
  upgradesBought = 0;
  upgradesByType: Record<string, number> = {
    speed: 0,
    buffer: 0,
    value: 0,
  };
  throughputInitial: number | null = null;
  throughputFinal: number | null = null;
  canonicalLineIncomePerMin: number | null = null;
  branchSelected: string | null = null;
  globalEventsSuppressed = 0;
  globalEventsSuppressedCount = 0;
  private suppressionActive = false;
  upgradesAtFiveMinutes: number | null = null;
  upgradesAtToysUnlock: number | null = null;
  lifetimeEarnedAtUnlock: number | null = null;
  lifetimeEarnedAt650: number | null = null;
  cashAtUnlock: number | null = null;
  toysThreshold: number | null = null;
  toyMasteryType: string | null = null;
  toyMasteryTarget: number | null = null;
  branchKpiAtToysUnlock: number | null = null;

  update(dtMs: number): void {
    this.elapsedMs += dtMs;
  }

  get elapsed(): number {
    return this.elapsedMs;
  }

  once(
    name: TelemetryEventName,
    payload?: TelemetryEvent['payload'],
  ): boolean {
    if (this.fired.has(name)) return false;
    this.fired.add(name);
    this.emit(name, payload);
    return true;
  }

  emit(name: TelemetryEventName, payload?: TelemetryEvent['payload']): void {
    const ev: TelemetryEvent = {
      name,
      elapsedMs: Math.round(this.elapsedMs),
      payload,
      at: Date.now(),
    };
    this.events.push(ev);
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __tfrTelemetry?: TelemetryEvent[] };
      w.__tfrTelemetry = this.events;
    }
  }

  has(name: TelemetryEventName): boolean {
    return this.fired.has(name);
  }

  recordHintDisplayed(hintId: string, text: string): void {
    this.hintsShown.push(text);
    this.emit('hint_displayed', { hintId, text });
  }

  recordHintDeduped(hintId: string): void {
    this.emit('hint_deduplicated', { hintId });
  }

  noteSuppressedAttempt(): void {
    this.globalEventsSuppressedCount += 1;
    this.globalEventsSuppressed = this.globalEventsSuppressedCount;
    if (!this.suppressionActive) {
      this.suppressionActive = true;
      this.once('global_events_suppression_started');
    }
  }

  noteSuppressionResumed(): void {
    if (!this.suppressionActive && this.globalEventsSuppressedCount === 0) {
      return;
    }
    this.emit('global_events_suppression_summary', {
      count: this.globalEventsSuppressedCount,
    });
    this.emit('global_events_resumed', {
      count: this.globalEventsSuppressedCount,
    });
    this.suppressionActive = false;
  }

  timeOf(name: TelemetryEventName): number | null {
    const ev = this.events.find((e) => e.name === name);
    return ev ? ev.elapsedMs : null;
  }

  noteUpgradesAtFive(total: number): void {
    if (this.upgradesAtFiveMinutes === null && this.elapsedMs >= 5 * 60_000) {
      this.upgradesAtFiveMinutes = total;
    }
  }

  buildReport(): OnboardingReport {
    return {
      timeToFirstInputMs: this.timeOf('first_input'),
      timeToFirstSaleMs: this.timeOf('first_sale'),
      timeToFirstUpgradeMs: this.timeOf('first_upgrade'),
      timeToBottleneckShownMs: this.timeOf('bottleneck_shown'),
      timeToSessionGoalStartMs: this.timeOf('session_goal_start'),
      timeToSessionGoalCompleteMs: this.timeOf('session_goal_complete'),
      upgradesBought: this.upgradesBought,
      throughputInitial: this.throughputInitial,
      throughputFinal: this.throughputFinal,
      hintsShown: [...this.hintsShown],
      globalEventsSuppressed: this.globalEventsSuppressedCount,
      globalEventsSuppressedCount: this.globalEventsSuppressedCount,
      onboardingComplete: this.has('onboarding_complete'),
      branchSelected: this.branchSelected,
      branchPurchaseTime: this.timeOf('optimization_choice_purchased'),
      branchGoalCompletionTime: this.timeOf('branch_goal_complete'),
      convergenceCompletionTime: this.timeOf('convergence_goal_complete'),
      nextMilestoneShownTime: this.timeOf('next_milestone_shown'),
      toysMilestoneShownMs: this.timeOf('toys_milestone_shown'),
      toysThreshold: this.toysThreshold,
      toysThresholdReachedMs: this.timeOf('toys_threshold_reached'),
      toysOpenedMs: this.timeOf('toys_opened'),
      firstToyActionMs: this.timeOf('first_toy_action'),
      firstToyProducedMs: this.timeOf('first_toy_produced'),
      toyMasteryShownMs: this.timeOf('toy_mastery_shown'),
      toyMasteryCompleteMs: this.timeOf('toy_mastery_complete'),
      toyMasteryType: this.toyMasteryType,
      toyMasteryTarget: this.toyMasteryTarget,
      smartphonesMilestoneShownMs: this.timeOf('smartphones_milestone_shown'),
      lifetimeEarnedAtUnlock: this.lifetimeEarnedAtUnlock,
      lifetimeEarnedAt650: this.lifetimeEarnedAt650,
      cashAtUnlock: this.cashAtUnlock,
      upgradesAtFiveMinutes: this.upgradesAtFiveMinutes,
      upgradesAtToysUnlock: this.upgradesAtToysUnlock,
      branchKpiAtToysUnlock: this.branchKpiAtToysUnlock,
      upgradesByType: { ...this.upgradesByType },
      canonicalLineIncomePerMin: this.canonicalLineIncomePerMin,
      events: [...this.events],
    };
  }

  /** Full session funnel — separates live events from persistent campaign markers. */
  buildSessionReport(factory?: {
    sessionMs: number;
    mc: {
      phase: string;
      state: {
        fundingPolicy: string | null;
        smartphoneFund: number;
        fundTarget: number;
        fundingReferenceIncomePerSec?: number;
        policyContribution?: number;
        smartphonesBuilt: boolean;
        shift1Complete: boolean;
        freeUpgradeCredits: number;
        freeUpgradeMode?: string;
        returnChallengeStarted: boolean;
        returnChallengeComplete: boolean;
        currentSessionId: string;
        cashAtBuild: number | null;
        launchActions: number;
        launchActionGate?: string;
        launchBatchProgress?: number;
        launchBatchTarget?: number;
        launchBaseline?: unknown;
        launchProgress?: number;
        launchMinGateReachedMs?: number | null;
        launchArmedAtMs?: number | null;
        returnChallenge?: {
          kind?: 'flow' | 'margin';
          batchProgress: number;
          batchTarget: number;
          baselineOutput: number;
          baselineIncome: number;
          referencePhonesPerSec?: number;
          referenceRevenuePerSec?: number;
          canonicalPhonesPerSec?: number;
          canonicalRevenuePerSec?: number;
          expectedDurationSec?: number;
          phonesAtReturnStart?: number;
          revenueAtReturnStart?: number;
          actualPhonesFirst30Sec?: number;
          actualRevenueFirst30Sec?: number;
        } | null;
        cheapestRelevantUpgradeCostAtFundingStart?: number | null;
        secondCheapestRelevantUpgradeCost?: number | null;
        fundingPurchases?: number;
        smartphonesSoldTotal?: number;
        smartphoneRevenueTotal?: number;
        campaignMarkers?: object;
      };
    };
    sessionGoal: { selectedBranch: string | null };
    getThroughputPerMin: () => number;
    lineIncomePerMin: () => number;
    getWip: () => number;
    economy: { coins: number };
  }): Record<string, unknown> {
    const base = this.buildReport();
    const mc = factory?.mc;
    const st = mc?.state;
    const markers = (st?.campaignMarkers ?? {}) as Record<
      string,
      number | null | undefined
    >;
    const rc = st?.returnChallenge;
    const observedReturnMs =
      markers.returnCompleteCampaignMs != null &&
      markers.returnShownCampaignMs != null
        ? markers.returnCompleteCampaignMs - markers.returnShownCampaignMs
        : null;
    const expectedReturnSec = rc?.expectedDurationSec ?? null;
    const observedReturnSec =
      observedReturnMs != null ? observedReturnMs / 1000 : null;
    return {
      currentSessionEvents: [...this.events],
      campaignMarkers: markers,
      campaignState: st
        ? {
            phase: mc!.phase,
            fundingPolicy: st.fundingPolicy,
            fundingReferenceIncomePerSec: st.fundingReferenceIncomePerSec ?? null,
            fundingTarget: st.fundTarget,
            effectiveContributionRate: st.policyContribution ?? null,
            fundProgress: st.smartphoneFund,
            launchBranch: factory?.sessionGoal.selectedBranch ?? null,
            launchBaseline: st.launchBaseline ?? null,
            launchTarget: st.launchBatchTarget ?? null,
            launchProgress: st.launchProgress ?? null,
            launchActionGate: st.launchActionGate ?? null,
            returnBaseline: rc
              ? {
                  output: rc.baselineOutput,
                  income: rc.baselineIncome,
                }
              : null,
            returnTarget: rc?.batchTarget ?? null,
            returnProgress: rc?.batchProgress ?? null,
            freeUpgradeMode: st.freeUpgradeMode ?? 'none',
            freeUpgradeCashDelta: 0,
          }
        : null,
      funding: st
        ? {
            contributionRate: st.policyContribution ?? null,
            retainedCash: factory ? Math.floor(factory.economy.coins) : null,
            upgradeCostsAtStart: {
              cheapest: st.cheapestRelevantUpgradeCostAtFundingStart ?? null,
              second: st.secondCheapestRelevantUpgradeCost ?? null,
            },
            affordableUpgradeOpportunities: null,
            actualPurchases: st.fundingPurchases ?? 0,
          }
        : null,
      returnDiag: rc
        ? {
            referenceRate:
              rc.kind === 'margin'
                ? (rc.referenceRevenuePerSec ?? null)
                : (rc.referencePhonesPerSec ?? null),
            canonicalRate:
              rc.kind === 'margin'
                ? (rc.canonicalRevenuePerSec ?? null)
                : (rc.canonicalPhonesPerSec ?? null),
            first30SecActualRate:
              rc.kind === 'margin'
                ? (rc.actualRevenueFirst30Sec ?? 0) / 30
                : (rc.actualPhonesFirst30Sec ?? 0) / 30,
            target: rc.batchTarget,
            startCounter:
              rc.kind === 'margin'
                ? (rc.revenueAtReturnStart ?? null)
                : (rc.phonesAtReturnStart ?? null),
            countedProgress: rc.batchProgress,
            expectedDuration: expectedReturnSec,
            observedDuration: observedReturnSec,
            observedToExpectedRatio:
              expectedReturnSec && observedReturnSec
                ? +(observedReturnSec / expectedReturnSec).toFixed(3)
                : null,
          }
        : null,
      sessionMs: factory ? Math.round(factory.sessionMs) : this.elapsedMs,
      fundingPolicy: st?.fundingPolicy ?? null,
      fundingSelectedMs: this.timeOf('smartphone_funding_policy_selected'),
      fundReadyMs:
        markers.fundReadyCampaignMs ?? this.timeOf('smartphone_fund_ready'),
      smartphoneBuildMs:
        markers.smartphoneBuildCampaignMs ??
        this.timeOf('smartphone_build_pressed'),
      cashAtBuild: st?.cashAtBuild ?? null,
      firstSmartphoneMs:
        markers.firstPhoneCampaignMs ?? this.timeOf('smartphone_first_product'),
      launchStartMs:
        markers.launchStartCampaignMs ?? this.timeOf('smartphone_launch_start'),
      launchCompleteMs:
        markers.launchCompleteCampaignMs ??
        this.timeOf('smartphone_launch_complete'),
      launchQualifiedActions: st?.launchActions ?? null,
      fundingReferenceIncomePerSec: st?.fundingReferenceIncomePerSec ?? null,
      fundingTarget: st?.fundTarget ?? null,
      effectiveContributionRate: st?.policyContribution ?? null,
      launchActionGate: st?.launchActionGate ?? null,
      freeUpgradeMode: st?.freeUpgradeMode ?? null,
      shift1CompleteMs:
        markers.shift1CompleteCampaignMs ?? this.timeOf('shift_1_complete'),
      returnChallengeCompleteMs:
        markers.returnCompleteCampaignMs ??
        this.timeOf('return_challenge_complete'),
      freeUpgradeUsedMs:
        markers.freeUpgradeUsedCampaignMs ?? this.timeOf('free_upgrade_used'),
      ...base,
      live: factory
        ? {
            branch: factory.sessionGoal.selectedBranch,
            OUTPUT: +factory.getThroughputPerMin().toFixed(1),
            lineIncomePerMin: +factory.lineIncomePerMin().toFixed(1),
            WIP: factory.getWip(),
            cash: Math.floor(factory.economy.coins),
          }
        : null,
    };
  }

  resetSessionClock(): void {
    this.elapsedMs = 0;
  }
}
