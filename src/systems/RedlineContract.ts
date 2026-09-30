/**
 * Headless REDLINE contract simulation — frame-rate independent.
 * Does not touch Economy / ProductionLine sell pipeline.
 */
import {
  REDLINE,
  type RedlineDock,
  type RedlineGrade,
  type RedlineTemplateId,
  computeRedlineTargetCount,
  createSeededRng,
  gradeFromAccuracy,
} from '../config/redline';

export interface RedlineContractSnapshot {
  templateId: RedlineTemplateId;
  seed: number;
  targetCount: number;
  deadlineMs: number;
  elapsedMs: number;
  productIndex: number;
  destinations: RedlineDock[];
  selectedRoute: RedlineDock;
  correct: number;
  wrong: number;
  streak: number;
  combo: number;
  comboPeak: number;
  score: number;
  heat: number;
  jamActive: boolean;
  jamRemainingMs: number;
  routeSwitchCount: number;
  jamCount: number;
  heatEnabled: boolean;
  tutorialHintsShown: number;
  rewardCash: number;
  rewardId: string;
  rewardClaimed: boolean;
  grade: RedlineGrade | null;
  finished: boolean;
  firstSwitchDone: boolean;
}

export interface RedlineDeliveryResult {
  expected: RedlineDock;
  selected: RedlineDock;
  correct: boolean;
  combo: number;
  comboChanged: 'up' | 'down' | 'same';
  scoreDelta: number;
  contractComplete: boolean;
}

export interface RedlinePersistedContract {
  templateId: RedlineTemplateId;
  seed: number;
  targetCount: number;
  deadlineMs: number;
  elapsedMs: number;
  productIndex: number;
  destinations: RedlineDock[];
  selectedRoute: RedlineDock;
  correct: number;
  wrong: number;
  streak: number;
  combo: number;
  comboPeak: number;
  score: number;
  heat: number;
  jamActive: boolean;
  jamRemainingMs: number;
  routeSwitchCount: number;
  jamCount: number;
  heatEnabled: boolean;
  tutorialHintsShown: number;
  rewardCash: number;
  rewardId: string;
  rewardClaimed: boolean;
  grade: RedlineGrade | null;
  finished: boolean;
  firstSwitchDone: boolean;
  /** Event-neutral $/s frozen at start for reward calc. */
  incomePerSecRef: number;
  lastSwitchAtMs: number;
}

function buildDestinations(
  templateId: RedlineTemplateId,
  seed: number,
  count: number,
): RedlineDock[] {
  const tpl =
    REDLINE.templates.find((t) => t.id === templateId) ?? REDLINE.templates[0]!;
  const rng = createSeededRng(seed);
  const out: RedlineDock[] = [];
  for (let i = 0; i < count; i++) {
    if (tpl.pattern && tpl.pattern.length > 0) {
      out.push(tpl.pattern[i % tpl.pattern.length]!);
    } else {
      out.push(rng() < tpl.priorityBias ? 'priority' : 'standard');
    }
  }
  // Ensure both docks appear at least once for guided/first contracts
  if (count >= 2 && !out.includes('standard')) out[0] = 'standard';
  if (count >= 2 && !out.includes('priority')) out[1] = 'priority';
  return out;
}

export function createRedlineContract(opts: {
  templateId: RedlineTemplateId;
  seed: number;
  eventNeutralThroughputPerMin: number;
  incomePerSecRef: number;
  heatEnabled: boolean;
  rewardId: string;
}): RedlinePersistedContract {
  const targetCount = computeRedlineTargetCount(
    opts.eventNeutralThroughputPerMin,
  );
  const destinations = buildDestinations(
    opts.templateId,
    opts.seed,
    targetCount,
  );
  const grade = null;
  const rewardCash = 0; // finalized on complete from frozen income + grade
  return {
    templateId: opts.templateId,
    seed: opts.seed,
    targetCount,
    deadlineMs: REDLINE.deadlineMs,
    elapsedMs: 0,
    productIndex: 0,
    destinations,
    selectedRoute: 'standard',
    correct: 0,
    wrong: 0,
    streak: 0,
    combo: 1,
    comboPeak: 1,
    score: 0,
    heat: 0,
    jamActive: false,
    jamRemainingMs: 0,
    routeSwitchCount: 0,
    jamCount: 0,
    heatEnabled: opts.heatEnabled,
    tutorialHintsShown: 0,
    rewardCash,
    rewardId: opts.rewardId,
    rewardClaimed: false,
    grade,
    finished: false,
    firstSwitchDone: false,
    incomePerSecRef: Math.max(0, opts.incomePerSecRef),
    lastSwitchAtMs: -Infinity,
  };
}

