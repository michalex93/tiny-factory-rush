import { describe, expect, it } from 'vitest';
import { IntentHistoryBuffer, TrackingLossMachine } from './intent.js';

describe('IntentHistoryBuffer', () => {
  it('forgets samples outside the tunable window', () => {
    const buf = new IntentHistoryBuffer(100);
    buf.push(0, true);
    buf.push(50, false);
    expect(buf.hadGrabIntent(90)).toBe(true);
    expect(buf.hadGrabIntent(160)).toBe(false);
  });

  it('reports recent grab fraction', () => {
    const buf = new IntentHistoryBuffer(1000);
    buf.push(0, true);
    buf.push(10, true);
    buf.push(20, false);
    expect(buf.recentGrabFraction(30)).toBeCloseTo(2 / 3);
  });

  it('setWindowMs is tunable at runtime', () => {
    const buf = new IntentHistoryBuffer(500);
    buf.push(0, true);
    buf.setWindowMs(10);
    expect(buf.hadGrabIntent(20)).toBe(false);
  });
});

describe('TrackingLossMachine', () => {
  it('stays in grace until tunable grace expires', () => {
    const m = new TrackingLossMachine(200);
    expect(m.update(0, false)).toEqual({ lost: false, recovered: false });
    expect(m.getState()).toBe('grace');
    expect(m.update(100, false)).toEqual({ lost: false, recovered: false });
    expect(m.update(201, false)).toEqual({ lost: true, recovered: false });
    expect(m.getState()).toBe('lost');
  });

  it('recovers from lost when tracking returns', () => {
    const m = new TrackingLossMachine(50);
    m.update(0, false);
    m.update(60, false);
    expect(m.update(70, true)).toEqual({ lost: false, recovered: true });
    expect(m.getState()).toBe('tracked');
  });

  it('does not emit recovered when only leaving grace', () => {
    const m = new TrackingLossMachine(200);
    m.update(0, false);
    expect(m.update(10, true)).toEqual({ lost: false, recovered: false });
  });
});
