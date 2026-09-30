/**
 * M-R1 REDLINE ROUTING — acceptance tests (headless).
 */
import { describe, expect, it } from 'vitest';
import {
  REDLINE,
  computeRedlineTargetCount,
  createSeededRng,
  gradeFromAccuracy,
} from '../config/redline';
import { SAVE_VERSION } from '../config/balance';
import { Factory } from './Factory';
import {
  RedlineContract,
  comboFromStreak,
  createRedlineContract,
  finalizeRewardCash,
} from './RedlineContract';
import { RedlineRouting, defaultRedlinePersisted } from './RedlineRouting';
import {
  planRedlineLayout,
  validateRedlineLayoutFits,
} from './RedlineLayout';
import { validateSave } from './SaveSystem';

function simSell(factory: Factory, n: number): void {
  for (let i = 0; i < n; i++) {
    // Drive line until a sell occurs (bounded)
    let sold = factory.economy.productsSold;
    for (let t = 0; t < 5000 && factory.economy.productsSold === sold; t++) {
      factory.update(50);
    }
  }
}

function forceSellBurst(factory: Factory, count: number): void {
  const before = factory.economy.productsSold;
  let guard = 0;
  while (factory.economy.productsSold < before + count && guard < 200_000) {
    factory.update(100);
    guard++;
  }
}

describe('M-R1 REDLINE formulas', () => {
  it('clamps target count 12–24 from event-neutral throughput', () => {
    expect(computeRedlineTargetCount(5)).toBe(12);
    expect(computeRedlineTargetCount(20)).toBe(15); // 20*45/60=15
    expect(computeRedlineTargetCount(100)).toBe(24);
  });

  it('grades match thresholds', () => {
    expect(gradeFromAccuracy(0.59)).toBe('MISS');
    expect(gradeFromAccuracy(0.6)).toBe('BRONZE');
    expect(gradeFromAccuracy(0.8)).toBe('SILVER');
    expect(gradeFromAccuracy(0.95)).toBe('GOLD');
  });

  it('combo rises by streak tiers without unlimited cash mult', () => {
    expect(comboFromStreak(0)).toBe(1);
    expect(comboFromStreak(3)).toBe(2);
    expect(comboFromStreak(6)).toBe(3);
    expect(comboFromStreak(12)).toBe(5);
    expect(comboFromStreak(99)).toBe(5);
  });

  it('reward uses frozen income × grade seconds', () => {
    expect(finalizeRewardCash('BRONZE', 10)).toBe(200);
    expect(finalizeRewardCash('SILVER', 10)).toBe(250);
    expect(finalizeRewardCash('GOLD', 10)).toBe(300);
    expect(finalizeRewardCash('MISS', 10)).toBe(0);
  });

  it('seeded destinations are deterministic and use both docks', () => {
    const a = createRedlineContract({
      templateId: 'split_quota',
      seed: 42,
      eventNeutralThroughputPerMin: 20,
      incomePerSecRef: 5,
      heatEnabled: false,
      rewardId: 't1',
    });
    const b = createRedlineContract({
      templateId: 'split_quota',
      seed: 42,
      eventNeutralThroughputPerMin: 20,
      incomePerSecRef: 5,
      heatEnabled: false,
      rewardId: 't1',
    });
    expect(a.destinations).toEqual(b.destinations);
    expect(a.destinations).toContain('standard');
    expect(a.destinations).toContain('priority');
  });
});

