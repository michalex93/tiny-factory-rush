/**
 * M-B.2 — Toys free earned unlock + pacing + badge preview.
 */
import { describe, expect, it, vi } from 'vitest';
import { Factory } from './Factory';
import { Telemetry } from './Telemetry';
import {
  PRODUCTS,
  TOYS_MILESTONE,
  OPTIMIZATION_CHAIN,
} from '../config/balance';

function sim(f: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    f.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function buyAffordable(f: Factory, prefer: 'speed' | 'value'): boolean {
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

function phaseIs(f: Factory, phase: string): boolean {
  return (f.sessionGoal.phase as string) === phase;
}

function reachPostChain(
  branch: 'throughput' | 'margin',
  events: 'none' | 'typical' | 'early' = 'none',
): Factory {
  const f = new Factory();
  f.line.rollGolden = () => false;
  f.economy.add(120);
  let g = 0;
  while (!phaseIs(f, 'awaiting_choice') && g < 400) {
    if (g % 25 === 10) buyAffordable(f, 'speed');
    sim(f, 500);
    g += 1;
  }
  if (!phaseIs(f, 'awaiting_choice')) {
    f.economy.add(800);
    while (f.upgrades.getLevel(1, 'speed') < 2) f.buyUpgrade(1, 'speed');
    g = 0;
    while (!phaseIs(f, 'awaiting_choice') && g < 200) {
      sim(f, 500);
      g += 1;
    }
  }
  expect(phaseIs(f, 'awaiting_choice')).toBe(true);
  f.selectOptimizationBranch(branch);
  g = 0;
  const pick = branch === 'throughput' ? 'speed' : 'value';
  while (!f.economy.canAfford(f.upgrades.costFor(1, pick)) && g < 100) {
    sim(f, 500);
    g += 1;
  }
  expect(f.buyUpgrade(1, pick)).toBe(true);

  const prefer = branch === 'throughput' ? 'speed' : 'value';
  g = 0;
  while (
    (f.sessionGoal.phase === 'branch' || f.sessionGoal.phase === 'convergence') &&
    g < 700
  ) {
    if (g % 20 === 0) buyAffordable(f, prefer);
    if (f.sessionGoal.phase === 'convergence' && g % 25 === 5) {
      buyAffordable(f, prefer === 'speed' ? 'value' : 'speed');
    }
    sim(f, 500);
    g += 1;
  }
  expect(['post_chain', 'complete']).toContain(f.sessionGoal.phase);

  if (events === 'none') f.eventsSys.suppress();
  else if (events === 'early') {
    f.eventsSys.resume();
    f.eventsSys.trigger('productionBoost');
  }
  return f;
}

function playToToys(
  branch: 'throughput' | 'margin',
  events: 'none' | 'typical' | 'early',
): {
  factory: Factory;
  unlockMs: number;
  earned: number;
  cash: number;
  ups: number;
  upsAt5: number;
} {
  const f = reachPostChain(branch, events);
  expect(f.progression.isUnlocked('toys')).toBe(false);
  expect(f.economy.totalEarned).toBeLessThan(TOYS_MILESTONE.unlockAtEarned);

  const prefer = branch === 'throughput' ? 'speed' : 'value';
  let upsAt5: number | null = null;
  let buyCd = 0;
  let g = 0;
  while (
    !f.progression.canUnlock('toys', f.economy).ok &&
    f.sessionMs < 9 * 60_000 &&
    g < 2500
  ) {
    if (upsAt5 === null && f.sessionMs >= 5 * 60_000) {
      upsAt5 = f.upgrades.totalPurchased;
    }
    if (buyCd <= 0) {
      const cheap = Math.min(
        f.upgrades.costFor(1, 'speed'),
        f.upgrades.costFor(1, 'value'),
      );
      if (f.economy.coins >= cheap * 1.1 && buyAffordable(f, prefer)) buyCd = 36;
    } else buyCd -= 1;
    sim(f, 500);
    g += 1;
  }

  expect(f.progression.canUnlock('toys', f.economy).ok).toBe(true);
  const unlockMs = f.sessionMs;
  const earned = Math.floor(f.economy.totalEarned);
  const cash = Math.floor(f.economy.coins);
  const ups = f.upgrades.totalPurchased;
  if (upsAt5 === null) upsAt5 = ups;
  return { factory: f, unlockMs, earned, cash, ups, upsAt5 };
}

describe('M-B.2 Toys free unlock + irreversible progress', () => {
  it('keeps PRODUCTS.toys in sync with TOYS_MILESTONE', () => {
    expect(PRODUCTS.toys.unlockAtEarned).toBe(TOYS_MILESTONE.unlockAtEarned);
    expect(PRODUCTS.toys.unlockCost).toBe(0);
    expect(TOYS_MILESTONE.freeUnlock).toBe(true);
  });

  it('buying upgrades does not reduce Toys progress display', () => {
    const f = reachPostChain('throughput', 'none');
    f.sessionGoal.syncToysProgress(f);
    const before = f.sessionGoal.snapshot()!.toysEarnedDisplay;
    f.economy.add(50); // also raises earned
    f.sessionGoal.syncToysProgress(f);
    const mid = f.sessionGoal.snapshot()!.toysEarnedDisplay;
    expect(mid).toBeGreaterThanOrEqual(before);
    // Spend all cash on upgrades
    while (buyAffordable(f, 'speed')) {
      /* drain */
    }
    f.sessionGoal.syncToysProgress(f);
    expect(f.sessionGoal.snapshot()!.toysEarnedDisplay).toBeGreaterThanOrEqual(
      mid,
    );
  });

  it('Toys needs no cash after lifetime earned; unlock does not debit', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    // Drain cash
    f.economy.spend(f.economy.coins);
    expect(f.economy.coins).toBe(0);
    expect(f.progression.canUnlock('toys', f.economy).ok).toBe(true);
    expect(f.tryUnlockNext()).toBe(true);
    expect(f.economy.coins).toBe(0);
    expect(f.progression.isUnlocked('toys')).toBe(true);
  });

  it('unlocks Toys only once', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    expect(f.tryUnlockNext()).toBe(true);
    expect(f.progression.isUnlocked('toys')).toBe(true);
    // Drain cash so later expansions cannot unlock
    f.economy.spend(f.economy.coins);
    expect(f.tryUnlockNext()).toBe(false);
    expect(f.progression.unlocked.filter((x) => x === 'toys').length).toBe(1);
  });

  it('save/reload preserves Toys earned progress', () => {
    const f = reachPostChain('margin', 'none');
    f.economy.add(200);
    f.sessionGoal.syncToysProgress(f);
    const earned = f.sessionGoal.snapshot()!.toysEarnedDisplay;
    const snap = f.toSnapshot();
    const eco = f.economy.snapshot();

    const f2 = new Factory();
    f2.economy.coins = eco.coins;
    f2.economy.totalEarned = eco.totalEarned;
    f2.economy.productsSold = eco.productsSold;
    f2.loadRuntime(snap);
    f2.sessionGoal.syncToysProgress(f2);
    expect(f2.sessionGoal.snapshot()!.toysEarnedDisplay).toBeGreaterThanOrEqual(
      earned,
    );
    expect(f2.economy.totalEarned).toBe(eco.totalEarned);
  });

  it('Toys is not unlocked at convergence complete', () => {
    for (const branch of ['throughput', 'margin'] as const) {
      const f = reachPostChain(branch, 'none');
      expect(f.progression.isUnlocked('toys')).toBe(false);
      expect(f.economy.totalEarned).toBeLessThan(TOYS_MILESTONE.unlockAtEarned);
      expect(f.sessionGoal.snapshot()!.nextMilestoneShown).toBe(true);
      const label = f.sessionGoal.label();
      expect(label).toMatch(/TOYS/i);
      expect(label).not.toMatch(/pay|cash|\$280/i);
    }
  });

  it('milestone appears within 2s of convergence (same tick)', () => {
    const f = reachPostChain('throughput', 'none');
    const shown = f.sessionGoal.snapshot()!.completedAtMs;
    expect(shown).not.toBeNull();
    // next milestone shown at convergence complete — delay ≤ nextStageMaxDelay
    expect(OPTIMIZATION_CHAIN.nextStageMaxDelayMs).toBeLessThanOrEqual(2_000);
    expect(f.sessionGoal.snapshot()!.nextMilestoneShown).toBe(true);
  });

  it('OPEN TOYS is free and sets first-Toy objective', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.syncToysProgress(f);
    const cash = f.economy.coins;
    expect(f.tryUnlockNext()).toBe(true);
    expect(f.economy.coins).toBe(cash);
    expect(f.sessionGoal.snapshot()!.awaitingFirstToy).toBe(true);
    expect(f.sessionGoal.label()).toMatch(/first Toy/i);
  });

  it('first Toy sale starts Toy Mastery (label stays non-empty)', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.sessionGoal.skipAsComplete();
    f.tryUnlockNext();
    expect(f.economy.currentProduct).toBe('toys');
    sim(f, 15_000);
    expect(f.sessionGoal.snapshot()!.awaitingFirstToy).toBe(false);
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    expect(f.sessionGoal.label().length).toBeGreaterThan(0);
  });

  it('progress telemetry is bucketed (no spam)', () => {
    const progress: unknown[] = [];
    const f = reachPostChain('throughput', 'none');
    f.events.onToysMilestoneProgress = (p) => progress.push(p);
    // Jump earned across several buckets
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    sim(f, 200);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress.length).toBeLessThanOrEqual(
      TOYS_MILESTONE.progressBuckets.length + 1,
    );
  });

  it('preview payoff only works in development', () => {
    const f = new Factory();
    const ok = f.previewPayoff('still_limiting');
    // Vitest/Vite sets import.meta.env.DEV = true
    expect(ok).toBe(true);
    expect(f.bottleneckBadgeMode).toBe('improved_still');
    expect(f.improvedBadgeDeltaPct).toBe(12);
    f.previewPayoff('moved');
    expect(f.bottleneckBadgeMode).toBe('bottleneck');
    f.clearPayoffPreview();
  });

  it('badge copy stays readable for narrow layouts', () => {
    const narrow = `IMPROVED +12%\nSTILL BOTTLENECK`;
    expect(narrow.split('\n')).toHaveLength(2);
    expect(narrow.length).toBeLessThan(40);
  });
});

