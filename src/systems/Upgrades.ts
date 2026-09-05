import {
  BUFFER_BASE,
  MACHINE_BASE,
  MACHINE_COUNT,
  MAX_UPGRADE_LEVEL,
  ONBOARDING_PURCHASE_BUDGET,
  UPGRADE_COSTS_NORMAL,
  UPGRADE_COSTS_ONBOARDING,
  UPGRADE_EFFECTS,
  type BufferId,
  type MachineId,
  type UpgradeType,
} from '../config/balance';
import type { MachineStation } from '../simulation/Machine';
import type { BufferStation } from '../simulation/Buffer';

export type UpgradeLevels = Record<MachineId, Record<UpgradeType, number>>;

function emptyLevels(): UpgradeLevels {
  const levels = {} as UpgradeLevels;
  for (let i = 0; i < MACHINE_COUNT; i++) {
    levels[i as MachineId] = { speed: 0, buffer: 0, value: 0 };
  }
  return levels;
}

/**
 * Upgrades:
 * - speed → machine processMs (operational)
 * - buffer → outgoing buffer capacity after this machine (operational)
 * - value → sale multiplier (financial, not physical)
 *
 * Machine 2's buffer upgrade boosts a virtual sink cushion (no visual buffer);
 * we apply buffer upgrades for M0→BUF0 and M1→BUF1; M2 buffer levels are unused
 * physically but kept for symmetric UI (or could boost spawn slightly — skip).
 */
export class Upgrades {
  levels: UpgradeLevels;
  totalPurchased = 0;

  constructor(levels?: UpgradeLevels, totalPurchased = 0) {
    this.levels = levels ? structuredClone(levels) : emptyLevels();
    this.totalPurchased = totalPurchased;
  }

  getLevel(machineId: MachineId, type: UpgradeType): number {
    return this.levels[machineId][type];
  }

  isMaxed(machineId: MachineId, type: UpgradeType): boolean {
    return this.getLevel(machineId, type) >= MAX_UPGRADE_LEVEL;
  }

  private costsTable(): typeof UPGRADE_COSTS_ONBOARDING {
    return this.totalPurchased < ONBOARDING_PURCHASE_BUDGET
      ? UPGRADE_COSTS_ONBOARDING
      : UPGRADE_COSTS_NORMAL;
  }

  costFor(machineId: MachineId, type: UpgradeType): number {
    const level = this.getLevel(machineId, type);
    if (level >= MAX_UPGRADE_LEVEL) return Infinity;
    const { baseCost, growthFactor } = this.costsTable()[type];
    return Math.floor(baseCost * Math.pow(growthFactor, level));
  }

  static costAtLevel(type: UpgradeType, level: number, onboarding = true): number {
    if (level >= MAX_UPGRADE_LEVEL) return Infinity;
    const table = onboarding ? UPGRADE_COSTS_ONBOARDING : UPGRADE_COSTS_NORMAL;
    const { baseCost, growthFactor } = table[type];
    return Math.floor(baseCost * Math.pow(growthFactor, level));
  }

  tryPurchase(
    machineId: MachineId,
    type: UpgradeType,
    spend: (cost: number) => boolean,
  ): boolean {
    if (this.isMaxed(machineId, type)) return false;
    const cost = this.costFor(machineId, type);
    if (!spend(cost)) return false;
    this.levels[machineId][type] += 1;
    this.totalPurchased += 1;
    return true;
  }

  applyTo(
    machines: MachineStation[],
    buffers: BufferStation[],
    bonus?: { machineId: MachineId; type: UpgradeType } | null,
  ): void {
    for (const machine of machines) {
      const id = machine.id;
      let speedLv = this.levels[id].speed;
      if (bonus?.machineId === id && bonus.type === 'speed') speedLv += 1;
      machine.processMs =
        MACHINE_BASE.processMs[id] *
        Math.pow(UPGRADE_EFFECTS.speedFactorPerLevel, speedLv);
    }

    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i]!;
      const fromMachine = i as MachineId;
      let bufLv = this.levels[fromMachine].buffer;
      if (bonus?.machineId === fromMachine && bonus.type === 'buffer') bufLv += 1;
      const base = BUFFER_BASE.capacity[i as BufferId];
      buf.capacity = base + bufLv * UPGRADE_EFFECTS.bufferSlotsPerLevel;
    }
  }

  totalValueMultiplier(
    bonus?: { machineId: MachineId; type: UpgradeType } | null,
  ): number {
    let mult = 1;
    for (let i = 0; i < MACHINE_COUNT; i++) {
      let lv = this.levels[i as MachineId].value;
      if (bonus?.machineId === i && bonus.type === 'value') lv += 1;
      mult *= Math.pow(UPGRADE_EFFECTS.valueFactorPerLevel, lv);
    }
    return mult;
  }

  snapshot(): { levels: UpgradeLevels; totalPurchased: number } {
    return {
      levels: structuredClone(this.levels),
      totalPurchased: this.totalPurchased,
    };
  }
}
