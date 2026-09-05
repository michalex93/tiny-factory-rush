/**
 * M-B.2 Toys threshold search.
 * Run: npx vitest run src/systems/Mb2ToysSim.test.ts
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

function buyAffordable(f: Factory, prefer: 'speed' | 'value') {
  const order =
    prefer === 'speed'
      ? (['speed', 'value', 'buffer'] as const)
      : (['value', 'speed', 'buffer'] as const);
  for (const type of order) {
    for (const m of [1, 0, 2] as const) {
      if (type === 'buffer' && m === 2) continue;
      const cost = f.upgrades.costFor(m, type);
      if (f.economy.canAfford(cost)) {
        f.buyUpgrade(m, type);
        return true;
      }
    }
  }
  return false;
}

function phaseIs(f: Factory, phase: string): boolean {
  return f.sessionGoal.phase === phase;
}

function runPathWithSeries(
  branch: 'throughput' | 'margin',
  mode: 'none' | 'typical' | 'early',
  maxMs = 9 * 60_000,
) {
  const f = new Factory();
  f.line.rollGolden = () => false;

  f.economy.add(80);
  let g = 0;
  while (!phaseIs(f, 'awaiting_choice') && g < 400) {
    if (g % 25 === 10) buyAffordable(f, 'speed');
    sim(f, 500);
    g += 1;
  }
  if (!phaseIs(f, 'awaiting_choice')) {
    f.economy.add(500);
    while (f.upgrades.getLevel(1, 'speed') < 2) f.buyUpgrade(1, 'speed');
    g = 0;
    while (!phaseIs(f, 'awaiting_choice') && g < 200) {
      sim(f, 500);
      g += 1;
    }
  }

  f.selectOptimizationBranch(branch);
  g = 0;
  while (
    !f.economy.canAfford(
      f.upgrades.costFor(1, branch === 'throughput' ? 'speed' : 'value'),
    ) &&
    g < 80
  ) {
    sim(f, 500);
    g += 1;
  }
  f.buyUpgrade(1, branch === 'throughput' ? 'speed' : 'value');

  const prefer = branch === 'throughput' ? 'speed' : 'value';
  g = 0;
  while (
    (f.sessionGoal.phase === 'branch' ||
      f.sessionGoal.phase === 'convergence') &&
    g < 600
  ) {
    if (g % 20 === 0) buyAffordable(f, prefer);
    if (f.sessionGoal.phase === 'convergence' && g % 25 === 5) {
      buyAffordable(f, prefer === 'speed' ? 'value' : 'speed');
    }
    sim(f, 500);
    g += 1;
  }

  const convMs = f.sessionMs;
  const earnedAtConv = Math.floor(f.economy.totalEarned);

  if (mode === 'none') f.eventsSys.suppress();
  else if (mode === 'early') {
    f.eventsSys.resume();
    f.eventsSys.trigger('productionBoost');
  }

  const series: { t: number; e: number; up: number; cash: number }[] = [];
  let upsAt5: number | null = null;
  let lastSampleBucket = -1;
  // Human-like cadence (~11 ups @5m in Margin validation): buy ~every 18–22s when flush
  let buyCooldownTicks = 0;
  g = 0;
  while (f.sessionMs < maxMs && g < 2000) {
    const bucket = Math.floor(f.sessionMs / 15_000);
    if (bucket !== lastSampleBucket) {
      lastSampleBucket = bucket;
      series.push({
        t: Math.round(f.sessionMs),
        e: Math.floor(f.economy.totalEarned),
        up: f.upgrades.totalPurchased,
        cash: Math.floor(f.economy.coins),
      });
    }
    if (upsAt5 === null && f.sessionMs >= 5 * 60_000) {
      upsAt5 = f.upgrades.totalPurchased;
    }
    if (buyCooldownTicks <= 0) {
      const cheapest = Math.min(
        f.upgrades.costFor(1, 'speed'),
        f.upgrades.costFor(1, 'value'),
      );
      if (f.economy.coins >= cheapest * 1.15 && buyAffordable(f, prefer)) {
        buyCooldownTicks = 36; // ~18s
      }
    } else {
      buyCooldownTicks -= 1;
    }
    sim(f, 500);
    g += 1;
  }

  return {
    branch,
    mode,
    convMs: Math.round(convMs),
    earnedAtConv,
    upsAt5,
    series,
    earnedEnd: Math.floor(f.economy.totalEarned),
    cashEnd: Math.floor(f.economy.coins),
    upsEnd: f.upgrades.totalPurchased,
  };
}

function timeToEarned(
  series: { t: number; e: number }[],
  target: number,
  convMs: number,
  earnedAtConv: number,
): number | null {
  if (earnedAtConv >= target) return convMs;
  for (const s of series) {
    if (s.e >= target) return s.t;
  }
  return null;
}

describe('M-B.2 Toys threshold search', () => {
  it('prints earned timelines for threshold pick', () => {
    const rows = [];
    for (const branch of ['throughput', 'margin'] as const) {
      for (const mode of ['none', 'typical', 'early'] as const) {
        rows.push(runPathWithSeries(branch, mode));
      }
    }

    const candidates = [700, 750, 800, 850, 900, 950];
    console.log('\n=== Earned at convergence / end ===');
    for (const r of rows) {
      console.log(
        `${r.branch}/${r.mode}: conv=${(r.convMs / 1000).toFixed(0)}s earned@conv=${r.earnedAtConv} end=${r.earnedEnd} ups@5=${r.upsAt5} upsEnd=${r.upsEnd}`,
      );
      console.log(
        '  samples:',
        r.series
          .filter((_, i) => i % 2 === 0)
          .map((s) => `${(s.t / 1000).toFixed(0)}s:$${s.e}`)
          .join(' | '),
      );
    }

    console.log('\n=== Threshold fitness (want unlock 5–8 min; not at conv; early≥4min; none≤8min) ===');
    for (const thr of candidates) {
      const scores = rows.map((r) => {
        const t = timeToEarned(r.series, thr, r.convMs, r.earnedAtConv);
        const ok =
          t !== null &&
          r.earnedAtConv < thr &&
          t >= 4 * 60_000 &&
          t <= 8 * 60_000 &&
          (r.mode !== 'early' || t >= 4 * 60_000) &&
          (r.mode !== 'none' || t <= 8 * 60_000);
        return {
          key: `${r.branch}/${r.mode}`,
          tSec: t == null ? null : +(t / 1000).toFixed(0),
          ok,
        };
      });
      const pass = scores.filter((s) => s.ok).length;
      console.log(
        `thr=${thr} pass=${pass}/${scores.length}`,
        scores.map((s) => `${s.key}:${s.tSec ?? 'never'}${s.ok ? '✓' : '✗'}`).join(' '),
      );
    }
  });
});
