import { describe, expect, it } from 'vitest';
import { ProductionLine } from './ProductionLine';
import { MACHINE_BASE } from '../config/balance';

function simulate(line: ProductionLine, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    line.update(dt);
    left -= dt;
  }
}

function setRates(line: ProductionLine, aPerMin: number, bPerMin: number, cPerMin: number): void {
  line.machines[0]!.processMs = 60_000 / aPerMin;
  line.machines[1]!.processMs = 60_000 / bPerMin;
  line.machines[2]!.processMs = 60_000 / cPerMin;
}

describe('Industrial simulation acceptance', () => {
  it('TEST 1 — bottleneck at B (~4/min) with queue before B and C waiting', () => {
    const line = new ProductionLine();
    setRates(line, 10, 4, 9);
    line.buffers[0]!.capacity = 12;
    line.buffers[1]!.capacity = 12;
    line.setSpawnIntervalMs(200);

    simulate(line, 60_000);

    const tp = line.getThroughputPerMin();
    expect(tp).toBeGreaterThan(2.5);
    expect(tp).toBeLessThan(5.5);
    expect(line.buffers[0]!.length).toBeGreaterThan(0);

    const utilB = line.machines[1]!.recentUtilization(15_000, line.clockMs);
    expect(utilB).toBeGreaterThan(0.5);

    const c = line.machines[2]!;
    expect(c.starvedTimeMs + c.idleTimeMs).toBeGreaterThan(0);
  });

  it('TEST 2 — upgrading C does little to throughput', () => {
    const base = new ProductionLine();
    setRates(base, 10, 4, 9);
    base.setSpawnIntervalMs(200);
    simulate(base, 45_000);
    const tpBase = base.getThroughputPerMin();

    const upgraded = new ProductionLine();
    setRates(upgraded, 10, 4, 9);
    upgraded.machines[2]!.processMs = 60_000 / 30;
    upgraded.setSpawnIntervalMs(200);
    simulate(upgraded, 45_000);
    const tpUp = upgraded.getThroughputPerMin();

    expect(Math.abs(tpUp - tpBase)).toBeLessThan(1.2);
  });

  it('TEST 3 — upgrading B clearly raises throughput', () => {
    const slowB = new ProductionLine();
    setRates(slowB, 10, 4, 9);
    slowB.setSpawnIntervalMs(200);
    simulate(slowB, 40_000);
    const tpSlow = slowB.getThroughputPerMin();
    const queueSlow = slowB.buffers[0]!.length;

    const fastB = new ProductionLine();
    setRates(fastB, 10, 8, 9);
    fastB.setSpawnIntervalMs(200);
    simulate(fastB, 40_000);
    const tpFast = fastB.getThroughputPerMin();
    const queueFast = fastB.buffers[0]!.length;

    expect(tpFast).toBeGreaterThan(tpSlow + 1.5);
    expect(queueFast).toBeLessThanOrEqual(queueSlow + 2);
  });

  it('TEST 4 — small buffer causes A to block; larger buffer raises WIP', () => {
    const tight = new ProductionLine();
    setRates(tight, 10, 4, 9);
    tight.buffers[0]!.capacity = 1;
    tight.setSpawnIntervalMs(100);
    simulate(tight, 40_000);
    expect(
      tight.machines[0]!.blockedTimeMs > 500 || tight.machines[0]!.state === 'BLOCKED',
    ).toBe(true);

    const wide = new ProductionLine();
    setRates(wide, 10, 4, 9);
    wide.buffers[0]!.capacity = 16;
    wide.setSpawnIntervalMs(100);
    simulate(wide, 40_000);
    expect(wide.getWip()).toBeGreaterThanOrEqual(tight.getWip());
  });

  it('TEST 5 — WIP matches physical count', () => {
    const line = new ProductionLine();
    setRates(line, 10, 4, 9);
    line.setSpawnIntervalMs(300);
    simulate(line, 20_000);

    let counted = 0;
    for (const m of line.machines) if (m.current) counted += 1;
    for (const b of line.buffers) counted += b.length;
    expect(line.getWip()).toBe(counted);
  });

  it('TEST 6 — utilization reacts to processing vs waiting', () => {
    const line = new ProductionLine();
    setRates(line, 10, 3, 12);
    line.setSpawnIntervalMs(200);
    simulate(line, 30_000);

    const utilB = line.machines[1]!.recentUtilization(15_000, line.clockMs);
    const utilC = line.machines[2]!.recentUtilization(15_000, line.clockMs);
    expect(utilB).toBeGreaterThan(utilC);
  });
});

describe('Default balance imbalance', () => {
  it('base process times keep B slower than A and C', () => {
    expect(MACHINE_BASE.processMs[1]).toBeGreaterThan(MACHINE_BASE.processMs[0]);
    expect(MACHINE_BASE.processMs[1]).toBeGreaterThan(MACHINE_BASE.processMs[2]);
  });
});
