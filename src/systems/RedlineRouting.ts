/**
 * REDLINE ROUTING orchestration — unlock, CTA, cooldown, persistence shape.
 * Adapter over Factory sell hook; never duplicates creditSale.
 */
import { REDLINE, type RedlineDock, type RedlinePhase, type RedlineTemplateId } from '../config/redline';
import {
  RedlineContract,
  createRedlineContract,
  type RedlineDeliveryResult,
  type RedlinePersistedContract,
} from './RedlineContract';

export interface RedlinePersistedState {
  phase: RedlinePhase;
  tutorialCompleted: boolean;
  unlockAtActiveMs: number | null;
  availableSinceActiveMs: number | null;
  cooldownRemainingMs: number;
  contract: RedlinePersistedContract | null;
  contractsCompleted: number;
  lastTemplateIndex: number;
  ctaShown: boolean;
  timeAvailableToStartMs: number;
}

export function defaultRedlinePersisted(): RedlinePersistedState {
  return {
    phase: 'locked',
    tutorialCompleted: false,
    unlockAtActiveMs: null,
    availableSinceActiveMs: null,
    cooldownRemainingMs: 0,
    contract: null,
    contractsCompleted: 0,
    lastTemplateIndex: -1,
    ctaShown: false,
    timeAvailableToStartMs: 0,
  };
}

export type RedlineTelemetryHook = (
  name: string,
  props?: Record<string, string | number | boolean | null>,
) => void;

export class RedlineRouting {
  state: RedlinePersistedState;
  private contract: RedlineContract | null = null;
  private activeMs = 0;
  private telem: RedlineTelemetryHook;
  private heatWarned = false;

  constructor(
    persisted: RedlinePersistedState | null | undefined,
    telem: RedlineTelemetryHook = () => {},
  ) {
    this.state = persisted ? { ...defaultRedlinePersisted(), ...persisted } : defaultRedlinePersisted();
    if (this.state.contract) {
      this.contract = new RedlineContract(this.state.contract);
    }
    this.telem = telem;
  }

  getContract(): RedlineContract | null {
    return this.contract;
  }

  phase(): RedlinePhase {
    return this.state.phase;
  }

  isManual(): boolean {
    return this.state.phase === 'active' && !!this.contract && !this.contract.state.finished;
  }

  selectedRoute(): RedlineDock {
    if (this.contract) return this.contract.state.selectedRoute;
    return 'standard';
  }

  /** Call after convergence_goal_complete → post_chain. */
  unlock(activeMs: number): void {
    if (this.state.phase !== 'locked') return;
    this.state.unlockAtActiveMs = activeMs;
    this.state.phase = 'available';
    this.state.availableSinceActiveMs = activeMs;
    this.state.ctaShown = true;
    this.telem('redline_available', { atMs: activeMs });
  }

  /** Whether CTA should be visible (≤2s after unlock, and during available). */
  shouldShowCta(activeMs: number): boolean {
    if (this.state.phase !== 'available') return false;
    if (this.state.unlockAtActiveMs == null) return true;
    return activeMs - this.state.unlockAtActiveMs >= 0; // immediate; UI may delay visual ≤2s
  }

  clickCta(): void {
    if (this.state.phase !== 'available') return;
    this.telem('redline_cta_clicked', {});
  }

