#!/usr/bin/env node
// Outer autonomous loop (PROTECTED).
// One task per iteration, fresh agent session per attempt, independent gates after every attempt,
// merge only on green, block + keep the branch on repeated failure, review packet at the end.
// Practices: Anthropic long-running harness (JSON task list, one feature at a time, verify before marking done),
// Ralph loop (fresh context per iteration, backpressure from tests), Claude Code best practices
// (fresh session after two failed corrections, independent verification), Kent Beck (anti-cheat).
//
// Usage: node scripts/agent-loop.mjs [--agent claude|claude-auto|codex|mock] [--max-tasks N] [--task ID]
//        [--once] [--dry-run] [--include-pair] [--gate-level full|quick|selftest] [--attempts N]
//        [--budget-minutes N] [--push] [--no-review]
// Stop gracefully: create the file .agent/STOP (or press Ctrl+C once).
import fs from 'node:fs';
import path from 'node:path';
import { runShellAsync, runShellSync, lastLines } from './lib/proc.mjs';
import * as G from './lib/git.mjs';
import { loadQueue, saveQueue, selectNext, isEligible, updateTask, validateQueue } from './lib/tasks.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d = null) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const root = G.repoRoot();
process.chdir(root);
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'agent-loop.config.json'), 'utf8'));
const AGENT_DIR = path.join(root, '.agent');
const QUEUE = path.join(root, 'tasks', 'queue.json');
const STOP_FILE = path.join(AGENT_DIR, 'STOP');
const LOCK_FILE = path.join(AGENT_DIR, 'loop.lock');
const pad2 = (n) => String(n).padStart(2, '0');
const now = new Date();
const runId = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
const runLog = path.join(AGENT_DIR, 'runs', `loop-${runId}.jsonl`);

const agentName = opt('--agent', process.env.AGENT_NAME ?? cfg.defaultAgent);
const agentCmd = process.env.AGENT_CMD ?? cfg.agents[agentName]?.command;
const maxTasks = Number(opt('--max-tasks', flag('--once') ? 1 : cfg.maxTasksPerRun));
const maxAttempts = Number(opt('--attempts', cfg.maxAttemptsPerTask));
const gateLevel = opt('--gate-level', cfg.gateLevel);
const budgetMs = Number(opt('--budget-minutes', cfg.runBudgetMinutes)) * 60_000;
const attemptTimeoutMs = cfg.attemptTimeoutMinutes * 60_000;
const dryRun = flag('--dry-run');
const push = flag('--push') || cfg.pushAfterEachTask;
const includePair = flag('--include-pair');

fs.mkdirSync(path.dirname(runLog), { recursive: true });
function log(event, data = {}) {
  fs.appendFileSync(runLog, JSON.stringify({ t: new Date().toISOString(), event, ...data }) + '\n');
  const brief = Object.entries(data).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`[loop] ${event}${brief ? ' ' + brief : ''}`);
}
const readStack = () => {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'xr.config.json'), 'utf8')).stack ?? 'undecided'; } catch { return 'undecided'; }
};
const render = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
const template = (name) => fs.readFileSync(path.join(root, 'prompts', name), 'utf8');

function fail(msg) {
  console.error(`[loop] ${msg}`);
  process.exit(2);
}

// ---------- preflight ----------
if (!agentCmd) fail(`unknown agent "${agentName}". Configure it in agent-loop.config.json.`);
const integration = G.currentBranch();
if (integration.startsWith('agent/')) fail(`run the loop from your integration branch, not ${integration}`);
if (!dryRun && !G.isClean()) fail('working tree is not clean. Commit or stash first (the loop needs a clean base).');
const queueErrors = validateQueue(loadQueue(QUEUE));
if (queueErrors.length) fail(`tasks/queue.json invalid:\n- ${queueErrors.join('\n- ')}`);
if (fs.existsSync(LOCK_FILE) && !dryRun) {
  const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch { /* stale */ }
  if (alive) fail(`another loop is running (pid ${pid}). Delete ${path.relative(root, LOCK_FILE)} if that is wrong.`);
}
if (fs.existsSync(STOP_FILE)) fs.rmSync(STOP_FILE);
if (!dryRun) fs.writeFileSync(LOCK_FILE, String(process.pid));

