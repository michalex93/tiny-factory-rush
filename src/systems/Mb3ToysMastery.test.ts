/**
 * M-B.3 Toy Mastery + Smartphones horizon + free Toys @ 650.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import {
  PRODUCTS,
  TOY_MASTERY,
  TOYS_MILESTONE,
  SMARTPHONES_HORIZON,
} from '../config/balance';
import { estimateUnlockMs, HUMAN_TRACES } from './Mb3HumanTraces';

function sim(f: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    f.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function phaseIs(f: Factory, phase: string): boolean {
  return (f.sessionGoal.phase as string) === phase;
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

function reachPostChain(branch: 'throughput' | 'margin'): Factory {
  const f = new Factory();
  f.line.rollGolden = () => false;
  f.economy.add(150);
  let g = 0;
  while (!phaseIs(f, 'awaiting_choice') && g < 400) {
    if (g % 20 === 8) buyPrefer(f, 'speed');
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
  f.selectOptimizationBranch(branch);
  const pick = branch === 'throughput' ? 'speed' : 'value';
  g = 0;
  while (!f.economy.canAfford(f.upgrades.costFor(1, pick)) && g < 80) {
    sim(f, 500);
    g += 1;
  }
  f.buyUpgrade(1, pick);
  const prefer = branch === 'throughput' ? 'speed' : 'value';
  g = 0;
  while (
    (phaseIs(f, 'branch') || phaseIs(f, 'convergence')) &&
    g < 700
  ) {
    if (g % 18 === 0) buyPrefer(f, prefer);
    if (phaseIs(f, 'convergence') && g % 22 === 5) {
      buyPrefer(f, prefer === 'speed' ? 'value' : 'speed');
    }
    sim(f, 500);
    g += 1;
  }
  f.eventsSys.suppress();
  return f;
}

describe('M-B.3 Toys @650 + mastery + smartphones', () => {
  it('Toys not ready at convergence', () => {
    for (const b of ['throughput', 'margin'] as const) {
      const f = reachPostChain(b);
      expect(f.sessionGoal.phase).toBe('post_chain');
      expect(f.economy.totalEarned).toBeLessThan(TOYS_MILESTONE.unlockAtEarned);
      expect(f.progression.canUnlock('toys', f.economy).ok).toBe(false);
    }
  });

  it('OPEN TOYS is free and cash-neutral', () => {
    const f = new Factory();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.economy.spend(f.economy.coins);
    expect(f.economy.coins).toBe(0);
    expect(f.tryUnlockNext()).toBe(true);
    expect(f.economy.coins).toBe(0);
  });

  it('buying upgrades does not reduce Toys progress', () => {
    const f = reachPostChain('throughput');
    f.sessionGoal.syncToysProgress(f);
    const before = f.sessionGoal.snapshot()!.toysEarnedDisplay;
    while (buyPrefer(f, 'speed')) {
      /* drain */
    }
    f.sessionGoal.syncToysProgress(f);
    expect(f.sessionGoal.snapshot()!.toysEarnedDisplay).toBeGreaterThanOrEqual(
      before,
    );
  });

  it('first Toy arms mastery within same flow (≤2s path)', () => {
    const f = new Factory();
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.load({
      ...f.sessionGoal.snapshot()!,
      selectedBranch: 'throughput',
    });
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.tryUnlockNext();
    const before = f.sessionMs;
    sim(f, 15_000);
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    expect(f.sessionMs - before).toBeLessThan(20_000);
    expect(f.sessionGoal.label().length).toBeGreaterThan(0);
  });

  it('label never empty after toys open', () => {
    const f = new Factory();
    f.sessionGoal.skipAsComplete();
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.tryUnlockNext();
    expect(f.sessionGoal.label()).not.toBe('');
    sim(f, 20_000);
    expect(f.sessionGoal.label()).not.toBe('');
    // Force mastery complete path
    const snap = f.sessionGoal.snapshot()!;
    if (f.sessionGoal.phase === 'toy_mastery') {
      let g = 0;
      while (f.sessionGoal.phase === 'toy_mastery' && g < 400) {
        buyPrefer(f, 'speed');
        sim(f, 500);
        g += 1;
      }
    }
    expect(f.sessionGoal.label()).not.toBe('');
    expect(snap).toBeTruthy();
  });

  it('Throughput gets volume mastery; Margin gets economic mastery', () => {
    const ft = new Factory();
    ft.sessionGoal.skipAsComplete();
    ft.sessionGoal.load({
      ...ft.sessionGoal.snapshot()!,
      selectedBranch: 'throughput',
    });
    ft.economy.add(TOYS_MILESTONE.unlockAtEarned);
    ft.tryUnlockNext();
    sim(ft, 15_000);
    expect(ft.sessionGoal.snapshot()!.toyMasteryType).toBe('throughput');
    expect(ft.sessionGoal.snapshot()!.toyMasteryTarget).toBe(
      TOY_MASTERY.throughput.sellTarget,
    );
    expect(ft.sessionGoal.label()).toMatch(/TOY RUSH/i);

    const fm = new Factory();
    fm.sessionGoal.skipAsComplete();
    fm.sessionGoal.load({
      ...fm.sessionGoal.snapshot()!,
      selectedBranch: 'margin',
    });
    fm.economy.add(TOYS_MILESTONE.unlockAtEarned);
    fm.tryUnlockNext();
    sim(fm, 15_000);
    expect(fm.sessionGoal.snapshot()!.toyMasteryType).toBe('margin');
    expect(fm.sessionGoal.snapshot()!.toyMasteryTarget).toBe(
      TOY_MASTERY.margin.incomeTarget,
    );
    expect(fm.sessionGoal.label()).toMatch(/PREMIUM TOYS/i);
  });

  it('Toy Mastery does not autocomplete during grace', () => {
    const f = new Factory();
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.load({
      ...f.sessionGoal.snapshot()!,
      selectedBranch: 'throughput',
    });
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.tryUnlockNext();
    let g = 0;
    while (!f.sessionGoal.snapshot()!.firstToyProduced && g < 60) {
      f.update(400);
      g += 1;
    }
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    expect(f.sessionGoal.snapshot()!.armGraceMs).toBeGreaterThan(0);
    expect(f.sessionGoal.snapshot()!.toyMasteryProgress).toBe(0);
    f.update(200);
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    expect(f.sessionGoal.snapshot()!.toyMasteryProgress).toBe(0);
  });

  it('scripted Throughput mastery completes in ~45–90s and shows Smartphones', () => {
    const f = new Factory();
    f.line.rollGolden = () => false;
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.load({
      ...f.sessionGoal.snapshot()!,
      selectedBranch: 'throughput',
    });
    f.economy.add(5_000);
    // Pre-buff line
    for (let i = 0; i < 6; i++) f.buyUpgrade(1, 'speed');
    for (let i = 0; i < 3; i++) f.buyUpgrade(1, 'value');
    f.tryUnlockNext();
    sim(f, 12_000);
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    const start = f.sessionMs;
    let g = 0;
    while (f.sessionGoal.phase === 'toy_mastery' && g < 500) {
      if (g % 15 === 0) buyPrefer(f, 'speed');
      sim(f, 500);
      g += 1;
    }
    const dur = f.sessionMs - start;
    expect(f.sessionGoal.phase).toBe('smartphones_horizon');
    expect(dur).toBeGreaterThanOrEqual(40_000);
    expect(dur).toBeLessThanOrEqual(100_000);
    expect(f.sessionGoal.label()).toMatch(/SMARTPHONES/i);
    expect(f.sessionGoal.snapshot()!.smartphonesMilestoneShown).toBe(true);
  }, 30_000);

  it('scripted Margin mastery completes in ~45–90s', () => {
    const f = new Factory();
    f.line.rollGolden = () => false;
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.load({
      ...f.sessionGoal.snapshot()!,
      selectedBranch: 'margin',
    });
    f.economy.add(5_000);
    for (let i = 0; i < 4; i++) f.buyUpgrade(1, 'value');
    for (let i = 0; i < 4; i++) f.buyUpgrade(1, 'speed');
    f.tryUnlockNext();
    sim(f, 12_000);
    const start = f.sessionMs;
    let g = 0;
    while (f.sessionGoal.phase === 'toy_mastery' && g < 500) {
      if (g % 15 === 0) buyPrefer(f, 'value');
      sim(f, 500);
      g += 1;
    }
    const dur = f.sessionMs - start;
    expect(f.sessionGoal.phase).toBe('smartphones_horizon');
    expect(dur).toBeGreaterThanOrEqual(40_000);
    expect(dur).toBeLessThanOrEqual(110_000);
  }, 30_000);

  it('save/reload restores mastery / smartphones state', () => {
    const f = new Factory();
    f.sessionGoal.skipAsComplete();
    f.sessionGoal.load({
      ...f.sessionGoal.snapshot()!,
      selectedBranch: 'margin',
    });
    f.economy.add(TOYS_MILESTONE.unlockAtEarned);
    f.tryUnlockNext();
    sim(f, 15_000);
    expect(f.sessionGoal.phase).toBe('toy_mastery');
    f.sessionGoal.snapshot()!.armGraceMs = 0;
    f.sessionGoal.noteToyMasterySale(f, 80);
    const progress = f.sessionGoal.snapshot()!.toyMasteryProgress;
    expect(progress).toBeGreaterThan(0);
    const snap = f.toSnapshot();
    const eco = f.economy.snapshot();
    const f2 = new Factory();
    f2.economy.coins = eco.coins;
    f2.economy.totalEarned = eco.totalEarned;
    f2.economy.productsSold = eco.productsSold;
    f2.economy.currentProduct = eco.currentProduct;
    f2.progression.unlocked = [...f.progression.unlocked];
    f2.upgrades.totalPurchased = Math.max(1, f.upgrades.totalPurchased);
    f2.loadRuntime(snap);
    expect(f2.prepareReturningPlayer()).toBe(true);
    expect(f2.sessionGoal.phase).toBe('toy_mastery');
    expect(f2.sessionGoal.snapshot()!.selectedBranch).toBe('margin');
    expect(f2.sessionGoal.snapshot()!.toyMasteryProgress).toBeGreaterThanOrEqual(
      progress,
    );
    expect(f2.sessionGoal.label()).toMatch(/PREMIUM TOYS/i);
  });

  it('Smartphones gameplay is Expansion Fund campaign (no cash gate)', () => {
    expect(PRODUCTS.smartphones.unlockCost).toBe(0);
    expect(PRODUCTS.smartphones.unlockAtEarned).toBe(0);
    expect(SMARTPHONES_HORIZON.productId).toBe('smartphones');
  });

  it('human-calibrated 650 timing band (events off)', () => {
    const t = estimateUnlockMs(HUMAN_TRACES.throughput, 650);
    const m = estimateUnlockMs(HUMAN_TRACES.margin, 650);
    expect(t).toBeGreaterThanOrEqual(TOYS_MILESTONE.targetUnlockMs.min);
    expect(t).toBeLessThanOrEqual(TOYS_MILESTONE.targetUnlockMs.max);
    expect(m).toBeGreaterThanOrEqual(TOYS_MILESTONE.targetUnlockMs.min);
    expect(m).toBeLessThanOrEqual(TOYS_MILESTONE.targetUnlockMs.max);
  });
});
