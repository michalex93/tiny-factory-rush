import { describe, expect, it } from 'vitest';
import { computeGrade, FactorySim } from './sim.js';

describe('computeGrade', () => {
  it('rewards high delivery and cash', () => {
    expect(
      computeGrade({
        delivered: 40,
        jamSec: 5,
        cash: 130,
        shiftDurationSec: 150,
      }),
    ).toBe('S');
  });

  it('penalizes long jam', () => {
    expect(
      computeGrade({
        delivered: 4,
        jamSec: 70,
        cash: 10,
        shiftDurationSec: 150,
      }),
    ).toBe('C');
  });
});

describe('FactorySim', () => {
  it('delivers products over time without boost (slow)', () => {
    const sim = new FactorySim({
      shiftDurationSec: 30,
      sourcePeriodSec: 0.5,
      procAPeriodSec: 0.4,
      procBPeriodSec: 1.2,
      bufferCapacity: 4,
      moveDurationSec: 0.2,
      maxProducts: 20,
      pressureRampStartSec: 999,
    });
    sim.start();
    for (let i = 0; i < 200; i += 1) sim.step(0.1);
    const snap = sim.snapshot();
    expect(snap.delivered).toBeGreaterThan(0);
    expect(snap.cash).toBeGreaterThan(sim.config.startingCash - 1);
  });

  it('enters jam when buffer fills behind slow procB', () => {
    const sim = new FactorySim({
      shiftDurationSec: 40,
      sourcePeriodSec: 0.35,
      procAPeriodSec: 0.3,
      procBPeriodSec: 3.5,
      bufferCapacity: 2,
      jamBufferThreshold: 2,
      moveDurationSec: 0.15,
      maxProducts: 20,
      pressureRampStartSec: 0,
      pressureRampDurationSec: 1,
      sourcePeriodStressedSec: 0.3,
      procBPeriodStressedSec: 3.5,
    });
    const events: string[] = [];
    sim.on((e) => events.push(e.type));
    sim.start();
    for (let i = 0; i < 250; i += 1) sim.step(0.1);
    expect(events).toContain('jamStart');
    expect(sim.snapshot().jamActive || sim.snapshot().jamSec > 0).toBe(true);
  });

  it('boost spends cash and speeds recovery', () => {
    const sim = new FactorySim({
      shiftDurationSec: 50,
      sourcePeriodSec: 0.4,
      procAPeriodSec: 0.35,
      procBPeriodSec: 3.2,
      bufferCapacity: 2,
      jamBufferThreshold: 2,
      boostCost: 18,
      startingCash: 40,
      moveDurationSec: 0.15,
      pressureRampStartSec: 0,
      pressureRampDurationSec: 1,
      sourcePeriodStressedSec: 0.35,
      procBPeriodStressedSec: 3.2,
    });
    const events: string[] = [];
    sim.on((e) => events.push(e.type));
    sim.start();
    for (let i = 0; i < 180; i += 1) sim.step(0.1);
    expect(events).toContain('jamStart');
    const before = sim.snapshot().delivered;
    const applied = sim.tryApplyBoost();
    expect(applied.ok).toBe(true);
    expect(events).toContain('interventionSuccess');
    expect(events).toContain('flowRecovered');
    expect(sim.snapshot().recoveryBurstLeft).toBeGreaterThan(0);
    for (let i = 0; i < 120; i += 1) sim.step(0.1);
    expect(sim.snapshot().delivered).toBeGreaterThan(before);
    expect(sim.snapshot().boosted).toBe(true);
  });

  it('ends shift with grade', () => {
    const sim = new FactorySim({ shiftDurationSec: 5, moveDurationSec: 0.1 });
    sim.start();
    for (let i = 0; i < 60; i += 1) sim.step(0.1);
    const snap = sim.snapshot();
    expect(snap.phase).toBe('ended');
    expect(snap.grade).toMatch(/^[SABC]$/);
  });

  it('fun-slice default shift is about 2–3 minutes', () => {
    const sim = new FactorySim();
    expect(sim.config.shiftDurationSec).toBeGreaterThanOrEqual(120);
    expect(sim.config.shiftDurationSec).toBeLessThanOrEqual(180);
  });

  it('pressure ramps after healthy window', () => {
    const sim = new FactorySim({
      pressureRampStartSec: 10,
      pressureRampDurationSec: 10,
    });
    for (let i = 0; i < 50; i += 1) sim.step(0.1);
    expect(sim.pressure()).toBeLessThan(0.05);
    for (let i = 0; i < 150; i += 1) sim.step(0.1);
    expect(sim.pressure()).toBeGreaterThan(0.5);
  });
});
