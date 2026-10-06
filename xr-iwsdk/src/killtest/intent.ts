export type TrackingState = 'tracked' | 'grace' | 'lost';

export type IntentSample = {
  t: number;
  grabbing: boolean;
};

/**
 * Sliding intent buffer. Window length is TUNABLE — not a copied design constant.
 */
export class IntentHistoryBuffer {
  private samples: IntentSample[] = [];

  constructor(private windowMs: number) {}

  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
    this.prune(performanceNowFallback());
  }

  push(t: number, grabbing: boolean): void {
    this.samples.push({ t, grabbing });
    this.prune(t);
  }

  /** True if any sample inside the window reported grabbing. */
  hadGrabIntent(now: number): boolean {
    this.prune(now);
    return this.samples.some((s) => s.grabbing);
  }

  recentGrabFraction(now: number): number {
    this.prune(now);
    if (this.samples.length === 0) return 0;
    const grabs = this.samples.filter((s) => s.grabbing).length;
    return grabs / this.samples.length;
  }

  clear(): void {
    this.samples = [];
  }

  get size(): number {
    return this.samples.length;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.samples.length > 0 && this.samples[0]!.t < cutoff) {
      this.samples.shift();
    }
  }
}

/**
 * Brief tracking-loss state machine with configurable grace.
 * TUNABLE: trackingLossGraceMs
 */
export class TrackingLossMachine {
  private state: TrackingState = 'tracked';
  private lossStartedAt: number | null = null;

  constructor(private graceMs: number) {}

  setGraceMs(graceMs: number): void {
    this.graceMs = graceMs;
  }

  getState(): TrackingState {
    return this.state;
  }

  /**
   * Feed current tracking boolean. Returns transition events for metrics.
   */
  update(now: number, isTracked: boolean): { lost: boolean; recovered: boolean } {
    let lost = false;
    let recovered = false;

    if (isTracked) {
      if (this.state === 'lost' || this.state === 'grace') {
        recovered = this.state === 'lost';
      }
      this.state = 'tracked';
      this.lossStartedAt = null;
      return { lost, recovered };
    }

    if (this.state === 'tracked') {
      this.state = 'grace';
      this.lossStartedAt = now;
      return { lost, recovered };
    }

    if (this.state === 'grace' && this.lossStartedAt != null) {
      if (now - this.lossStartedAt >= this.graceMs) {
        this.state = 'lost';
        lost = true;
      }
    }

    return { lost, recovered };
  }
}

function performanceNowFallback(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
