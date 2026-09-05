import { Product } from './Product';
import { BUFFER_BASE, type BufferId } from '../config/balance';

/**
 * Finite capacity buffer between stations.
 * Full ⇒ upstream BLOCKED. Empty ⇒ downstream may STARVE.
 */
export class BufferStation {
  readonly id: BufferId;
  capacity: number;
  readonly items: Product[] = [];

  constructor(id: BufferId) {
    this.id = id;
    this.capacity = BUFFER_BASE.capacity[id];
  }

  get length(): number {
    return this.items.length;
  }

  get isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get fillRatio(): number {
    if (this.capacity <= 0) return 1;
    return this.items.length / this.capacity;
  }

  canAccept(): boolean {
    return !this.isFull;
  }

  enqueue(product: Product): boolean {
    if (!this.canAccept()) return false;
    product.flowState = 'waiting';
    this.items.push(product);
    return true;
  }

  peek(): Product | undefined {
    return this.items[0];
  }

  dequeue(): Product | undefined {
    return this.items.shift();
  }

  clear(): void {
    this.items.length = 0;
  }

  serialize(): {
    capacity: number;
    items: { color: number; golden: boolean; createdAtMs: number }[];
  } {
    return {
      capacity: this.capacity,
      items: this.items.map((p) => ({
        color: p.color,
        golden: p.golden,
        createdAtMs: p.createdAtMs,
      })),
    };
  }
}
