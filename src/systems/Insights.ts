export type InsightId =
  | 'bottleneck_cleared'
  | 'low_impact_upgrade'
  | 'buffer_tradeoff'
  | 'utilization_not_enough';

export interface InsightDef {
  id: InsightId;
  title: string;
  body: string;
}

export const INSIGHTS: Record<InsightId, InsightDef> = {
  bottleneck_cleared: {
    id: 'bottleneck_cleared',
    title: 'Bottleneck eliminated!',
    body: 'Engineering insight: improving the slowest process increased the output of the whole system.',
  },
  low_impact_upgrade: {
    id: 'low_impact_upgrade',
    title: 'Low operational impact',
    body: 'A faster machine does not improve the system if another station limits production.',
  },
  buffer_tradeoff: {
    id: 'buffer_tradeoff',
    title: 'Engineering insight unlocked',
    body: 'Large buffers reduce blocking but increase WIP.',
  },
  utilization_not_enough: {
    id: 'utilization_not_enough',
    title: 'Engineering insight unlocked',
    body: 'High utilization is not always good if it creates excessive inventory.',
  },
};

/**
 * Tracks which insights were shown; never spam.
 */
export class InsightTracker {
  shown: Set<InsightId> = new Set();

  has(id: InsightId): boolean {
    return this.shown.has(id);
  }

  mark(id: InsightId): InsightDef | null {
    if (this.shown.has(id)) return null;
    this.shown.add(id);
    return INSIGHTS[id];
  }

  snapshot(): InsightId[] {
    return [...this.shown];
  }

  load(ids: InsightId[] | undefined): void {
    this.shown = new Set(ids ?? []);
  }
}
