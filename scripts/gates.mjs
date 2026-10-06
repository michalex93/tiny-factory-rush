#!/usr/bin/env node
// Deterministic quality gates (PROTECTED). The loop, the Claude Stop hook and CI all call this.
// Usage: node scripts/gates.mjs [--level quick|full|selftest] [--base <sha>] [--task <id>]
//                              [--json <file>] [--no-diff] [--allow-protected] [--allow-test-decrease] [--quiet]
import fs from 'node:fs';
import path from 'node:path';
import { runShellSync, lastLines } from './lib/proc.mjs';
import * as G from './lib/git.mjs';
import { statusChanges, immutableDiff, globToRegExp } from './lib/tasks.mjs';
import { analyzeDiff, analyzeTestSource, isTestFile } from './lib/anticheat.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const root = G.repoRoot();
process.chdir(root);
const config = JSON.parse(fs.readFileSync(path.join(root, 'gates.config.json'), 'utf8'));
const level = opt('--level', 'full');
const steps = config.levels[level];
if (!steps) {
  console.error(`Unknown level "${level}". Levels: ${Object.keys(config.levels).join(', ')}`);
  process.exit(2);
}
const quiet = flag('--quiet');
const noDiff = flag('--no-diff');
const allowProtected = flag('--allow-protected') || process.env.ALLOW_PROTECTED_EDITS === '1';
const allowTestDecrease = flag('--allow-test-decrease');
const stepTimeoutMs = (config.stepTimeoutMinutes ?? 20) * 60_000;
const gatesDir = path.join(root, '.agent', 'gates');
fs.mkdirSync(gatesDir, { recursive: true });

function resolveBase() {
  const candidates = [opt('--base'), process.env.AGENT_BASE_SHA];
  const sessionFile = path.join(root, '.agent', 'session-base');
  if (fs.existsSync(sessionFile)) candidates.push(fs.readFileSync(sessionFile, 'utf8').trim());
  for (const c of candidates) if (c && G.shaExists(c)) return c;
  return null;
}
const base = noDiff ? null : resolveBase();

const readHead = (f) => {
  const p = path.join(root, f);
  return fs.existsSync(p) && fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
};
const readBase = (f) => {
  const t = base ? G.showFileAt(base, f) : null;
  return t === null ? null : t.replace(/\r\n/g, '\n');
};
const queueAt = (ref) => {
  const raw = ref ? G.showFileAt(ref, 'tasks/queue.json') : readHead('tasks/queue.json');
  try { return raw ? JSON.parse(raw) : { version: 1, tasks: [] }; } catch { return null; }
};

