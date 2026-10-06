#!/usr/bin/env node
// Test double for the outer loop (PROTECTED). Simulates good and bad agent behaviors so the
// selftest can prove that gates merge honest work and block cheating, laziness and stuck tasks.
// Behavior per task: MOCK_BEHAVIOR_MAP='{"DEMO-PASS":"pass"}' or MOCK_BEHAVIOR=pass
//   pass | flaky (forgets the progress entry on attempt 1) | cheat (skips an existing test)
//   lazy (marks done without evidence) | needs-human | crash
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const current = JSON.parse(fs.readFileSync('.agent/current-task.json', 'utf8'));
const id = current.task;
const attempt = Number(process.env.AGENT_ATTEMPT ?? current.attempt ?? 1);
const map = JSON.parse(process.env.MOCK_BEHAVIOR_MAP ?? '{}');
const behavior = map[id] ?? process.env.MOCK_BEHAVIOR ?? 'pass';

const prompt = fs.readFileSync(0, 'utf8');
if (!prompt.includes(id)) {
  console.error(`mock agent: prompt does not mention ${id}`);
  process.exit(3);
}

const node = (...args) => execFileSync('node', args, { stdio: 'inherit' });
const git = (...args) => execFileSync('git', args, { stdio: 'pipe' });
const evidence = () => {
  fs.mkdirSync('demo', { recursive: true });
  fs.writeFileSync(`demo/${id}.txt`, `evidence for ${id} (attempt ${attempt})\n`);
  return `demo/${id}.txt`;
};
const progress = (status) => fs.appendFileSync('progress/PROGRESS.md',
  `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${id} — ${status}\n- What changed: mock agent (${behavior}, attempt ${attempt})\n- Evidence: demo/${id}.txt\n`);
const commit = (msg) => { git('add', '-A'); git('commit', '-m', msg, '--no-verify'); };

switch (behavior) {
  case 'pass': {
    const ev = evidence();
    progress('done');
    node('scripts/tasks.mjs', 'set', id, 'done', '--evidence', ev, '--note', 'mock pass');
    commit(`${id}: mock pass`);
    break;
  }
  case 'flaky': {
    const ev = evidence();
    if (attempt > 1) progress('done');
    node('scripts/tasks.mjs', 'set', id, 'done', '--evidence', ev, '--note', `mock flaky attempt ${attempt}`);
    commit(`${id}: mock flaky attempt ${attempt}`);
    break;
  }
  case 'cheat': {
    const ev = evidence();
    const target = 'src/systems/Economy.test.ts';
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace("  it('", "  it.skip('"));
    progress('done');
    node('scripts/tasks.mjs', 'set', id, 'done', '--evidence', ev, '--note', 'mock cheat');
    commit(`${id}: mock cheat`);
    break;
  }
  case 'lazy': {
    const q = JSON.parse(fs.readFileSync('tasks/queue.json', 'utf8'));
    const t = q.tasks.find((x) => x.id === id);
    t.status = 'done';
    fs.writeFileSync('tasks/queue.json', JSON.stringify(q, null, 2) + '\n');
    progress('done');
    commit(`${id}: mock lazy`);
    break;
  }
  case 'needs-human': {
    progress('blocked');
    node('scripts/tasks.mjs', 'set', id, 'blocked', '--note', 'NEEDS-HUMAN: plug in the headset and enable developer mode');
    commit(`${id}: mock needs human`);
    break;
  }
  case 'crash':
    console.error('mock agent: simulated crash');
    process.exit(1);
    break;
  default:
    console.error(`mock agent: unknown behavior ${behavior}`);
    process.exit(2);
}
console.log(`mock agent: ${id} behavior=${behavior} attempt=${attempt}`);
