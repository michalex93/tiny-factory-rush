import { describe, expect, it } from 'vitest';
import { Progression, unlockCostsCash } from './Progression';
import { Economy } from './Economy';
import { PRODUCTS } from '../config/balance';

describe('Progression', () => {
  it('starts with boxes unlocked', () => {
    const p = new Progression();
    expect(p.isUnlocked('boxes')).toBe(true);
    expect(p.nextUnlock).toBe('toys');
  });

  it('blocks unlock without earnings gate', () => {
    const p = new Progression();
    const e = new Economy({ coins: 10_000, totalEarned: 0 });
    const r = p.canUnlock('toys', e);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('progress');
  });

  it('unlocks toys for free when earned gate met (no cash required)', () => {
    const p = new Progression();
    const e = new Economy({
      coins: 5,
      totalEarned: PRODUCTS.toys.unlockAtEarned,
    });
    expect(unlockCostsCash('toys')).toBe(false);
    const r = p.tryUnlock('toys', e);
    expect(r.ok).toBe(true);
    expect(p.isUnlocked('toys')).toBe(true);
    expect(e.currentProduct).toBe('toys');
    expect(e.coins).toBe(5);
  });

  it('robots still require cash; smartphones use Expansion Fund (cost 0)', () => {
    const p = new Progression(['boxes', 'toys']);
    const e = new Economy({ coins: 0, totalEarned: 1e9 });
    expect(unlockCostsCash('smartphones')).toBe(false);
    // M-C: Progression would allow free unlock — Factory/McCampaign blocks the button
    expect(p.canUnlock('smartphones', e).ok).toBe(true);

    const p2 = new Progression(['boxes', 'toys', 'smartphones']);
    expect(unlockCostsCash('robots')).toBe(true);
    expect(p2.canUnlock('robots', e).ok).toBe(false);
    expect(p2.canUnlock('robots', e).reason).toBe('coins');
  });

  it('requires sequential unlock order', () => {
    const p = new Progression();
    const e = new Economy({ coins: 1e9, totalEarned: 1e9 });
    expect(p.canUnlock('robots', e).ok).toBe(false);
  });
});
