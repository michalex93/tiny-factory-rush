/**
 * Extra sims for stage 2/3 threshold discovery.
 */
import { describe, it } from 'vitest';
import { Factory } from './Factory';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    factory.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function sampleLine(factory: Factory, durationMs: number, step = 500) {
  const wip: number[] = [];
  const tp: number[] = [];
  const m0Blocked: number[] = [];
  const m1Util: number[] = [];
  const buf0: number[] = [];
  let left = durationMs;
  while (left > 0) {
    factory.update(step);
    left -= step;
    const clock = factory.line.clockMs;
    wip.push(factory.getWip());
    tp.push(factory.getThroughputPerMin());
    m0Blocked.push(factory.machines[0]!.recentStateShare('BLOCKED', 10_000, clock));
    m1Util.push(factory.machines[1]!.recentUtilization(10_000, clock));
    buf0.push(factory.buffers[0]!.fillRatio);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    avgWip: avg(wip),
    maxWip: Math.max(...wip),
    minWip: Math.min(...wip),
    avgTp: avg(tp),
    minTp: Math.min(...tp),
    avgM0Blocked: avg(m0Blocked),
    maxM0Blocked: Math.max(...m0Blocked),
    avgM1Util: avg(m1Util),
    avgBuf0: avg(buf0),
    incomePerMin: factory.estimateIncomePerSecond() * 60,
  };
}

describe('Stage threshold discovery', () => {
  it.skip('compares paths after stage1', () => {
    const base = () => {
      const f = new Factory();
      simulate(f, 35_000);
      f.economy.add(1000);
      f.buyUpgrade(1, 'speed');
      f.buyUpgrade(1, 'speed');
      simulate(f, 12_000);
      return f;
    };

    const s0 = sampleLine(base(), 20_000);

    const moreSpeed = base();
    moreSpeed.buyUpgrade(1, 'speed');
    moreSpeed.buyUpgrade(1, 'speed');
    simulate(moreSpeed, 8_000);
    const sSpeed = sampleLine(moreSpeed, 20_000);

    const buf = base();
    buf.buyUpgrade(0, 'buffer');
    buf.buyUpgrade(0, 'buffer');
    simulate(buf, 8_000);
    const sBuf = sampleLine(buf, 20_000);

    const val = base();
    val.buyUpgrade(1, 'value');
    val.buyUpgrade(0, 'value');
    val.buyUpgrade(2, 'value');
    simulate(val, 8_000);
    const sVal = sampleLine(val, 20_000);

    const mixed = base();
    mixed.buyUpgrade(1, 'speed');
    mixed.buyUpgrade(0, 'buffer');
    simulate(mixed, 8_000);
    const sMix = sampleLine(mixed, 20_000);

    const incomeSpeed = base();
    incomeSpeed.buyUpgrade(1, 'speed');
    incomeSpeed.buyUpgrade(1, 'speed');
    simulate(incomeSpeed, 15_000);
    const iSp = sampleLine(incomeSpeed, 10_000);

    const incomeVal = base();
    incomeVal.buyUpgrade(1, 'value');
    incomeVal.buyUpgrade(1, 'value');
    incomeVal.buyUpgrade(0, 'value');
    simulate(incomeVal, 15_000);
    const iVal = sampleLine(incomeVal, 10_000);

    const incomeMix = base();
    incomeMix.buyUpgrade(0, 'buffer');
    incomeMix.buyUpgrade(1, 'value');
    incomeMix.buyUpgrade(2, 'value');
    simulate(incomeMix, 15_000);
    const iMix = sampleLine(incomeMix, 10_000);

    const rich = base();
    rich.buyUpgrade(1, 'value');
    rich.buyUpgrade(1, 'value');
    rich.buyUpgrade(0, 'value');
    rich.buyUpgrade(2, 'value');
    rich.buyUpgrade(1, 'speed');
    simulate(rich, 12_000);
    const iRich = sampleLine(rich, 10_000);

    const fatVal = base();
    for (let i = 0; i < 5; i++) fatVal.buyUpgrade(1, 'value');
    simulate(fatVal, 12_000);
    const iFat = sampleLine(fatVal, 10_000);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        { s0, sSpeed, sBuf, sVal, sMix, iSp, iVal, iMix, iRich, iFat },
        null,
        2,
      ),
    );
  });
});