let stopRequested = false;
let killCurrent = null;
process.on('uncaughtException', (err) => {
  console.error(`[loop] crashed: ${err?.stack ?? err}`);
  console.error(`[loop] recovery: git checkout ${integration}; inspect any agent/* branch; delete .agent/loop.lock if it remains.`);
  try { fs.rmSync(LOCK_FILE); } catch { /* ignore */ }
  process.exit(3);
});
process.on('SIGINT', () => {
  if (stopRequested) {
    console.log('[loop] second Ctrl+C: killing the current agent and exiting.');
    if (killCurrent) killCurrent();
    try { fs.rmSync(LOCK_FILE); } catch { /* ignore */ }
    process.exit(130);
  }
  stopRequested = true;
  console.log('[loop] stop requested: finishing the current attempt (Ctrl+C again to abort now).');
});

function summarizeFailure({ report, task, agentRes }) {
  const parts = [];
  if (agentRes?.timedOut) parts.push(`- The attempt timed out after ${cfg.attemptTimeoutMinutes} min. Work in smaller steps and commit progress.`);
  if (agentRes && agentRes.code !== 0 && !agentRes.timedOut) parts.push(`- The agent process exited with code ${agentRes.code}. Last output:\n\`\`\`\n${lastLines(agentRes.tail, 25)}\n\`\`\``);
  if (report && !report.pass) {
    for (const r of report.results.filter((x) => x.status === 'FAIL')) {
      parts.push(`- Gate **${r.name}** failed:\n\`\`\`\n${lastLines((r.details ?? []).join('\n'), 30)}\n\`\`\``);
    }
  }
  if (task && task.status !== 'done') {
    parts.push(`- Task status is "${task.status}". After the gates pass you must run: node scripts/tasks.mjs set ${task.id} done --evidence <path> --note "<one line>" and append a progress entry.`);
  }
  return parts.join('\n') || '- Unknown failure (no gate report).';
}

async function runAttempt({ task, base, branch, attempt, previousFailure, resetNote }) {
  const stack = readStack();
  const vars = {
    RUN_ID: runId, TASK_ID: task.id, ATTEMPT: String(attempt), MAX_ATTEMPTS: String(maxAttempts),
    BASE_SHA: base, BRANCH: branch, STACK: stack, GATE_LEVEL: gateLevel,
    TASK_JSON: JSON.stringify(task, null, 2),
    TASK_SKILLS: (task.skills ?? []).map((s) => `skills/${s}/SKILL.md`).join(', ') || 'skills/autonomous-task/SKILL.md',
    RETRY_CONTEXT: previousFailure
      ? render(template('retry.md'), { PREV_ATTEMPT: String(attempt - 1), FAILURE_SUMMARY: previousFailure, RESET_NOTE: resetNote ?? '' })
      : '',
  };
  const prompt = render(template('task.md'), vars);
  const promptFile = path.join(AGENT_DIR, 'prompts', `${task.id}-a${attempt}.md`);
  fs.mkdirSync(path.dirname(promptFile), { recursive: true });
  fs.writeFileSync(promptFile, prompt);
  fs.writeFileSync(path.join(AGENT_DIR, 'current-task.json'), JSON.stringify({ runId, task: task.id, base, branch, attempt, maxAttempts }, null, 2));
  if (dryRun) {
    console.log(`\n----- PROMPT (${path.relative(root, promptFile)}) -----\n${prompt}\n----- END -----`);
    return null;
  }
  log('attempt-start', { task: task.id, attempt, agent: agentName });
  const agentRes = await runShellAsync(agentCmd, {
    cwd: root,
    input: prompt,
    timeoutMs: attemptTimeoutMs,
    logFile: path.join(AGENT_DIR, 'logs', `${runId}-${task.id}-a${attempt}.log`),
    env: { AGENT_BASE_SHA: base, AGENT_TASK_ID: task.id, AGENT_RUN_ID: runId, AGENT_BRANCH: branch, AGENT_ATTEMPT: String(attempt) },
    onSpawn: (_child, kill) => { killCurrent = kill; },
  });
  killCurrent = null;
  log('agent-exit', { task: task.id, attempt, code: agentRes.code, timedOut: agentRes.timedOut, seconds: Math.round(agentRes.durationMs / 1000) });

  if (G.currentBranch() !== branch) {
    log('warn-branch-switched', { expected: branch, actual: G.currentBranch() });
    if (!G.isClean()) G.commitAll(`${task.id}: changes left on wrong branch (auto-commit by loop)`);
    G.checkout(branch);
  }
  if (!G.isClean()) G.commitAll(`${task.id}: wip attempt ${attempt} (auto-commit by loop)`);

  const gateJson = path.join(AGENT_DIR, 'gates', `${runId}-${task.id}-a${attempt}.json`);
  const gate = runShellSync(`node scripts/gates.mjs --level ${gateLevel} --base ${base} --task ${task.id} --json "${gateJson}"`, {
    cwd: root, env: { AGENT_BASE_SHA: base },
  });
  let report = null;
  try { report = JSON.parse(fs.readFileSync(gateJson, 'utf8')); } catch { /* gates crashed */ }
  if (!report) report = { pass: false, results: [{ name: 'gates', status: 'FAIL', details: [lastLines(gate.stdout + gate.stderr, 40)] }] };
  const after = loadQueue(QUEUE).tasks.find((t) => t.id === task.id);
  log('gates', { task: task.id, attempt, pass: report.pass, status: after?.status });
  return { agentRes, report, after };
}

