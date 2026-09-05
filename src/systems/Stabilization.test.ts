import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { Telemetry } from './Telemetry';
import { SESSION_GOAL } from '../config/balance';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    const dt = Math.min(step, left);
    factory.update(dt);
    left -= dt;
  }
}

/**
 * Scripted first-session path: clean run → sale → Speed → goal → complete
 * with ≤3 reasonable upgrades and no global x2.
 */
describe('v0.5.0 stabilization — First-Session Industrial Hook', () => {
  it('completes OUTPUT goal without global multipliers (≤3 Speed)', () => {
    const factory = new Factory();
    const telemetry = new Telemetry();
    let suppressedAttempts = 0;
    let maxProductionMult = 1;
    let goalStarted = false;
    let goalSuccess = false;
    let upgradesBought = 0;

    factory.events = {
      onSell: () => telemetry.once('first_sale'),
      onBottleneckShown: () => telemetry.once('bottleneck_shown'),
      onSessionGoalStart: () => {
        goalStarted = true;
        telemetry.once('session_goal_start');
        telemetry.throughputInitial = factory.getThroughputPerMin();
      },
      onSessionGoalProgress: (tp, target) => {
        telemetry.emit('session_goal_progress', { throughput: tp, target });
      },
      onSessionGoalComplete: (success) => {
        goalSuccess = success;
        telemetry.throughputFinal = factory.getThroughputPerMin();
        telemetry.once('session_goal_complete', { success });
      },
      onGlobalEventSuppressed: (kind) => {
        suppressedAttempts += 1;
        telemetry.emit('global_event_suppressed_onboarding', { kind });
      },
      onOnboardingComplete: () => telemetry.once('onboarding_complete'),
    };
    factory.eventsSys.hooks.onSuppressedAttempt = (kind) => {
      factory.events.onGlobalEventSuppressed?.(kind);
    };

    expect(factory.eventsSys.suppressed).toBe(true);

    // Attempt to force x2 — must be blocked during onboarding
    expect(factory.eventsSys.trigger('productionBoost')).toBe(false);
    expect(factory.eventsSys.productionMult).toBe(1);
    expect(suppressedAttempts).toBeGreaterThan(0);

    // Warm line until first sale (no upgrades)
    let safety = 0;
    while (factory.economy.productsSold < 1 && safety < 80) {
      simulate(factory, 1000);
      maxProductionMult = Math.max(maxProductionMult, factory.eventsSys.productionMult);
      safety += 1;
    }
    expect(factory.economy.productsSold).toBeGreaterThanOrEqual(1);
    expect(factory.revealUpgrades()).toBe(true);
    telemetry.once('first_upgrade_view');

    const tpBeforeFirst = factory.getThroughputPerMin();

    // Buy Speed on bottleneck (or M1) up to 3 times as cash allows
    for (let buy = 0; buy < 3; buy++) {
      // Earn toward next Speed if needed
      let earnLoops = 0;
      const mid = factory.suggestedUpgradeMachine();
      while (
        factory.economy.coins < factory.upgrades.costFor(mid, 'speed') &&
        earnLoops < 90
      ) {
      simulate(factory, 1000);
      if (factory.eventsSys.suppressed) {
        maxProductionMult = Math.max(maxProductionMult, factory.eventsSys.productionMult);
      }
      // Keep trying to force boost — must stay blocked until goal done
      if (factory.eventsSys.suppressed) {
        factory.eventsSys.trigger('productionBoost');
      }
      earnLoops += 1;
      }

      const focus = factory.suggestedUpgradeMachine();
      const cost = factory.upgrades.costFor(focus, 'speed');
      if (factory.economy.coins < cost) break;

      const before = factory.getThroughputPerMin();
      expect(factory.buyUpgrade(focus, 'speed')).toBe(true);
      upgradesBought += 1;
      telemetry.upgradesBought = upgradesBought;
      if (upgradesBought === 1) telemetry.once('first_upgrade');

      simulate(factory, 8_000);
      maxProductionMult = Math.max(maxProductionMult, factory.eventsSys.productionMult);

      if (upgradesBought === 1) {
        expect(factory.getThroughputPerMin()).toBeGreaterThan(before * 0.95);
        expect(goalStarted || factory.sessionGoal.isActive || factory.sessionGoal.status === 'success').toBe(
          true,
        );
      }

      if (factory.sessionGoal.snapshot()?.completedStages.includes('throughput')) {
        break;
      }
      if (factory.getThroughputPerMin() >= SESSION_GOAL.targetThroughputPerMin) {
        simulate(factory, 5_000);
        break;
      }
      void tpBeforeFirst;
    }

    // Settle until goal succeeds or hard timeout (~3 min total budget)
    let settle = 0;
    while (factory.sessionGoal.snapshot()?.completedStages.includes('throughput') !== true && settle < 120) {
      simulate(factory, 1000);
      if (factory.eventsSys.suppressed) {
        expect(factory.eventsSys.productionMult).toBe(1);
      }
      maxProductionMult = Math.max(
        maxProductionMult,
        factory.eventsSys.suppressed ? factory.eventsSys.productionMult : 1,
      );
      settle += 1;
    }

    expect(upgradesBought).toBeGreaterThanOrEqual(1);
    expect(upgradesBought).toBeLessThanOrEqual(3);
    expect(
      factory.sessionGoal.snapshot()?.completedStages.includes('throughput'),
    ).toBe(true);
    expect(goalSuccess).toBe(true);
    // Captured at complete (rolling window can dip afterward)
    expect(telemetry.throughputFinal ?? 0).toBeGreaterThanOrEqual(
      SESSION_GOAL.targetThroughputPerMin,
    );
    expect(maxProductionMult).toBe(1);
    expect(factory.eventsSys.suppressed).toBe(false);
    expect(telemetry.has('session_goal_start')).toBe(true);
    expect(telemetry.has('session_goal_complete')).toBe(true);
    expect(telemetry.has('onboarding_complete')).toBe(true);
    // After stage 1: awaiting strategic choice (not auto-completed branch)
    expect(['awaiting_choice', 'awaiting_purchase']).toContain(
      factory.sessionGoal.phase,
    );

    // No deadlock: line still sells after goal
    const soldBefore = factory.economy.productsSold;
    simulate(factory, 10_000);
    expect(factory.economy.productsSold).toBeGreaterThan(soldBefore);

    // Events can start after onboarding
    if (!factory.eventsSys.active) {
      expect(factory.eventsSys.trigger('productionBoost')).toBe(true);
    }
    expect(factory.eventsSys.suppressed).toBe(false);
    // Either manual trigger or auto-started boost after resume
    expect(
      factory.eventsSys.productionMult > 1 || factory.eventsSys.active !== null,
    ).toBe(true);
  });

  it('prepareReturningPlayer skips tutorial only with real progress', () => {
    const fresh = new Factory();
    expect(fresh.hasRealProgress()).toBe(false);
    expect(fresh.prepareReturningPlayer()).toBe(false);
    expect(fresh.eventsSys.suppressed).toBe(true);
    expect(fresh.sessionGoal.status).toBe('idle');

    const returning = new Factory();
    returning.economy.add(100);
    expect(returning.buyUpgrade(1, 'speed')).toBe(true);
    expect(returning.hasRealProgress()).toBe(true);
    expect(returning.prepareReturningPlayer()).toBe(true);
    expect(returning.sessionGoal.status).toBe('chain_complete');
    expect(returning.sessionGoal.phase).toBe('post_chain');
    expect(returning.eventsSys.suppressed).toBe(false);
  });

  it('old save snapshot without suppressed still loads safely', () => {
    const factory = new Factory();
    factory.economy.add(50);
    factory.buyUpgrade(1, 'speed');
    const snap = factory.toSnapshot();
    // Simulate legacy snapshot missing suppressed
    delete (snap.events as { suppressed?: boolean }).suppressed;

    const loaded = new Factory();
    loaded.economy.coins = factory.economy.coins;
    loaded.upgrades.levels = structuredClone(factory.upgrades.levels);
    loaded.upgrades.totalPurchased = factory.upgrades.totalPurchased;
    loaded.loadRuntime(snap);
    expect(loaded.hasRealProgress()).toBe(true);
    expect(loaded.eventsSys.suppressed).toBe(false);
    expect(loaded.prepareReturningPlayer()).toBe(true);
  });

  it('Telemetry buildReport exposes onboarding timings', () => {
    const t = new Telemetry();
    t.once('first_input');
    t.update(500);
    t.once('first_sale');
    t.update(1000);
    t.once('first_upgrade');
    t.once('bottleneck_shown');
    t.once('session_goal_start');
    t.emit('session_goal_progress', { throughput: 20, target: 28 });
    t.once('session_goal_complete', { success: true });
    t.emit('global_event_suppressed_onboarding', { kind: 'productionBoost' });
    t.once('onboarding_complete');
    t.recordHintDisplayed('TAP', 'TAP');
    t.upgradesBought = 2;
    t.throughputInitial = 18;
    t.throughputFinal = 30;

    const report = t.buildReport();
    expect(report.timeToFirstInputMs).toBe(0);
    expect(report.timeToFirstSaleMs).toBe(500);
    expect(report.timeToFirstUpgradeMs).toBe(1500);
    expect(report.timeToBottleneckShownMs).toBe(1500);
    expect(report.timeToSessionGoalStartMs).toBe(1500);
    expect(report.timeToSessionGoalCompleteMs).toBe(1500);
    expect(report.upgradesBought).toBe(2);
    expect(report.throughputInitial).toBe(18);
    expect(report.throughputFinal).toBe(30);
    expect(report.hintsShown).toContain('TAP');
    expect(report.onboardingComplete).toBe(true);
  });
});
