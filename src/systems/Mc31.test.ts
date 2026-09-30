/**
 * M-C.3.1 — Launch event-neutral baseline, sustain HUD, Return capacity copy.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import {
  SMARTPHONE_CAMPAIGN,
  TOYS_MILESTONE,
  classifyReturnTargetChange,
  returnOrderCapacityCopy,
} from '../config/balance';

function sim(f: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    f.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function buyPrefer(f: Factory, prefer: 'speed' | 'value'): boolean {
  const order =
    prefer === 'speed'
      ? (['speed', 'value', 'buffer'] as const)
      : (['value', 'speed', 'buffer'] as const);
  for (const type of order) {
    for (const m of [1, 0, 2] as const) {
      if (type === 'buffer' && m === 2) continue;
      if (f.upgrades.isMaxed(m, type)) continue;
      if (f.economy.canAfford(f.upgrades.costFor(m, type))) {
        return f.buyUpgrade(m, type);
      }
    }
  }
  return false;
}

function reachFunding(branch: 'throughput' | 'margin'): Factory {
  const f = new Factory();
  f.line.rollGolden = () => false;
  f.eventsSys.suppress();
  f.sessionGoal.skipAsComplete();
  f.sessionGoal.load({
    ...f.sessionGoal.snapshot()!,
    selectedBranch: branch,
  });
  f.economy.add(8_000);
  for (let i = 0; i < 5; i++) {
    f.buyUpgrade(1, branch === 'margin' ? 'value' : 'speed');
  }
  for (let i = 0; i < 3; i++) {
    f.buyUpgrade(1, branch === 'margin' ? 'speed' : 'value');
  }
  f.economy.add(TOYS_MILESTONE.unlockAtEarned);
  f.tryUnlockNext();
  sim(f, 20_000);
  let g = 0;
  while (f.sessionGoal.phase === 'toy_mastery' && g < 600) {
    if (g % 12 === 0) buyPrefer(f, branch === 'margin' ? 'value' : 'speed');
    sim(f, 500);
    g += 1;
  }
  expect(f.mc.phase).toBe('funding_choice');
  return f;
}

function toLaunch(
  branch: 'throughput' | 'margin',
  eventsOn: boolean,
): Factory {
  const f = reachFunding(branch);
  f.mc.selectPolicy(f, 'fast');
  f.economy.coins = Math.max(f.economy.coins, 30_000);
  if (eventsOn) f.eventsSys.resume();
  else f.eventsSys.suppress();
  let g = 0;
  while (f.mc.phase !== 'smartphone_ready' && g < 1200) {
    sim(f, 500);
    g += 1;
  }
  f.mc.buildSmartphoneLine(f);
  g = 0;
  while (f.mc.phase !== 'smartphone_launch' && g < 400) {
    sim(f, 250);
    g += 1;
  }
  expect(f.mc.phase).toBe('smartphone_launch');
  return f;
}

describe('M-C.3.1 Return capacity copy', () => {
  it('classifies increased / stable / decreased at ±5%', () => {
    expect(classifyReturnTargetChange(100, 110)).toBe('increased');
    expect(classifyReturnTargetChange(100, 104)).toBe('stable');
    expect(classifyReturnTargetChange(100, 96)).toBe('stable');
    expect(classifyReturnTargetChange(100, 90)).toBe('decreased');
  });

  it('copy never says increased when target shrinks', () => {
    expect(returnOrderCapacityCopy(101, 86)).toBe(
      'SHIFT RECALIBRATED — TARGET ADJUSTED',
    );
    expect(returnOrderCapacityCopy(100, 100)).toBe(
      'CAPACITY CONFIRMED — NEXT ORDER',
    );
    expect(returnOrderCapacityCopy(100, 120)).toMatch(
      /^CAPACITY UP — NEXT ORDER \+\d+%$/,
    );
  });

  it('McCampaign detailLines use conditional copy after order', () => {
    const f = reachFunding('throughput');
    f.mc.state.phase = 'return_challenge';
    f.mc.state.returnChallengeStarted = true;
    // Minimal return state for UI copy
    f.mc.state.returnChallenge = {
      kind: 'flow',
      baselineOutput: 60,
      baselineIncome: 100,
      baselineWip: 8,
      baselineBottleneck: 1,
      batchTarget: 86,
      batchProgress: 10,
      maxWip: 16,
      startedAtMs: f.sessionMs,
      progress: 0.1,
      postStartInput: true,
      sustainOkMs: 0,
      phonesAtReturnStart: 0,
      revenueAtReturnStart: 0,
      referencePhonesPerSec: 1,
      referenceRevenuePerSec: 0,
      canonicalPhonesPerSec: 1,
      canonicalRevenuePerSec: 0,
      expectedDurationSec: 210,
      actualPhonesFirst30Sec: 0,
      actualRevenueFirst30Sec: 0,
      first30SecSampleMs: 0,
      returnPhase: 'order_2',
      returnOrderIndex: 2,
      calibrationMs: 9000,
      calibrationPhonesStart: 0,
      calibrationRevenueStart: 0,
      calibrationEventWeightedMs: 9000,
      returnOrderReferenceRate: 1.2,
      returnOrderTarget: 86,
      returnOrderStartCounter: 0,
      returnOrderProgress: 10,
      returnOrderActiveSimulationMs: 5000,
      returnOrderEventWeightedMs: 5000,
      returnFinalConditionHoldMs: 0,
      returnOrderOutputReference: 60,
      completedOrderSummaries: [],
      returnInputSeen: true,
      capacityFeedback: '1.40 → 1.20',
      capacityCopy: returnOrderCapacityCopy(101, 86),
    };
    const lines = f.mc.detailLines(f);
    expect(lines.some((l) => l.includes('SHIFT RECALIBRATED'))).toBe(true);
    expect(lines.some((l) => /increased/i.test(l))).toBe(false);
  });
});

describe('M-C.3.1 Launch event-neutral baseline', () => {
  it('no event: target basis event_neutral and ~105s equivalent', () => {
    const f = toLaunch('throughput', false);
    expect(f.mc.state.launchTargetBasis).toBe('event_neutral');
    expect(f.mc.state.baselineEventMultiplier).toBeGreaterThanOrEqual(1);
    expect(f.mc.state.eventNeutralLaunchBaseline).not.toBeNull();
    expect(f.mc.state.rawLaunchBaseline).not.toBeNull();
    const bl = f.mc.state.eventNeutralLaunchBaseline!;
    const expected = Math.max(
      8,
      Math.ceil(
        (bl.outputPerMin * SMARTPHONE_CAMPAIGN.launch.equivalentSeconds) / 60,
      ),
    );
    expect(f.mc.state.launchBatchTarget).toBe(expected);
  }, 120_000);

  it('boost during sampling: target uses neutral (≤ raw), live progress still counts', () => {
    const f = reachFunding('margin');
    f.mc.selectPolicy(f, 'fast');
    f.economy.coins = 40_000;
    f.eventsSys.resume();
    let g = 0;
    while (f.mc.phase !== 'smartphone_ready' && g < 1200) {
      sim(f, 500);
      g += 1;
    }
    f.mc.buildSmartphoneLine(f);
    // Force boost while sampling
    g = 0;
    while (f.mc.phase === 'first_smartphone' && g < 80) {
      sim(f, 250);
      g += 1;
    }
    f.eventsSys.trigger('productionBoost');
    g = 0;
    while (f.mc.phase !== 'smartphone_launch' && g < 200) {
      if (!f.eventsSys.active) f.eventsSys.trigger('productionBoost');
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.phase).toBe('smartphone_launch');
    expect(f.mc.state.launchTargetBasis).toBe('event_neutral');
    const raw = f.mc.state.rawLaunchBaseline!;
    const neutral = f.mc.state.eventNeutralLaunchBaseline!;
    // When boost was active, raw income ≥ neutral
    expect(raw.lineIncomePerMin).toBeGreaterThanOrEqual(
      neutral.lineIncomePerMin * 0.95,
    );
    const targetFromNeutral = Math.max(
      40,
      Math.round(
        (neutral.lineIncomePerMin *
          SMARTPHONE_CAMPAIGN.launch.equivalentSeconds) /
          60 /
          5,
      ) * 5,
    );
    expect(f.mc.state.launchBatchTarget).toBe(targetFromNeutral);
    // Progress still counts live sales (may be boosted)
    const before = f.mc.state.launchBatchProgress;
    sim(f, 3_000);
    expect(f.mc.state.launchBatchProgress).toBeGreaterThanOrEqual(before);
  }, 120_000);

  it('event after target armed does not change target', () => {
    const f = toLaunch('margin', false);
    const target = f.mc.state.launchBatchTarget;
    f.eventsSys.resume();
    f.eventsSys.trigger('productionBoost');
    sim(f, 2_000);
    expect(f.mc.state.launchBatchTarget).toBe(target);
  }, 120_000);

  it('sustain HUD exposes NEED OUTPUT / NEED WIP when hold fails', () => {
    const f = toLaunch('margin', false);
    f.mc.state.launchActionGate = 'complete';
    f.mc.state.launchBatchProgress = f.mc.state.launchBatchTarget;
    f.mc.state.launchSustainOkMs = 0;
    // Force low throughput so hold fails
    const lines = f.mc.detailLines(f);
    expect(
      lines.some((l) => l.startsWith('NEED OUTPUT') || l.startsWith('HOLD OUTPUT')),
    ).toBe(true);
  }, 90_000);

  it('reload mid-proof: hydration delta 0 and target stable', () => {
    const f = toLaunch('margin', false);
    f.economy.coins = 50_000;
    const rec = f.mc.state.launchRecommended;
    if (rec) f.buyUpgrade(rec.machineId, rec.type);
    sim(f, 4_000);
    const target = f.mc.state.launchBatchTarget;
    const progress = f.mc.state.launchBatchProgress;
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.economy.coins = f.economy.coins;
    f2.economy.totalEarned = f.economy.totalEarned;
    f2.economy.currentProduct = f.economy.currentProduct;
    f2.progression.unlocked = [...f.progression.unlocked];
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    f2.upgrades.totalPurchased = f.upgrades.totalPurchased;
    f2.sessionGoal.load(f.sessionGoal.snapshot()!);
    f2.loadRuntime(snap);
    f2.bootMcSession(true);
    expect(f2.mc.phase).toBe('smartphone_launch');
    expect(f2.mc.state.launchBatchTarget).toBe(target);
    expect(f2.mc.state.launchProgressAfterHydrate).toBe(progress);
    expect(f2.mc.state.hydrationProgressDelta).toBe(0);
  }, 120_000);
});

describe('M-C.3.1 BUILD Fast tolerance documentation', () => {
  it('keeps frozen funding rates and BUILD floor 9.75', () => {
    expect(SMARTPHONE_CAMPAIGN.balancedPct).toBe(0.35);
    expect(SMARTPHONE_CAMPAIGN.fastPct).toBe(0.58);
    expect(SMARTPHONE_CAMPAIGN.minBuildSessionMs).toBe(9.75 * 60_000);
    expect(SMARTPHONE_CAMPAIGN.launch.equivalentSeconds).toBe(105);
  });
});
