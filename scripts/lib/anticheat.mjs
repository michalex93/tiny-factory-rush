// Detects the "genie" behaviors Kent Beck warns about: deleted/disabled tests,
// focused tests, and edits to the harness that grades the agent.
import { matchesAny } from './tasks.mjs';

const JS_TEST_FILE = /\.(test|spec)\.(m?[jt]sx?|cjs)$/;
const CS_TEST_FILE = /(^|\/)(Tests?|EditModeTests|PlayModeTests)\/.*\.cs$|\.Tests?\.cs$/;

export function isTestFile(file) {
  const f = file.replace(/\\/g, '/');
  return JS_TEST_FILE.test(f) || CS_TEST_FILE.test(f);
}

/** Counts active test cases, skipped tests and focused (.only) tests in a source file. */
export function analyzeTestSource(source, file = 'x.test.ts') {
  const text = String(source ?? '');
  if (file.endsWith('.cs')) {
    const tests = (text.match(/\[\s*(?:Test|UnityTest|TestCase)\b[^\]]*\]/g) ?? []).length;
    const skipped = (text.match(/\[\s*Ignore\b/g) ?? []).length;
    return { tests, skipped, only: 0 };
  }
  // Strip line comments to avoid counting commented-out tests as active.
  const code = text.replace(/^\s*\/\/.*$/gm, '');
  const active = code.match(/(?<![.\w])(?:it|test)(?:\.(?:each\s*(?:\([^)]*\)|`[^`]*`)|concurrent|fails|sequential))?\s*\(/g) ?? [];
  const skipped = code.match(/(?<![.\w])(?:(?:it|test|describe)\.(?:skip|todo)|xit|xtest|xdescribe)\s*\(/g) ?? [];
  const only = code.match(/(?<![.\w])(?:(?:it|test|describe)\.only|fit|fdescribe)\s*\(/g) ?? [];
  return { tests: active.length, skipped: skipped.length, only: only.length };
}

/**
 * Compares the base and head versions of changed files.
 * @param {{ changed: {file:string,status:string}[], readBase:(f:string)=>string|null, readHead:(f:string)=>string|null,
 *           protectedPatterns:string[], allowProtected?:boolean, allowTestDecrease?:boolean }} p
 */
export function analyzeDiff(p) {
  const { changed, readBase, readHead, protectedPatterns = [], allowProtected = false, allowTestDecrease = false } = p;
  const violations = [];
  const warnings = [];
  let baseTests = 0;
  let headTests = 0;
  for (const { file, status } of changed) {
    if (!allowProtected && matchesAny(file, protectedPatterns)) {
      violations.push(`protected file ${status === 'D' ? 'deleted' : 'modified'}: ${file}`);
    }
    if (!isTestFile(file)) continue;
    const before = readBase(file);
    const after = status === 'D' ? null : readHead(file);
    const b = before === null ? { tests: 0, skipped: 0, only: 0 } : analyzeTestSource(before, file);
    const a = after === null ? { tests: 0, skipped: 0, only: 0 } : analyzeTestSource(after, file);
    baseTests += b.tests;
    headTests += a.tests;
    if (status === 'D' && before !== null) {
      (allowTestDecrease ? warnings : violations).push(`test file deleted: ${file} (${b.tests} tests)`);
    } else if (a.tests < b.tests) {
      (allowTestDecrease ? warnings : violations).push(`test cases removed in ${file}: ${b.tests} -> ${a.tests}`);
    }
    if (a.skipped > b.skipped) violations.push(`tests skipped/todo added in ${file}: ${b.skipped} -> ${a.skipped}`);
    if (a.only > 0) violations.push(`focused test (.only) in ${file}`);
  }
  return { violations, warnings, stats: { baseTests, headTests } };
}
