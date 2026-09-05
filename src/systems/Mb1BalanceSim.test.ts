/**
 * M-B.1 baseline sims after stage1 (2× Speed on M1).
 * Run: npx vitest run src/systems/Mb1BalanceSim.test.ts
 */
import { describe, it } from 'vitest';
import { Factory } from './Factory';

function sim(f: Factory, ms: number, step = 50) {
  let left = ms;
  while (left > 0) {
    f.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function reachStage1(): Factory {
  const f = new Factory();
  f.economy.add(500);
  // warm then buy 2 speed like scripted path
  sim(f, 20_000);
  f.buyUpgrade(1, 'speed');
  sim(f, 12_000);
  f.buyUpgrade(1, 'speed');
  let g = 0;
  while (f.getThroughputPerMin() < 28 && g < 120) {
    sim(f, 500);
    g++;
  }
  sim(f, 3_000);
  return f;
}

function sample(f: Factory, ms: number) {
  const tps: number[] = [];
  const inc: number[] = [];
  const wip: number[] = [];
  const blk: number[] = [];
  let left = ms;
  while (left > 0) {
    f.update(500);
    left -= 500;
    tps.push(f.getThroughputPerMin());
    inc.push(f.lineIncomePerMin());
    wip.push(f.getWip());
    blk.push(f.machines[0]!.recentStateShare('BLOCKED', 10_000, f.line.clockMs));
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    avgTp: avg(tps),
    minTp: Math.min(...tps),
    avgInc: avg(inc),
    minInc: Math.min(...inc),
    avgWip: avg(wip),
    maxWip: Math.max(...wip),
    avgBlk: avg(blk),
    bn: f.line.getBottleneckId(),
    coins: f.economy.coins,
  };
}

describe('M-B.1 balance sim', () => {
  it.skip('prints path baselines', () => {
    const base = reachStage1();
    const baseline = {
      tp: base.getThroughputPerMin(),
      inc: base.lineIncomePerMin(),
      wip: base.getWip(),
      blk: base.machines[0]!.recentStateShare('BLOCKED', 10_000, base.line.clockMs),
      bn: base.line.getBottleneckId(),
      up: base.upgrades.totalPurchased,
      costSpeed: base.upgrades.costFor(1, 'speed'),
      costVal: base.upgrades.costFor(1, 'value'),
    };

    // Throughput path: +1 speed then sample 40s
    const t = reachStage1();
    t.economy.add(200);
    const beforeT = { tp: t.getThroughputPerMin(), inc: t.lineIncomePerMin(), wip: t.getWip() };
    t.buyUpgrade(1, 'speed');
    sim(t, 5_000);
    const afterBuyT = { tp: t.getThroughputPerMin(), inc: t.lineIncomePerMin(), wip: t.getWip() };
    const holdT = sample(t, 40_000);

    // Margin path: +1 value
    const m = reachStage1();
    m.economy.add(200);
    const beforeM = { tp: m.getThroughputPerMin(), inc: m.lineIncomePerMin(), wip: m.getWip() };
    m.buyUpgrade(1, 'value');
    sim(m, 5_000);
    const afterBuyM = { tp: m.getThroughputPerMin(), inc: m.lineIncomePerMin(), wip: m.getWip() };
    const holdM = sample(m, 40_000);

    // Throughput then need value for convergence
    const tc = reachStage1();
    tc.economy.add(2000);
    tc.buyUpgrade(1, 'speed');
    sim(tc, 20_000);
    tc.buyUpgrade(1, 'value');
    tc.buyUpgrade(1, 'value');
    sim(tc, 25_000);
    const convT = sample(tc, 25_000);

    // Margin then need speed
    const mc = reachStage1();
    mc.economy.add(2000);
    mc.buyUpgrade(1, 'value');
    sim(mc, 20_000);
    mc.buyUpgrade(1, 'speed');
    mc.buyUpgrade(1, 'speed');
    sim(mc, 25_000);
    const convM = sample(mc, 25_000);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          baseline,
          throughput: { beforeT, afterBuyT, holdT },
          margin: { beforeM, afterBuyM, holdM },
          convFromThroughput: convT,
          convFromMargin: convM,
        },
        null,
        2,
      ),
    );
  });
});
