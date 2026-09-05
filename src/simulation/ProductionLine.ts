import {
  BUFFER_COUNT,
  EVENTS,
  MACHINE_COUNT,
  METRICS,
  SPAWN,
  type MachineId,
} from '../config/balance';
import { BufferStation } from './Buffer';
import { MachineStation } from './Machine';
import { Metrics } from './Metrics';
import { Product, resetProductIds } from './Product';

export interface LineEvents {
  onSell?: (amountBase: number, golden: boolean, product: Product) => void;
  onProcessDone?: (machineId: MachineId) => void;
  onSpawn?: (golden: boolean) => void;
  onClickBoost?: (machineId: MachineId) => void;
}

export interface LineSnapshot {
  clockMs: number;
  spawnTimerMs: number;
  machines: ReturnType<MachineStation['serialize']>[];
  buffers: ReturnType<BufferStation['serialize']>[];
}

/**
 * Discrete production line:
 * SOURCE → M0 → BUF0 → M1 → BUF1 → M2 → SINK
 */
export class ProductionLine {
  readonly machines: MachineStation[] = [];
  readonly buffers: BufferStation[] = [];
  readonly metrics = new Metrics();
  events: LineEvents = {};

  clockMs = 0;
  private spawnTimerMs = 0;
  private baseSpawnIntervalMs: number = SPAWN.intervalMs;

  /** External multipliers from game events */
  spawnRateMult = 1;
  machineSpeedMult: Record<MachineId, number> = { 0: 1, 1: 1, 2: 1 };

  productColor = 0xc4a574;
  rollGolden: () => boolean = () => false;

  /** Test helper */
  setSpawnIntervalMs(ms: number): void {
    this.baseSpawnIntervalMs = ms;
  }

  constructor() {
    for (let i = 0; i < MACHINE_COUNT; i++) {
      this.machines.push(new MachineStation(i as MachineId));
    }
    for (let i = 0; i < BUFFER_COUNT; i++) {
      this.buffers.push(new BufferStation(i as 0 | 1));
    }
  }

  resetRuntime(): void {
    resetProductIds();
    this.spawnTimerMs = 0;
    for (const m of this.machines) m.clear();
    for (const b of this.buffers) b.clear();
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    this.metrics.tick(this.clockMs);

    const spawnInterval = Math.max(
      SPAWN.minIntervalMs,
      this.baseSpawnIntervalMs / this.spawnRateMult,
    );
    this.spawnTimerMs += dtMs;
    while (this.spawnTimerMs >= spawnInterval) {
      this.spawnTimerMs -= spawnInterval;
      this.trySpawn();
    }

    // Process machines (speed mult applies to processing only)
    for (let i = 0; i < MACHINE_COUNT; i++) {
      const m = this.machines[i]!;
      const speed = this.machineSpeedMult[i as MachineId] ?? 1;
      this.stepMachine(m, dtMs * speed, i as MachineId);
      m.accumulateTime(dtMs, this.clockMs);
      m.pruneWindow(this.clockMs - METRICS.utilizationWindowMs);
    }

    // Pull from buffers into starved/idle machines
    this.feedMachines();
  }

  private trySpawn(): void {
    const m0 = this.machines[0]!;
    // Source feeds Machine A directly if idle; else can't spawn (implicit tiny buffer of 0 at source)
    // Better: allow spawn into M0 if free, else skip (lost opportunity) — or hold one.
    // Spec: SOURCE → MACHINE A. If A busy, we simply don't spawn this tick (material waits at source = not WIP).
    if (m0.current) return;
    const golden = this.rollGolden();
    const color = golden ? EVENTS.golden.color : this.productColor;
    const product = new Product(color, golden, this.clockMs);
    m0.tryStart(product);
    this.events.onSpawn?.(golden);
  }

  private stepMachine(m: MachineStation, dtMs: number, id: MachineId): void {
    if (m.state === 'BLOCKED' && m.current && m.progress >= 1) {
      if (this.tryUnload(m, id)) return;
      return;
    }

    if (m.state === 'PROCESSING' || (m.current && m.progress < 1)) {
      m.state = 'PROCESSING';
      const finished = m.updateProcessing(dtMs);
      if (finished) {
        this.events.onProcessDone?.(id);
        if (!this.tryUnload(m, id)) {
          m.setBlocked();
        }
      }
      return;
    }

    if (!m.current) {
      // Will be fed by feedMachines; mark starved if still empty after
      m.setIdle();
    }
  }

  private tryUnload(m: MachineStation, id: MachineId): boolean {
    if (!m.current || m.progress < 1) return false;

    if (id < MACHINE_COUNT - 1) {
      const buf = this.buffers[id]!;
      if (!buf.canAccept()) {
        m.setBlocked();
        return false;
      }
      const product = m.unload();
      if (!product) return false;
      buf.enqueue(product);
      return true;
    }

    // Sink
    const product = m.unload();
    if (!product) return false;
    product.markCompleted(this.clockMs);
    this.metrics.recordCompletion(product, this.clockMs);
    this.events.onSell?.(1, product.golden, product);
    return true;
  }

  private feedMachines(): void {
    // Machine 0 is fed by SOURCE — idle between spawns is normal (not starved)
    const m0 = this.machines[0]!;
    if (!m0.current && m0.state !== 'BLOCKED') {
      m0.setIdle();
    }

    for (let i = 1; i < MACHINE_COUNT; i++) {
      const m = this.machines[i]!;
      if (m.current) continue;
      const buf = this.buffers[i - 1]!;
      if (buf.isEmpty) {
        m.setStarved();
        continue;
      }
      const product = buf.dequeue();
      if (product) m.tryStart(product);
    }
  }

  clickMachine(id: MachineId): boolean {
    const m = this.machines[id];
    if (!m) return false;
    const ok = m.clickBoost();
    if (ok) this.events.onClickBoost?.(id);
    return ok;
  }

  getWip(): number {
    return this.metrics.computeWip(this.machines, this.buffers);
  }

  getThroughputPerMin(): number {
    return this.metrics.throughputPerMin;
  }

  getBottleneckId(): MachineId | null {
    return this.metrics.identifyBottleneck(this.machines, this.buffers);
  }

  toSnapshot(): LineSnapshot {
    return {
      clockMs: this.clockMs,
      spawnTimerMs: this.spawnTimerMs,
      machines: this.machines.map((m) => m.serialize()),
      buffers: this.buffers.map((b) => b.serialize()),
    };
  }

  loadSnapshot(snapshot: LineSnapshot | undefined): void {
    this.resetRuntime();
    if (!snapshot) return;
    this.clockMs = snapshot.clockMs ?? 0;
    this.spawnTimerMs = snapshot.spawnTimerMs ?? 0;

    for (let i = 0; i < MACHINE_COUNT; i++) {
      const ms = snapshot.machines?.[i];
      const m = this.machines[i]!;
      if (!ms) continue;
      m.progress = ms.progress ?? 0;
      m.state = ms.state ?? 'IDLE';
      if (ms.product) {
        m.current = new Product(
          ms.product.color,
          ms.product.golden,
          ms.product.createdAtMs,
        );
        m.current.flowState = 'processing';
      }
    }

    for (let i = 0; i < BUFFER_COUNT; i++) {
      const bs = snapshot.buffers?.[i];
      const b = this.buffers[i]!;
      if (!bs) continue;
      // capacity restored via upgrades.apply; items restored here
      for (const item of bs.items ?? []) {
        b.enqueue(new Product(item.color, item.golden, item.createdAtMs));
      }
    }
  }
}