// ---------- main loop ----------
const started = Date.now();
const startSha = G.headSha();
const summary = { done: [], blocked: [], needsHuman: [] };
let consecutiveBlocked = 0;
log('run-start', { runId, agent: agentName, integration, startSha: G.shortSha(startSha), gateLevel, maxTasks });

for (let processed = 0; processed < maxTasks; processed++) {
  if (stopRequested || fs.existsSync(STOP_FILE)) { log('stop', { reason: 'requested' }); break; }
  if (Date.now() - started > budgetMs) { log('stop', { reason: 'run budget exhausted' }); break; }

  const queue = loadQueue(QUEUE);
  const ctx = { includePair, stack: readStack() };
  let task;
  if (opt('--task')) {
    task = queue.tasks.find((t) => t.id === opt('--task'));
    if (!task) fail(`unknown task ${opt('--task')}`);
    const e = isEligible(task, queue, { ...ctx, includePair: true });
    if (!e.ok) fail(`task ${task.id} is not eligible: ${e.why}`);
  } else {
    task = selectNext(queue, ctx);
  }
  if (!task) { log('no-eligible-task', {}); break; }

  const base = G.headSha();
  const branch = `agent/${task.id.toLowerCase()}-${runId}`;
  if (dryRun) { await runAttempt({ task, base, branch, attempt: 1 }); break; }
  G.createBranch(branch, base);
  log('task-start', { task: task.id, title: task.title, branch });

  let success = false;
  let agentBlocked = null;
  let previousFailure = null;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (stopRequested || fs.existsSync(STOP_FILE)) break;
    let resetNote = '';
    if (attempt === maxAttempts && attempt > 1 && cfg.resetBeforeFinalAttempt) {
      G.resetHard(base);
      resetNote = 'The branch was reset to the base commit for this final attempt: start clean, apply what you learned, keep the change minimal.';
      log('reset-before-final-attempt', { task: task.id });
    }
    attemptsUsed = attempt;
    const { agentRes, report, after } = await runAttempt({ task, base, branch, attempt, previousFailure, resetNote });
    if (report.pass && after?.status === 'done') { success = true; break; }
    if (after?.status === 'blocked') { agentBlocked = (after.notes ?? []).slice(-1)[0] ?? 'blocked by agent'; break; }
    previousFailure = summarizeFailure({ report, task: after, agentRes });
    const failFile = path.join(AGENT_DIR, 'failures', `${runId}-${task.id}-a${attempt}.md`);
    fs.mkdirSync(path.dirname(failFile), { recursive: true });
    fs.writeFileSync(failFile, `# ${task.id} attempt ${attempt} failed\n\n${previousFailure}\n`);
  }

  if (success) {
    G.checkout(integration);
    G.mergeNoFf(branch, `merge(agent): ${task.id} ${task.title}`);
    G.deleteBranch(branch);
    if (push) {
      const r = runShellSync(`git push ${cfg.remote} ${integration}`, { cwd: root });
      log('push', { ok: r.code === 0 });
    }
    summary.done.push(task.id);
    consecutiveBlocked = 0;
    log('task-done', { task: task.id, attempts: attemptsUsed });
  } else {
    const failedBranch = `agent/failed/${task.id.toLowerCase()}-${runId}`;
    if (!G.isClean()) G.commitAll(`${task.id}: leftovers (auto-commit by loop)`);
    G.checkout(integration);
    G.renameBranch(branch, failedBranch);
    const q = loadQueue(QUEUE);
    const reason = agentBlocked
      ? `agent: ${agentBlocked}`
      : stopRequested ? 'run stopped before completion'
        : `gates/acceptance failed after ${attemptsUsed} attempts (see .agent/failures/${runId}-${task.id}-a*.md)`;
    updateTask(q, task.id, {
      status: stopRequested && !agentBlocked ? 'todo' : 'blocked',
      note: `[loop ${runId}] ${reason}. Work kept on branch ${failedBranch}.`,
      attemptsDelta: attemptsUsed,
    });
    saveQueue(QUEUE, q);
    const progress = path.join(root, 'progress', 'PROGRESS.md');
    fs.appendFileSync(progress, `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${task.id} — ${stopRequested && !agentBlocked ? 'interrupted' : 'blocked'} (loop)\n- Reason: ${reason}\n- Branch with the attempts: ${failedBranch}\n`);
    G.commitAll(`chore(loop): ${stopRequested && !agentBlocked ? 'interrupt' : 'block'} ${task.id}`);
    if (agentBlocked && /NEEDS-HUMAN/i.test(agentBlocked)) summary.needsHuman.push(task.id);
    else if (!stopRequested) { summary.blocked.push(task.id); consecutiveBlocked++; }
    log('task-blocked', { task: task.id, reason: reason.slice(0, 120) });
    if (consecutiveBlocked >= cfg.maxConsecutiveBlocked) {
      log('stop', { reason: `${consecutiveBlocked} tasks blocked in a row: likely a systemic problem (environment, prompt or gates). Read the review packet.` });
      break;
    }
  }
  if (flag('--once')) break;
}

