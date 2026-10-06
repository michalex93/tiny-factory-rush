#!/usr/bin/env node
// Task queue CLI. Agents use `set` to update status/evidence/notes (mutable fields only).
//   node scripts/tasks.mjs validate
//   node scripts/tasks.mjs list [--status todo] [--owner agent]
//   node scripts/tasks.mjs next [--include-pair] [--json]
//   node scripts/tasks.mjs human            # human/pair tasks still open, by due date
//   node scripts/tasks.mjs show <id>
//   node scripts/tasks.mjs set <id> <status> [--note "..."] [--evidence path]...
import fs from 'node:fs';
import path from 'node:path';
import { loadQueue, saveQueue, validateQueue, selectNext, isEligible, updateTask } from './lib/tasks.mjs';
import { repoRoot } from './lib/git.mjs';

const root = repoRoot();
const QUEUE = path.join(root, 'tasks', 'queue.json');
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const opts = (name) => rest.flatMap((x, i) => (x === name && rest[i + 1] ? [rest[i + 1]] : []));

function readStack() {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'xr.config.json'), 'utf8')).stack ?? 'undecided'; } catch { return 'undecided'; }
}

const queue = loadQueue(QUEUE);
const ctx = { includePair: rest.includes('--include-pair'), stack: readStack() };
const row = (t) => `${t.id.padEnd(7)} ${String(t.status).padEnd(8)} T${t.tier} ${t.owner.padEnd(5)} ${String(t.due ?? '').padEnd(10)} ${t.title}`;

switch (cmd) {
  case 'validate': {
    const errors = validateQueue(queue);
    if (errors.length) {
      console.error(`tasks/queue.json invalid:\n- ${errors.join('\n- ')}`);
      process.exit(1);
    }
    console.log(`tasks/queue.json OK (${queue.tasks.length} tasks)`);
    break;
  }
  case 'list': {
    const status = opt('--status');
    const owner = opt('--owner');
    queue.tasks.filter((t) => (!status || t.status === status) && (!owner || t.owner === owner)).forEach((t) => console.log(row(t)));
    break;
  }
  case 'next': {
    const t = selectNext(queue, ctx);
    if (rest.includes('--json')) { console.log(JSON.stringify(t, null, 2)); break; }
    if (!t) {
      console.log('No eligible agent task. Blockers:');
      queue.tasks.filter((x) => x.status === 'todo').slice(0, 15).forEach((x) => console.log(`  ${x.id}: ${isEligible(x, queue, ctx).why}`));
      process.exit(3);
    }
    console.log(row(t));
    break;
  }
  case 'human': {
    queue.tasks
      .filter((t) => (t.owner === 'human' || t.owner === 'pair') && !['done', 'skipped'].includes(t.status))
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))
      .forEach((t) => console.log(row(t)));
    break;
  }
  case 'show': {
    const t = queue.tasks.find((x) => x.id === rest[0]);
    if (!t) { console.error(`unknown task ${rest[0]}`); process.exit(1); }
    console.log(JSON.stringify(t, null, 2));
    break;
  }
  case 'set': {
    const [id, status] = rest;
    if (!id || !status) { console.error('usage: set <id> <status> [--note ".."] [--evidence path]...'); process.exit(2); }
    const evidence = opts('--evidence').map((e) => e.replace(/\\/g, '/'));
    const t = updateTask(queue, id, { status, note: opt('--note'), evidence });
    const errors = validateQueue(queue);
    if (errors.length) { console.error(`refusing to save, queue would be invalid:\n- ${errors.join('\n- ')}`); process.exit(1); }
    saveQueue(QUEUE, queue);
    console.log(`updated ${t.id}: status=${t.status} evidence=${(t.evidence ?? []).length}`);
    break;
  }
  default:
    console.log('commands: validate | list | next | human | show <id> | set <id> <status> [--note] [--evidence]');
    process.exit(cmd ? 2 : 0);
}
