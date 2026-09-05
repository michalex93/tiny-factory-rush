import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { buildOptimizationChoices } from './SessionGoal';
import { OPTIMIZATION_CHAIN } from '../config/balance';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    factory.update(dt);
    left -= dt;
  }
}

function reachStage1Complete(factory: Factory): void {
  factory.economy.add(5_000);
  simulate(factory, 15_000);
  factory.buyUpgrade(1, 'speed');
  simulate(factory, 10_000);
  factory.buyUpgrade(1, 'speed');
  let g = 0;
  while (
    factory.sessionGoal.phase !== 'awaiting_choice' &&
    g < 200
  ) {
    simulate(factory, 500);
    g += 1;
  }
}

describe('M-B.1 decision state machine', () => {
  it('stage 2 does not progress before choosing', () => {
    const f = new Factory();
    reachStage1Complete(f);
    expect(f.sessionGoal.phase).toBe('awaiting_choice');
    const holdBefore = f.sessionGoal.snapshot()!.holdProgressMs;
    simulate(f, 20_000);
    expect(f.sessionGoal.phase).toBe('awaiting_choice');
    expect(f.sessionGoal.snapshot()!.holdProgressMs).toBe(holdBefore);
    expect(f.sessionGoal.snapshot()!.completedStages).not.toContain(
      'branch_throughput',
    );
  });

  it('select without purchase does not arm stage', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('throughput');
    expect(f.sessionGoal.phase).toBe('awaiting_purchase');
    simulate(f, 25_000);
    expect(f.sessionGoal.phase).toBe('awaiting_purchase');
    expect(f.sessionGoal.snapshot()!.purchaseDone).toBe(false);
  });

  it('buying correct option arms stage from zero hold', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('throughput');
    // Inherited conditions would have completed old stage2 — must not
    simulate(f, 5_000);
    expect(f.buyUpgrade(1, 'speed')).toBe(true);
    expect(f.sessionGoal.phase).toBe('branch');
    expect(f.sessionGoal.snapshot()!.holdProgressMs).toBe(0);
    expect(f.sessionGoal.snapshot()!.armGraceMs).toBeGreaterThan(0);
    expect(f.sessionGoal.snapshot()!.baseline).not.toBeNull();
  });

  it('hold ignores conditions during arm grace (no same-tick complete)', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('throughput');
    f.economy.add(500);
    f.buyUpgrade(1, 'speed');
    // One tick during grace
    f.update(50);
    expect(f.sessionGoal.phase).toBe('branch');
    expect(
      f.sessionGoal.snapshot()!.completedStages.includes('branch_throughput'),
    ).toBe(false);
  });
});

