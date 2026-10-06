#!/usr/bin/env node
// Stop hook (PROTECTED): deterministic "definition of done" gate.
// If the session changed anything since its base commit, run the quick gates; when red, block the stop
// and feed the failure back to Claude. At most 3 consecutive blocks per session, then allow the stop
// (the outer loop's full gates still decide whether the work is merged).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const agentDir = path.join(root, '.agent');
fs.mkdirSync(agentDir, { recursive: true });
const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; } };

const baseFile = path.join(agentDir, 'session-base');
const base = process.env.AGENT_BASE_SHA || (fs.existsSync(baseFile) ? fs.readFileSync(baseFile, 'utf8').trim() : null);
if (!base || git('cat-file', '-e', `${base}^{commit}`) === null) process.exit(0);

const changed = git('status', '--porcelain') !== '' || git('rev-parse', 'HEAD') !== base;
if (!changed) process.exit(0);

// A task the agent explicitly blocked (with a diagnosis) is an honest stop.
try {
  const before = JSON.parse(execFileSync('git', ['show', `${base}:tasks/queue.json`], { cwd: root, encoding: 'utf8' }));
  const now = JSON.parse(fs.readFileSync(path.join(root, 'tasks', 'queue.json'), 'utf8'));
  const prev = new Map(before.tasks.map((t) => [t.id, t.status]));
  if (now.tasks.some((t) => t.status === 'blocked' && prev.get(t.id) !== 'blocked')) process.exit(0);
} catch { /* queue missing or invalid: let the gates report it */ }

const counterFile = path.join(agentDir, 'stop-blocks.json');
let counters = {};
try { counters = JSON.parse(fs.readFileSync(counterFile, 'utf8')); } catch { /* fresh */ }
const key = input.session_id ?? 'default';

const res = spawnSync('node', ['scripts/gates.mjs', '--level', 'quick', '--base', base], {
  cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, AGENT_BASE_SHA: base },
});
if (res.status === 0) {
  delete counters[key];
  fs.writeFileSync(counterFile, JSON.stringify(counters));
  process.exit(0);
}

counters[key] = (counters[key] ?? 0) + 1;
fs.writeFileSync(counterFile, JSON.stringify(counters));
if (counters[key] > 3) {
  fs.writeFileSync(path.join(agentDir, 'stop-gate-exhausted'), `${new Date().toISOString()} session ${key}: quick gates still failing after 3 blocks\n`);
  process.exit(0);
}

const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.split(/\r?\n/).filter((l) => /^(FAIL|      )/.test(l)).slice(0, 60).join('\n');
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: `Quick gates are red (block ${counters[key]}/3), so the work is not done yet:\n${output}\n\nFix the root cause (skills/systematic-debugging). Never delete/skip tests or edit protected files to get green. If you cannot fix it, run: node scripts/tasks.mjs set <TASK-ID> blocked --note "<diagnosis>", append a progress entry, commit, and stop.`,
}));
process.exit(0);
