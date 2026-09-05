/**
 * M-C.2 Smartphone campaign config.
 *
 * Funding (keep duration, recover liquidity):
 *   Balanced 35% × 250s · Fast 58% × 195s
 *   Chosen from paired search on throughput/margin snapshots (see McCampaign tests).
 *
 * Return:
 *   Reference from Launch proof-batch realized rates (not a single HUD tick).
 *   Progress = delta of smartphone counters after Return starts.
 *   Root cause of 180→37/86s: HUD tick understated rate vs post-reload reality.
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
    /**
     * After rate/unit fix; lowest value that lands both branches ~150–240s.
     * Recalibrated from 180 (which finished in 37–86s due to HUD under-rate).
     */
    equivalentSeconds: 210,
    maxWip: 16,
    sustainWindowMs: 10_000,
    marginMinOutputMult: 0.9,
    armGraceMs: 1_500,
    progressBuckets: [0.25, 0.5, 0.75, 1] as const,
    /** Clamp realized reference to ±25% of canonical event-neutral estimate. */
    referenceClamp: 0.25,
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

export function clampReturnReference(
  realizedPerSec: number,
  canonicalPerSec: number,
  clamp = SMARTPHONE_CAMPAIGN.returnChallenge.referenceClamp,
): number {
  const canon = Math.max(0.05, canonicalPerSec);
  const lo = canon * (1 - clamp);
  const hi = canon * (1 + clamp);
  let v = realizedPerSec;
  if (!Number.isFinite(v) || v <= 0) v = canon;
  return Math.min(hi, Math.max(lo, v));
}