  startContract(opts: {
    activeMs: number;
    eventNeutralThroughputPerMin: number;
    incomePerSecRef: number;
    seed?: number;
    templateId?: RedlineTemplateId;
  }): boolean {
    if (this.state.phase !== 'available') return false;

    const templates = REDLINE.templates;
    let templateId = opts.templateId;
    if (!templateId) {
      const next = (this.state.lastTemplateIndex + 1) % templates.length;
      this.state.lastTemplateIndex = next;
      templateId = templates[next]!.id;
    }

    // First contract (tutorial): heat off. Later contracts: heat on.
    const heatOn = this.state.tutorialCompleted;

    const seed =
      opts.seed ??
      ((Math.imul(this.state.contractsCompleted + 1, 2654435761) ^
        (opts.activeMs | 0)) >>>
        0);

    const rewardId = `rl_${seed}_${this.state.contractsCompleted}_${opts.activeMs}`;

    const persisted = createRedlineContract({
      templateId,
      seed,
      eventNeutralThroughputPerMin: opts.eventNeutralThroughputPerMin,
      incomePerSecRef: opts.incomePerSecRef,
      heatEnabled: heatOn,
      rewardId,
    });

    this.contract = new RedlineContract(persisted);
    this.state.contract = persisted;
    this.state.phase = 'active';

    if (this.state.availableSinceActiveMs != null) {
      this.state.timeAvailableToStartMs = Math.max(
        0,
        opts.activeMs - this.state.availableSinceActiveMs,
      );
    }

    if (!this.state.tutorialCompleted) {
      this.telem('redline_tutorial_start', { template: templateId, seed });
      this.contract.state.tutorialHintsShown = Math.min(
        2,
        REDLINE.tutorialHintMax,
      );
    }
    this.telem('redline_contract_start', {
      template: templateId,
      seed,
      target: persisted.targetCount,
      heatEnabled: heatOn,
      tutorial: !this.state.tutorialCompleted,
    });

    return true;
  }

  setRoute(route: RedlineDock): {
    ok: boolean;
    jammed: boolean;
    jamCreated: boolean;
    heatWarning: boolean;
  } {
    if (!this.contract || this.state.phase !== 'active') {
      return { ok: false, jammed: false, jamCreated: false, heatWarning: false };
    }
    const wasFirst = !this.contract.state.firstSwitchDone;
    const r = this.contract.trySetRoute(route, this.activeMs);
    if (r.ok && wasFirst && this.contract.state.firstSwitchDone) {
      this.telem('redline_first_switch', {
        route,
        atMs: this.contract.state.elapsedMs,
      });
    }
    if (r.jamCreated) {
      this.telem('redline_jam_created', {
        heat: this.contract.state.heat,
        jamCount: this.contract.state.jamCount,
      });
    }
    if (r.heatWarning && !this.heatWarned) {
      this.heatWarned = true;
      this.telem('redline_heat_warning', { heat: this.contract.state.heat });
    }
    return r;
  }

  coolSwitch(): boolean {
    if (!this.contract) return false;
    const ok = this.contract.coolSwitch();
    if (ok) {
      this.telem('redline_jam_resolved', { via: 'cool_switch' });
      this.heatWarned = false;
    }
    return ok;
  }

  /**
   * Canonical sell side-effect: score contract only. Caller still creditSale once.
   */
  onCanonicalSell(): RedlineDeliveryResult | null {
    if (this.state.phase !== 'active' || !this.contract) return null;
    if (this.contract.state.finished) return null;
    const result = this.contract.noteDelivery();
    if (result?.contractComplete) {
      this.finishToSummary();
    }
    return result;
  }

  private finishToSummary(): void {
    if (!this.contract) return;
    this.contract.complete();
    this.state.contract = this.contract.state;
    this.state.phase = 'summary';
    this.state.tutorialCompleted = true;
    this.state.contractsCompleted += 1;

    const snap = this.contract.snapshot();
    const accuracy = this.contract.accuracy();
    const grade = snap.grade ?? 'MISS';

    this.telem(
      grade === 'MISS' ? 'redline_contract_miss' : 'redline_contract_complete',
      this.finalProps(),
    );
    this.telem('redline_summary_shown', {
      grade,
      accuracy,
      reward: snap.rewardCash,
    });
    this.telem('redline_combo_peak', { comboPeak: snap.comboPeak });
  }

  finalProps(): Record<string, string | number | boolean | null> {
    const c = this.contract;
    if (!c) return {};
    const snap = c.snapshot();
    return {
      template: snap.templateId,
      durationActiveMs: snap.elapsedMs,
      target: snap.targetCount,
      correct: snap.correct,
      wrong: snap.wrong,
      accuracy: c.accuracy(),
      comboPeak: snap.comboPeak,
      routeSwitchCount: snap.routeSwitchCount,
      jamCount: snap.jamCount,
      grade: snap.grade,
      reward: snap.rewardCash,
      timeAvailableToStartMs: this.state.timeAvailableToStartMs,
    };
  }

