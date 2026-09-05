import { describe, expect, it } from 'vitest';
import { Economy } from '../systems/Economy';
import { MAX_UPGRADE_LEVEL, UPGRADE_COSTS } from '../config/balance';

describe('Economy', () => {
  it('starts with configured coins', () => {
    const e = new Economy();
    expect(e.coins).toBe(0);
  });

  it('adds coins and tracks totals', () => {
    const e = new Economy();
    e.recordSale(10);
    expect(e.coins).toBe(10);
    expect(e.totalEarned).toBe(10);
    expect(e.productsSold).toBe(1);
  });

  it('refuses overspend', () => {
    const e = new Economy({ coins: 5 });
    expect(e.canAfford(10)).toBe(false);
    expect(e.spend(10)).toBe(false);
    expect(e.coins).toBe(5);
  });

  it('spends when affordable', () => {
    const e = new Economy({ coins: 50 });
    expect(e.spend(22)).toBe(true);
    expect(e.coins).toBe(28);
  });

  it('estimates income from recent window', () => {
    const e = new Economy();
    e.recordSale(20);
    e.update(1000);
    e.recordSale(20);
    expect(e.incomePerSecond).toBeGreaterThan(0);
  });
});

describe('Upgrade cost formula', () => {
  it('matches baseCost * growth^level', async () => {
    const { Upgrades } = await import('../systems/Upgrades');
    const { baseCost, growthFactor } = UPGRADE_COSTS.speed;
    for (let level = 0; level < 5; level++) {
      const expected = Math.floor(baseCost * Math.pow(growthFactor, level));
      expect(Upgrades.costAtLevel('speed', level)).toBe(expected);
    }
  });

  it('caps at max level', async () => {
    const { Upgrades } = await import('../systems/Upgrades');
    expect(Upgrades.costAtLevel('speed', MAX_UPGRADE_LEVEL)).toBe(Infinity);
  });
});
