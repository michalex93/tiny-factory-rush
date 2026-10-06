import { describe, expect, it } from 'vitest';
import { isValidSnapPlacement, selectSnapTarget, type SnapTarget } from './snap.js';

const targets: SnapTarget[] = [
  { id: 'a', position: [-0.35, 0.75, -0.95], occupied: false },
  { id: 'b', position: [0, 0.75, -0.95], occupied: false },
  { id: 'c', position: [0.35, 0.75, -0.95], occupied: true },
];

describe('selectSnapTarget', () => {
  it('snaps to nearest free slot inside radius', () => {
    const decision = selectSnapTarget([0.02, 0.78, -0.93], targets, 0.18);
    expect(decision.kind).toBe('snap');
    if (decision.kind === 'snap') {
      expect(decision.targetId).toBe('b');
    }
  });

  it('rejects when outside snap radius', () => {
    const decision = selectSnapTarget([2, 0.78, -0.95], targets, 0.18);
    expect(decision).toMatchObject({ kind: 'reject', reason: 'out-of-range' });
  });

  it('rejects occupied nearest slot', () => {
    const decision = selectSnapTarget([0.34, 0.78, -0.95], targets, 0.18);
    expect(decision).toMatchObject({
      kind: 'reject',
      reason: 'occupied',
      nearestId: 'c',
    });
  });

  it('reports no-targets', () => {
    const decision = selectSnapTarget([0, 0, 0], [], 0.18);
    expect(decision).toMatchObject({ kind: 'reject', reason: 'no-targets' });
  });
});

describe('isValidSnapPlacement', () => {
  it('mirrors selectSnapTarget success', () => {
    expect(isValidSnapPlacement([0, 0.78, -0.95], targets, 0.18)).toBe(true);
    expect(isValidSnapPlacement([2, 0.78, -0.95], targets, 0.18)).toBe(false);
  });
});
