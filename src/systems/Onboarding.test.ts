import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { SessionGoal } from './SessionGoal';
import { Telemetry } from './Telemetry';
import { REVEAL, SESSION_GOAL } from '../config/balance';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    factory.update(dt);
    left -= dt;
  }
}

describe('First-session industrial hook', () => {
  it('first sale normally before 25s', () => {
    const factory = new Factory();
    simulate(factory, 25_000);
    expect(factory.economy.productsSold).toBeGreaterThan(0);
  });

  it('first upgrade affordable before ~60s', () => {
    const factory = new Factory();
    simulate(factory, 55_000);
    const cost = factory.upgrades.costFor(factory.suggestedUpgradeMachine(), 'speed');
    expect(factory.economy.coins).toBeGreaterThanOrEqual(cost);
  });

  it('upgrade panel reveal stays hidden until first sale', () => {
    const factory = new Factory();
    expect(factory.revealUpgrades()).toBe(false);
    simulate(factory, 3_000);
    // May or may not have sold yet; force check at 0 sales
    if (factory.economy.productsSold === 0) {
      expect(factory.revealUpgrades()).toBe(false);
    }
    simulate(factory, 30_000);
    expect(factory.economy.productsSold).toBeGreaterThanOrEqual(REVEAL.upgradesAfterSales);
    expect(factory.revealUpgrades()).toBe(true);
    expect(factory.revealMetrics()).toBe(false);
  });

  it('metrics reveal after first upgrade', () => {
    const factory = new Factory();
    simulate(factory, 40_000);
    const mid = factory.suggestedUpgradeMachine();
    const cost = factory.upgrades.costFor(mid, 'speed');
    // Grant coins if needed
    if (factory.economy.coins < cost) {
      factory.economy.add(cost - factory.economy.coins);
    }
    expect(factory.buyUpgrade(mid, 'speed')).toBe(true);
    expect(factory.revealMetrics()).toBe(true);
    expect(factory.revealFullUpgradeGrid()).toBe(false);
  });

  it('bottleneck is announced and highlightable', () => {
    const factory = new Factory();
    let shown: number | null = null;
    factory.events.onBottleneckShown = (id) => {
      shown = id;
    };
    simulate(factory, 45_000);
    expect(factory.highlightedBottleneck).not.toBeNull();
    expect(shown).not.toBeNull();
  });

  it('speed on bottleneck raises throughput (resolution signal)', () => {
    const factory = new Factory();
    simulate(factory, 30_000);
    const before = factory.getThroughputPerMin();
    factory.economy.add(500);
    // Upgrade M1 (index 1) — default bottleneck
    expect(factory.buyUpgrade(1, 'speed')).toBe(true);
    simulate(factory, 25_000);
    expect(factory.getThroughputPerMin()).toBeGreaterThan(before);
  });
});

describe('SessionGoal', () => {
  it('starts after first upgrade and completes on throughput', () => {
    const factory = new Factory();
    factory.economy.add(10_000);
    for (let i = 0; i < 4; i++) factory.buyUpgrade(1, 'speed');
    simulate(factory, 5_000);
    expect(
      factory.sessionGoal.isActive ||
        factory.sessionGoal.phase === 'awaiting_choice' ||
        factory.sessionGoal.status === 'awaiting_choice',
    ).toBe(true);
    simulate(factory, 40_000);
    expect(factory.getThroughputPerMin()).toBeGreaterThanOrEqual(
      SESSION_GOAL.targetThroughputPerMin * 0.9,
    );
  });

  it('tryStart only once', () => {
    const goal = new SessionGoal();
    const factory = new Factory();
    expect(goal.tryStart(factory, 1)).toBe(true);
    expect(goal.tryStart(factory, 1)).toBe(false);
  });

  it('fail path when time limit exceeded with low throughput', () => {
    const goal = new SessionGoal();
    const factory = new Factory();
    goal.tryStart(factory, 1);
    factory.sessionMs = SESSION_GOAL.timeLimitMs + 1;
    goal.tickHold(factory, 50);
    expect(goal.status).toBe('failed');
  });
});

describe('Telemetry', () => {
  it('fires first_* events only once', () => {
    const t = new Telemetry();
    expect(t.once('first_input')).toBe(true);
    expect(t.once('first_input')).toBe(false);
    expect(t.has('first_input')).toBe(true);
    t.emit('confusion_signal', { reason: 'test' });
    t.emit('confusion_signal', { reason: 'test2' });
    expect(t.events.filter((e) => e.name === 'confusion_signal').length).toBe(2);
  });
});

describe('Returning save restore', () => {
  it('prepareReturningPlayer skips teaching spam', () => {
    const factory = new Factory();
    factory.economy.add(100);
    factory.buyUpgrade(1, 'speed');
    expect(factory.prepareReturningPlayer()).toBe(true);
    expect(factory.sessionGoal.status).toBe('chain_complete');
    expect(factory.revealUpgrades()).toBe(true);
    expect(factory.revealMetrics()).toBe(true);
    expect(factory.eventsSys.suppressed).toBe(false);
  });

  it('new game is not a returning player', () => {
    const factory = new Factory();
    expect(factory.prepareReturningPlayer()).toBe(false);
    expect(factory.sessionGoal.status).toBe('idle');
    expect(factory.eventsSys.suppressed).toBe(true);
  });
});
