/**
 * Tiny crude factory simulation for the IWSDK walking-skeleton checkpoint.
 * Deterministic fixed-step; no random. Player-facing labels stay out of this module.
 */

export type StationId = 'source' | 'procA' | 'buffer' | 'procB' | 'sink';

export type ProductState =
  | { kind: 'idle' }
  | { kind: 'at'; station: StationId }
  | { kind: 'moving'; from: StationId; to: StationId; t: number }
  | { kind: 'spill'; edgeX: number; age: number };

export type SimConfig = {
  shiftDurationSec: number;
  sourcePeriodSec: number;
  procAPeriodSec: number;
  procBPeriodSec: number;
  bufferCapacity: number;
  moveDurationSec: number;
  maxProducts: number;
  payoutPerDelivery: number;
  boostCost: number;
  boostProcBMultiplier: number;
  startingCash: number;
  jamBufferThreshold: number;
  spillCap: number;
};

export const DEFAULT_SIM_CONFIG: SimConfig = {
  /** Checkpoint timing (45–75s). Not final competition balance. */
  shiftDurationSec: 60,
  sourcePeriodSec: 0.55,
  procAPeriodSec: 0.45,
  procBPeriodSec: 2.6,
  bufferCapacity: 2,
  moveDurationSec: 0.3,
  maxProducts: 24,
  payoutPerDelivery: 4,
  boostCost: 18,
  boostProcBMultiplier: 2.8,
  startingCash: 40,
  jamBufferThreshold: 2,
  spillCap: 4,
};

export type SimEvent =
  | { type: 'shiftStart' }
  | { type: 'firstProduct' }
  | { type: 'jamStart' }
  | { type: 'interventionStart' }
  | { type: 'interventionSuccess'; kind: 'boost' }
  | { type: 'flowRecovered' }
  | { type: 'productDelivered'; total: number }
  | { type: 'spill'; count: number }
  | { type: 'shiftEnd'; grade: Grade; cash: number; delivered: number; jamSec: number }
  | { type: 'shiftReset' };

export type Grade = 'S' | 'A' | 'B' | 'C';

export type SimSnapshot = {
  elapsed: number;
  remaining: number;
  cash: number;
  delivered: number;
  jamActive: boolean;
  jamSec: number;
  bufferFill: number;
  boosted: boolean;
  phase: 'running' | 'ended';
  grade: Grade | null;
  products: ProductState[];
};

type InternalProduct = {
  id: number;
  state: ProductState;
};

const LINE: StationId[] = ['source', 'procA', 'buffer', 'procB', 'sink'];

function nextStation(id: StationId): StationId | null {
  const i = LINE.indexOf(id);
  if (i < 0 || i >= LINE.length - 1) return null;
  return LINE[i + 1]!;
}

export function computeGrade(input: {
  delivered: number;
  jamSec: number;
  cash: number;
  shiftDurationSec: number;
}): Grade {
  const deliveryScore = Math.min(1, input.delivered / 18);
  const jamPenalty = Math.min(1, input.jamSec / Math.max(1, input.shiftDurationSec * 0.45));
  const cashScore = Math.min(1, Math.max(0, input.cash) / 80);
  const score = deliveryScore * 0.55 + cashScore * 0.25 + (1 - jamPenalty) * 0.2;
  if (score >= 0.82) return 'S';
  if (score >= 0.62) return 'A';
  if (score >= 0.4) return 'B';
  return 'C';
}

export class FactorySim {
  readonly config: SimConfig;
  private elapsed = 0;
  private cash: number;
  private delivered = 0;
  private jamSec = 0;
  private jamActive = false;
  private boosted = false;
  private phase: 'running' | 'ended' = 'running';
  private grade: Grade | null = null;
  private products: InternalProduct[] = [];
  private nextId = 1;
  private sourceAcc = 0;
  private procABusy = 0;
  private procBBusy = 0;
  private firstProduct = false;
  private spillCount = 0;
  private listeners: Array<(e: SimEvent) => void> = [];