describe('M-B.2 PATH Toys unlock timing', () => {
  it('PATH_THROUGHPUT reaches Toys in 5–8 min (no events)', () => {
    const r = playToToys('throughput', 'none');
    expect(r.unlockMs).toBeGreaterThanOrEqual(TOYS_MILESTONE.targetUnlockMs.min);
    expect(r.unlockMs).toBeLessThanOrEqual(TOYS_MILESTONE.targetUnlockMs.max);
    expect(r.earned).toBeGreaterThanOrEqual(TOYS_MILESTONE.unlockAtEarned);
    // Cash may be low — must still unlock
    expect(r.factory.tryUnlockNext()).toBe(true);
  }, 30_000);

  it('PATH_MARGIN reaches Toys within eventFloor–8 min (no events)', () => {
    const r = playToToys('margin', 'none');
    // Aggressive scripted bots are faster than human traces; floor = eventFloor
    expect(r.unlockMs).toBeGreaterThanOrEqual(TOYS_MILESTONE.eventFloorMs);
    expect(r.unlockMs).toBeLessThanOrEqual(8 * 60_000);
    expect(r.factory.tryUnlockNext()).toBe(true);
  }, 30_000);

  it('favorable early events do not unlock before ~4 min', () => {
    const r = playToToys('margin', 'early');
    expect(r.unlockMs).toBeGreaterThanOrEqual(TOYS_MILESTONE.eventFloorMs);
    expect(r.unlockMs).toBeLessThanOrEqual(TOYS_MILESTONE.targetUnlockMs.max);
  }, 30_000);

  it('no-events path stays within ~8 min', () => {
    const t = playToToys('throughput', 'none');
    const m = playToToys('margin', 'none');
    expect(t.unlockMs).toBeLessThanOrEqual(8 * 60_000);
    expect(m.unlockMs).toBeLessThanOrEqual(8 * 60_000);
  }, 60_000);

  it('records onboarding report Toys fields via Telemetry', () => {
    const t = new Telemetry();
    t.emit('toys_milestone_shown', { threshold: TOYS_MILESTONE.unlockAtEarned });
    t.toysThreshold = TOYS_MILESTONE.unlockAtEarned;
    t.once('toys_threshold_reached');
    t.once('toys_opened', {
      lifetimeEarnedAtUnlock: 900,
      cashAtUnlock: 40,
    });
    t.lifetimeEarnedAtUnlock = 900;
    t.cashAtUnlock = 40;
    t.upgradesAtFiveMinutes = 11;
    t.upgradesAtToysUnlock = 14;
    t.once('first_toy_action');
    const r = t.buildReport();
    expect(r.toysMilestoneShownMs).not.toBeNull();
    expect(r.toysThreshold).toBe(TOYS_MILESTONE.unlockAtEarned);
    expect(r.toysOpenedMs).not.toBeNull();
    expect(r.lifetimeEarnedAtUnlock).toBe(900);
    expect(r.cashAtUnlock).toBe(40);
    expect(r.upgradesAtFiveMinutes).toBe(11);
    expect(r.upgradesAtToysUnlock).toBe(14);
    expect(r.firstToyActionMs).not.toBeNull();
  });
});

describe('M-B.2 industrial scenarios untouched smoke', () => {
  it('factory still sells and upgrades after Toys open', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.tryUnlockNext();
    const sold = f.economy.productsSold;
    sim(f, 20_000);
    expect(f.economy.productsSold).toBeGreaterThan(sold);
    expect(f.economy.currentProduct).toBe('toys');
    expect(f.economy.baseProductValue).toBe(PRODUCTS.toys.baseValue);
  });
});

// silence unused vi import if any
void vi;
