/**
 * M-C.3 / M-C.3.1 Smartphone campaign config.
 *
 * Funding (frozen — do not retune):
 *   Balanced 35% × 250s · Fast 58% × 195s · deposit cap 125%
 *
 * Launch (M-C.3.1):
 *   Targets from event-neutral baseline (temporary mults stripped).
 *   Progress still counts live production (events may accelerate).
 *   FAST BUILD hard acceptance: ≥9.75 and ≤11.5 min (9.75–10.0 = sim tolerance).
 *
 * Return (M-C.3):
 *   Three adaptive orders; capacity copy is conditional (never “increased” on decrease).
 */
export const SMARTPHONE_CAMPAIGN = {
  /** Legacy fixed target — only used as migration fallback. */
  fundTarget: 1050,
  balancedPct: 0.35,
  fastPct: 0.58,
  balancedDurationSec: 250,
  fastDurationSec: 195,
  fundDepositCapMult: 1.25,
  refIncomeFallbackPerSec: 6,
  refIncomeMinPerSec: 2,
  refIncomeMaxPerSec: 40,
  fundProgressBuckets: [0.25, 0.5, 0.75, 1] as const,
  minBuildSessionMs: 9.75 * 60_000,

  launch: {
    baselineSampleMs: 9_000,
    equivalentSeconds: 105,
    maxWip: 16,
    sustainWindowMs: 10_000,
    marginMinOutputMult: 0.85,
    progressBuckets: [0.25, 0.5, 0.75, 1] as const,
  },

  returnChallenge: {
    /** Seconds of capacity each adaptive order targets. Band search: 60–90. */
    orderEquivalentSeconds: 70,
    orderCount: 3,
    /** Initial calibration window after reload hydration. */
    calibrationMs: 9_000,
    calibrationMinValidMs: 8_000,
    maxWip: 16,
    sustainWindowMs: 9_000,
    marginMinOutputMult: 0.9,
    armGraceMs: 500,
    progressBuckets: [0.25, 0.5, 0.75, 1] as const,
    /** Preferred total Return band (informational / telemetry). */
    preferredTotalSec: 210,
    /** Legacy field kept for migration / report compat. */
    equivalentSeconds: 210,
    /** Soft floor for event-extreme total (no hard clock gate). */
    extremeEventFloorSec: 90,
  },
} as const;

export function roundReadableFund(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 100;
  if (n < 200) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  if (n < 5000) return Math.round(n / 25) * 25;
  return Math.round(n / 50) * 50;
}

export function computeFundTarget(
  refIncomePerSec: number,
  policy: 'balanced' | 'fast',
): {
  fundTarget: number;
  contribution: number;
  durationSec: number;
} {
  const contribution =
    policy === 'fast'
      ? SMARTPHONE_CAMPAIGN.fastPct
      : SMARTPHONE_CAMPAIGN.balancedPct;
  const durationSec =
    policy === 'fast'
      ? SMARTPHONE_CAMPAIGN.fastDurationSec
      : SMARTPHONE_CAMPAIGN.balancedDurationSec;
  const raw = refIncomePerSec * contribution * durationSec;
  return {
    fundTarget: roundReadableFund(raw),
    contribution,
    durationSec,
  };
}

/** @deprecated M-C.2 clamp — kept for tests / migration. Unused by M-C.3 orders. */
export function clampReturnReference(
  realizedPerSec: number,
  canonicalPerSec: number,
  clamp = 0.25,
): number {
  const canon = Math.max(0.05, canonicalPerSec);
  const lo = canon * (1 - clamp);
  const hi = canon * (1 + clamp);
  let v = realizedPerSec;
  if (!Number.isFinite(v) || v <= 0) v = canon;
  return Math.min(hi, Math.max(lo, v));
}

export function sanitizeRate(v: number, fallback: number): number {
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return v;
}

export type ReturnTargetChange = 'increased' | 'stable' | 'decreased';

/** Classify next vs previous order target (±5% band = stable). */
export function classifyReturnTargetChange(
  previousTarget: number,
  nextTarget: number,
): ReturnTargetChange {
  if (
    !Number.isFinite(previousTarget) ||
    previousTarget <= 0 ||
    !Number.isFinite(nextTarget) ||
    nextTarget <= 0
  ) {
    return 'stable';
  }
  const ratio = nextTarget / previousTarget;
  if (ratio > 1.05) return 'increased';
  if (ratio < 0.95) return 'decreased';
  return 'stable';
}

/** Player-facing capacity line after an order completes — never lies about growth. */
export function returnOrderCapacityCopy(
  previousTarget: number,
  nextTarget: number,
): string {
  const kind = classifyReturnTargetChange(previousTarget, nextTarget);
  if (kind === 'increased') {
    const pct = Math.max(
      1,
      Math.round((nextTarget / previousTarget - 1) * 100),
    );
    return `CAPACITY UP — NEXT ORDER +${pct}%`;
  }
  if (kind === 'decreased') {
    return 'SHIFT RECALIBRATED — TARGET ADJUSTED';
  }
  return 'CAPACITY CONFIRMED — NEXT ORDER';
}
