/**
 * Diagnostic: bottleneck state before/after 2× Speed on M1 (M2 UI).
 * Run: npx vitest run src/systems/BottleneckDiag.test.ts
 */
import { describe, it } from 'vitest';
import { Factory } from './Factory';
import { METRICS } from '../config/balance';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    factory.update(dt);
    left -= dt;
  }
}

function snapshot(factory: Factory, label: string) {
  const clock = factory.line.clockMs;
  const machines = [0, 1, 2].map((id) => {
    const m = factory.machines[id]!;
    return {
      id,
      name: ['Procesado', 'Ensamblaje', 'Empaque'][id],
      processMs: m.processMs,
      ratePerMin: m.effectiveRatePerMin,
      state: m.state,
      util: Math.round(m.recentUtilization(METRICS.utilizationWindowMs, clock) * 1000) / 1000,
      blockedShare: Math.round(m.recentStateShare?.('BLOCKED', 15_000, clock) * 1000) / 1000,
      starvedShare: Math.round(m.recentStateShare?.('STARVED', 15_000, clock) * 1000) / 1000,
    };
  });
  const buffers = factory.buffers.map((b, i) => ({
    id: i,
    fill: `${b.length}/${b.capacity}`,
    fillRatio: Math.round(b.fillRatio * 100) / 100,
    wip: b.length,
  }));
  const bn = factory.line.getBottleneckId();
  return {
    label,
    throughput: Math.round(factory.getThroughputPerMin() * 10) / 10,
    wip: factory.getWip(),
    bottleneckId: bn,
    highlighted: factory.highlightedBottleneck,
    machines,
    buffers,
  };
}

describe('Bottleneck diagnostic (M-B Part 1)', () => {
  it.skip('prints pre/post 2× Speed on M1 state', () => {
    const factory = new Factory();
    // Warm line to steady-ish state
    simulate(factory, 35_000);
    const before = snapshot(factory, 'BEFORE upgrades');

    factory.economy.add(500);
    factory.buyUpgrade(1, 'speed');
    factory.buyUpgrade(1, 'speed');
    simulate(factory, 25_000); // settle rolling windows
    const after = snapshot(factory, 'AFTER 2× Speed M1 + 25s settle');

    // Also check immediately after upgrades with less settle
    const factory2 = new Factory();
    simulate(factory2, 35_000);
    factory2.economy.add(500);
    factory2.buyUpgrade(1, 'speed');
    factory2.buyUpgrade(1, 'speed');
    simulate(factory2, 5_000);
    const after5 = snapshot(factory2, 'AFTER 2× Speed + 5s');

    // One more Speed
    factory.economy.add(100);
    factory.buyUpgrade(1, 'speed');
    simulate(factory, 20_000);
    const after3 = snapshot(factory, 'AFTER 3× Speed M1');

    // Buffer on M0 instead of more speed
    const factory3 = new Factory();
    simulate(factory3, 35_000);
    factory3.economy.add(500);
    factory3.buyUpgrade(1, 'speed');
    factory3.buyUpgrade(1, 'speed');
    simulate(factory3, 15_000);
    factory3.buyUpgrade(0, 'buffer');
    simulate(factory3, 20_000);
    const afterBuf = snapshot(factory3, 'AFTER 2× Speed M1 + Buffer M0');

    // Value path income
    const factory4 = new Factory();
    simulate(factory4, 30_000);
    factory4.economy.add(500);
    factory4.buyUpgrade(1, 'speed');
    factory4.buyUpgrade(1, 'speed');
    simulate(factory4, 15_000);
    const incomeBefore = factory4.estimateIncomePerSecond();
    factory4.buyUpgrade(1, 'value');
    factory4.buyUpgrade(0, 'value');
    simulate(factory4, 15_000);
    const incomeAfter = factory4.estimateIncomePerSecond();

    // Stability sim: after 2 speed, track WIP/blocked over 20s
    const factory5 = new Factory();
    simulate(factory5, 35_000);
    factory5.economy.add(500);
    factory5.buyUpgrade(1, 'speed');
    factory5.buyUpgrade(1, 'speed');
    simulate(factory5, 10_000);
    const wipSamples: number[] = [];
    const blockedSamples: number[] = [];
    for (let i = 0; i < 40; i++) {
      simulate(factory5, 500);
      wipSamples.push(factory5.getWip());
      const m1 = factory5.machines[1]!;
      blockedSamples.push(
        m1.state === 'BLOCKED' ? 1 : factory5.machines[0]!.state === 'BLOCKED' ? 1 : 0,
      );
    }
    const avgWip = wipSamples.reduce((a, b) => a + b, 0) / wipSamples.length;
    const maxWip = Math.max(...wipSamples);
    const minWip = Math.min(...wipSamples);
    const blockedRate = blockedSamples.reduce((a, b) => a + b, 0) / blockedSamples.length;

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          before,
          after5,
          after,
          after3,
          afterBuf,
          income: { before: incomeBefore, after: incomeAfter },
          stability20s: { avgWip, maxWip, minWip, blockedRate, tp: factory5.getThroughputPerMin() },
        },
        null,
        2,
      ),
    );
  });
});
