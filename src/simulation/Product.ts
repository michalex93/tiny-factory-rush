export type ProductFlowState =
  | 'waiting'
  | 'moving'
  | 'processing'
  | 'completed';

let nextProductId = 1;

export function resetProductIds(): void {
  nextProductId = 1;
}

/** Token moving through SOURCE → machines/buffers → SINK. */
export class Product {
  readonly id: number;
  flowState: ProductFlowState;
  color: number;
  golden: boolean;
  createdAtMs: number;
  completedAtMs: number | null = null;

  constructor(color = 0xc4a574, golden = false, createdAtMs = 0) {
    this.id = nextProductId++;
    this.flowState = 'waiting';
    this.color = color;
    this.golden = golden;
    this.createdAtMs = createdAtMs;
  }

  markCompleted(nowMs: number): void {
    this.flowState = 'completed';
    this.completedAtMs = nowMs;
  }

  get cycleTimeMs(): number | null {
    if (this.completedAtMs === null) return null;
    return this.completedAtMs - this.createdAtMs;
  }
}
