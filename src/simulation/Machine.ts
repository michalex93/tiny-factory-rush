import { Product } from './Product';
import {
  CLICK_BOOST,
  MACHINE_BASE,
  type MachineId,
  type MachineState,
} from '../config/balance';

/**
 * Single-unit processing station with industrial states.
 * Capacity emerges from processMs + buffers — no parallel magic slots.
 */
export class MachineStation {
  readonly id: MachineId;
  processMs: number;
  state: MachineState = 'IDLE';
  current: Product | null = null;
  /** 0..1 */
  progress = 0;
  clickCooldownMs = 0;
  processedCount = 0;

  /** Time accumulators (ms) for utilization */
  processingTimeMs = 0;
  blockedTimeMs = 0;
  starvedTimeMs = 0;
  idleTimeMs = 0;

  /** Rolling window samples for recent utilization */
  private windowSamples: { t: number; state: MachineState }[] = [];

  constructor(id: MachineId) {
    this.id = id;
    this.processMs = MACHINE_BASE.processMs[id];
  }

  get isBusy(): boolean {
    return this.current !== null;
  }

  get effectiveRatePerMin(): number {
    if (this.processMs <= 0) return 0;
    return 60_000 / this.processMs;
  }

  tryStart(product: Product): boolean {
    if (this.current) return false;
    this.current = product;
    product.flowState = 'processing';
    this.progress = 0;
    this.state = 'PROCESSING';
    return true;
  }

  /**
   * Advance processing. Returns finished product when complete
   * (caller must unload; if can't, machine becomes BLOCKED).
   */
  updateProcessing(dtMs: number): Product | null {
    if (!this.current || this.state !== 'PROCESSING') return null;
    this.progress = Math.min(1, this.progress + dtMs / this.processMs);
    if (this.progress < 1) return null;
    return this.current;
  }

  /** Unload finished product and go IDLE (or STARVED next tick). */
  unload(): Product | null {
    const p = this.current;
    this.current = null;
    this.progress = 0;
    this.state = 'IDLE';
    if (p) this.processedCount += 1;
    return p;
  }

  setBlocked(): void {
    if (this.current && this.progress >= 1) {
      this.state = 'BLOCKED';
    }
  }

  setStarved(): void {
    if (!this.current) this.state = 'STARVED';
  }

  setIdle(): void {
    if (!this.current) this.state = 'IDLE';
  }

  accumulateTime(dtMs: number, clockMs: number): void {
    switch (this.state) {
      case 'PROCESSING':
        this.processingTimeMs += dtMs;
        break;
      case 'BLOCKED':
        this.blockedTimeMs += dtMs;
        break;
      case 'STARVED':
        this.starvedTimeMs += dtMs;
        break;
      default:
        this.idleTimeMs += dtMs;
    }
    this.windowSamples.push({ t: clockMs, state: this.state });
    if (this.clickCooldownMs > 0) {
      this.clickCooldownMs = Math.max(0, this.clickCooldownMs - dtMs);
    }
  }

  pruneWindow(cutoffMs: number): void {
    let write = 0;
    for (let i = 0; i < this.windowSamples.length; i++) {
      const s = this.windowSamples[i]!;
      if (s.t >= cutoffMs) this.windowSamples[write++] = s;
    }
    this.windowSamples.length = write;
  }

  /** Fraction of recent window spent PROCESSING. */
  recentUtilization(windowMs: number, clockMs: number): number {
    return this.recentStateShare('PROCESSING', windowMs, clockMs);
  }

  /** Fraction of recent window spent in a given state. */
  recentStateShare(
    state: MachineState,
    windowMs: number,
    clockMs: number,
  ): number {
    const cutoff = clockMs - windowMs;
    this.pruneWindow(cutoff);
    if (this.windowSamples.length === 0) {
      return this.state === state ? 1 : 0;
    }
    let hit = 0;
    for (const s of this.windowSamples) {
      if (s.state === state) hit += 1;
    }
    return hit / this.windowSamples.length;
  }

  clickBoost(): boolean {
    if (this.clickCooldownMs > 0 || !this.current || this.state !== 'PROCESSING') {
      return false;
    }
    const remaining = 1 - this.progress;
    this.progress = Math.min(1, this.progress + remaining * CLICK_BOOST.progressPulse);
    this.clickCooldownMs = CLICK_BOOST.cooldownMs;
    return true;
  }

  clear(): void {
    this.current = null;
    this.progress = 0;
    this.state = 'IDLE';
    this.clickCooldownMs = 0;
    this.windowSamples.length = 0;
  }

  serialize(): {
    processMs: number;
    state: MachineState;
    progress: number;
    product: { color: number; golden: boolean; createdAtMs: number } | null;
  } {
    return {
      processMs: this.processMs,
      state: this.state,
      progress: this.progress,
      product: this.current
        ? {
            color: this.current.color,
            golden: this.current.golden,
            createdAtMs: this.current.createdAtMs,
          }
        : null,
    };
  }
}
