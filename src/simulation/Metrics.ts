import { METRICS, type MachineId } from '../config/balance';
import type { MachineStation } from './Machine';
import type { BufferStation } from './Buffer';
import type { Product } from './Product';

export interface MetricsSnapshot {
  throughputPerMin: number;
  wip: number;
  avgCycleTimeMs: number;
  bottleneckId: MachineId | null;
}

/**
 * Rolling-window industrial metrics. Simple but coherent.
 */
export class Metrics {
  private completions: { t: number; cycleMs: number }[] = [];
  private clockMs = 0;

  tick(clockMs: number): void {
    this.clockMs = clockMs;
    const cutoff = clockMs - METRICS.windowMs;
    let write = 0;
    for (let i = 0; i < this.completions.length; i++) {
      const c = this.completions[i]!;
      if (c.t >= cutoff) this.completions[write++] = c;
    }
    this.completions.length = write;
  }

  recordCompletion(product: Product, nowMs: number): void {
    const cycle = product.cycleTimeMs ?? 0;
    this.completions.push({ t: nowMs, cycleMs: cycle });
  }

  get throughputPerMin(): number {
    if (this.completions.length === 0) return 0;
    return (this.completions.length / METRICS.windowMs) * 60_000;
  }

  get avgCycleTimeMs(): number {
    if (this.completions.length === 0) return 0;
    const sum = this.completions.reduce((a, c) => a + c.cycleMs, 0);
    return sum / this.completions.length;
  }

  computeWip(machines: MachineStation[], buffers: BufferStation[]): number {
    let n = 0;
    for (const m of machines) if (m.current) n += 1;
    for (const b of buffers) n += b.length;
    return n;
  }

  /**
   * Heuristic bottleneck: highest recent utilization,
   * boosted if downstream buffer is filling / upstream starved.
   */
  identifyBottleneck(
    machines: MachineStation[],
    buffers: BufferStation[],
  ): MachineId | null {
    let best: MachineId | null = null;
    let bestScore = -1;
    for (const m of machines) {
      let score = m.recentUtilization(METRICS.utilizationWindowMs, this.clockMs);
      // Upstream buffer filling → this machine likely bottleneck
      if (m.id > 0) {
        const prevBuf = buffers[m.id - 1];
        if (prevBuf && prevBuf.fillRatio > 0.6) score += 0.25;
      }
      // Downstream starving → this machine may be bottleneck
      if (m.id < machines.length - 1) {
        const next = machines[m.id + 1];
        if (next && (next.state === 'STARVED' || next.state === 'IDLE')) {
          score += 0.15;
        }
      }
      if (m.state === 'BLOCKED') score -= 0.1; // blocked means downstream is the issue
      if (score > bestScore) {
        bestScore = score;
        best = m.id;
      }
    }
    return best;
  }

  snapshot(
    machines: MachineStation[],
    buffers: BufferStation[],
  ): MetricsSnapshot {
    return {
      throughputPerMin: this.throughputPerMin,
      wip: this.computeWip(machines, buffers),
      avgCycleTimeMs: this.avgCycleTimeMs,
      bottleneckId: this.identifyBottleneck(machines, buffers),
    };
  }
}