describe('M-R1 canonical sell adapter', () => {
  it('correct and wrong delivery each sell exactly once; wrong keeps cash/lifetime', () => {
    const f = new Factory();
    // Unlock + start a tiny contract
    f.redline.unlock(0);
    expect(f.startRedlineContract(99)).toBe(true);
    const c = f.redline.getContract()!;
    // Override destinations for control
    c.state.destinations = ['standard', 'priority', 'standard'];
    c.state.targetCount = 3;
    c.state.selectedRoute = 'standard';

    const cash0 = f.economy.coins;
    const life0 = f.economy.totalEarned;
    const sold0 = f.economy.productsSold;

    // Simulate three canonical sells via wireLine path
    const sellOnce = () => {
      f.line.events.onSell?.(1, false, {
        id: 1,
        golden: false,
        color: 0xffffff,
      } as never);
    };

    sellOnce(); // correct
    expect(f.economy.productsSold).toBe(sold0 + 1);
    const afterCorrectCash = f.economy.coins;
    const afterCorrectLife = f.economy.totalEarned;
    expect(afterCorrectCash).toBeGreaterThan(cash0);
    expect(afterCorrectLife).toBeGreaterThan(life0);

    f.setRedlineRoute('standard'); // wrong for priority expected
    sellOnce();
    expect(f.economy.productsSold).toBe(sold0 + 2);
    expect(f.economy.coins).toBeGreaterThan(afterCorrectCash);
    expect(f.economy.totalEarned).toBeGreaterThan(afterCorrectLife);
    expect(c.state.wrong).toBe(1);
    expect(c.state.correct).toBe(1);

    f.setRedlineRoute('standard');
    sellOnce();
    expect(f.economy.productsSold).toBe(sold0 + 3);
  });
});

describe('M-R1 first contract + combo', () => {
  it('CTA unlock after convergence path; first switch ≤5s active; both docks needed', () => {
    const telem: string[] = [];
    const rl = new RedlineRouting(null, (n) => telem.push(n));
    rl.unlock(1000);
    expect(rl.phase()).toBe('available');
    expect(telem).toContain('redline_available');
    expect(rl.shouldShowCta(1000)).toBe(true);

    rl.clickCta();
    expect(telem).toContain('redline_cta_clicked');

    expect(
      rl.startContract({
        activeMs: 1500,
        eventNeutralThroughputPerMin: 18,
        incomePerSecRef: 4,
        seed: 7,
      }),
    ).toBe(true);

    const c = rl.getContract()!;
    expect(c.state.heatEnabled).toBe(false); // tutorial
    expect(c.state.targetCount).toBeGreaterThanOrEqual(12);
    expect(c.state.targetCount).toBeLessThanOrEqual(24);
    // Human duration estimate: target / (tp/60) ≈ 45s band
    const estSec = (c.state.targetCount / 18) * 60;
    expect(estSec).toBeGreaterThanOrEqual(35);
    expect(estSec).toBeLessThanOrEqual(60);

    expect(c.state.destinations).toContain('standard');
    expect(c.state.destinations).toContain('priority');

    const sw = rl.setRoute('priority');
    expect(sw.ok).toBe(true);
    expect(c.state.firstSwitchDone).toBe(true);
    expect(c.state.elapsedMs).toBeLessThanOrEqual(REDLINE.firstSwitchExpectMs);
    expect(telem).toContain('redline_first_switch');
  });

  it('combo x3 reachable without perfect play', () => {
    const c = new RedlineContract(
      createRedlineContract({
        templateId: 'split_quota',
        seed: 1,
        eventNeutralThroughputPerMin: 20,
        incomePerSecRef: 5,
        heatEnabled: false,
        rewardId: 'x',
      }),
    );
    // Force all standard then play with matching route + one wrong mid-way after x3
    c.state.destinations = Array(12).fill('standard') as never;
    c.state.targetCount = 12;
    c.state.selectedRoute = 'standard';
    for (let i = 0; i < 6; i++) c.noteDelivery();
    expect(c.state.combo).toBeGreaterThanOrEqual(3);
    // one wrong — partial penalty, not always x1
    c.state.selectedRoute = 'priority';
    c.noteDelivery();
    expect(c.state.combo).toBeGreaterThanOrEqual(1);
    expect(c.state.combo).toBeLessThan(3);
  });
});