export function comboFromStreak(streak: number): number {
  const tier = Math.floor(Math.max(0, streak) / REDLINE.combo.streakPerTier);
  return Math.min(REDLINE.combo.maxMultiplier, 1 + tier);
}

export function finalizeRewardCash(
  grade: RedlineGrade,
  incomePerSecRef: number,
): number {
  const secs = REDLINE.rewardSeconds[grade];
  return Math.max(0, Math.round(incomePerSecRef * secs));
}

export class RedlineContract {
  state: RedlinePersistedContract;

  constructor(state: RedlinePersistedContract) {
    this.state = state;
  }

  snapshot(): RedlineContractSnapshot {
    const s = this.state;
    return {
      templateId: s.templateId,
      seed: s.seed,
      targetCount: s.targetCount,
      deadlineMs: s.deadlineMs,
      elapsedMs: s.elapsedMs,
      productIndex: s.productIndex,
      destinations: s.destinations.slice(),
      selectedRoute: s.selectedRoute,
      correct: s.correct,
      wrong: s.wrong,
      streak: s.streak,
      combo: s.combo,
      comboPeak: s.comboPeak,
      score: s.score,
      heat: s.heat,
      jamActive: s.jamActive,
      jamRemainingMs: s.jamRemainingMs,
      routeSwitchCount: s.routeSwitchCount,
      jamCount: s.jamCount,
      heatEnabled: s.heatEnabled,
      tutorialHintsShown: s.tutorialHintsShown,
      rewardCash: s.rewardCash,
      rewardId: s.rewardId,
      rewardClaimed: s.rewardClaimed,
      grade: s.grade,
      finished: s.finished,
      firstSwitchDone: s.firstSwitchDone,
    };
  }

  previewNext(n = REDLINE.previewCount): RedlineDock[] {
    const s = this.state;
    return s.destinations.slice(s.productIndex, s.productIndex + n);
  }

  currentExpected(): RedlineDock | null {
    const s = this.state;
    if (s.finished || s.productIndex >= s.targetCount) return null;
    return s.destinations[s.productIndex] ?? null;
  }

  /** Advance active sim time only (pause/load excluded by caller). */
  tick(dtMs: number): {
    heatWarning: boolean;
    jamStarted: boolean;
    jamResolved: boolean;
    timedOut: boolean;
  } {
    const s = this.state;
    if (s.finished || dtMs <= 0) {
      return {
        heatWarning: false,
        jamStarted: false,
        jamResolved: false,
        timedOut: false,
      };
    }

    s.elapsedMs += dtMs;
    let heatWarning = false;
    let jamStarted = false;
    let jamResolved = false;

    if (s.heatEnabled) {
      const decay = (REDLINE.heat.decayPerSec * dtMs) / 1000;
      if (!s.jamActive) {
        s.heat = Math.max(0, s.heat - decay);
        if (s.heat >= REDLINE.heat.warningAt) heatWarning = true;
      } else {
        s.jamRemainingMs = Math.max(0, s.jamRemainingMs - dtMs);
        if (s.jamRemainingMs <= 0) {
          s.jamActive = false;
          s.heat = Math.max(0, s.heat * 0.35);
          jamResolved = true;
        }
      }
    }

    const timedOut = s.elapsedMs >= s.deadlineMs;
    if (timedOut && !s.finished) {
      this.complete();
    }

    return { heatWarning, jamStarted, jamResolved, timedOut };
  }

