import {
  ECONOMY,
  PRODUCTS,
  type ProductId,
} from '../config/balance';

export interface EconomySnapshot {
  coins: number;
  totalEarned: number;
  productsSold: number;
  currentProduct: ProductId;
}

/**
 * Centralized economy: coins, income tracking, product value.
 */
export class Economy {
  coins: number;
  totalEarned: number;
  productsSold: number;
  currentProduct: ProductId;
  private recentEarnings: { t: number; amount: number }[] = [];
  private clockMs = 0;

  constructor(snapshot?: Partial<EconomySnapshot>) {
    this.coins = snapshot?.coins ?? ECONOMY.startingCoins;
    this.totalEarned = snapshot?.totalEarned ?? 0;
    this.productsSold = snapshot?.productsSold ?? 0;
    this.currentProduct = snapshot?.currentProduct ?? 'boxes';
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    const cutoff = this.clockMs - ECONOMY.incomeWindowMs;
    // In-place prune (avoid allocating a new array every frame)
    let write = 0;
    for (let i = 0; i < this.recentEarnings.length; i++) {
      const e = this.recentEarnings[i]!;
      if (e.t >= cutoff) {
        this.recentEarnings[write++] = e;
      }
    }
    this.recentEarnings.length = write;
  }

  canAfford(cost: number): boolean {
    return this.coins >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.coins -= cost;
    return true;
  }

  add(amount: number): void {
    if (amount <= 0) return;
    this.coins += amount;
    this.totalEarned += amount;
    this.recentEarnings.push({ t: this.clockMs, amount });
  }

  /**
   * Record a sale with optional cash split (M-C Expansion Fund).
   * totalAmount always counts toward lifetime earned; only cashAmount hits wallet.
   */
  creditSale(totalAmount: number, cashAmount: number): void {
    if (totalAmount <= 0) return;
    this.coins += Math.max(0, cashAmount);
    this.totalEarned += totalAmount;
    this.productsSold += 1;
    this.recentEarnings.push({ t: this.clockMs, amount: totalAmount });
  }

  recordSale(amount: number): void {
    this.add(amount);
    this.productsSold += 1;
  }

  /** Estimated coins per second from recent sales window. */
  get incomePerSecond(): number {
    if (this.recentEarnings.length === 0) return 0;
    const sum = this.recentEarnings.reduce((a, e) => a + e.amount, 0);
    return (sum / ECONOMY.incomeWindowMs) * 1000;
  }

  get baseProductValue(): number {
    return PRODUCTS[this.currentProduct].baseValue;
  }

  get productName(): string {
    return PRODUCTS[this.currentProduct].name;
  }

  get productColor(): number {
    return PRODUCTS[this.currentProduct].color;
  }

  snapshot(): EconomySnapshot {
    return {
      coins: this.coins,
      totalEarned: this.totalEarned,
      productsSold: this.productsSold,
      currentProduct: this.currentProduct,
    };
  }
}
