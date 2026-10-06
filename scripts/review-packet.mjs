#!/usr/bin/env node
// Builds a review packet for the human owner and an external reviewer (Claude/ChatGPT).
//   node scripts/review-packet.mjs [--since <sha|ref>] [--run <runId>] [--out <file>] [--stdout]
// Default --since: the sha stored in review/.last (previous packet), else 24 hours of history.
import fs from 'node:fs';
import path from 'node:path';
import * as G from './lib/git.mjs';
import { loadQueue, statusChanges } from './lib/tasks.mjs';

const argv = process.argv.slice(2);
const opt = (n, d = null) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const root = G.repoRoot();
process.chdir(root);
const reviewDir = path.join(root, 'review');
fs.mkdirSync(reviewDir, { recursive: true });
const lastFile = path.join(reviewDir, '.last');

let since = opt('--since');
if (!since && fs.existsSync(lastFile)) since = fs.readFileSync(lastFile, 'utf8').trim();
if (since && !G.shaExists(since)) since = null;
if (!since) {
  const r = G.git(['rev-list', '-1', '--before=24 hours ago', 'HEAD']);
  since = r.stdout.trim() || G.git(['rev-list', '--max-parents=0', 'HEAD']).stdout.trim().split('\n')[0];
}
since = G.git(['rev-parse', since]).stdout.trim() || since; // accept refs like origin/master
const head = G.headSha();
const queue = loadQueue(path.join(root, 'tasks', 'queue.json'));
let baseQueue = { version: 1, tasks: [] };
try { baseQueue = JSON.parse(G.showFileAt(since, 'tasks/queue.json') ?? '{"version":1,"tasks":[]}'); } catch { /* keep empty */ }
const changes = statusChanges(baseQueue, queue);
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const in3 = new Date(today.getTime() + 3 * 86400000);

const line = (t) => `- **${t.id}** (T${t.tier}, ${t.owner}${t.due ? `, due ${t.due}` : ''}) ${t.title}`;
const notes = (t) => (t.notes ?? []).slice(-2).map((n) => `  - note: ${n}`).join('\n');
const done = changes.filter((c) => c.to === 'done').map((c) => c.task);
const blocked = queue.tasks.filter((t) => t.status === 'blocked');
const proposed = queue.tasks.filter((t) => t.status === 'proposed');
const humanOpen = queue.tasks.filter((t) => ['human', 'pair'].includes(t.owner) && !['done', 'skipped'].includes(t.status));
const overdue = queue.tasks.filter((t) => t.due && t.due < iso(today) && !['done', 'skipped'].includes(t.status));
const dueSoon = queue.tasks.filter((t) => t.due && t.due >= iso(today) && t.due <= iso(in3) && !['done', 'skipped'].includes(t.status));
const questions = queue.tasks.flatMap((t) => (t.notes ?? []).filter((n) => /^Q:|NEEDS-HUMAN/i.test(n)).map((n) => `- ${t.id}: ${n}`));
const counts = queue.tasks.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }), {});

let gates = 'No gate report found (.agent/gates/last.json).';
const gatesFile = path.join(root, '.agent', 'gates', 'last.json');
if (fs.existsSync(gatesFile)) {
  const g = JSON.parse(fs.readFileSync(gatesFile, 'utf8'));
  gates = `Level ${g.level} at ${g.at} on ${String(g.head).slice(0, 10)}: **${g.pass ? 'PASS' : 'FAIL'}**\n` +
    g.results.map((r) => `- ${r.status} ${r.name}`).join('\n');
}

const decisionsText = fs.existsSync(path.join(root, 'docs/xr/DECISIONS.md')) ? fs.readFileSync(path.join(root, 'docs/xr/DECISIONS.md'), 'utf8').replace(/\r\n/g, '\n') : '';
const openDecisions = decisionsText
  .split(/^## (?=D-\d+\s*$)/m)
  .slice(1)
  .map((block) => {
    const id = block.split('\n')[0].trim();
    const status = (block.match(/^Status: (.*)$/m) ?? [])[1] ?? '';
    const decision = (block.match(/^Decision(?: \(original\))?: (.*)$/m) ?? [])[1] ?? '';
    return { id, status, decision };
  })
  .filter((d) => /^(OPEN|PROVISIONAL)/.test(d.status))
  .map((d) => `- ${d.id} — ${d.status} — ${d.decision.slice(0, 140)}`);

const packet = `# Review packet — ${iso(today)}${opt('--run') ? ` (loop run ${opt('--run')})` : ''}

Branch \`${G.currentBranch()}\` · range \`${G.shortSha(since)}..${G.shortSha(head)}\`
Task counts: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}

## Done since last packet (${done.length})
${done.map((t) => `${line(t)}\n  - evidence: ${(t.evidence ?? []).join(', ') || '—'}`).join('\n') || '- none'}

## Blocked (${blocked.length})
${blocked.map((t) => `${line(t)}\n${notes(t)}`).join('\n') || '- none'}

## Needs the owner
${humanOpen.slice(0, 12).map(line).join('\n') || '- none'}

## Overdue
${overdue.map(line).join('\n') || '- none'}

## Due in the next 3 days
${dueSoon.map(line).join('\n') || '- none'}

## Proposed by agents (approve by setting status "todo", or delete)
${proposed.map(line).join('\n') || '- none'}

## Questions / NEEDS-HUMAN notes
${questions.join('\n') || '- none'}

## Open or provisional decisions
${openDecisions.join('\n') || '- none'}

## Latest gates
${gates}

## Commits
\`\`\`
${G.logOneline(`${since}..${head}`) || '(none)'}
\`\`\`

## Diffstat
\`\`\`
${G.diffStat(`${since}..${head}`) || '(none)'}
\`\`\`
`;

const external = fs.readFileSync(path.join(root, 'prompts', 'external-review.md'), 'utf8').replace('{{PACKET}}', packet);
const output = `${packet}\n---\n\n## Prompt for an external reviewer (copy everything below into ChatGPT or Claude)\n\n${external}`;

if (argv.includes('--stdout')) {
  process.stdout.write(output);
} else {
  const stamp = `${iso(today).replace(/-/g, '')}-${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
  const out = opt('--out', path.join(reviewDir, `REVIEW-${stamp}.md`));
  fs.writeFileSync(out, output);
  fs.writeFileSync(lastFile, head + '\n');
  console.log(`review packet written: ${path.relative(root, out)}`);
}
