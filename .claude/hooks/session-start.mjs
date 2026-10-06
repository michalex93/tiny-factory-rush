#!/usr/bin/env node
// SessionStart hook (PROTECTED): records the session base commit for the Stop gate and prints a short
// orientation that Claude Code adds to the context (stdout of SessionStart hooks becomes context).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };
const agentDir = path.join(root, '.agent');
fs.mkdirSync(agentDir, { recursive: true });

const head = git('rev-parse', 'HEAD');
const baseFile = path.join(agentDir, 'session-base');
if (process.env.AGENT_BASE_SHA) fs.writeFileSync(baseFile, process.env.AGENT_BASE_SHA);
else if ((input.source ?? 'startup') === 'startup' || !fs.existsSync(baseFile)) fs.writeFileSync(baseFile, head);

let next = '';
try { next = execFileSync('node', ['scripts/tasks.mjs', 'next'], { cwd: root, encoding: 'utf8' }).trim(); } catch { next = 'none eligible right now (run: node scripts/tasks.mjs next)'; }
let progressTail = '';
try {
  const p = fs.readFileSync(path.join(root, 'progress', 'PROGRESS.md'), 'utf8').split(/\r?\n/);
  progressTail = p.filter((l) => l.startsWith('## ')).slice(-3).join('\n');
} catch { /* none */ }

console.log([
  'Tiny Factory Rush XR — session orientation (from .claude/hooks/session-start.mjs)',
  `Branch: ${git('rev-parse', '--abbrev-ref', 'HEAD')} @ ${head.slice(0, 10)} · Stop gate base: ${fs.readFileSync(baseFile, 'utf8').trim().slice(0, 10)}`,
  process.env.AGENT_TASK_ID ? `Loop task: ${process.env.AGENT_TASK_ID} (attempt ${process.env.AGENT_ATTEMPT ?? '?'})` : `Next eligible agent task: ${next || 'none'}`,
  progressTail ? `Recent progress:\n${progressTail}` : '',
  'Protocol: skills/autonomous-task/SKILL.md. Gates: npm run gates:quick / npm run gates. Protected files: gates.config.json "protected".',
].filter(Boolean).join('\n'));
