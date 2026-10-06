#!/usr/bin/env node
// End-to-end proof that the loop is disciplined (PROTECTED).
// Clones this repo into a temp folder, installs a demo queue, runs the loop with the mock agent and checks:
//   honest work is merged; a forgotten progress entry is retried and fixed; skipping a test, marking done
//   without evidence and "needs a human" are blocked and never merged; a review packet is written.
// Usage: npm run loop:selftest [-- --keep]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync, runShellSync } from './lib/proc.mjs';
import { repoRoot } from './lib/git.mjs';

const root = repoRoot();
const keep = process.argv.includes('--keep');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tfr-loop-selftest-'));
const sh = (cmd, cwd = tmp, env = {}) => runShellSync(cmd, { cwd, env });
const must = (r, what) => {
  if (r.code !== 0) {
    console.error(`selftest setup failed at: ${what}\n${r.stdout}\n${r.stderr}`);
    process.exit(2);
  }
  return r;
};

console.log(`[selftest] temp repo: ${tmp}`);
must(runSync('git', ['clone', '--quiet', root, tmp]), 'git clone');
// Overlay the current working tree versions of the automation so uncommitted changes are tested too.
for (const p of ['scripts', 'prompts', 'tools', 'skills', '.claude', 'gates.config.json', 'agent-loop.config.json', 'vite.config.ts', 'package.json', 'tsconfig.json', '.gitignore']) {
  const src = path.join(root, p);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(tmp, p), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
// A symlink/junction is not matched by "node_modules/" in .gitignore, so exclude it explicitly.
fs.appendFileSync(path.join(tmp, '.git', 'info', 'exclude'), '\nnode_modules\n');

const task = (id, title, due) => ({
  id, title, phase: 'selftest', tier: 0, owner: 'agent', lane: 'demo', due, depends_on: [],
  acceptance: [`demo/${id}.txt exists`, 'progress entry appended', 'no test weakened'],
  verify: ['npm run gates -- --level selftest'], evidence_required: ['demo/*'], skills: ['autonomous-task'],
  status: 'todo', attempts: 0, notes: [], evidence: [],
});
const queue = {
  version: 1,
  tasks: [
    task('DEMO-PASS', 'Honest task that should be merged', '2026-10-06'),
    task('DEMO-FLAKY', 'Forgets the progress entry once, then fixes it', '2026-10-06'),
    task('DEMO-HUMAN', 'Needs a person: must be blocked as NEEDS-HUMAN', '2026-10-07'),
    task('DEMO-CHEAT', 'Skips an existing test: must be blocked', '2026-10-07'),
    task('DEMO-LAZY', 'Marks done without evidence: must be blocked', '2026-10-08'),
  ],
};
fs.mkdirSync(path.join(tmp, 'tasks'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'tasks', 'queue.json'), JSON.stringify(queue, null, 2) + '\n');
fs.mkdirSync(path.join(tmp, 'progress'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'progress', 'PROGRESS.md'), '# Progress log (selftest)\n');
must(sh('git add -A && git -c user.name=selftest -c user.email=selftest@example.com commit --quiet --no-verify -m "selftest setup"'), 'commit setup');

const behaviors = { 'DEMO-PASS': 'pass', 'DEMO-FLAKY': 'flaky', 'DEMO-HUMAN': 'needs-human', 'DEMO-CHEAT': 'cheat', 'DEMO-LAZY': 'lazy' };
const env = {
  MOCK_BEHAVIOR_MAP: JSON.stringify(behaviors),
  GIT_AUTHOR_NAME: 'selftest', GIT_AUTHOR_EMAIL: 'selftest@example.com',
  GIT_COMMITTER_NAME: 'selftest', GIT_COMMITTER_EMAIL: 'selftest@example.com',
};
console.log('[selftest] running the loop with the mock agent (this takes a minute)...');
const run = sh('node scripts/agent-loop.mjs --agent mock --gate-level selftest --max-tasks 10 --attempts 2', tmp, env);
fs.writeFileSync(path.join(tmp, 'selftest-loop-output.log'), run.stdout + run.stderr);

const final = JSON.parse(fs.readFileSync(path.join(tmp, 'tasks', 'queue.json'), 'utf8'));
const status = Object.fromEntries(final.tasks.map((t) => [t.id, t]));
const log = runSync('git', ['log', '--oneline', '--no-decorate'], { cwd: tmp }).stdout;
const branches = runSync('git', ['branch', '--list'], { cwd: tmp }).stdout;
const economy = fs.readFileSync(path.join(tmp, 'src', 'systems', 'Economy.test.ts'), 'utf8');
const reviews = fs.existsSync(path.join(tmp, 'review')) ? fs.readdirSync(path.join(tmp, 'review')).filter((f) => f.startsWith('REVIEW-')) : [];

const checks = [
  ['DEMO-PASS merged as done', status['DEMO-PASS'].status === 'done' && log.includes('merge(agent): DEMO-PASS')],
  ['DEMO-FLAKY fixed on retry and merged', status['DEMO-FLAKY'].status === 'done' && log.includes('merge(agent): DEMO-FLAKY')],
  ['DEMO-HUMAN blocked as NEEDS-HUMAN', status['DEMO-HUMAN'].status === 'blocked' && status['DEMO-HUMAN'].notes.join(' ').includes('NEEDS-HUMAN')],
  ['DEMO-CHEAT blocked', status['DEMO-CHEAT'].status === 'blocked'],
  ['skipped test never reached the integration branch', !economy.includes("it.skip('")],
  ['DEMO-LAZY blocked', status['DEMO-LAZY'].status === 'blocked'],
  ['failed work kept on agent/failed/* branches', /agent\/failed\/demo-cheat-/.test(branches) && /agent\/failed\/demo-lazy-/.test(branches)],
  ['review packet written', reviews.length > 0],
  ['working tree clean after the run', runSync('git', ['status', '--porcelain'], { cwd: tmp }).stdout.trim() === ''],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  ok = ok && pass;
}
if (!ok) {
  console.log(`\n[selftest] loop output:\n${run.stdout.slice(-6000)}\n${run.stderr.slice(-3000)}`);
  console.log(`[selftest] kept temp repo for inspection: ${tmp}`);
  process.exit(1);
}
console.log('[selftest] LOOP SELFTEST: PASS');
if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`[selftest] kept: ${tmp}`);
