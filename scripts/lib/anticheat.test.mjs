import { describe, it, expect } from 'vitest';
import { analyzeTestSource, analyzeDiff, isTestFile } from './anticheat.mjs';

describe('analyzeTestSource', () => {
  it('counts active, skipped and focused tests', () => {
    // Skipped/focused tokens are assembled at runtime so this file never contains a literal one
    // (otherwise the repo's own anti-cheat scan would flag it).
    const src = [
      "describe('x', () => {",
      "  it('a', () => {});",
      "  test('b', () => {});",
      "  it.each([1, 2])('c %s', () => {});",
      `  ${'it.' + 'skip'}('d', () => {});`,
      `  ${'test.' + 'todo'}('e');`,
      "  // it('commented out', () => {});",
      `  ${'x' + 'it'}('f', () => {});`,
      `  ${'it.' + 'only'}('g', () => {});`,
      '});',
    ].join('\n');
    expect(analyzeTestSource(src)).toEqual({ tests: 3, skipped: 3, only: 1 });
  });

  it('does not count words that merely end in "it("', () => {
    expect(analyzeTestSource('submit(); await emit("x"); audit(1);').tests).toBe(0);
  });

  it('counts NUnit attributes in C# test files', () => {
    const cs = '[Test] public void A(){}\n[UnityTest] public IEnumerator B(){}\n[Ignore("x")][Test] public void C(){}';
    expect(analyzeTestSource(cs, 'Assets/Tests/SimTests.cs')).toEqual({ tests: 3, skipped: 1, only: 0 });
  });
});

describe('isTestFile', () => {
  it('recognizes JS/TS and Unity test files', () => {
    expect(isTestFile('src/systems/Economy.test.ts')).toBe(true);
    expect(isTestFile('scripts/lib/tasks.test.mjs')).toBe(true);
    expect(isTestFile('xr-unity/Assets/Tests/EditMode/SimParityTests.cs')).toBe(true);
    expect(isTestFile('src/systems/Economy.ts')).toBe(false);
  });
});

describe('analyzeDiff', () => {
  const base = { 'src/a.test.ts': "it('one', () => {});\nit('two', () => {});\n", 'gates.config.json': '{}' };
  const mk = (head, changed, extra = {}) => analyzeDiff({
    changed,
    readBase: (f) => base[f] ?? null,
    readHead: (f) => head[f] ?? null,
    protectedPatterns: ['gates.config.json', 'scripts/lib/**'],
    ...extra,
  });

  it('flags removed test cases', () => {
    const r = mk({ 'src/a.test.ts': "it('one', () => {});\n" }, [{ file: 'src/a.test.ts', status: 'M' }]);
    expect(r.violations.join('\n')).toMatch(/test cases removed/);
  });

  it('flags deleted test files and newly skipped tests', () => {
    const del = mk({}, [{ file: 'src/a.test.ts', status: 'D' }]);
    expect(del.violations.join('\n')).toMatch(/test file deleted/);
    const skip = mk({ 'src/a.test.ts': `it('one', () => {});\n${'it.' + 'skip'}('two', () => {});\n` }, [{ file: 'src/a.test.ts', status: 'M' }]);
    expect(skip.violations.join('\n')).toMatch(/skipped\/todo added/);
  });

  it('flags protected files unless explicitly allowed', () => {
    const changed = [{ file: 'gates.config.json', status: 'M' }, { file: 'scripts/lib/x.mjs', status: 'A' }];
    expect(mk({}, changed).violations).toHaveLength(2);
    expect(mk({}, changed, { allowProtected: true }).violations).toHaveLength(0);
  });

  it('accepts added tests and unrelated changes', () => {
    const r = mk({ 'src/a.test.ts': base['src/a.test.ts'] + "it('three', () => {});\n", 'src/b.ts': 'x' },
      [{ file: 'src/a.test.ts', status: 'M' }, { file: 'src/b.ts', status: 'A' }]);
    expect(r.violations).toEqual([]);
    expect(r.stats).toEqual({ baseTests: 2, headTests: 3 });
  });
});
