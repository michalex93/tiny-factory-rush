import { describe, expect, it } from 'vitest';
import { Upgrades } from './Upgrades';
import { Economy } from './Economy';
import { MachineStation } from '../simulation/Machine';
import { BufferStation } from '../simulation/Buffer';
import { MACHINE_BASE, MAX_UPGRADE_LEVEL, UPGRADE_EFFECTS } from '../config/balance';

describe('Upgrades (industrial)', () => {
  it('speed reduces processMs', () => {
    const upgrades = new Upgrades();
    const economy = new Economy({ coins: 10_000 });
    const machines = [new MachineStation(0), new MachineStation(1), new MachineStation(2)];
    const buffers = [new BufferStation(0), new BufferStation(1)];
    upgrades.applyTo(machines, buffers);
    const before = machines[0]!.processMs;
    expect(upgrades.tryPurchase(0, 'speed', (c) => economy.spend(c))).toBe(true);
    upgrades.applyTo(machines, buffers);
    expect(machines[0]!.processMs).toBeCloseTo(
      before * UPGRADE_EFFECTS.speedFactorPerLevel,
      5,
    );
    expect(machines[0]!.processMs).toBeLessThan(MACHINE_BASE.processMs[0]);
  });

  it('buffer increases buffer capacity, not machine parallelism', () => {
    const upgrades = new Upgrades();
    const economy = new Economy({ coins: 10_000 });
    const machines = [new MachineStation(0), new MachineStation(1), new MachineStation(2)];
    const buffers = [new BufferStation(0), new BufferStation(1)];
    upgrades.applyTo(machines, buffers);
    const before = buffers[0]!.capacity;
    expect(upgrades.tryPurchase(0, 'buffer', (c) => economy.spend(c))).toBe(true);
    upgrades.applyTo(machines, buffers);
    expect(buffers[0]!.capacity).toBe(before + UPGRADE_EFFECTS.bufferSlotsPerLevel);
  });

  it('value increases sale multiplier without changing processMs', () => {
    const upgrades = new Upgrades();
    const economy = new Economy({ coins: 10_000 });
    const machines = [new MachineStation(0), new MachineStation(1), new MachineStation(2)];
    const buffers = [new BufferStation(0), new BufferStation(1)];
    upgrades.applyTo(machines, buffers);
    const processBefore = machines[0]!.processMs;
    const valueBefore = upgrades.totalValueMultiplier();
    upgrades.tryPurchase(0, 'value', (c) => economy.spend(c));
    upgrades.applyTo(machines, buffers);
    expect(machines[0]!.processMs).toBe(processBefore);
    expect(upgrades.totalValueMultiplier()).toBeGreaterThan(valueBefore);
  });

  it('caps at max level', () => {
    const upgrades = new Upgrades();
    const economy = new Economy({ coins: 1e15 });
    for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
      expect(upgrades.tryPurchase(0, 'speed', (c) => economy.spend(c))).toBe(true);
    }
    expect(upgrades.isMaxed(0, 'speed')).toBe(true);
    expect(upgrades.tryPurchase(0, 'speed', (c) => economy.spend(c))).toBe(false);
  });
});
