export type FactoryMetricEvent =
  | 'shiftStart'
  | 'firstProduct'
  | 'jamStart'
  | 'interventionStart'
  | 'interventionSuccess'
  | 'flowRecovered'
  | 'productDelivered'
  | 'spill'
  | 'shiftEnd'
  | 'shiftReset'
  | 'grabAttempt'
  | 'grabSuccess'
  | 'release'
  | 'snapSuccess'
  | 'snapRejected';

export type FactoryMetricEntry = {
  t: number;
  event: FactoryMetricEvent;
  detail?: Record<string, unknown>;
};

export class FactoryMetrics {
  readonly entries: FactoryMetricEntry[] = [];

  log(event: FactoryMetricEvent, detail?: Record<string, unknown>): void {
    const t =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.entries.push({ t, event, detail });
    // eslint-disable-next-line no-console
    console.info(`[factory] ${event}`, detail ?? {});
  }
}
