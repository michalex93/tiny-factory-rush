/**
 * Fun-slice factory simulation (~2–3 min shift).
 * Deterministic fixed-step; drama via pressure ramp + recovery burst.
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
  /** Elapsed before source/procB pressure ramps toward jam. */
  pressureRampStartSec: number;
  pressureRampDurationSec: number;
  sourcePeriodStressedSec: number;
  procBPeriodStressedSec: number;
  recoveryBurstSec: number;
  recoveryMoveScale: number;
};

export const DEFAULT_SIM_CONFIG: SimConfig = {
  /** Fun-slice: ~2.5 minutes. */
  shiftDurationSec: 150,
  sourcePeriodSec: 0.85,
  procAPeriodSec: 0.42,
  procBPeriodSec: 1.55,
  bufferCapacity: 3,
  moveDurationSec: 0.28,
  maxProducts: 28,
  payoutPerDelivery: 5,
  boostCost: 20,
  boostProcBMultiplier: 3.2,
  startingCash: 45,
  jamBufferThreshold: 2,
  spillCap: 5,
  pressureRampStartSec: 22,
  pressureRampDurationSec: 28,
  sourcePeriodStressedSec: 0.42,
  procBPeriodStressedSec: 3.1,
  recoveryBurstSec: 2.8,
  recoveryMoveScale: 0.42,
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
  | {
      type: 'shiftEnd';
      grade: Grade;
      cash: number;
      delivered: number;
      jamSec: number;
    }
  | { type: 'shiftReset' };

export type Grade = 'S' | 'A' | 'B' | 'C';

export type SimSnapshot = {
  elapsed: number;
  remaining: number;
  cash: number;
  delivered: number;
  jamActive: boolean;
  jamSec: number;
  /** 0..1 visual/audio stress while jamActive. */
  jamSeverity: number;
  bufferFill: number;
  boosted: boolean;
  phase: 'running' | 'ended';
  grade: Grade | null;
  products: ProductState[];
  /** Seconds left in post-boost acceleration. */
  recoveryBurstLeft: number;
  pressure: number;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeGrade(input: {
  delivered: number;
  jamSec: number;
  cash: number;
  shiftDurationSec: number;
}): Grade {
  const deliveryTarget = Math.max(12, input.shiftDurationSec * 0.22);
  const deliveryScore = Math.min(1, input.delivered / deliveryTarget);
  const jamPenalty = Math.min(
    1,
    input.jamSec / Math.max(1, input.shiftDurationSec * 0.35),
  );
  const cashScore = Math.min(1, Math.max(0, input.cash) / 120);
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
  private recoveryBurstLeft = 0;
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
    this.recoveryBurstLeft = 0;
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
    this.recoveryBurstLeft = this.config.recoveryBurstSec;
    this.emit({ type: 'interventionSuccess', kind: 'boost' });
    if (this.jamActive) {
      this.jamActive = false;
      this.emit({ type: 'flowRecovered' });
    }
    return { ok: true };
  }

  /** 0 = calm, 1 = fully stressed (before boost). */
  pressure(): number {
    if (this.boosted) return 0;
    const start = this.config.pressureRampStartSec;
    const dur = Math.max(0.01, this.config.pressureRampDurationSec);
    return Math.min(1, Math.max(0, (this.elapsed - start) / dur));
  }

  private sourcePeriod(): number {
    const p = this.pressure();
    return lerp(
      this.config.sourcePeriodSec,
      this.config.sourcePeriodStressedSec,
      p,
    );
  }

  private procBPeriod(): number {
    let base = this.boosted
      ? this.config.procBPeriodSec / this.config.boostProcBMultiplier
      : lerp(
          this.config.procBPeriodSec,
          this.config.procBPeriodStressedSec,
          this.pressure(),
        );
    if (this.recoveryBurstLeft > 0) base *= 0.55;
    return base;
  }

  private moveDuration(): number {
    let d = this.config.moveDurationSec;
    if (this.recoveryBurstLeft > 0) d *= this.config.recoveryMoveScale;
    else if (this.jamActive) d *= 1.35;
    return d;
  }

  snapshot(): SimSnapshot {
    const jamSeverity = this.jamActive
      ? Math.min(1, 0.25 + this.jamSec / 18)
      : 0;
    return {
      elapsed: this.elapsed,
      remaining: Math.max(0, this.config.shiftDurationSec - this.elapsed),
      cash: this.cash,
      delivered: this.delivered,
      jamActive: this.jamActive,
      jamSec: this.jamSec,
      jamSeverity,
      bufferFill: this.countAt('buffer'),
      boosted: this.boosted,
      phase: this.phase,
      grade: this.grade,
      products: this.products.map((p) => p.state),
      recoveryBurstLeft: this.recoveryBurstLeft,
      pressure: this.pressure(),
    };
  }

  private countAt(station: StationId): number {
    return this.products.filter(
      (p) => p.state.kind === 'at' && p.state.station === station,
    ).length;
  }

  step(dt: number): void {
    if (this.phase !== 'running') return;
    if (dt <= 0) return;

    this.elapsed += dt;
    if (this.recoveryBurstLeft > 0) {
      this.recoveryBurstLeft = Math.max(0, this.recoveryBurstLeft - dt);
    }
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
    const moveDur = this.moveDuration();
    for (const p of this.products) {
      if (p.state.kind === 'moving') {
        const t = p.state.t + dt / moveDur;
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
    const period = this.sourcePeriod();
    while (
      this.sourceAcc >= period &&
      this.products.length < this.config.maxProducts
    ) {
      this.sourceAcc -= period;
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
    if (to !== 'sink' && to !== 'buffer' && this.countAt(to) > 0) {
      return;
    }

    product.state = { kind: 'moving', from, to, t: 0 };
  }

  private updateJam(dt: number): void {
    for (const p of this.products) {
      if (p.state.kind === 'at' && p.state.station === 'sink') {
        this.delivered += 1;
        this.cash += this.config.payoutPerDelivery;
        this.emit({ type: 'productDelivered', total: this.delivered });
        p.state = { kind: 'idle' };
      }
    }
    this.products = this.products.filter((p) => p.state.kind !== 'idle');

    this.tryDepart('source');
    if (this.procABusy === 0) this.tryDepart('procA');
    if (
      this.countAt('buffer') > 0 &&
      this.countAt('procB') === 0 &&
      this.procBBusy === 0
    ) {
      const waiting = this.products.find(
        (p) => p.state.kind === 'at' && p.state.station === 'buffer',
      );
      if (waiting) {
        waiting.state = { kind: 'moving', from: 'buffer', to: 'procB', t: 0 };
      }
    }
    if (this.procBBusy === 0) this.tryDepart('procB');

    const congested =
      this.countAt('buffer') >= this.config.jamBufferThreshold && !this.boosted;
    if (!this.boosted) {
      if (congested && !this.jamActive) {
        this.jamActive = true;
        this.emit({ type: 'jamStart' });
      }
      if (this.jamActive) {
        this.jamSec += dt;
        if (this.jamSec > 4 && this.spillCount < this.config.spillCap) {
          this.maybeSpill();
        }
      }
    } else if (this.jamActive) {
      this.jamActive = false;
      this.emit({ type: 'flowRecovered' });
    }
  }

  private maybeSpill(): void {
    if (this.spillCount >= this.config.spillCap) return;
    if (!this.jamActive && this.countAt('buffer') < this.config.bufferCapacity)
      return;
    const stuck = this.products.find(
      (p) => p.state.kind === 'at' && (p.state.station === 'procA' || p.state.station === 'buffer'),
    );
    if (!stuck) return;
    this.spillCount += 1;
    // Pile around the stressed processor (procB) — readable jam cause.
    stuck.state = {
      kind: 'spill',
      edgeX: -0.2 + this.spillCount * 0.1,
      age: 0,
    };
    this.emit({ type: 'spill', count: this.spillCount });
  }
}

