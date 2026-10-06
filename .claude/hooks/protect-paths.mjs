#!/usr/bin/env node
// PreToolUse hook for Edit|Write|MultiEdit|NotebookEdit (PROTECTED): denies edits to the files that grade
// the agent (gates, loop, hooks, harness criteria, CI). Humans can bypass with ALLOW_PROTECTED_EDITS=1.
import fs from 'node:fs';
import path from 'node:path';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
if (process.env.ALLOW_PROTECTED_EDITS === '1') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);

let rel = path.relative(root, path.resolve(root, target)).replace(/\\/g, '/');
if (rel.startsWith('..')) process.exit(0);

let patterns = [];
try { patterns = JSON.parse(fs.readFileSync(path.join(root, 'gates.config.json'), 'utf8')).protected ?? []; } catch { /* keep empty */ }
patterns.push('.git/**', '.agent/session-base');

const toRe = (g) => new RegExp('^' + g.split('**').map((part) => part.split('*').map((s) => s.replace(/[.+^${}()|[\]\\?]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
const hit = patterns.find((p) => toRe(p).test(rel));
if (!hit) process.exit(0);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: `"${rel}" is protected (matches "${hit}"): it grades or runs the agent. Do not work around this. If it really must change, add a task with status "proposed" to tasks/queue.json explaining why, then continue with your task or stop.`,
  },
}));