const builtins = {
  'no-only': () => {
    const offenders = G.listTrackedAndUntracked()
      .filter(isTestFile)
      .filter((f) => analyzeTestSource(readHead(f), f).only > 0);
    return offenders.length
      ? { status: 'FAIL', details: offenders.map((f) => `focused test (.only/fit) in ${f}`) }
      : { status: 'PASS', details: [] };
  },
  'diff-anticheat': () => {
    if (!base) return { status: 'SKIP', details: ['no base commit (pass --base or set AGENT_BASE_SHA)'] };
    const changed = G.changedFilesSince(base);
    const res = analyzeDiff({
      changed, readBase, readHead,
      protectedPatterns: config.protected ?? [],
      allowProtected, allowTestDecrease,
    });
    const qBase = queueAt(base);
    const qHead = queueAt(null);
    if (!qHead) res.violations.push('tasks/queue.json is not valid JSON');
    else res.violations.push(...immutableDiff(qBase, qHead));
    const details = [...res.violations, ...res.warnings.map((w) => `warning: ${w}`),
      `test cases in changed files: ${res.stats.baseTests} -> ${res.stats.headTests}`];
    return { status: res.violations.length ? 'FAIL' : 'PASS', details };
  },
  'task-evidence': () => {
    if (!base) return { status: 'SKIP', details: ['no base commit'] };
    const qBase = queueAt(base);
    const qHead = queueAt(null);
    if (!qHead) return { status: 'FAIL', details: ['tasks/queue.json is not valid JSON'] };
    const problems = [];
    for (const c of statusChanges(qBase, qHead)) {
      if (c.to !== 'done' || c.task.owner === 'human') continue;
      const ev = c.task.evidence ?? [];
      if (!ev.length) problems.push(`${c.id}: marked done without evidence`);
      for (const e of ev) {
        if (/^https?:\/\//.test(e)) continue;
        if (!fs.existsSync(path.join(root, e))) problems.push(`${c.id}: evidence path does not exist: ${e}`);
      }
      for (const pattern of c.task.evidence_required ?? []) {
        const re = globToRegExp(pattern);
        if (!ev.some((e) => re.test(e.replace(/\\/g, '/')))) problems.push(`${c.id}: no evidence matches required pattern ${pattern}`);
      }
    }
    return { status: problems.length ? 'FAIL' : 'PASS', details: problems };
  },
  'progress-entry': () => {
    if (!base) return { status: 'SKIP', details: ['no base commit'] };
    const qHead = queueAt(null);
    if (!qHead) return { status: 'FAIL', details: ['tasks/queue.json is not valid JSON'] };
    const before = readBase('progress/PROGRESS.md') ?? '';
    const after = readHead('progress/PROGRESS.md') ?? '';
    const problems = [];
    if (!after.startsWith(before)) problems.push('progress/PROGRESS.md must be append-only (existing lines were changed)');
    const added = after.startsWith(before) ? after.slice(before.length) : after;
    for (const c of statusChanges(queueAt(base), qHead)) {
      if (!['done', 'blocked'].includes(c.to) || c.task.owner === 'human') continue;
      if (!added.includes(`— ${c.id} —`) && !added.includes(`- ${c.id} -`)) {
        problems.push(`${c.id}: no progress entry appended (heading must contain "— ${c.id} —")`);
      }
    }
    return { status: problems.length ? 'FAIL' : 'PASS', details: problems };
  },
  'lane-extra': () => {
    const details = [];
    let ran = 0;
    let failed = 0;
    for (const s of config.laneSteps ?? []) {
      const conds = String(s.when ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      const ok = conds.every((c) => {
        const [kind, value] = c.split(':');
        if (kind === 'exists') return fs.existsSync(path.join(root, value));
        if (kind === 'env') return Boolean(process.env[value]);
        return false;
      });
      if (!ok) { details.push(`skip ${s.name} (${s.when})`); continue; }
      ran++;
      // Expand $VARS ourselves: cmd.exe (Windows) does not understand $VAR syntax.
      const cmd = s.cmd.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, v) => process.env[v] ?? '');
      const r = runShellSync(cmd, { cwd: root, timeoutMs: stepTimeoutMs });
      fs.writeFileSync(path.join(gatesDir, `${s.name.replace(/[^\w.-]/g, '_')}.log`), r.stdout + r.stderr);
      if (r.code !== 0) {
        failed++;
        details.push(`FAIL ${s.name}:\n${lastLines(r.stdout + r.stderr, 40)}`);
      } else details.push(`pass ${s.name}`);
    }
    return { status: failed ? 'FAIL' : ran ? 'PASS' : 'SKIP', details };
  },
};

const results = [];
for (const name of steps) {
  const def = config.steps[name];
  const started = Date.now();
  let r;
  if (!def) r = { status: 'FAIL', details: [`unknown step ${name}`] };
  else if (def.builtin) {
    try { r = builtins[def.builtin](); } catch (e) { r = { status: 'FAIL', details: [String(e?.stack ?? e)] }; }
  } else {
    const run = runShellSync(def.cmd, { cwd: root, timeoutMs: stepTimeoutMs });
    const output = run.stdout + run.stderr;
    fs.writeFileSync(path.join(gatesDir, `${name.replace(/[^\w.-]/g, '_')}.log`), output);
    r = run.code === 0
      ? { status: 'PASS', details: [] }
      : { status: 'FAIL', details: [run.timedOut ? `timed out after ${config.stepTimeoutMinutes} min` : `exit ${run.code}`, lastLines(output, 40)] };
  }
  r.name = name;
  r.seconds = Math.round((Date.now() - started) / 100) / 10;
  results.push(r);
  if (!quiet) {
    console.log(`${r.status.padEnd(5)} ${name.padEnd(20)} ${String(r.seconds).padStart(6)}s`);
    if (r.status === 'FAIL' || (r.status === 'SKIP' && r.details.length)) {
      for (const d of r.details) console.log(String(d).split('\n').map((l) => `      ${l}`).join('\n'));
    }
  }
}

const failed = results.filter((r) => r.status === 'FAIL');
const report = {
  level, base, task: opt('--task'), head: G.headSha(), branch: G.currentBranch(),
  at: new Date().toISOString(), pass: failed.length === 0, results,
};
fs.writeFileSync(path.join(gatesDir, 'last.json'), JSON.stringify(report, null, 2));
const jsonOut = opt('--json');
if (jsonOut) {
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
}
if (!quiet) console.log(failed.length ? `GATES ${level.toUpperCase()}: FAIL (${failed.map((f) => f.name).join(', ')})` : `GATES ${level.toUpperCase()}: PASS`);
process.exit(failed.length ? 1 : 0);
