export type FactoryInputSource = 'xr' | 'dev-keyboard' | 'automation';

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

/** True only when URL has ?dev=1 — keeps B / __factoryApplyBoost off the hero path. */
export function isDevFallbackEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('dev') === '1';
  } catch {
    return false;
  }
}