  /**
   * Claim reward once. Returns cash amount to grant, or 0 if already claimed / miss / none.
   */
  claimReward(): { cash: number; rewardId: string; granted: boolean } {
    if (this.state.phase !== 'summary' || !this.contract) {
      return { cash: 0, rewardId: '', granted: false };
    }
    const s = this.contract.state;
    if (s.rewardClaimed) {
      return { cash: 0, rewardId: s.rewardId, granted: false };
    }
    s.rewardClaimed = true;
    this.state.contract = s;
    if (s.rewardCash > 0) {
      this.telem('redline_reward_granted', {
        rewardId: s.rewardId,
        reward: s.rewardCash,
        grade: s.grade,
      });
    }
    return { cash: s.rewardCash, rewardId: s.rewardId, granted: s.rewardCash > 0 };
  }

  continueFromSummary(): void {
    if (this.state.phase !== 'summary') return;
    // Ensure claim attempted (idempotent)
    this.claimReward();
    this.state.phase = 'cooldown';
    this.state.cooldownRemainingMs = REDLINE.cooldownMs;
    this.state.contract = null;
    this.contract = null;
    this.heatWarned = false;
  }

  retryFromSummary(opts: {
    activeMs: number;
    eventNeutralThroughputPerMin: number;
    incomePerSecRef: number;
  }): boolean {
    if (this.state.phase !== 'summary') return false;
    this.claimReward(); // claim previous if any (idempotent)
    this.state.phase = 'available';
    this.state.cooldownRemainingMs = 0;
    this.state.contract = null;
    this.contract = null;
    this.heatWarned = false;
    this.telem('redline_replay_start', {});
    return this.startContract(opts);
  }

  /**
   * Active simulation tick only. hydrationProgressDelta must stay 0 for redline.
   */
  tick(dtMs: number, activeMs: number): void {
    this.activeMs = activeMs;
    if (dtMs <= 0) return;

    if (this.state.phase === 'active' && this.contract) {
      const r = this.contract.tick(dtMs);
      this.state.contract = this.contract.state;
      if (r.jamResolved) {
        this.telem('redline_jam_resolved', { via: 'auto' });
        this.heatWarned = false;
      }
      if (r.heatWarning && !this.heatWarned && this.contract.state.heatEnabled) {
        this.heatWarned = true;
        this.telem('redline_heat_warning', { heat: this.contract.state.heat });
      }
      if (this.contract.state.finished && this.state.phase === 'active') {
        this.finishToSummary();
      }
    } else if (this.state.phase === 'cooldown') {
      this.state.cooldownRemainingMs = Math.max(
        0,
        this.state.cooldownRemainingMs - dtMs,
      );
      if (this.state.cooldownRemainingMs <= 0) {
        this.state.phase = 'available';
        this.state.availableSinceActiveMs = activeMs;
      }
    }
  }

  toJSON(): RedlinePersistedState {
    if (this.contract) {
      this.state.contract = this.contract.state;
    }
    return {
      phase: this.state.phase,
      tutorialCompleted: this.state.tutorialCompleted,
      unlockAtActiveMs: this.state.unlockAtActiveMs,
      availableSinceActiveMs: this.state.availableSinceActiveMs,
      cooldownRemainingMs: this.state.cooldownRemainingMs,
      contract: this.state.contract
        ? { ...this.state.contract, destinations: this.state.contract.destinations.slice() }
        : null,
      contractsCompleted: this.state.contractsCompleted,
      lastTemplateIndex: this.state.lastTemplateIndex,
      ctaShown: this.state.ctaShown,
      timeAvailableToStartMs: this.state.timeAvailableToStartMs,
    };
  }

  static fromJSON(raw: unknown, telem?: RedlineTelemetryHook): RedlineRouting {
    if (!raw || typeof raw !== 'object') {
      return new RedlineRouting(null, telem);
    }
    const o = raw as Partial<RedlinePersistedState>;
    const base = defaultRedlinePersisted();
    const merged: RedlinePersistedState = {
      ...base,
      ...o,
      contract: o.contract ?? null,
    };
    return new RedlineRouting(merged, telem);
  }
}
