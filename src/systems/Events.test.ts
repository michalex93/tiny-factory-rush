import { describe, expect, it } from 'vitest';
import { Events } from './Events';
import { EVENTS } from '../config/balance';

describe('Events', () => {
  it('applies production boost multiplier', () => {
    const ev = new Events({
      boostCooldownMs: 0,
      overdriveCooldownMs: 999_999,
      active: null,
    });
    ev.update(16);
    expect(ev.active?.kind).toBe('productionBoost');
    expect(ev.productionMult).toBe(EVENTS.productionBoost.mult);
  });

  it('applies overdrive to one machine', () => {
    const ev = new Events({
      boostCooldownMs: 999_999,
      overdriveCooldownMs: 0,
      active: null,
    });
    ev.update(16);
    expect(ev.active?.kind).toBe('overdrive');
    const id = ev.active!.machineId!;
    expect(ev.machineSpeedMult(id)).toBe(EVENTS.overdrive.speedMult);
    const other = ((id + 1) % 3) as 0 | 1 | 2;
    expect(ev.machineSpeedMult(other)).toBe(1);
  });

  it('manual trigger for rewarded-ad hook', () => {
    const ev = new Events({
      boostCooldownMs: 999_999,
      overdriveCooldownMs: 999_999,
      active: null,
    });
    expect(ev.trigger('productionBoost')).toBe(true);
    expect(ev.active?.kind).toBe('productionBoost');
    expect(ev.trigger('overdrive')).toBe(false); // already active
  });

  it('suppress blocks multipliers and freezes cooldowns', () => {
    const attempts: string[] = [];
    const ev = new Events({
      boostCooldownMs: 0,
      overdriveCooldownMs: 999_999,
      active: null,
    });
    ev.hooks.onSuppressedAttempt = (k) => attempts.push(k);
    ev.suppress();
    ev.update(1000);
    expect(ev.active).toBeNull();
    expect(ev.productionMult).toBe(1);
    expect(ev.trigger('productionBoost')).toBe(false);
    expect(attempts).toContain('productionBoost');
  });

  it('resume restores firstDelay and allows boosts', () => {
    const ev = new Events({
      boostCooldownMs: 0,
      overdriveCooldownMs: 999_999,
      active: null,
    });
    ev.suppress();
    ev.resume();
    expect(ev.suppressed).toBe(false);
    ev.update(16);
    // firstDelay was reset — should not fire immediately
    expect(ev.active).toBeNull();
    expect(ev.trigger('productionBoost')).toBe(true);
    expect(ev.productionMult).toBe(EVENTS.productionBoost.mult);
  });

  it('expires active boost', () => {
    const ev = new Events({
      boostCooldownMs: 999_999,
      overdriveCooldownMs: 999_999,
      active: {
        kind: 'productionBoost',
        remainingMs: 100,
      },
    });
    ev.update(150);
    expect(ev.active).toBeNull();
    expect(ev.productionMult).toBe(1);
  });
});
