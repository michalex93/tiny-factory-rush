import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { angles, checkLayout } from './lib/fov.mjs';

const load = (f) => JSON.parse(fs.readFileSync(new URL(`./examples/${f}`, import.meta.url), 'utf8'));

describe('fov geometry', () => {
  it('puts the look-at point at the center of view', () => {
    const a = angles([0, 1.2, 0], [0, 0.76, -0.45], [0, 0.76, -0.45]);
    expect(Math.abs(a.h)).toBeLessThan(1e-9);
    expect(Math.abs(a.v)).toBeLessThan(1e-9);
    expect(a.inFront).toBe(true);
  });

  it('measures right and up as positive angles', () => {
    const a = angles([0, 1.2, 0], [0, 1.2, -1], [1, 2.2, -1]);
    expect(a.h).toBeCloseTo(45, 5);
    expect(a.v).toBeGreaterThan(30);
  });

  it('flags points behind the head as not in front', () => {
    expect(angles([0, 1.2, 0], [0, 1.2, -1], [0, 1.2, 1]).inFront).toBe(false);
  });
});

describe('checkLayout', () => {
  it('passes the recommended compact layout on the VR Glasses budget', () => {
    expect(checkLayout(load('layout-example.json'), { device: 'vr-glasses' }).pass).toBe(true);
  });

  it('fails the wide layout on VR Glasses but passes it on Quest 3', () => {
    const wide = load('layout-too-wide.json');
    const glasses = checkLayout(wide, { device: 'vr-glasses' });
    expect(glasses.pass).toBe(false);
    expect(glasses.results.filter((r) => !r.pass).map((r) => r.id)).toEqual(expect.arrayContaining(['source', 'contract-timer']));
    expect(checkLayout(wide, { device: 'quest3' }).pass).toBe(true);
  });

  it('fails interactables beyond the 2 ft reach', () => {
    const layout = { head: [0, 1.2, 0], lookAt: [0, 0.76, -0.45], elements: [{ id: 'far', position: [0, 0.8, -0.95], interactable: true }] };
    const r = checkLayout(layout, { device: 'quest3' }).results[0];
    expect(r.reachOk).toBe(false);
    expect(r.pass).toBe(false);
  });

  it('ignores decorative elements that are neither critical nor interactable', () => {
    const layout = { head: [0, 1.2, 0], lookAt: [0, 0.76, -0.45], elements: [{ id: 'decor', position: [2, 0.8, -0.45] }] };
    expect(checkLayout(layout).pass).toBe(true);
  });

  it('rejects unknown devices', () => {
    expect(() => checkLayout({ head: [0, 0, 0], lookAt: [0, 0, -1], elements: [] }, { device: 'nope' })).toThrow(/unknown device/);
  });
});
