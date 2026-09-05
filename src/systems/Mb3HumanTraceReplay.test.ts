/**
 * M-B.3 — Human trace replay + physical factory calibration.
 */
import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { TOYS_MILESTONE } from '../config/balance';
import {
  HUMAN_TRACES,
  estimateUnlockMs,
  type HumanTrace,
} from './Mb3HumanTraces';
import type { MachineId, UpgradeType } from '../config/balance';

function sim(f: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    f.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

function applyLevels(
  f: Factory,
  levels: HumanTrace['markers']['convergence']['levels'],
  totalUps: number,
): void {
  const fund = (cost: number) => {
    // Cash only — do not inflate lifetime earned (human gate metric)
    f.economy.coins += cost;
  };
  const set = (m: MachineId, type: UpgradeType, n: number) => {
    while (f.upgrades.getLevel(m, type) < n) {
      fund(f.upgrades.costFor(m, type) + 5);
      f.buyUpgrade(m, type);
    }
  };
  set(1, 'speed', levels.speed1);
  set(1, 'value', levels.value1);
  set(0, 'speed', levels.speed0);
  set(0, 'value', levels.value0);
  let guard = 0;
  while (f.upgrades.totalPurchased < totalUps && guard < 40) {
    let bought = false;
    for (const type of ['buffer', 'speed', 'value'] as const) {
      for (const m of [1, 0, 2] as const) {
        if (type === 'buffer' && m === 2) continue;
        if (f.upgrades.totalPurchased >= totalUps) break;
        fund(f.upgrades.costFor(m, type) + 2);
        if (f.buyUpgrade(m, type)) bought = true;
      }
    }
    if (!bought) break;
    guard += 1;
  }
  f.upgrades.applyTo(f.line.machines, f.line.buffers);
}

/** Seed factory at human convergence snapshot (events off). */
function seedAtConvergence(trace: HumanTrace): Factory {
  const f = new Factory();
  f.line.rollGolden = () => false;
  f.eventsSys.suppress();
  const c = trace.markers.convergence;
  applyLevels(f, c.levels, c.ups);
  f.economy.coins = c.coins;
  f.economy.totalEarned = c.earned;
  f.sessionMs = c.sessMs;
  f.sessionGoal.skipAsComplete();
  f.sessionGoal.snapshot()!.selectedBranch = trace.branch;
  f.sessionGoal.load({
    ...f.sessionGoal.snapshot()!,
    selectedBranch: trace.branch,
    nextMilestoneShown: true,
    toysEarnedDisplay: c.earned,
    phase: 'post_chain',
  });
  // Warm line so throughput settles
  sim(f, 8_000);
  return f;
}

describe('Mb3HumanTraceReplay', () => {
  it('documents prior sim error vs human (threshold 900)', () => {
    // Previous aggressive bot predicted ~480s; human was ~540s (Throughput)
    const humanT = HUMAN_TRACES.throughput.markers.toysThreshold.sessMs;
    const oldBotEstimate = 480_000;
    const errPct = Math.abs(oldBotEstimate - humanT) / humanT;
    expect(errPct).toBeGreaterThan(0.08); // >8% — why we recalibrated
  });

  it('human rate extrapolation: Throughput earned timeline within 10%', () => {
    const t = HUMAN_TRACES.throughput;
    const ready = t.markers.toysThreshold;
    const estEarned =
      t.markers.convergence.earned +
      t.postConvEarnedPerSec *
        ((ready.sessMs - t.markers.convergence.sessMs) / 1000);
    const err = Math.abs(estEarned - ready.earned) / ready.earned;
    expect(err).toBeLessThanOrEqual(0.05);
  });

  it('human rate extrapolation: Margin earned timeline within 10%', () => {
    const t = HUMAN_TRACES.margin;
    const ready = t.markers.toysThreshold;
    const estEarned =
      t.markers.convergence.earned +
      t.postConvEarnedPerSec *
        ((ready.sessMs - t.markers.convergence.sessMs) / 1000);
    const err = Math.abs(estEarned - ready.earned) / ready.earned;
    expect(err).toBeLessThanOrEqual(0.05);
  });

  it('threshold 650 lands in 6–7.5 min for both human rates', () => {
    const thr = TOYS_MILESTONE.unlockAtEarned;
    expect(thr).toBe(650);
    const tMs = estimateUnlockMs(HUMAN_TRACES.throughput, thr);
    const mMs = estimateUnlockMs(HUMAN_TRACES.margin, thr);
    expect(tMs).toBeGreaterThanOrEqual(6 * 60_000);
    expect(tMs).toBeLessThanOrEqual(7.5 * 60_000);
    expect(mMs).toBeGreaterThanOrEqual(6 * 60_000);
    expect(mMs).toBeLessThanOrEqual(7.5 * 60_000);
    const diff = Math.abs(tMs - mMs) / Math.max(tMs, mMs);
    expect(diff).toBeLessThanOrEqual(0.2);
  });

  it('physical replay Throughput: earned near human at threshold time (±15%)', () => {
    const trace = HUMAN_TRACES.throughput;
    const f = seedAtConvergence(trace);
    f.eventsSys.suppress();
    const targetMs = trace.markers.toysThreshold.sessMs;
    const startMs = f.sessionMs;
    // Linearly buy remaining upgrades toward end levels while simulating
    const end = trace.markers.toysThreshold.levels;
    const start = trace.markers.convergence.levels;
    const duration = targetMs - startMs;
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      const want = {
        speed1: Math.round(start.speed1 + (end.speed1 - start.speed1) * frac),
        value1: Math.round(start.value1 + (end.value1 - start.value1) * frac),
        speed0: Math.round(start.speed0 + (end.speed0 - start.speed0) * frac),
        value0: Math.round(start.value0 + (end.value0 - start.value0) * frac),
      };
      applyLevels(f, want, Math.round(7 + (25 - 7) * frac));
      sim(f, duration / steps);
    }
    const humanEarned = trace.markers.toysThreshold.earned;
    const err = Math.abs(f.economy.totalEarned - humanEarned) / humanEarned;
    // Physical line + upgrade schedule is noisy; allow 15%
    expect(err).toBeLessThanOrEqual(0.15);
  }, 30_000);

  it('physical replay Margin: earned near human at threshold time (±15%)', () => {
    const trace = HUMAN_TRACES.margin;
    const f = seedAtConvergence(trace);
    f.eventsSys.suppress();
    const targetMs = trace.markers.toysThreshold.sessMs;
    const startMs = f.sessionMs;
    const end = trace.markers.toysThreshold.levels;
    const start = trace.markers.convergence.levels;
    const duration = targetMs - startMs;
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      const want = {
        speed1: Math.round(start.speed1 + (end.speed1 - start.speed1) * frac),
        value1: Math.round(start.value1 + (end.value1 - start.value1) * frac),
        speed0: Math.round(start.speed0 + (end.speed0 - start.speed0) * frac),
        value0: Math.round(start.value0 + (end.value0 - start.value0) * frac),
      };
      applyLevels(f, want, Math.round(8 + (25 - 8) * frac));
      sim(f, duration / steps);
    }
    const humanEarned = trace.markers.toysThreshold.earned;
    const err = Math.abs(f.economy.totalEarned - humanEarned) / humanEarned;
    expect(err).toBeLessThanOrEqual(0.15);
  }, 30_000);

  it('searches 600–725: 650 is best fit for 6–7.5 min band', () => {
    const scores: { thr: number; pass: boolean; t: number; m: number }[] = [];
    for (const thr of [600, 625, 650, 675, 700, 725]) {
      const t = estimateUnlockMs(HUMAN_TRACES.throughput, thr);
      const m = estimateUnlockMs(HUMAN_TRACES.margin, thr);
      const pass =
        t >= 6 * 60_000 &&
        t <= 7.5 * 60_000 &&
        m >= 6 * 60_000 &&
        m <= 7.5 * 60_000 &&
        Math.abs(t - m) / Math.max(t, m) <= 0.2;
      scores.push({ thr, pass, t, m });
    }
    const best = scores.filter((s) => s.pass);
    expect(best.some((s) => s.thr === 650)).toBe(true);
    expect(TOYS_MILESTONE.unlockAtEarned).toBe(650);
  });
});
