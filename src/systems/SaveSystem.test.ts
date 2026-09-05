import { describe, expect, it, beforeEach } from 'vitest';
import { validateSave, SaveSystem, type SaveData } from './SaveSystem';
import { SAVE_VERSION } from '../config/balance';

function validSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    economy: {
      coins: 100,
      totalEarned: 200,
      productsSold: 10,
      currentProduct: 'boxes',
    },
    upgrades: {
      levels: {
        0: { speed: 1, buffer: 0, value: 0 },
        1: { speed: 0, buffer: 0, value: 0 },
        2: { speed: 0, buffer: 0, value: 0 },
      },
      totalPurchased: 1,
    },
    progression: { unlocked: ['boxes'] },
    audio: { muted: false },
    stats: {
      sessionTimeMs: 0,
      lifetimeTimeMs: 5000,
      productsCrafted: 10,
      upgradesBought: 1,
      taps: 3,
      totalCoinsEarned: 200,
      maxProductUnlocked: 'boxes',
    },
    ...overrides,
  };
}

describe('SaveSystem validateSave', () => {
  it('accepts valid v3 save', () => {
    expect(validateSave(validSave())).not.toBeNull();
  });

  it('accepts legacy v4 and rewrites to SAVE_VERSION', () => {
    const v4 = validSave({ version: 4 as typeof SAVE_VERSION });
    const data = validateSave(v4);
    expect(data).not.toBeNull();
    expect(data!.version).toBe(SAVE_VERSION);
  });

  it('rejects corrupt shapes', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave({})).toBeNull();
  });

  it('migrates v2 capacity/profit to buffer/value', () => {
    const v2 = {
      version: 2,
      savedAt: Date.now(),
      economy: {
        coins: 50,
        totalEarned: 80,
        productsSold: 5,
        currentProduct: 'boxes',
      },
      upgrades: {
        levels: {
          0: { speed: 2, capacity: 3, profit: 1 },
          1: { speed: 0, capacity: 0, profit: 0 },
          2: { speed: 0, capacity: 0, profit: 0 },
        },
        totalPurchased: 6,
      },
      progression: { unlocked: ['boxes'] },
      audio: { muted: false },
      stats: {
        sessionTimeMs: 0,
        lifetimeTimeMs: 1,
        productsCrafted: 1,
        upgradesBought: 1,
        taps: 0,
        totalCoinsEarned: 80,
        maxProductUnlocked: 'boxes',
      },
    };
    const data = validateSave(v2);
    expect(data).not.toBeNull();
    expect(data!.upgrades.levels[0].buffer).toBe(3);
    expect(data!.upgrades.levels[0].value).toBe(1);
    expect(data!.version).toBe(SAVE_VERSION);
  });

  it('clamps negative coins', () => {
    const data = validateSave(
      validSave({
        economy: {
          coins: -10,
          totalEarned: 0,
          productsSold: 0,
          currentProduct: 'boxes',
        },
      }),
    );
    expect(data!.economy.coins).toBe(0);
  });
});

describe('SaveSystem roundtrip', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        get length() {
          return memory.size;
        },
        clear: () => memory.clear(),
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => memory.set(k, String(v)),
        removeItem: (k: string) => memory.delete(k),
        key: (i: number) => [...memory.keys()][i] ?? null,
      },
      configurable: true,
    });
  });

  it('saves and loads', () => {
    let applied: SaveData | null = null;
    const state = validSave();
    const sys = new SaveSystem(
      {
        getState: () => ({
          economy: state.economy,
          upgrades: state.upgrades,
          progression: state.progression,
          audio: state.audio,
          stats: state.stats,
          factory: state.factory,
        }),
        applyState: (d) => {
          applied = d;
        },
      },
      60_000,
    );
    expect(sys.save()).toBe(true);
    expect(sys.load()).not.toBeNull();
    expect(applied!.economy.coins).toBe(100);
  });
});
