export type KillTestMetricEvent =
  | 'grabAttempt'
  | 'grabSuccess'
  | 'release'
  | 'snapSuccess'
  | 'snapRejected'
  | 'falseActivation'
  | 'trackingLost'
  | 'trackingRecovered'
  | 'interactionDuration';

export type MetricRecord = {
  event: KillTestMetricEvent;
  t: number;
  detail?: Record<string, unknown>;
};

/**
 * Append-only interaction log for later EXP-XR-01 / EXP-XR-11 analysis.
 * Simulator sessions must not invent human-performance rates.
 */
export class KillTestMetrics {
  readonly records: MetricRecord[] = [];

  log(event: KillTestMetricEvent, detail?: Record<string, unknown>): void {
    const record: MetricRecord = {
      event,
      t: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      detail,
    };
    this.records.push(record);
    // eslint-disable-next-line no-console
    console.info(`[killtest][metric] ${event}`, detail ?? {});
  }

  counts(): Record<KillTestMetricEvent, number> {
    const base: Record<KillTestMetricEvent, number> = {
      grabAttempt: 0,
      grabSuccess: 0,
      release: 0,
      snapSuccess: 0,
      snapRejected: 0,
      falseActivation: 0,
      trackingLost: 0,
      trackingRecovered: 0,
      interactionDuration: 0,
    };
    for (const r of this.records) {
      base[r.event] += 1;
    }
    return base;
  }

  toJSON(): MetricRecord[] {
    return [...this.records];
  }
}
