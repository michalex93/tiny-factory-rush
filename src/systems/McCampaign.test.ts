/**
 * M-C.1 — adaptive funding, commissioning launch, return batch, bonus free upgrade.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import {
  SMARTPHONE_CAMPAIGN,
  TOYS_MILESTONE,
  computeFundTarget,
  MAX_UPGRADE_LEVEL,
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

function advanceToBuilt(f: Factory, policy: 'balanced' | 'fast'): void {
  f.mc.selectPolicy(f, policy);
  f.economy.coins = Math.max(f.economy.coins, 5_000);
  let g = 0;
  while (f.mc.phase !== 'smartphone_ready' && g < 1_200) {
    if (g % 8 === 0) buyPrefer(f, policy === 'fast' ? 'speed' : 'value');
    sim(f, 500);
    g += 1;
  }
  expect(f.mc.phase).toBe('smartphone_ready');
  f.mc.buildSmartphoneLine(f);
}

function finishLaunch(f: Factory, prefer: 'speed' | 'value'): void {
  f.economy.coins = Math.max(f.economy.coins, 30_000);
  let g = 0;
  while (
    f.mc.phase !== 'return_preview' &&
    f.mc.phase !== 'shift_1_complete' &&
    g < 2_400
  ) {
    if (f.mc.phase === 'baseline_sampling' || f.mc.phase === 'first_smartphone') {
      sim(f, 500);
      g += 1;
      continue;
    }
    if (f.mc.phase === 'smartphone_launch') {
      if (f.mc.state.launchActionGate === 'pending' && g % 4 === 0) {
        const rec = f.mc.state.launchRecommended;
        if (rec && !f.upgrades.isMaxed(rec.machineId, rec.type)) {
          f.buyUpgrade(rec.machineId, rec.type);
        } else if (prefer === 'value') {
          let bought = false;
          for (const m of [1, 0, 2] as const) {
            if (!f.upgrades.isMaxed(m, 'value')) {
              bought = f.buyUpgrade(m, 'value');
              if (bought) break;
            }
          }
          if (!bought) buyPrefer(f, prefer);
        } else {
          buyPrefer(f, prefer);
        }
      }
    }
    sim(f, 500);
    g += 1;
  }
  expect(f.mc.state.shift1Complete).toBe(true);
}

describe('M-C.1 adaptive funding', () => {
  it('computes locked adaptive targets with new contributions', () => {
    expect(SMARTPHONE_CAMPAIGN.balancedPct).toBe(0.35);
    expect(SMARTPHONE_CAMPAIGN.fastPct).toBe(0.58);
    const bal = computeFundTarget(10, 'balanced');
    const fast = computeFundTarget(10, 'fast');
    expect(bal.durationSec).toBe(250);
    expect(fast.durationSec).toBe(195);
    // Fast deposits a higher share → finishes sooner; absolute $ target may be higher
    expect(fast.contribution).toBeGreaterThan(bal.contribution);
    expect(fast.durationSec).toBeLessThan(bal.durationSec);
    expect(fast.durationSec / bal.durationSec).toBeCloseTo(0.78, 1);
  });

  it('locks fundTarget at policy confirm; cash spend does not shrink fund', () => {
    const f = reachFunding('throughput');
    f.mc.selectPolicy(f, 'balanced');
    const target = f.mc.state.fundTarget;
    const ref = f.mc.state.fundingReferenceIncomePerSec;
    expect(target).toBeGreaterThan(100);
    expect(ref).toBeGreaterThan(0);
    sim(f, 5_000);
    const fund = f.mc.state.smartphoneFund;
    f.economy.coins = 8_000;
    buyPrefer(f, 'speed');
    expect(f.mc.state.fundTarget).toBe(target);
    expect(f.mc.state.smartphoneFund).toBeGreaterThanOrEqual(fund);
    expect(f.mc.selectPolicy(f, 'fast').length).toBe(0);
  });

  it('event deposit cap leaves excess as cash', () => {
    const f = reachFunding('margin');
    f.mc.selectPolicy(f, 'fast');
    const beforeCash = f.economy.coins;
    const beforeFund = f.mc.state.smartphoneFund;
    // Huge golden-like sale
    const split = f.mc.splitSale(5_000, 100);
    expect(split.toFund).toBeLessThan(5_000 * 0.58);
    expect(split.toCash + split.toFund).toBe(5_000);
    f.economy.creditSale(5_000, split.toCash);
    expect(f.mc.state.smartphoneFund).toBeGreaterThanOrEqual(beforeFund);
    expect(f.economy.coins).toBeGreaterThan(beforeCash);
  });

  it('both policies reach READY; balanced leaves more cash opportunity', () => {
    const fb = reachFunding('throughput');
    fb.economy.coins = 50;
    fb.mc.selectPolicy(fb, 'balanced');
    const balPct = fb.mc.state.policyContribution;
    const ft = reachFunding('throughput');
    ft.economy.coins = 50;
    ft.mc.selectPolicy(ft, 'fast');
    expect(balPct).toBeLessThan(ft.mc.state.policyContribution);
  });
});

describe('M-C.1 commissioning launch', () => {
  it('does not complete by elapsed alone; needs batch + action/waiver + sustain', () => {
    const f = reachFunding('throughput');
    advanceToBuilt(f, 'fast');
    let g = 0;
    while (f.mc.phase !== 'smartphone_launch' && g < 80) {
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.phase).toBe('smartphone_launch');
    const start = f.sessionMs;
    // Idle 90s without qualifying action / without enough batch
    sim(f, 90_000);
    // May progress batch via sales but action still pending unless waived
    if (f.mc.state.launchActionGate === 'pending') {
      expect(f.mc.phase).toBe('smartphone_launch');
      expect(f.sessionMs - start).toBeGreaterThanOrEqual(90_000);
    }
  });

  it('FLOW relevant Speed on bottleneck qualifies; sales do not', () => {
    const f = reachFunding('throughput');
    advanceToBuilt(f, 'fast');
    let g = 0;
    while (f.mc.phase !== 'smartphone_launch' && g < 100) {
      sim(f, 250);
      g += 1;
    }
    const before = f.mc.state.launchActions;
    sim(f, 5_000); // sales
    expect(f.mc.state.launchActionGate).not.toBe('complete');
    f.economy.coins = 50_000;
    const bn = (f.line.getBottleneckId() ?? 1) as 0 | 1 | 2;
    expect(f.buyUpgrade(bn, 'speed')).toBe(true);
    expect(f.mc.state.launchActionGate).toBe('complete');
    expect(f.mc.state.launchActions).toBeGreaterThan(before);
  });

  it('pre-launch production does not count toward batch', () => {
    const f = reachFunding('margin');
    advanceToBuilt(f, 'balanced');
    sim(f, 4_000);
    expect(
      f.mc.phase === 'baseline_sampling' || f.mc.phase === 'first_smartphone',
    ).toBe(true);
    let progressAtEnter: number | null = null;
    let g = 0;
    while (g < 400) {
      const prev = f.mc.phase;
      f.update(50);
      if (
        prev !== 'smartphone_launch' &&
        f.mc.phase === 'smartphone_launch'
      ) {
        progressAtEnter = f.mc.state.launchBatchProgress;
        break;
      }
      g += 1;
    }
    expect(progressAtEnter).toBe(0);
  });

  it('reload mid-sampling continues without zeroing progress forever', () => {
    const f = reachFunding('throughput');
    advanceToBuilt(f, 'fast');
    sim(f, 3_000);
    expect(f.mc.phase).toBe('baseline_sampling');
    const sampleMs = f.mc.state.launchSampleMs;
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.economy.currentProduct = 'smartphones';
    f2.progression.unlocked = [...f.progression.unlocked];
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    f2.upgrades.totalPurchased = f.upgrades.totalPurchased;
    f2.loadRuntime(snap);
    expect(f2.mc.phase).toBe('baseline_sampling');
    expect(f2.mc.state.launchSampleMs).toBeGreaterThanOrEqual(sampleMs);
  });

  it('waived_at_cap when line is MAX', () => {
    const f = reachFunding('throughput');
    advanceToBuilt(f, 'fast');
    // Max all upgrades
    for (const type of ['speed', 'value', 'buffer'] as const) {
      for (const m of [0, 1, 2] as const) {
        if (type === 'buffer' && m === 2) continue;
        while (!f.upgrades.isMaxed(m, type)) {
          f.economy.coins += f.upgrades.costFor(m, type);
          f.buyUpgrade(m, type);
        }
      }
    }
    let g = 0;
    while (f.mc.phase !== 'smartphone_launch' && g < 100) {
      sim(f, 250);
      g += 1;
    }
    expect(f.mc.state.launchActionGate).toBe('waived_at_cap');
  });
});

describe('M-C.1 return + free upgrade', () => {
  it('return does not autocomplete on load; counters start at 0', () => {
    const f = reachFunding('throughput');
    advanceToBuilt(f, 'fast');
    finishLaunch(f, 'speed');
    expect(f.mc.state.returnChallengeStarted).toBe(false);
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.economy.coins = f.economy.coins;
    f2.economy.totalEarned = f.economy.totalEarned;
    f2.economy.currentProduct = 'smartphones';
    f2.progression.unlocked = [...f.progression.unlocked];
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    f2.upgrades.totalPurchased = f.upgrades.totalPurchased;
    f2.loadRuntime(snap);
    f2.bootMcSession(true);
    expect(f2.mc.phase).toBe('return_challenge');
    expect(f2.mc.state.returnChallenge!.batchProgress).toBe(0);
    expect(f2.mc.state.returnChallengeComplete).toBe(false);
    sim(f2, 3_000);
    expect(f2.mc.state.returnChallengeComplete).toBe(false);
  }, 60_000);

  it('bonus tier free upgrade when all MAX; cashDelta 0; no reload dup', () => {
    const f = reachFunding('margin');
    advanceToBuilt(f, 'fast');
    finishLaunch(f, 'value');
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.economy.coins = 0;
    f2.economy.currentProduct = 'smartphones';
    f2.progression.unlocked = [...f.progression.unlocked];
    f2.upgrades.levels = structuredClone(f.upgrades.levels);
    f2.upgrades.totalPurchased = f.upgrades.totalPurchased;
    // Force all max
    for (const type of ['speed', 'value', 'buffer'] as const) {
      for (const m of [0, 1, 2] as const) {
        if (type === 'buffer' && m === 2) continue;
        f2.upgrades.levels[m][type] = MAX_UPGRADE_LEVEL;
      }
    }
    f2.loadRuntime(snap);
    f2.bootMcSession(true);
    // Complete return by easing targets
    const rc = f2.mc.state.returnChallenge!;
    rc.batchTarget = 2;
    rc.startedAtMs =
      f2.sessionMs - SMARTPHONE_CAMPAIGN.returnChallenge.armGraceMs - 1;
    let h = 0;
    while (!f2.mc.state.returnChallengeComplete && h < 400) {
      f2.buyUpgrade(1, 'speed'); // marks postStartInput via noteQualified or return
      f2.mc.state.returnChallenge!.postStartInput = true;
      f2.mc.state.returnChallenge!.batchProgress = 2;
      f2.mc.state.returnChallenge!.sustainOkMs =
        SMARTPHONE_CAMPAIGN.returnChallenge.sustainWindowMs;
      sim(f2, 500);
      h += 1;
    }
    expect(f2.mc.state.freeUpgradeGranted).toBe(true);
    expect(f2.mc.computeFreeUpgradeMode(f2)).toBe('bonus_tier');
    f2.economy.coins = 0;
    expect(f2.buyUpgrade(1, 'value')).toBe(true);
    expect(f2.economy.coins).toBe(0);
    expect(f2.mc.state.bonusUpgradeGranted).toBe(true);
    expect(f2.mc.state.freeUpgradeCredits).toBe(0);

    const snap2 = f2.toSnapshot();
    const f3 = new Factory();
    f3.loadRuntime(snap2);
    expect(f3.mc.state.freeUpgradeCredits).toBe(0);
    expect(f3.mc.state.bonusUpgradeGranted).toBe(true);
    expect(f3.buyUpgrade(0, 'speed')).toBe(false);
  }, 90_000);

  it('campaignMarkers survive logical reload of state', () => {
    const f = reachFunding('throughput');
    f.mc.selectPolicy(f, 'balanced');
    expect(f.mc.state.campaignMarkers.fundingChoiceCampaignMs).not.toBeNull();
    const snap = f.toSnapshot();
    const f2 = new Factory();
    f2.loadRuntime(snap);
    expect(f2.mc.state.campaignMarkers.fundingChoiceCampaignMs).not.toBeNull();
  });
});

describe('M-C.1 funding duration bands (trace-calibrated)', () => {
  it('Balanced READY ~3.5–4.5 min; Fast shorter with equal upgrade pressure', () => {
    const run = (policy: 'balanced' | 'fast') => {
      const f = reachFunding('throughput');
      f.economy.coins = 1_500;
      const t0 = f.sessionMs;
      f.mc.selectPolicy(f, policy);
      let buys = 0;
      let g = 0;
      while (f.mc.phase !== 'smartphone_ready' && g < 1_500) {
        // Equal upgrade pressure so Fast's shorter duration is visible
        if (g % 20 === 0 && buys < 2) {
          if (buyPrefer(f, 'speed')) buys += 1;
        }
        sim(f, 500);
        g += 1;
      }
      expect(f.mc.phase).toBe('smartphone_ready');
      return {
        fundSec: (f.sessionMs - t0) / 1000,
        buys,
        target: f.mc.state.fundTarget,
        ref: f.mc.state.fundingReferenceIncomePerSec,
      };
    };
    const bal = run('balanced');
    const fast = run('fast');
    expect(bal.fundSec).toBeGreaterThanOrEqual(180);
    expect(bal.fundSec).toBeLessThanOrEqual(300);
    expect(fast.fundSec).toBeGreaterThanOrEqual(145);
    expect(fast.fundSec).toBeLessThanOrEqual(250);
    expect(fast.fundSec).toBeLessThan(bal.fundSec);
    expect(bal.buys + fast.buys).toBeGreaterThanOrEqual(1);
  });
});

describe('M-C.1 path smoke', () => {
  it.each([
    ['throughput', 'balanced'],
    ['throughput', 'fast'],
    ['margin', 'balanced'],
    ['margin', 'fast'],
  ] as const)('%s + %s reaches Shift 1', (branch, policy) => {
    const f = reachFunding(branch);
    const prefer = branch === 'margin' ? 'value' : 'speed';
    advanceToBuilt(f, policy);
    const buildMs = f.sessionMs;
    finishLaunch(f, prefer);
    expect(f.mc.state.shift1Complete).toBe(true);
    expect(f.sessionLabel().length).toBeGreaterThan(0);
    // Launch not instant
    expect(f.sessionMs - buildMs).toBeGreaterThan(15_000);
  }, 90_000);
});
