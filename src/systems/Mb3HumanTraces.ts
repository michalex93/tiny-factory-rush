/**
 * Human session fixtures from validate-mb2-final.json (M-B.2 validation).
 * Used to calibrate Toys pacing — prefer these over aggressive bots.
 */
export interface HumanMarker {
  sessMs: number;
  earned: number;
  coins: number;
  ups: number;
  tp: number;
  income: number;
  wip: number;
  levels: {
    speed1: number;
    value1: number;
    speed0: number;
    value0: number;
  };
}

export interface HumanTrace {
  branch: 'throughput' | 'margin';
  /** Observed rate $/s from convergence → threshold (human). */
  postConvEarnedPerSec: number;
  markers: {
    stage1: HumanMarker;
    convergence: HumanMarker;
    toysThreshold: HumanMarker;
    beforeOpen: HumanMarker;
  };
}

/** Extracted from validate-mb2-final.json (session-time accelerated runs). */
export const HUMAN_TRACES: Record<'throughput' | 'margin', HumanTrace> = {
  throughput: {
    branch: 'throughput',
    // (910 - 168) / ((541601 - 159374) / 1000) ≈ 1.941
    postConvEarnedPerSec: 1.941,
    markers: {
      stage1: {
        sessMs: 55993,
        earned: 44,
        coins: 2,
        ups: 3,
        tp: 28,
        income: 56,
        wip: 8,
        levels: { speed1: 1, value1: 0, speed0: 1, value0: 0 },
      },
      convergence: {
        sessMs: 159374,
        earned: 168,
        coins: 26,
        ups: 7,
        tp: 44,
        income: 98.6,
        wip: 8,
        levels: { speed1: 2, value1: 1, speed0: 2, value0: 0 },
      },
      toysThreshold: {
        sessMs: 541601,
        earned: 910,
        coins: 40,
        ups: 25,
        tp: 36,
        income: 199.7,
        wip: 10,
        levels: { speed1: 4, value1: 3, speed0: 4, value0: 3 },
      },
      beforeOpen: {
        sessMs: 541861,
        earned: 910,
        coins: 0,
        ups: 25,
        tp: 36,
        income: 199.7,
        wip: 10,
        levels: { speed1: 4, value1: 3, speed0: 4, value0: 3 },
      },
    },
  },
  margin: {
    branch: 'margin',
    // (910 - 254) / ((525700 - 205494) / 1000) ≈ 2.048
    postConvEarnedPerSec: 2.048,
    markers: {
      stage1: {
        sessMs: 55983,
        earned: 44,
        coins: 2,
        ups: 3,
        tp: 28,
        income: 56,
        wip: 8,
        levels: { speed1: 1, value1: 0, speed0: 1, value0: 0 },
      },
      convergence: {
        sessMs: 205494,
        earned: 254,
        coins: 14,
        ups: 8,
        tp: 42,
        income: 118,
        wip: 8,
        levels: { speed1: 2, value1: 1, speed0: 2, value0: 1 },
      },
      toysThreshold: {
        sessMs: 525683,
        earned: 910,
        coins: 40,
        ups: 25,
        tp: 36,
        income: 199.7,
        wip: 10,
        levels: { speed1: 4, value1: 3, speed0: 4, value0: 3 },
      },
      beforeOpen: {
        sessMs: 525956,
        earned: 910,
        coins: 0,
        ups: 25,
        tp: 36,
        income: 199.7,
        wip: 10,
        levels: { speed1: 4, value1: 3, speed0: 4, value0: 3 },
      },
    },
  },
};

/** Extrapolate session time to reach `threshold` using human post-conv rate. */
export function estimateUnlockMs(
  trace: HumanTrace,
  threshold: number,
): number {
  const conv = trace.markers.convergence;
  if (conv.earned >= threshold) return conv.sessMs;
  const need = threshold - conv.earned;
  return conv.sessMs + (need / trace.postConvEarnedPerSec) * 1000;
}
