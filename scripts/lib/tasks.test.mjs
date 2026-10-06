import { describe, it, expect } from 'vitest';
import { validateQueue, selectNext, isEligible, immutableDiff, statusChanges, updateTask, globToRegExp, matchesAny } from './tasks.mjs';

const t = (id, extra = {}) => ({
  id, title: `Task ${id} title`, phase: 'p', tier: 0, owner: 'agent', lane: 'sim', due: '2026-10-10',
  depends_on: [], acceptance: ['works'], verify: [], evidence_required: [], skills: [],
  status: 'todo', attempts: 0, notes: [], evidence: [], ...extra,
});
const q = (...tasks) => ({ version: 1, tasks });

describe('validateQueue', () => {
  it('accepts a well-formed queue', () => {
    expect(validateQueue(q(t('A-001'), t('H-001', { owner: 'human', lane: 'comp' })))).toEqual([]);
  });

  it('rejects duplicates, unknown deps and bad enums', () => {
    const errors = validateQueue(q(
      t('A-001'),
      t('A-001'),
      t('A-003', { status: 'finished', owner: 'robot', depends_on: ['Z-999'] }),
    )).join('\n');
    expect(errors).toMatch(/duplicate id/);
    expect(errors).toMatch(/unknown task Z-999/);
    expect(errors).toMatch(/status must be one of/);
    expect(errors).toMatch(/owner must be one of/);
  });

  it('detects dependency cycles', () => {
    const errors = validateQueue(q(
      t('A-001', { depends_on: ['A-002'] }),
      t('A-002', { depends_on: ['A-003'] }),
      t('A-003', { depends_on: ['A-001'] }),
    )).join('\n');
    expect(errors).toMatch(/dependency cycle/);
  });

  it('requires evidence on done agent tasks', () => {
    expect(validateQueue(q(t('A-001', { status: 'done' }))).join('\n')).toMatch(/must list evidence/);
    expect(validateQueue(q(t('A-001', { status: 'done', evidence: ['x.md'] })))).toEqual([]);
  });
});

describe('selectNext / isEligible', () => {
  it('orders by due date, then tier, then file order, and respects dependencies', () => {
    const queue = q(
      t('A-010', { tier: 1, due: '2026-10-08' }),
      t('A-011', { due: '2026-10-12' }),
      t('A-012', { due: '2026-10-09', depends_on: ['A-013'] }),
      t('A-013', { due: '2026-10-11' }),
    );
    expect(selectNext(queue).id).toBe('A-010');
    queue.tasks[0].status = 'done';
    queue.tasks[0].evidence = ['e'];
    expect(selectNext(queue).id).toBe('A-013');
    queue.tasks[3].status = 'done';
    queue.tasks[3].evidence = ['e'];
    expect(selectNext(queue).id).toBe('A-012');
  });

  it('skips human tasks, pair tasks unless included, and xr tasks while the stack is undecided', () => {
    const queue = q(t('H-001', { owner: 'human' }), t('A-020', { owner: 'pair' }), t('A-021', { lane: 'xr' }));
    expect(selectNext(queue)).toBeNull();
    expect(selectNext(queue, { includePair: true }).id).toBe('A-020');
    expect(isEligible(queue.tasks[2], queue, { stack: 'undecided' }).why).toMatch(/stack undecided/);
    expect(isEligible(queue.tasks[2], queue, { stack: 'unity' }).ok).toBe(true);
  });

  it('keeps stack-specific lanes apart', () => {
    const queue = q(t('A-030', { lane: 'xr-unity' }), t('A-031', { lane: 'xr-iwsdk' }));
    expect(isEligible(queue.tasks[0], queue, { stack: 'iwsdk' }).ok).toBe(false);
    expect(isEligible(queue.tasks[1], queue, { stack: 'iwsdk' }).ok).toBe(true);
  });
});

describe('immutableDiff', () => {
  it('flags contract edits and non-proposed new tasks', () => {
    const base = q(t('A-001'), t('A-002'));
    const head = q(t('A-001', { acceptance: ['easier'] }), t('A-003'), t('A-004', { status: 'proposed' }));
    const v = immutableDiff(base, head).join('\n');
    expect(v).toMatch(/A-001: immutable field "acceptance" changed/);
    expect(v).toMatch(/A-002: task removed/);
    expect(v).toMatch(/A-003: new tasks added by agents must have status "proposed"/);
    expect(v).not.toMatch(/A-004/);
  });

  it('allows status, notes and evidence updates', () => {
    const base = q(t('A-001'));
    const head = q(t('A-001', { status: 'done', evidence: ['e.md'], notes: ['ok'], attempts: 1 }));
    expect(immutableDiff(base, head)).toEqual([]);
    expect(statusChanges(base, head)).toMatchObject([{ id: 'A-001', from: 'todo', to: 'done' }]);
  });
});

describe('updateTask', () => {
  it('updates only mutable fields and dedupes evidence', () => {
    const queue = q(t('A-001'));
    updateTask(queue, 'A-001', { status: 'done', note: 'n', evidence: ['a', 'a', 'b'], attemptsDelta: 2 });
    expect(queue.tasks[0]).toMatchObject({ status: 'done', notes: ['n'], evidence: ['a', 'b'], attempts: 2 });
    expect(() => updateTask(queue, 'A-001', { status: 'nope' })).toThrow();
  });
});

describe('glob matching', () => {
  it('supports ** and *', () => {
    expect(globToRegExp('scripts/lib/**').test('scripts/lib/a/b.mjs')).toBe(true);
    expect(globToRegExp('evidence/xr/*.png').test('evidence/xr/a.png')).toBe(true);
    expect(globToRegExp('evidence/xr/*.png').test('evidence/xr/sub/a.png')).toBe(false);
    expect(matchesAny('.\\gates.config.json', ['gates.config.json'])).toBe(true);
  });
});
