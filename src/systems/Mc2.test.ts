/**
 * M-C.2 — liquidity contributions, return rate units, launch reload, bonus UI path.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import {
  SMARTPHONE_CAMPAIGN,
  TOYS_MILESTONE,
  clampReturnReference,
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

function cloneAtFunding(branch: 'throughput' | 'margin') {
  const f = reachFunding(branch);
  f.economy.coins = Math.min(f.economy.coins, 100);
  return {
    snap: f.toSnapshot(),
    coins: f.economy.coins,
    totalEarned: f.economy.totalEarned,
    productsSold: f.economy.productsSold,
    product: f.economy.currentProduct,
    levels: structuredClone(f.upgrades.levels),
    totalPurchased: f.upgrades.totalPurchased,
    unlocked: [...f.progression.unlocked],
    branch,
  };
}

function restoreFunding(base: ReturnType<typeof cloneAtFunding>): Factory {
  const f = new Factory();
  f.line.rollGolden = () => false;
  f.eventsSys.suppress();
  f.economy.coins = base.coins;
  f.economy.totalEarned = base.totalEarned;
  f.economy.productsSold = base.productsSold;
  f.economy.currentProduct = base.product;
  f.progression.unlocked = [...base.unlocked];
  f.upgrades.levels = structuredClone(base.levels);
  f.upgrades.totalPurchased = base.totalPurchased;
  f.sessionGoal.skipAsComplete();
  f.sessionGoal.load({
    ...f.sessionGoal.snapshot()!,
    selectedBranch: base.branch,
    smartphonesMilestoneShown: true,
    toyMasteryCompleted: true,
  });
  f.loadRuntime(base.snap);
  if (f.mc.phase !== 'funding_choice') f.mc.beginAfterMastery(f);
  return f;
}

function fundUntilReady(
  f: Factory,
  policy: 'balanced' | 'fast',
  prefer: 'speed' | 'value',
): { fundSec: number; buys: number; cashEnd: number } {
  f.mc.selectPolicy(f, policy);
  const t0 = f.sessionMs;
  let buys = 0;
  let g = 0;
  while (f.mc.phase !== 'smartphone_ready' && g < 2000) {
    if (g % 10 === 0 && buys < (policy === 'balanced' ? 3 : 2)) {
      if (buyPrefer(f, prefer)) buys += 1;
    }
    sim(f, 500);
    g += 1;
  }
  expect(f.mc.phase).toBe('smartphone_ready');
  return {
    fundSec: (f.sessionMs - t0) / 1000,
    buys,
    cashEnd: Math.floor(f.economy.coins),
  };
}

describe('M-C.2 config', () => {
  it('uses liquidity-oriented contributions and clamps return refs', () => {
    expect(SMARTPHONE_CAMPAIGN.balancedPct).toBe(0.35);
    expect(SMARTPHONE_CAMPAIGN.fastPct).toBe(0.58);
    expect(SMARTPHONE_CAMPAIGN.balancedDurationSec).toBe(250);
    expect(SMARTPHONE_CAMPAIGN.fastDurationSec).toBe(195);
    expect(clampReturnReference(2, 1)).toBeCloseTo(1.25, 5);
    expect(clampReturnReference(0.1, 1)).toBeCloseTo(0.75, 5);
    expect(clampReturnReference(0, 1)).toBe(1);
  });
});

describe('M-C.2 paired funding liquidity', () => {
  it('same throughput snapshot: Fast 15–25% shorter and fewer retained buys than Balanced', () => {
    const base = cloneAtFunding('throughput');
    const bal = fundUntilReady(restoreFunding(base), 'balanced', 'speed');
    const fast = fundUntilReady(restoreFunding(base), 'fast', 'speed');
    expect(bal.buys).toBeGreaterThanOrEqual(2);
    expect(fast.buys).toBeGreaterThanOrEqual(1);
    expect(fast.fundSec / bal.fundSec).toBeGreaterThanOrEqual(0.75);
    expect(fast.fundSec / bal.fundSec).toBeLessThanOrEqual(0.85);
    expect(fast.cashEnd).toBeLessThanOrEqual(bal.cashEnd);
  }, 60_000);

  it('same margin snapshot: Fast shorter with ≥1 buy', () => {
    const base = cloneAtFunding('margin');
    const bal = fundUntilReady(restoreFunding(base), 'balanced', 'value');
    const fast = fundUntilReady(restoreFunding(base), 'fast', 'value');
    expect(bal.buys).toBeGreaterThanOrEqual(2);
    expect(fast.buys).toBeGreaterThanOrEqual(1);
    expect(fast.fundSec / bal.fundSec).toBeGreaterThanOrEqual(0.75);
    expect(fast.fundSec / bal.fundSec).toBeLessThanOrEqual(0.85);
  }, 60_000);
});

describe('M-C.2 return rate + units', () => {
  it('return target uses proof-batch rate; progress is post-start delta only', () => {
    const f = reachFunding('throughput');
    f.mc.selectPolicy(f, 'fast');
    f.economy.coins = 20_000;
    let g = 0;
    while (f.mc.phase !== 'smartphone_ready' && g < 800) {
      sim(f, 500);
      g += 1;
    }
    f.mc.buildSmartphoneLine(f);
    // Produce through sampling + launch
    g = 0;
    while (!f.mc.state.shift1Complete && g < 2000) {
      if (
        f.mc.phase === 'smartphone_launch' &&
        f.mc.state.launchActionGate === 'pending' &&
        g % 8 === 0
      ) {
        const rec = f.mc.state.launchRecommended;
        if (rec && !f.upgrades.isMaxed(rec.machineId, rec.type)) {
          f.buyUpgrade(rec.machineId, rec.type);
        } else buyPrefer(f, 'speed');
      }
      sim(f, 500);
      g += 1;
    }
    expect(f.mc.state.shift1Complete).toBe(true);
    const rc = f.mc.state.returnChallenge!;
    expect(f.mc.state.launchProofPhones).toBeGreaterThan(0);
    expect(rc.referencePhonesPerSec).toBeGreaterThan(0);
    expect(rc.batchTarget).toBeGreaterThanOrEqual(
      Math.ceil(rc.referencePhonesPerSec * 180),
    );
    // Pre-return production must not count
    const preSold = f.mc.state.smartphonesSoldTotal;
    expect(preSold).toBeGreaterThan(0);
    f.bootMcSession(true);
    expect(f.mc.phase).toBe('return_challenge');
    expect(f.mc.state.returnChallenge!.phonesAtReturnStart).toBe(preSold);
    expect(f.mc.state.returnChallenge!.batchProgress).toBe(0);
    sim(f, 2_000);
    expect(f.mc.state.returnChallengeComplete).toBe(false);
    // Mark input + accumulate
    f.mc.state.returnChallenge!.postStartInput = true;
    const start = f.sessionMs;
    g = 0;
    while (!f.mc.state.returnChallengeComplete && g < 800) {
      if (g % 10 === 0) buyPrefer(f, 'speed');
      sim(f, 500);
      g += 1;
    }
    expect(f.mc.state.returnChallengeComplete).toBe(true);
    const observed = (f.sessionMs - start) / 1000;
    expect(observed).toBeGreaterThanOrEqual(90);
    expect(observed).toBeLessThanOrEqual(360);
  }, 120_000);
});

describe('M-C.2 launch reload persistence', () => {
  function advanceToPhase(
    f: Factory,
    phase: string,
    prefer: 'speed' | 'value' = 'speed',
  ): void {
    f.economy.coins = Math.max(f.economy.coins, 25_000);
    let g = 0;
    while (f.mc.phase !== phase && g < 1500) {
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

  it.each([
    ['first tick sampling', 200],
    ['mid sampling', 4_000],
  ] as const)('reload during %s continues sampling', (_label, waitMs) => {
    const f = reachFunding('throughput');
    f.mc.selectPolicy(f, 'fast');
    let g = 0;
    while (f.mc.phase !== 'smartphone_ready' && g < 800) {
      sim(f, 500);
      g += 1;
    }
    f.mc.buildSmartphoneLine(f);
    sim(f, 500); // first phone likely
    sim(f, waitMs);
    expect(
      f.mc.phase === 'baseline_sampling' || f.mc.phase === 'first_smartphone',
    ).toBe(true);
    if (f.mc.phase === 'first_smartphone') sim(f, 2_000);
    expect(f.mc.phase).toBe('baseline_sampling');
    const sampleBefore = f.mc.state.launchSampleMs;
    const f2 = reload(f);
    expect(f2.mc.phase).toBe('baseline_sampling');
    expect(f2.mc.state.launchSampleMs).toBeGreaterThanOrEqual(sampleBefore);
    expect(f2.mc.state.shift1Complete).toBe(false);
    expect(f2.mc.state.returnChallengeStarted).toBe(false);
  }, 90_000);

  it('reload mid-launch preserves batch and action; no return', () => {
    const f = reachFunding('margin');
    f.mc.selectPolicy(f, 'fast');
    let g = 0;
    while (f.mc.phase !== 'smartphone_ready' && g < 800) {
      sim(f, 500);
      g += 1;
    }
    advanceToPhase(f, 'smartphone_launch', 'value');
    expect(f.mc.phase).toBe('smartphone_launch');
    // Do correct action
    f.economy.coins = 50_000;
    const rec = f.mc.state.launchRecommended;
    if (rec && !f.upgrades.isMaxed(rec.machineId, rec.type)) {
      f.buyUpgrade(rec.machineId, rec.type);
    } else {
      f.buyUpgrade(1, 'value');
    }
    sim(f, 5_000);
    const batch = f.mc.state.launchBatchProgress;
    const gate = f.mc.state.launchActionGate;
    const target = f.mc.state.launchBatchTarget;
    const f2 = reload(f);
    expect(f2.mc.phase).toBe('smartphone_launch');
    expect(f2.mc.state.launchBatchTarget).toBe(target);
    expect(f2.mc.state.launchBatchProgress).toBe(batch);
    expect(f2.mc.state.launchActionGate).toBe(gate);
    expect(f2.mc.state.returnChallengeStarted).toBe(false);
  }, 90_000);
});

describe('M-C.2 BONUS TIER buy path', () => {
  it('MAX line: credit enables over-cap once; cashDelta 0; reload idempotent', () => {
    const f = reachFunding('margin');
    f.mc.selectPolicy(f, 'fast');
    // Max everything
    for (const type of ['speed', 'value', 'buffer'] as const) {
      for (const m of [0, 1, 2] as const) {
        if (type === 'buffer' && m === 2) continue;
        while (!f.upgrades.isMaxed(m, type)) {
          f.economy.coins += f.upgrades.costFor(m, type);
          f.buyUpgrade(m, type);
        }
      }
    }
    f.mc.state.freeUpgradeGranted = true;
    f.mc.state.freeUpgradeCredits = 1;
    f.mc.state.freeUpgradeUsed = false;
    f.mc.state.freeUpgradeMode = f.mc.computeFreeUpgradeMode(f);
    expect(f.mc.state.freeUpgradeMode).toBe('bonus_tier');

    // Simulate UI enablement condition
    const maxedAll = [0, 1, 2].every((m) =>
      (['speed', 'value', 'buffer'] as const).every((t) => {
        if (t === 'buffer' && m === 2) return true;
        return f.upgrades.isMaxed(m as 0 | 1 | 2, t);
      }),
    );
    expect(maxedAll).toBe(true);
    const bonusButtonEnabled =
      f.mc.state.freeUpgradeCredits > 0 &&
      f.mc.computeFreeUpgradeMode(f) === 'bonus_tier' &&
      !f.mc.state.bonusUpgradeGranted;
    expect(bonusButtonEnabled).toBe(true);

    f.economy.coins = 0;
    const levelBefore = f.upgrades.getLevel(1, 'value');
    const multBefore = f.upgrades.totalValueMultiplier(null);
    expect(f.buyUpgrade(1, 'value')).toBe(true);
    expect(f.economy.coins).toBe(0);
    expect(f.mc.state.freeUpgradeCredits).toBe(0);
    expect(f.mc.state.bonusUpgradeGranted).toBe(true);
    expect(f.mc.state.bonusUpgradeMachineId).toBe(1);
    expect(f.mc.state.bonusUpgradeType).toBe('value');
    expect(f.upgrades.getLevel(1, 'value')).toBe(levelBefore);
    expect(
      f.upgrades.totalValueMultiplier({ machineId: 1, type: 'value' }),
    ).toBeGreaterThan(multBefore);

    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.loadRuntime(snap);
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    expect(f2.mc.state.freeUpgradeCredits).toBe(0);
    expect(f2.mc.state.bonusUpgradeGranted).toBe(true);
    f2.economy.coins = 0;
    expect(f2.buyUpgrade(0, 'speed')).toBe(false);
  }, 60_000);
});
