import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { Economy } from './Economy';
import { Upgrades } from './Upgrades';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    factory.update(dt);
    left -= dt;
  }
}

describe('Factory progression', () => {
  it('produces and sells over time', () => {
    const factory = new Factory();
    simulate(factory, 25_000);
    expect(factory.economy.productsSold).toBeGreaterThan(0);
    expect(factory.economy.coins).toBeGreaterThan(0);
  });

  it('can afford first speed upgrade within ~25s', () => {
    const factory = new Factory();
    simulate(factory, 25_000);
    const cost = factory.upgrades.costFor(0, 'speed');
    expect(factory.economy.coins).toBeGreaterThanOrEqual(cost);
  });

  it('speed on bottleneck beats speed on non-bottleneck', () => {
    const bad = new Factory(new Economy({ coins: 10_000 }), new Upgrades());
    const good = new Factory(new Economy({ coins: 10_000 }), new Upgrades());

    // Purchase several C speed upgrades vs B speed upgrades
    for (let n = 0; n < 4; n++) {
      bad.buyUpgrade(2, 'speed');
      good.buyUpgrade(1, 'speed');
    }

    simulate(bad, 40_000);
    simulate(good, 40_000);

    expect(good.getThroughputPerMin()).toBeGreaterThan(bad.getThroughputPerMin());
  });

  it('click boost advances processing machine', () => {
    const factory = new Factory();
    simulate(factory, 5000);
    const m = factory.machines[0]!;
    if (!m.current) simulate(factory, 5000);
    expect(m.current).not.toBeNull();
    const before = m.progress;
    expect(factory.clickMachine(0)).toBe(true);
    expect(m.progress).toBeGreaterThan(before);
  });
});
