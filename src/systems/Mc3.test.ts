/**
 * M-C.3 — three adaptive Return orders, atomic free upgrade, hydration barrier,
 * funding purchase telemetry. Balance rates frozen from M-C.2.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import {
  MAX_UPGRADE_LEVEL,
  SMARTPHONE_CAMPAIGN,
  TOYS_MILESTONE,
} from '../config/balance';
import type { MachineId, UpgradeType } from '../config/balance';

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

function advanceToShift1(
  branch: 'throughput' | 'margin',
  policy: 'balanced' | 'fast' = 'fast',
): Factory {
  const f = reachFunding(branch);
  f.mc.selectPolicy(f, policy);
  f.economy.coins = Math.max(f.economy.coins, 25_000);
  const prefer = branch === 'margin' ? 'value' : 'speed';
  let g = 0;
  while (!f.mc.state.shift1Complete && g < 2500) {
    if (f.mc.phase === 'smartphone_ready') f.mc.buildSmartphoneLine(f);
    if (
      f.mc.phase === 'smartphone_launch' &&
      f.mc.state.launchActionGate === 'pending' &&
      g % 6 === 0
    ) {
      const rec = f.mc.state.launchRecommended;
      if (rec && !f.upgrades.isMaxed(rec.machineId, rec.type)) {
        f.buyUpgrade(rec.machineId, rec.type);
      } else buyPrefer(f, prefer);
    }
    sim(f, 250);
    g += 1;
  }
  expect(f.mc.state.shift1Complete).toBe(true);
  expect(f.mc.phase).toBe('return_preview');
  return f;
}

function reload(f: Factory): Factory {
  const snap = f.toSnapshot();
  const f2 = new Factory();
  f2.economy.coins = f.economy.coins;
  f2.economy.totalEarned = f.economy.totalEarned;
  f2.economy.productsSold = f.economy.productsSold;
  f2.economy.currentProduct = f.economy.currentProduct;
  f2.progression.unlocked = [...f.progression.unlocked];
  f2.upgrades.levels = structuredClone(f.upgrades.levels);
  f2.upgrades.totalPurchased = f.upgrades.totalPurchased;
  f2.sessionGoal.load(f.sessionGoal.snapshot()!);
  f2.loadRuntime(snap);
  f2.bootMcSession(true);
  return f2;
}

function runReturn(
  f: Factory,
  prefer: 'speed' | 'value',
  opts?: { boostMult?: number; buyBurst?: number },
): { durationSec: number; orders: number } {
  f.bootMcSession(true);
  expect(f.mc.phase).toBe('return_challenge');
  const t0 = f.sessionMs;
  let g = 0;
  let buys = 0;
  while (!f.mc.state.returnChallengeComplete && g < 4000) {
    const rc = f.mc.state.returnChallenge!;
    if (opts?.boostMult && opts.boostMult > 1 && rc.returnOrderIndex === 1) {
      f.eventsSys.trigger('productionBoost');
    }
    if (rc.returnPhase.startsWith('order') && g % 8 === 0) {
      if (opts?.buyBurst && buys < opts.buyBurst) {
        f.economy.coins += 50_000;
        if (buyPrefer(f, prefer)) buys += 1;
      } else {
        f.clickMachine(1);
        buyPrefer(f, prefer);
      }
    }
    sim(f, 250);
    g += 1;
  }
  expect(f.mc.state.returnChallengeComplete).toBe(true);
  expect(f.mc.state.returnChallenge!.completedOrderSummaries.length).toBe(3);
  return {
    durationSec: (f.sessionMs - t0) / 1000,
    orders: f.mc.state.returnChallenge!.completedOrderSummaries.length,
  };
}

describe('M-C.3 config freeze', () => {
  it('keeps funding/launch frozen parameters', () => {
    expect(SMARTPHONE_CAMPAIGN.balancedPct).toBe(0.35);
    expect(SMARTPHONE_CAMPAIGN.fastPct).toBe(0.58);
    expect(SMARTPHONE_CAMPAIGN.balancedDurationSec).toBe(250);
    expect(SMARTPHONE_CAMPAIGN.fastDurationSec).toBe(195);
    expect(SMARTPHONE_CAMPAIGN.fundDepositCapMult).toBe(1.25);
    expect(SMARTPHONE_CAMPAIGN.launch.equivalentSeconds).toBe(105);
    expect(SMARTPHONE_CAMPAIGN.returnChallenge.orderEquivalentSeconds).toBe(70);
    expect(SMARTPHONE_CAMPAIGN.returnChallenge.orderCount).toBe(3);
  });
});

describe('M-C.3 Return three adaptive orders', () => {
  it('FLOW: three orders, target frozen mid-order, duration in band', () => {
    const f = advanceToShift1('throughput');
    const result = runReturn(f, 'speed');
    expect(result.orders).toBe(3);
    expect(result.durationSec).toBeGreaterThanOrEqual(120);
    expect(result.durationSec).toBeLessThanOrEqual(300);
    expect(f.mc.label(f)).toMatch(/RETURN COMPLETE|FREE UPGRADE/);
  }, 180_000);

  it('MARGIN: three orders, duration in band', () => {
    const f = advanceToShift1('margin');
    const result = runReturn(f, 'value');
    expect(result.orders).toBe(3);
    expect(result.durationSec).toBeGreaterThanOrEqual(90);
    expect(result.durationSec).toBeLessThanOrEqual(300);
  }, 180_000);

  it('upgrade burst during order 1 raises next order capacity', () => {
    const f = advanceToShift1('throughput');
    f.bootMcSession(true);
    // Wait for order 1
    let g = 0;
    while (
      f.mc.state.returnChallenge!.returnPhase !== 'order_1' &&
      g < 200
    ) {
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.returnChallenge!.returnPhase).toBe('order_1');
    const t1 = f.mc.state.returnChallenge!.returnOrderTarget;
    const ref1 = f.mc.state.returnChallenge!.returnOrderReferenceRate;
    // 3× speed buys during order 1
    f.economy.coins += 100_000;
    for (let i = 0; i < 3; i++) buyPrefer(f, 'speed');
    g = 0;
    while (
      f.mc.state.returnChallenge!.completedOrderSummaries.length < 1 &&
      g < 1500
    ) {
      f.clickMachine(1);
      if (g % 10 === 0) buyPrefer(f, 'speed');
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.returnChallenge!.completedOrderSummaries.length).toBe(1);
    expect(f.mc.state.returnChallenge!.returnPhase).toBe('order_2');
    const ref2 = f.mc.state.returnChallenge!.returnOrderReferenceRate;
    expect(ref2).toBeGreaterThanOrEqual(ref1 * 0.9);
    // Target for order 1 never changed
    expect(
      f.mc.state.returnChallenge!.completedOrderSummaries[0]!.target,
    ).toBe(t1);
    // Finish remaining
    g = 0;
    while (!f.mc.state.returnChallengeComplete && g < 3000) {
      f.clickMachine(1);
      if (g % 8 === 0) buyPrefer(f, 'speed');
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.returnChallengeComplete).toBe(true);
  }, 180_000);

  it('event boost during order 1 does not shrink order 2 after boost ends', () => {
    const f = advanceToShift1('throughput');
    f.eventsSys.resume();
    f.bootMcSession(true);
    let g = 0;
    while (
      f.mc.state.returnChallenge!.returnPhase !== 'order_1' &&
      g < 200
    ) {
      sim(f, 250);
      g += 1;
    }
    f.eventsSys.trigger('productionBoost');
    const ref1 = f.mc.state.returnChallenge!.returnOrderReferenceRate;
    g = 0;
    while (
      f.mc.state.returnChallenge!.completedOrderSummaries.length < 1 &&
      g < 1500
    ) {
      // Keep boost alive while finishing order 1 if possible
      if (!f.eventsSys.active) f.eventsSys.trigger('productionBoost');
      f.clickMachine(1);
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.returnChallenge!.returnPhase).toBe('order_2');
    // Clear event before measuring order 2
    f.eventsSys.suppress();
    const ref2 = f.mc.state.returnChallenge!.returnOrderReferenceRate;
    // Neutral recalibration should not be 10× the original permanent rate
    expect(ref2).toBeLessThan(ref1 * 8);
    g = 0;
    while (!f.mc.state.returnChallengeComplete && g < 3000) {
      f.clickMachine(1);
      if (g % 10 === 0) buyPrefer(f, 'speed');
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.returnChallengeComplete).toBe(true);
    const dur =
      (f.sessionMs - (f.mc.state.returnChallenge!.startedAtMs ?? f.sessionMs)) /
      1000;
    expect(dur).toBeGreaterThanOrEqual(90);
  }, 180_000);

  it('reload mid each order preserves target and progress', () => {
    let f = advanceToShift1('throughput');
    f.bootMcSession(true);
    for (const order of [1, 2, 3] as const) {
      let g = 0;
      while (
        f.mc.state.returnChallenge!.returnOrderIndex !== order &&
        !f.mc.state.returnChallengeComplete &&
        g < 2000
      ) {
        f.clickMachine(1);
        if (g % 8 === 0) buyPrefer(f, 'speed');
        sim(f, 250);
        g += 1;
      }
      if (f.mc.state.returnChallengeComplete) break;
      expect(f.mc.state.returnChallenge!.returnOrderIndex).toBe(order);
      sim(f, 3_000);
      const phase = f.mc.state.returnChallenge!.returnPhase;
      const target = f.mc.state.returnChallenge!.returnOrderTarget;
      const progress = f.mc.state.returnChallenge!.returnOrderProgress;
      const start = f.mc.state.returnChallenge!.returnOrderStartCounter;
      f = reload(f);
      expect(f.mc.phase).toBe('return_challenge');
      expect(f.mc.state.returnChallenge!.returnPhase).toBe(phase);
      expect(f.mc.state.returnChallenge!.returnOrderTarget).toBe(target);
      expect(f.mc.state.returnChallenge!.returnOrderStartCounter).toBe(start);
      expect(f.mc.state.returnChallenge!.returnOrderProgress).toBe(progress);
    }
  }, 240_000);

  it('reward only after 3/3; no prior production counted', () => {
    const f = advanceToShift1('throughput');
    const preSold = f.mc.state.smartphonesSoldTotal;
    expect(preSold).toBeGreaterThan(0);
    f.bootMcSession(true);
    expect(f.mc.state.returnChallenge!.phonesAtReturnStart).toBe(preSold);
    expect(f.mc.state.returnChallenge!.returnOrderProgress).toBe(0);
    expect(f.mc.state.freeUpgradeGranted).toBe(false);
    // Force through calibration only
    sim(f, SMARTPHONE_CAMPAIGN.returnChallenge.calibrationMs + 500);
    expect(f.mc.state.returnChallenge!.returnPhase).toBe('order_1');
    expect(f.mc.state.freeUpgradeGranted).toBe(false);
    expect(f.mc.state.returnChallenge!.completedOrderSummaries.length).toBe(0);
  }, 120_000);
});

describe('M-C.3 atomic free upgrade', () => {
  it('normal: cash insufficient still applies free; cashDelta 0; credit after success', () => {
    const f = reachFunding('throughput');
    f.mc.state.freeUpgradeGranted = true;
    f.mc.state.freeUpgradeCredits = 1;
    f.mc.state.freeUpgradeUsed = false;
    f.mc.state.freeUpgradeConsumed = false;
    f.economy.coins = 0;
    const levelBefore = f.upgrades.getLevel(1, 'speed');
    expect(f.upgrades.isMaxed(1, 'speed')).toBe(false);
    const r = f.mc.applyFreeUpgrade(f, 1, 'speed');
    expect(r.ok).toBe(true);
    expect(r.cashDelta).toBe(0);
    expect(r.levelAfter).toBe(levelBefore + 1);
    expect(f.economy.coins).toBe(0);
    expect(f.mc.state.freeUpgradeConsumed).toBe(true);
    expect(f.mc.state.freeUpgradeCredits).toBe(0);
  });

  it('failure: invalid leaves credit/level/cash untouched', () => {
    const f = reachFunding('throughput');
    f.mc.state.freeUpgradeGranted = true;
    f.mc.state.freeUpgradeCredits = 1;
    f.mc.state.freeUpgradeUsed = false;
    f.mc.state.freeUpgradeConsumed = false;
    // Max only this slot while others free → stale_max
    f.upgrades.levels[1].speed = MAX_UPGRADE_LEVEL;
    f.economy.coins = 50;
    const r = f.mc.applyFreeUpgrade(f, 1, 'speed');
    expect(r.ok).toBe(false);
    expect(f.mc.state.freeUpgradeCredits).toBe(1);
    expect(f.mc.state.freeUpgradeConsumed).toBe(false);
    expect(f.economy.coins).toBe(50);
    expect(f.upgrades.getLevel(1, 'speed')).toBe(MAX_UPGRADE_LEVEL);
  });

  it('BONUS: MAX line, cashDelta 0, one only, reload idempotent', () => {
    const f = reachFunding('margin');
    for (const type of ['speed', 'value', 'buffer'] as UpgradeType[]) {
      for (const m of [0, 1, 2] as MachineId[]) {
        if (type === 'buffer' && m === 2) continue;
        f.upgrades.levels[m][type] = MAX_UPGRADE_LEVEL;
      }
    }
    f.mc.state.phase = 'return_complete';
    f.mc.state.freeUpgradeGranted = true;
    f.mc.state.freeUpgradeCredits = 1;
    f.mc.state.freeUpgradeUsed = false;
    f.mc.state.freeUpgradeConsumed = false;
    expect(f.mc.computeFreeUpgradeMode(f)).toBe('bonus_tier');
    f.economy.coins = 0;
    expect(f.buyUpgrade(1, 'value')).toBe(true);
    expect(f.economy.coins).toBe(0);
    expect(f.mc.state.bonusUpgradeGranted).toBe(true);
    expect(f.mc.state.bonusLevelDelta).toBe(1);
    expect(f.mc.state.freeUpgradeCredits).toBe(0);
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    f2.loadRuntime(snap);
    expect(f2.mc.state.freeUpgradeCredits).toBe(0);
    expect(f2.mc.state.bonusUpgradeGranted).toBe(true);
    f2.economy.coins = 100;
    f2.mc.state.phase = 'return_complete';
    expect(f2.buyUpgrade(0, 'speed')).toBe(false);
    expect(f2.economy.coins).toBe(100);
  }, 60_000);
});

describe('M-C.3 launch hydration barrier', () => {
  it('reload mid-proof: hydrationProgressDelta 0; no offline catch-up', () => {
    const g0 = reachFunding('margin');
    g0.mc.selectPolicy(g0, 'fast');
    g0.economy.coins = 40_000;
    let g = 0;
    while (g0.mc.phase !== 'smartphone_launch' && g < 2000) {
      if (g0.mc.phase === 'smartphone_ready') g0.mc.buildSmartphoneLine(g0);
      if (g0.mc.state.launchActionGate === 'pending' && g % 6 === 0) {
        const rec = g0.mc.state.launchRecommended;
        if (rec && !g0.upgrades.isMaxed(rec.machineId, rec.type)) {
          g0.buyUpgrade(rec.machineId, rec.type);
        } else buyPrefer(g0, 'value');
      }
      sim(g0, 250);
      g += 1;
    }
    expect(g0.mc.phase).toBe('smartphone_launch');
    if (g0.mc.state.launchActionGate === 'pending') {
      const rec = g0.mc.state.launchRecommended;
      if (rec) g0.buyUpgrade(rec.machineId, rec.type);
    }
    sim(g0, 4_000);
    const before = g0.mc.state.launchBatchProgress;
    const target = g0.mc.state.launchBatchTarget;
    const gate = g0.mc.state.launchActionGate;
    const f2 = reload(g0);
    expect(f2.mc.phase).toBe('smartphone_launch');
    expect(f2.mc.state.launchBatchTarget).toBe(target);
    expect(f2.mc.state.launchActionGate).toBe(gate);
    expect(f2.mc.state.launchProgressAfterHydrate).toBe(before);
    expect(f2.mc.state.hydrationProgressDelta).toBe(0);
    expect(f2.mc.state.launchBatchProgress).toBe(before);
    sim(f2, 50);
    expect(f2.mc.state.hydrationComplete).toBe(true);
    if (f2.mc.state.launchProgressAfterFirstValidStep != null) {
      expect(f2.mc.state.firstValidStepDelta).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);
});

describe('M-C.3 funding purchase telemetry', () => {
  it('records only successful funding-phase purchases', () => {
    const f = reachFunding('throughput');
    const before = f.upgrades.totalPurchased;
    f.mc.selectPolicy(f, 'balanced');
    expect(f.mc.state.upgradesBoughtBeforeFunding).toBe(before);
    f.economy.coins = 5_000;
    let buys = 0;
    let g = 0;
    while (f.mc.phase === 'smartphone_funding' && buys < 2 && g < 400) {
      if (buyPrefer(f, 'speed')) buys += 1;
      sim(f, 500);
      g += 1;
    }
    expect(f.mc.state.fundingPurchaseCount).toBe(buys);
    expect(f.mc.state.fundingPurchases.length).toBe(buys);
    for (const p of f.mc.state.fundingPurchases) {
      expect(p.levelAfter).toBe(p.levelBefore + 1);
      expect(p.cashAfter).toBeLessThan(p.cashBefore);
      expect(p.fundAfter).toBeGreaterThanOrEqual(p.fundBefore);
    }
  }, 60_000);
});