  trySetRoute(route: RedlineDock, nowMs: number): {
    ok: boolean;
    jammed: boolean;
    heatWarning: boolean;
    jamCreated: boolean;
  } {
    const s = this.state;
    if (s.finished) return { ok: false, jammed: false, heatWarning: false, jamCreated: false };
    if (s.jamActive) {
      return { ok: false, jammed: true, heatWarning: true, jamCreated: false };
    }
    if (route === s.selectedRoute) {
      return { ok: true, jammed: false, heatWarning: false, jamCreated: false };
    }

    s.selectedRoute = route;
    s.routeSwitchCount += 1;
    if (!s.firstSwitchDone) s.firstSwitchDone = true;

    let jamCreated = false;
    let heatWarning = false;
    if (s.heatEnabled) {
      const delta = nowMs - s.lastSwitchAtMs;
      if (delta < REDLINE.heat.spamWindowMs) {
        s.heat = Math.min(120, s.heat + REDLINE.heat.risePerSpamSwitch);
      } else {
        s.heat = Math.min(120, s.heat + 4);
      }
      s.lastSwitchAtMs = nowMs;
      if (s.heat >= REDLINE.heat.warningAt) heatWarning = true;
      if (s.heat >= REDLINE.heat.jamAt) {
        s.jamActive = true;
        s.jamRemainingMs = REDLINE.heat.jamLockMs;
        s.jamCount += 1;
        jamCreated = true;
        heatWarning = true;
      }
    }

    return { ok: true, jammed: false, heatWarning, jamCreated };
  }

  coolSwitch(): boolean {
    const s = this.state;
    if (!s.jamActive && s.heat < REDLINE.heat.warningAt) return false;
    s.jamActive = false;
    s.jamRemainingMs = 0;
    s.heat = 0;
    return true;
  }

  /**
   * Called when a product sells through the canonical pipeline.
   * Always returns a delivery result; does NOT sell/credit cash.
   */
  noteDelivery(): RedlineDeliveryResult | null {
    const s = this.state;
    if (s.finished) return null;
    const expected = s.destinations[s.productIndex];
    if (!expected) {
      this.complete();
      return null;
    }

    const selected = s.selectedRoute;
    const correct = selected === expected;
    const prevCombo = s.combo;

    if (correct) {
      s.correct += 1;
      s.streak += 1;
      s.combo = comboFromStreak(s.streak);
      s.comboPeak = Math.max(s.comboPeak, s.combo);
      const scoreDelta = 10 * s.combo;
      s.score += scoreDelta;
      s.productIndex += 1;

      const contractComplete = s.productIndex >= s.targetCount;
      if (contractComplete) this.complete();

      return {
        expected,
        selected,
        correct: true,
        combo: s.combo,
        comboChanged: s.combo > prevCombo ? 'up' : 'same',
        scoreDelta,
        contractComplete,
      };
    }

    s.wrong += 1;
    s.streak = Math.max(0, s.streak - REDLINE.combo.wrongStreakPenalty);
    s.combo = comboFromStreak(s.streak);
    const scoreDelta = 2; // base score for wrong — still sold; combo score only
    s.score += scoreDelta;
    s.productIndex += 1;

    const contractComplete = s.productIndex >= s.targetCount;
    if (contractComplete) this.complete();

    return {
      expected,
      selected,
      correct: false,
      combo: s.combo,
      comboChanged: s.combo < prevCombo ? 'down' : 'same',
      scoreDelta,
      contractComplete,
    };
  }

  complete(): void {
    const s = this.state;
    if (s.finished) return;
    s.finished = true;
    const total = s.correct + s.wrong;
    const accuracy = total > 0 ? s.correct / total : 0;
    s.grade = gradeFromAccuracy(accuracy);
    if (!s.rewardClaimed && s.rewardCash === 0) {
      s.rewardCash = finalizeRewardCash(s.grade, s.incomePerSecRef);
    }
  }

  accuracy(): number {
    const t = this.state.correct + this.state.wrong;
    return t > 0 ? this.state.correct / t : 0;
  }
}
