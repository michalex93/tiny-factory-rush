export interface StatsSnapshot {
  sessionTimeMs: number;
  lifetimeTimeMs: number;
  productsCrafted: number;
  upgradesBought: number;
  taps: number;
  totalCoinsEarned: number;
  maxProductUnlocked: string;
}

/**
 * Local-only analytics for balancing and CrazyGames prep.
 */
export class Stats {
  sessionTimeMs = 0;
  lifetimeTimeMs = 0;
  productsCrafted = 0;
  upgradesBought = 0;
  taps = 0;
  totalCoinsEarned = 0;
  maxProductUnlocked = 'boxes';

  update(dtMs: number): void {
    this.sessionTimeMs += dtMs;
    this.lifetimeTimeMs += dtMs;
  }

  recordSale(amount: number): void {
    this.productsCrafted += 1;
    this.totalCoinsEarned += amount;
  }

  recordUpgrade(): void {
    this.upgradesBought += 1;
  }

  recordTap(): void {
    this.taps += 1;
  }

  setMaxProduct(id: string): void {
    this.maxProductUnlocked = id;
  }

  snapshot(): StatsSnapshot {
    return {
      sessionTimeMs: this.sessionTimeMs,
      lifetimeTimeMs: this.lifetimeTimeMs,
      productsCrafted: this.productsCrafted,
      upgradesBought: this.upgradesBought,
      taps: this.taps,
      totalCoinsEarned: this.totalCoinsEarned,
      maxProductUnlocked: this.maxProductUnlocked,
    };
  }

  load(data: Partial<StatsSnapshot> | undefined): void {
    if (!data) return;
    this.lifetimeTimeMs = data.lifetimeTimeMs ?? 0;
    this.productsCrafted = data.productsCrafted ?? 0;
    this.upgradesBought = data.upgradesBought ?? 0;
    this.taps = data.taps ?? 0;
    this.totalCoinsEarned = data.totalCoinsEarned ?? 0;
    this.maxProductUnlocked = data.maxProductUnlocked ?? 'boxes';
    this.sessionTimeMs = 0;
  }
}
