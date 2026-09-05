import { UPGRADE_PAYOFF, type MachineId } from '../config/balance';
import type { Factory } from './Factory';
import type { PayoffKind } from './SessionGoal';

export interface PayoffResult {
  kind: PayoffKind;
  message: string;
  beforeTp: number;
  afterTp: number;
  deltaPct: number;
  beforeWip: number;
  afterWip: number;
  wipTrend: 'down' | 'up' | 'flat';
  bottleneckBefore: MachineId | null;
  bottleneckAfter: MachineId | null;
  improvedStillLimiting: boolean;
}

/**
 * Classify upgrade outcome from measured metrics (not cosmetics).
 */
export function classifyUpgradePayoff(input: {
  beforeTp: number;
  afterTp: number;
  beforeWip: number;
  afterWip: number;
  wipSamples: number[];
  bottleneckBefore: MachineId | null;
  bottleneckAfter: MachineId | null;
  upgradedMachine: MachineId;
}): PayoffResult {
  const {
    beforeTp,
    afterTp,
    beforeWip,
    afterWip,
    wipSamples,
    bottleneckBefore,
    bottleneckAfter,
    upgradedMachine,
  } = input;

  const deltaPct =
    beforeTp > 0.05 ? ((afterTp - beforeTp) / beforeTp) * 100 : 0;

  let wipTrend: 'down' | 'up' | 'flat' = 'flat';
  if (wipSamples.length >= 4) {
    const mid = Math.floor(wipSamples.length / 2);
    const first =
      wipSamples.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
    const second =
      wipSamples.slice(mid).reduce((a, b) => a + b, 0) /
      Math.max(1, wipSamples.length - mid);
    if (second < first - 0.35) wipTrend = 'down';
    else if (second > first + 0.35) wipTrend = 'up';
  } else if (afterWip < beforeWip - 0.5) wipTrend = 'down';
  else if (afterWip > beforeWip + 0.5) wipTrend = 'up';

  let kind: PayoffKind = 'neutral';
  let message = `OUTPUT ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(0)}%`;
  let improvedStillLimiting = false;

  const bnMoved =
    bottleneckBefore !== null &&
    bottleneckAfter !== null &&
    bottleneckBefore !== bottleneckAfter;

  const bnCleared =
    bottleneckBefore !== null &&
    bottleneckAfter !== null &&
    bottleneckBefore === upgradedMachine &&
    bottleneckAfter !== upgradedMachine;

  if (bnCleared || (bnMoved && bottleneckBefore === upgradedMachine)) {
    kind = 'bottleneck_moved';
    message = `BOTTLENECK MOVED TO M${(bottleneckAfter ?? 0) + 1}`;
  } else if (
    bottleneckAfter === upgradedMachine &&
    deltaPct >= 5
  ) {
    kind = 'bottleneck_improved_still_limiting';
    improvedStillLimiting = true;
    message = `IMPROVED +${deltaPct.toFixed(0)}% — STILL LIMITING`;
  } else if (
    bottleneckBefore === upgradedMachine &&
    bottleneckAfter !== upgradedMachine &&
    bottleneckAfter !== null
  ) {
    kind = 'bottleneck_resolved';
    message = 'BOTTLENECK RESOLVED';
  } else if (wipTrend === 'down') {
    kind = 'queue_shrinking';
    message = 'QUEUE SHRINKING';
  } else if (deltaPct >= 5) {
    kind = 'output_up';
    message = `OUTPUT +${deltaPct.toFixed(0)}%`;
  }

  // Never claim queue shrinking if trend isn't down
  if (kind === 'queue_shrinking' && wipTrend !== 'down') {
    kind = 'output_up';
    message = `OUTPUT +${Math.max(0, deltaPct).toFixed(0)}%`;
  }

  return {
    kind,
    message,
    beforeTp,
    afterTp,
    deltaPct,
    beforeWip,
    afterWip,
    wipTrend,
    bottleneckBefore,
    bottleneckAfter,
    improvedStillLimiting,
  };
}

export function sampleWipTrend(
  factory: Factory,
  samples: number[],
  maxSamples = 8,
): void {
  samples.push(factory.getWip());
  while (samples.length > maxSamples) samples.shift();
}

export const PAYOFF_SETTLE_MS = UPGRADE_PAYOFF.settleMs;
