import { describe, expect, it } from 'vitest';
import { Factory } from './Factory';
import { HintQueue } from './HintQueue';
import { Telemetry } from './Telemetry';
import { buildOptimizationChoices } from './SessionGoal';
import { classifyUpgradePayoff } from './UpgradePayoff';

function simulate(factory: Factory, ms: number, step = 50): void {
  let left = ms;
  while (left > 0) {
    factory.update(Math.min(step, left));
    left -= Math.min(step, left);
  }
}

describe('M-B residual — hints / suppress / payoff', () => {
  it('Money in teaches once', () => {
    const q = new HintQueue(100);
    expect(
      q.offer({
        id: 'money_in_teach',
        text: 'Money in!',
        priority: 'sell_feedback',
        once: true,
      }).shown,
    ).toBe(true);
    expect(
      q.offer({
        id: 'money_in_teach',
        text: 'Money in!',
        priority: 'sell_feedback',
        once: true,
      }).deduped,
    ).toBe(true);
  });

  it('only one hint visible', () => {
    const q = new HintQueue(0);
    q.offer({ id: 'sell', text: 'sell', priority: 'sell_feedback' });
    q.offer({ id: 'goal', text: 'goal', priority: 'objective' });
    expect(q.visible?.id).toBe('goal');
  });

  it('suppression aggregates', () => {
    const t = new Telemetry();
    t.noteSuppressedAttempt();
    t.noteSuppressedAttempt();
    t.noteSuppressionResumed();
    expect(t.globalEventsSuppressedCount).toBe(2);
    expect(t.has('global_events_suppression_started')).toBe(true);
  });

  it('payoff still-limiting message', () => {
    const r = classifyUpgradePayoff({
      beforeTp: 14,
      afterTp: 22,
      beforeWip: 7,
      afterWip: 8,
      wipSamples: [7, 8, 8, 9],
      bottleneckBefore: 1,
      bottleneckAfter: 1,
      upgradedMachine: 1,
    });
    expect(r.kind).toBe('bottleneck_improved_still_limiting');
  });

  it('choices are throughput + margin', () => {
    const f = new Factory();
    simulate(f, 25_000);
    f.economy.add(200);
    f.buyUpgrade(1, 'speed');
    f.buyUpgrade(1, 'speed');
    const opts = buildOptimizationChoices(f);
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.id)).toContain('throughput');
    expect(opts.map((o) => o.id)).toContain('margin');
  });
});