  constructor(config: Partial<SimConfig> = {}) {
    this.config = { ...DEFAULT_SIM_CONFIG, ...config };
    this.cash = this.config.startingCash;
  }

  on(listener: (e: SimEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(e: SimEvent): void {
    for (const l of this.listeners) l(e);
  }

  start(): void {
    this.emit({ type: 'shiftStart' });
  }

  reset(): void {
    this.elapsed = 0;
    this.cash = this.config.startingCash;
    this.delivered = 0;
    this.jamSec = 0;
    this.jamActive = false;
    this.boosted = false;
    this.phase = 'running';
    this.grade = null;
    this.products = [];
    this.nextId = 1;
    this.sourceAcc = 0;
    this.procABusy = 0;
    this.procBBusy = 0;
    this.firstProduct = false;
    this.spillCount = 0;
    this.emit({ type: 'shiftReset' });
    this.emit({ type: 'shiftStart' });
  }

  tryApplyBoost(): { ok: boolean; reason?: string } {
    if (this.phase !== 'running') return { ok: false, reason: 'shift-ended' };
    if (this.boosted) return { ok: false, reason: 'already-boosted' };
    if (this.cash < this.config.boostCost) return { ok: false, reason: 'broke' };
    this.emit({ type: 'interventionStart' });
    this.cash -= this.config.boostCost;
    this.boosted = true;
    this.emit({ type: 'interventionSuccess', kind: 'boost' });
    if (this.jamActive) {
      this.jamActive = false;
      this.emit({ type: 'flowRecovered' });
    }
    return { ok: true };
  }

  snapshot(): SimSnapshot {
    return {
      elapsed: this.elapsed,
      remaining: Math.max(0, this.config.shiftDurationSec - this.elapsed),
      cash: this.cash,
      delivered: this.delivered,
      jamActive: this.jamActive,
      jamSec: this.jamSec,
      bufferFill: this.countAt('buffer'),
      boosted: this.boosted,
      phase: this.phase,
      grade: this.grade,
      products: this.products.map((p) => p.state),
    };
  }

  private countAt(station: StationId): number {
    return this.products.filter((p) => p.state.kind === 'at' && p.state.station === station)
      .length;
  }

  private procBPeriod(): number {
    return this.boosted
      ? this.config.procBPeriodSec / this.config.boostProcBMultiplier
      : this.config.procBPeriodSec;
  }

  step(dt: number): void {
    if (this.phase !== 'running') return;
    if (dt <= 0) return;

    this.elapsed += dt;
    if (this.elapsed >= this.config.shiftDurationSec) {
      this.endShift();
      return;
    }

    this.advanceMovers(dt);
    this.tickSource(dt);
    this.tickProcA(dt);
    this.tickProcB(dt);
    this.updateJam(dt);
  }

  private endShift(): void {
    this.phase = 'ended';
    this.grade = computeGrade({
      delivered: this.delivered,
      jamSec: this.jamSec,
      cash: this.cash,
      shiftDurationSec: this.config.shiftDurationSec,
    });
    this.emit({
      type: 'shiftEnd',
      grade: this.grade,
      cash: this.cash,
      delivered: this.delivered,
      jamSec: this.jamSec,
    });
  }

  private advanceMovers(dt: number): void {
    for (const p of this.products) {
      if (p.state.kind === 'moving') {
        const t = p.state.t + dt / this.config.moveDurationSec;
        if (t >= 1) {
          p.state = { kind: 'at', station: p.state.to };
        } else {
          p.state = { ...p.state, t };
        }
      } else if (p.state.kind === 'spill') {
        p.state = { ...p.state, age: p.state.age + dt };
      }
    }
  }

  private tickSource(dt: number): void {
    this.sourceAcc += dt;
    while (
      this.sourceAcc >= this.config.sourcePeriodSec &&
      this.products.length < this.config.maxProducts
    ) {
      this.sourceAcc -= this.config.sourcePeriodSec;
      if (this.countAt('source') > 0) break;
      const id = this.nextId++;
      this.products.push({ id, state: { kind: 'at', station: 'source' } });
      if (!this.firstProduct) {
        this.firstProduct = true;
        this.emit({ type: 'firstProduct' });
      }
      this.tryDepart('source');
    }
  }

  private tickProcA(dt: number): void {
    if (this.procABusy > 0) {
      this.procABusy = Math.max(0, this.procABusy - dt);
      if (this.procABusy === 0) this.tryDepart('procA');
      return;
    }
    if (this.countAt('procA') > 0) {
      this.procABusy = this.config.procAPeriodSec;
    }
  }

  private tickProcB(dt: number): void {
    if (this.procBBusy > 0) {
      this.procBBusy = Math.max(0, this.procBBusy - dt);
      if (this.procBBusy === 0) this.tryDepart('procB');
      return;
    }
    if (this.countAt('procB') > 0) {
      this.procBBusy = this.procBPeriod();
    }
  }

  private tryDepart(from: StationId): void {
    const product = this.products.find(
      (p) => p.state.kind === 'at' && p.state.station === from,
    );
    if (!product || product.state.kind !== 'at') return;

    const to = nextStation(from);
    if (!to) return;

    if (to === 'buffer' && this.countAt('buffer') >= this.config.bufferCapacity) {
      this.maybeSpill();
      return;
    }
    if (to === 'sink') {
      // leave procB toward sink
    } else if (to !== 'buffer' && this.countAt(to) > 0) {
      return;
    }

    if (to === 'sink') {
      product.state = { kind: 'moving', from, to, t: 0 };
      return;
    }

    product.state = { kind: 'moving', from, to, t: 0 };
  }

  private updateJam(dt: number): void {
    // Complete arrivals into sink / buffer capacity effects.
    for (const p of this.products) {
      if (p.state.kind === 'at' && p.state.station === 'sink') {
        this.delivered += 1;
        this.cash += this.config.payoutPerDelivery;
        this.emit({ type: 'productDelivered', total: this.delivered });
        p.state = { kind: 'idle' };
      }
    }
    this.products = this.products.filter((p) => p.state.kind !== 'idle');

    // Push ready stations forward when free.
    this.tryDepart('source');
    if (this.procABusy === 0) this.tryDepart('procA');
    if (this.countAt('buffer') > 0 && this.countAt('procB') === 0 && this.procBBusy === 0) {
      const waiting = this.products.find(
        (p) => p.state.kind === 'at' && p.state.station === 'buffer',
      );
      if (waiting) {
        waiting.state = { kind: 'moving', from: 'buffer', to: 'procB', t: 0 };
      }
    }
    if (this.procBBusy === 0) this.tryDepart('procB');

    // Jam sticks once entered until boost clears it (readable crisis, no flicker).
    const congested =
      this.countAt('buffer') >= this.config.jamBufferThreshold && !this.boosted;
    if (!this.boosted) {
      if (congested && !this.jamActive) {
        this.jamActive = true;
        this.emit({ type: 'jamStart' });
      }
      if (this.jamActive) this.jamSec += dt;
    } else if (this.jamActive) {
      this.jamActive = false;
      this.emit({ type: 'flowRecovered' });
    }
  }

  private maybeSpill(): void {
    if (this.spillCount >= this.config.spillCap) return;
    if (!this.jamActive && this.countAt('buffer') < this.config.bufferCapacity) return;
    // Convert one queued-at-procA product into a spill placeholder toward table edge.
    const stuck = this.products.find(
      (p) => p.state.kind === 'at' && p.state.station === 'procA',
    );
    if (!stuck) return;
    this.spillCount += 1;
    stuck.state = { kind: 'spill', edgeX: 0.55 + this.spillCount * 0.04, age: 0 };
    this.emit({ type: 'spill', count: this.spillCount });
  }
}