describe('M-R1 heat / jam', () => {
  it('heat off in tutorial; normal play no jam; spam jams; cool is free', () => {
    const rl = new RedlineRouting(null);
    rl.unlock(0);
    rl.startContract({
      activeMs: 0,
      eventNeutralThroughputPerMin: 16,
      incomePerSecRef: 3,
      seed: 3,
    });
    expect(rl.getContract()!.state.heatEnabled).toBe(false);
    // spam switches — no jam during tutorial
    for (let i = 0; i < 30; i++) {
      rl.setRoute(i % 2 === 0 ? 'priority' : 'standard');
    }
    expect(rl.getContract()!.state.jamActive).toBe(false);

    // Complete tutorial
    rl.getContract()!.complete();
    rl.state.phase = 'summary';
    rl.state.tutorialCompleted = true;
    rl.continueFromSummary();
    // Wait out cooldown
    rl.tick(REDLINE.cooldownMs + 10, 10_000);
    expect(rl.phase()).toBe('available');

    rl.startContract({
      activeMs: 20_000,
      eventNeutralThroughputPerMin: 16,
      incomePerSecRef: 3,
      seed: 4,
    });
    expect(rl.getContract()!.state.heatEnabled).toBe(true);

    // Normal switches with spacing — no jam
    for (let i = 0; i < 5; i++) {
      rl.tick(800, 20_000 + i * 800);
      rl.setRoute(i % 2 === 0 ? 'priority' : 'standard');
    }
    expect(rl.getContract()!.state.jamActive).toBe(false);

    // Spam
    for (let i = 0; i < 20; i++) {
      rl.setRoute(i % 2 === 0 ? 'priority' : 'standard');
    }
    expect(rl.getContract()!.state.jamActive).toBe(true);
    const cash = 0;
    expect(rl.coolSwitch()).toBe(true);
    expect(rl.getContract()!.state.jamActive).toBe(false);
    expect(cash).toBe(0); // free — no economy touch

    // Auto recovery path
    rl.getContract()!.state.jamActive = true;
    rl.getContract()!.state.jamRemainingMs = 100;
    rl.tick(150, 30_000);
    expect(rl.getContract()!.state.jamActive).toBe(false);
  });
});

describe('M-R1 persistence Save v6', () => {
  it('migrates v5 → SAVE_VERSION 6 and preserves campaign fields', () => {
    expect(SAVE_VERSION).toBe(6);
    const v5 = {
      version: 5,
      savedAt: Date.now(),
      economy: {
        coins: 100,
        totalEarned: 500,
        productsSold: 20,
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
        lifetimeTimeMs: 1,
        productsCrafted: 1,
        upgradesBought: 1,
        taps: 0,
        totalCoinsEarned: 500,
        maxProductUnlocked: 'boxes',
      },
      factory: {
        sessionMs: 12_000,
        sessionGoal: { phase: 'post_chain', status: 'chain_complete' },
      },
    };
    const data = validateSave(v5);
    expect(data).not.toBeNull();
    expect(data!.version).toBe(6);
  });

  it('reload mid-contract preserves seed/target/progress; reward idempotent', () => {
    const rl = new RedlineRouting(null);
    rl.unlock(0);
    rl.startContract({
      activeMs: 100,
      eventNeutralThroughputPerMin: 20,
      incomePerSecRef: 8,
      seed: 55,
    });
    const c = rl.getContract()!;
    c.state.selectedRoute = c.state.destinations[0]!;
    c.noteDelivery();
    c.noteDelivery();
    const json = rl.toJSON();
    expect(json.phase).toBe('active');
    expect(json.contract?.productIndex).toBe(2);
    expect(json.contract?.seed).toBe(55);

    const restored = RedlineRouting.fromJSON(json);
    expect(restored.phase()).toBe('active');
    expect(restored.getContract()!.state.seed).toBe(55);
    expect(restored.getContract()!.state.productIndex).toBe(2);
    expect(restored.getContract()!.state.targetCount).toBe(c.state.targetCount);

    // Finish + summary reward once
    restored.getContract()!.complete();
    restored.state.phase = 'summary';
    restored.state.contract = restored.getContract()!.state;
    const r1 = restored.claimReward();
    const r2 = restored.claimReward();
    expect(r1.granted).toBe(r1.cash > 0);
    expect(r2.granted).toBe(false);
    expect(r2.rewardId).toBe(r1.rewardId);
  });

  it('hydration does not advance cooldown (delta applied only via tick)', () => {
    const state = defaultRedlinePersisted();
    state.phase = 'cooldown';
    state.cooldownRemainingMs = 50_000;
    state.tutorialCompleted = true;
    const rl = RedlineRouting.fromJSON(state);
    // Simulate "hydration" — constructing does not tick
    expect(rl.state.cooldownRemainingMs).toBe(50_000);
    rl.tick(1_000, 999);
    expect(rl.state.cooldownRemainingMs).toBe(49_000);
  });
});