describe('M-B.1 PATH_THROUGHPUT / PATH_MARGIN', () => {
  it('throughput branch completes its own goal', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('throughput');
    f.economy.add(2_000);
    expect(f.buyUpgrade(1, 'speed')).toBe(true);
    // May need another speed for lift
    let guard = 0;
    while (f.sessionGoal.phase === 'branch' && guard < 300) {
      if (f.economy.coins >= f.upgrades.costFor(1, 'speed') && guard % 40 === 20) {
        f.buyUpgrade(1, 'speed');
      }
      simulate(f, 500);
      guard += 1;
    }
    expect(
      f.sessionGoal.snapshot()!.completedStages.includes('branch_throughput') ||
        f.sessionGoal.phase === 'convergence' ||
        f.sessionGoal.phase === 'post_chain',
    ).toBe(true);
  });

  it('margin branch completes its own goal', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('margin');
    f.economy.add(2_000);
    expect(f.buyUpgrade(1, 'value')).toBe(true);
    let guard = 0;
    while (f.sessionGoal.phase === 'branch' && guard < 300) {
      if (f.economy.coins >= f.upgrades.costFor(1, 'value') && guard % 50 === 25) {
        f.buyUpgrade(1, 'value');
      }
      simulate(f, 500);
      guard += 1;
    }
    expect(
      f.sessionGoal.snapshot()!.completedStages.includes('branch_margin') ||
        f.sessionGoal.phase === 'convergence' ||
        f.sessionGoal.phase === 'post_chain',
    ).toBe(true);
  });

  it('both routes viable with distinct consequences', () => {
    const mk = (branch: 'throughput' | 'margin') => {
      const f = new Factory();
      reachStage1Complete(f);
      f.selectOptimizationBranch(branch);
      f.economy.add(3_000);
      if (branch === 'throughput') f.buyUpgrade(1, 'speed');
      else f.buyUpgrade(1, 'value');
      simulate(f, 8_000);
      return {
        tp: f.getThroughputPerMin(),
        income: f.lineIncomePerMin(),
        speedLv: f.upgrades.getLevel(1, 'speed'),
        valueLv: f.upgrades.getLevel(1, 'value'),
        branch: f.sessionGoal.selectedBranch,
      };
    };
    const a = mk('throughput');
    const b = mk('margin');
    expect(a.branch).toBe('throughput');
    expect(b.branch).toBe('margin');
    expect(a.speedLv).toBeGreaterThan(b.speedLv);
    expect(b.valueLv).toBeGreaterThan(a.valueLv);
  });

  it('convergence works from both routes and does not autocompletes', () => {
    const run = (branch: 'throughput' | 'margin') => {
      const f = new Factory();
      reachStage1Complete(f);
      f.selectOptimizationBranch(branch);
      f.economy.add(20_000);
      if (branch === 'throughput') f.buyUpgrade(1, 'speed');
      else f.buyUpgrade(1, 'value');

      let g = 0;
      while (f.sessionGoal.phase === 'branch' && g < 400) {
        if (branch === 'throughput' && g % 30 === 0) f.buyUpgrade(1, 'speed');
        if (branch === 'margin' && g % 30 === 0) f.buyUpgrade(1, 'value');
        simulate(f, 500);
        g += 1;
      }
      expect(f.sessionGoal.phase).toBe('convergence');
      // Grace + no purchases yet → should not complete instantly
      simulate(f, OPTIMIZATION_CHAIN.armGraceMs + 500);
      expect(f.sessionGoal.phase).toBe('convergence');

      // Need complementary upgrades + hold
      if (branch === 'throughput') {
        f.buyUpgrade(1, 'value');
        f.buyUpgrade(1, 'value');
      } else {
        f.buyUpgrade(1, 'speed');
        f.buyUpgrade(1, 'speed');
      }
      let h = 0;
      while (f.sessionGoal.phase === 'convergence' && h < 200) {
        simulate(f, 500);
        h += 1;
      }
      expect(['post_chain', 'complete']).toContain(f.sessionGoal.phase);
      return f;
    };
    const ft = run('throughput');
    const fm = run('margin');
    expect(ft.sessionGoal.snapshot()!.nextMilestoneShown).toBe(true);
    expect(fm.sessionGoal.snapshot()!.nextMilestoneShown).toBe(true);
  });
});

describe('M-B.1 economy metric + save + choice UI', () => {
  it('HUD getter matches SessionGoal LINE INCOME/MIN', () => {
    const f = new Factory();
    simulate(f, 20_000);
    f.economy.add(100);
    f.buyUpgrade(1, 'value');
    simulate(f, 5_000);
    const a = f.lineIncomePerMin();
    const b = f.estimateIncomePerSecond() * 60;
    expect(a).toBeCloseTo(b, 5);
  });

  it('offers Speed vs Value — not Buffer', () => {
    const f = new Factory();
    reachStage1Complete(f);
    const opts = buildOptimizationChoices(f);
    expect(opts.map((o) => o.id).sort()).toEqual(['margin', 'throughput']);
    expect(opts.every((o) => o.type !== 'buffer')).toBe(true);
  });

  it('save/load preserves branch and phase', () => {
    const f = new Factory();
    reachStage1Complete(f);
    f.selectOptimizationBranch('margin');
    f.economy.add(500);
    f.buyUpgrade(1, 'value');
    expect(f.sessionGoal.phase).toBe('branch');
    const snap = f.toSnapshot();
    const loaded = new Factory();
    loaded.upgrades.levels = structuredClone(f.upgrades.levels);
    loaded.upgrades.totalPurchased = f.upgrades.totalPurchased;
    loaded.economy.coins = f.economy.coins;
    loaded.loadRuntime(snap);
    expect(loaded.sessionGoal.phase).toBe('branch');
    expect(loaded.sessionGoal.selectedBranch).toBe('margin');
    expect(loaded.sessionGoal.snapshot()!.baseline).not.toBeNull();
  });

  it('returning player recovers coherent post-chain state', () => {
    const f = new Factory();
    f.economy.add(100);
    f.buyUpgrade(1, 'speed');
    expect(f.prepareReturningPlayer()).toBe(true);
    expect(f.sessionGoal.phase).toBe('post_chain');
    expect(f.sessionGoal.status).toBe('chain_complete');
    expect(f.eventsSys.suppressed).toBe(false);
  });

  it('next milestone label appears on chain complete', () => {
    const f = new Factory();
    f.sessionGoal.skipAsComplete();
    f.economy.add(100);
    f.sessionGoal.syncToysProgress(f);
    expect(f.sessionGoal.label()).toMatch(/TOYS/i);
    expect(f.sessionGoal.label()).toMatch(/EARNED/i);
    expect(f.sessionGoal.label()).not.toMatch(/pay \$/i);
  });
});
