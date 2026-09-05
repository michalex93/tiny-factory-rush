import {
  PRODUCTS,
  PRODUCT_ORDER,
  nextProductId,
  type ProductId,
} from '../config/balance';
import type { Economy } from './Economy';
import type { Stats } from './Stats';

export interface UnlockResult {
  ok: boolean;
  productId?: ProductId;
  reason?: string;
}

/** First Toys unlock (and any product with unlockCost 0) spends no cash. */
export function unlockCostsCash(id: ProductId): boolean {
  return PRODUCTS[id].unlockCost > 0;
}

/**
 * Product unlock progression — same factory, new value tier.
 */
export class Progression {
  unlocked: ProductId[];

  constructor(unlocked?: ProductId[]) {
    this.unlocked = unlocked?.length ? [...unlocked] : ['boxes'];
  }

  isUnlocked(id: ProductId): boolean {
    return this.unlocked.includes(id);
  }

  get currentMax(): ProductId {
    let best: ProductId = 'boxes';
    for (const id of PRODUCT_ORDER) {
      if (this.isUnlocked(id)) best = id;
    }
    return best;
  }

  get nextUnlock(): ProductId | null {
    return nextProductId(this.currentMax);
  }

  canUnlock(id: ProductId, economy: Economy): UnlockResult {
    if (this.isUnlocked(id)) {
      return { ok: false, reason: 'already' };
    }
    const def = PRODUCTS[id];
    if (economy.totalEarned < def.unlockAtEarned) {
      return { ok: false, reason: 'progress' };
    }
    if (unlockCostsCash(id) && !economy.canAfford(def.unlockCost)) {
      return { ok: false, reason: 'coins' };
    }
    // Must unlock in order
    const next = this.nextUnlock;
    if (next !== id) {
      return { ok: false, reason: 'order' };
    }
    return { ok: true, productId: id };
  }

  tryUnlock(id: ProductId, economy: Economy, stats?: Stats): UnlockResult {
    const check = this.canUnlock(id, economy);
    if (!check.ok) return check;
    const cost = PRODUCTS[id].unlockCost;
    if (cost > 0 && !economy.spend(cost)) {
      return { ok: false, reason: 'coins' };
    }
    // cost === 0: do not touch cash
    this.unlocked.push(id);
    economy.currentProduct = id;
    stats?.setMaxProduct(id);
    return { ok: true, productId: id };
  }

  /** Campaign / migration unlock — no cash, no earned gate. Idempotent. */
  unlockProduct(id: ProductId, economy?: Economy, stats?: Stats): boolean {
    if (this.isUnlocked(id)) {
      if (economy) economy.currentProduct = id;
      return false;
    }
    const next = this.nextUnlock;
    if (next !== id) return false;
    this.unlocked.push(id);
    if (economy) economy.currentProduct = id;
    stats?.setMaxProduct(id);
    return true;
  }

  /** Switch active product line among unlocked ones. */
  setActive(id: ProductId, economy: Economy): boolean {
    if (!this.isUnlocked(id)) return false;
    economy.currentProduct = id;
    return true;
  }

  snapshot(): { unlocked: ProductId[] } {
    return { unlocked: [...this.unlocked] };
  }
}