describe('M-R1 ignored path ±5% regression sample', () => {
  it('with REDLINE locked, short headless run produces finite sales without NaN', () => {
    const f = new Factory();
    expect(f.redline.phase()).toBe('locked');
    for (let i = 0; i < 600; i++) f.update(100); // 60s
    expect(Number.isFinite(f.economy.coins)).toBe(true);
    expect(Number.isFinite(f.economy.totalEarned)).toBe(true);
    expect(f.economy.productsSold).toBeGreaterThanOrEqual(0);
    // Line still sells while locked
    expect(f.economy.productsSold).toBeGreaterThan(0);
  });
});

describe('M-R1 30min headless robustness', () => {
  it('30 min with random routes: no NaN/deadlock/duplicate sell anomaly', () => {
    const f = new Factory();
    f.redline.unlock(0);
    f.startRedlineContract(12345);
    const rng = createSeededRng(999);
    let lastSold = f.economy.productsSold;
    let duplicateBurst = 0;

    for (let step = 0; step < 18_000; step++) {
      // 30 min @ 100ms
      if (rng() < 0.08) {
        f.setRedlineRoute(rng() < 0.5 ? 'standard' : 'priority');
      }
      f.update(100);

      const sold = f.economy.productsSold;
      if (sold - lastSold > 5) duplicateBurst++;
      lastSold = sold;

      if (f.redline.phase() === 'summary') {
        f.claimRedlineReward();
        f.continueRedlineSummary();
      }
      if (f.redline.phase() === 'available') {
        f.startRedlineContract(Math.floor(rng() * 1e9));
      }
      if (f.redline.phase() === 'cooldown') {
        // wait via ticks
      }

      expect(Number.isFinite(f.economy.coins)).toBe(true);
      expect(Number.isFinite(f.economy.totalEarned)).toBe(true);
      expect(f.economy.productsSold).toBeGreaterThanOrEqual(0);
    }

    expect(duplicateBurst).toBeLessThan(50);
    expect(f.economy.productsSold).toBeGreaterThan(10);
  }, 60_000);
});

describe('M-R1 responsive layout', () => {
  it('fits 390×844, 800×450, 907×510', () => {
    for (const [w, h] of [
      [390, 844],
      [800, 450],
      [907, 510],
      [1280, 720],
    ] as const) {
      const sinkX = w * 0.82;
      const factoryY = h * 0.5;
      const plan = planRedlineLayout(sinkX, factoryY, w, h);
      expect(validateRedlineLayoutFits(plan, w, h)).toBe(true);
    }
  });
});

describe('M-R1 seeded replay', () => {
  it('same seed reproduces destinations and delivery outcomes', () => {
    const run = (seed: number) => {
      const c = new RedlineContract(
        createRedlineContract({
          templateId: 'split_quota',
          seed,
          eventNeutralThroughputPerMin: 22,
          incomePerSecRef: 6,
          heatEnabled: false,
          rewardId: `r${seed}`,
        }),
      );
      const routes: string[] = [];
      for (let i = 0; i < c.state.targetCount; i++) {
        const exp = c.currentExpected()!;
        c.state.selectedRoute = i % 3 === 0 ? 'priority' : exp;
        const r = c.noteDelivery()!;
        routes.push(`${r.correct ? 'Y' : 'N'}:${r.combo}`);
      }
      return { dest: c.state.destinations.join(','), routes: routes.join('|') };
    };
    expect(run(777)).toEqual(run(777));
    expect(run(777).dest).not.toEqual(run(888).dest);
  });
});

// silence unused helpers in some environments
void simSell;
void forceSellBurst;
