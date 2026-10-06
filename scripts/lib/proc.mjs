// Cross-platform process helpers (Windows + macOS + Linux). No dependencies.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const isWin = process.platform === 'win32';

/** Run a command synchronously without a shell. Returns { code, stdout, stderr }. */
export function runSync(cmd, args = [], opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    input: opts.input,
    shell: false,
  });
  return {
    code: res.status ?? (res.error ? 1 : 0),
    stdout: res.stdout ?? '',
    stderr: (res.stderr ?? '') + (res.error ? String(res.error) : ''),
  };
}

/** Run a shell command line synchronously (used for npm scripts and configured gate steps). */
export function runShellSync(command, opts = {}) {
  const res = spawnSync(command, {
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    shell: true,
    timeout: opts.timeoutMs,
  });
  const timedOut = res.error && /ETIMEDOUT/.test(String(res.error));
  return {
    code: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: (res.stderr ?? '') + (res.error && !timedOut ? String(res.error) : ''),
    timedOut: Boolean(timedOut),
  };
}

function killTree(child) {
  if (!child.pid) return;
  try {
    if (isWin) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    } else {
      process.kill(-child.pid, 'SIGINT');
      setTimeout(() => {
        try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
      }, 5000).unref();
    }
  } catch {
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
  }
}

/**
 * Run a shell command asynchronously, streaming output to a log file, with a hard timeout.
 * Resolves { code, timedOut, durationMs, tail } where tail is the last ~8KB of output.
 */
export function runShellAsync(command, opts = {}) {
  const { cwd = process.cwd(), env = {}, input, timeoutMs, logFile, echo = false, onSpawn } = opts;
  return new Promise((resolve) => {
    const started = Date.now();
    if (logFile) fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const log = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
    let tail = '';
    const keep = (chunk) => {
      const s = chunk.toString();
      tail = (tail + s).slice(-8192);
      if (log) log.write(s);
      if (echo) process.stdout.write(s);
    };
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      detached: !isWin,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    if (onSpawn) onSpawn(child, () => killTree(child));
    let timedOut = false;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          keep(Buffer.from(`\n[loop] attempt timed out after ${Math.round(timeoutMs / 60000)} min; killing process tree\n`));
          killTree(child);
        }, timeoutMs)
      : null;
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', (err) => keep(Buffer.from(`\n[loop] spawn error: ${err}\n`)));
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (log) log.end();
      resolve({ code: code ?? 1, timedOut, durationMs: Date.now() - started, tail });
    });
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

/** Last N lines of a string, for compact failure summaries. */
export function lastLines(text, n = 60) {
  const lines = String(text ?? '').split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}