if (!dryRun && cfg.reviewPacket && !flag('--no-review') && G.headSha() !== startSha) {
  // Re-gate the integration branch so the packet's "Latest gates" describes what was merged, not the last failed attempt.
  const finalLevel = gateLevel === 'full' ? 'quick' : gateLevel;
  const fg = runShellSync(`node scripts/gates.mjs --level ${finalLevel} --no-diff --quiet`, { cwd: root });
  log('integration-gates', { level: finalLevel, pass: fg.code === 0 });
  const r = runShellSync(`node scripts/review-packet.mjs --since ${startSha} --run ${runId}`, { cwd: root });
  process.stdout.write(r.stdout);
  if (!G.isClean()) G.commitAll(`docs(review): packet for loop run ${runId}`);
}
try { fs.rmSync(LOCK_FILE); } catch { /* ignore */ }
log('run-end', { done: summary.done.length, blocked: summary.blocked.length, needsHuman: summary.needsHuman.length, minutes: Math.round((Date.now() - started) / 60000) });
console.log(`[loop] done: ${summary.done.join(', ') || '-'} | blocked: ${summary.blocked.join(', ') || '-'} | needs human: ${summary.needsHuman.join(', ') || '-'}`);
process.exit(summary.blocked.length && !summary.done.length ? 1 : 0);
