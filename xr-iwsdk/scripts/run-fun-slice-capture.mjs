/**
 * Start IWSDK runtime, wait for browser ready, run fun-slice recorder, shut down.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
const sessionPath = path.join(root, '.iwsdk', 'runtime', 'session.json');
const logPath = path.join(root, '..', '.agent', 'fun-dev-up.log');

function sleep(ms) {
  spawnSync(process.execPath, [
    '-e',
    `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`,
  ]);
}

function iwsdk(args, opts = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    ...opts,
  });
}

console.log('[fun-cap] dev down');
iwsdk(['dev', 'down']);

fs.mkdirSync(path.dirname(logPath), { recursive: true });
const logFd = fs.openSync(logPath, 'w');
console.log('[fun-cap] dev up');
const child = spawn(
  process.execPath,
  [
    bin,
    'dev',
    'up',
    '--ai-mode',
    'agent',
    '--allow-browser-automation',
    '--headless',
    '--open',
  ],
  { cwd: root, stdio: ['ignore', logFd, logFd] },
);

let ready = false;
for (let i = 0; i < 90; i += 1) {
  sleep(2000);
  if (!fs.existsSync(sessionPath)) continue;
  try {
    const s = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    if (s?.browser?.commandReady) {
      ready = true;
      console.log('[fun-cap] browser command-ready');
      break;
    }
  } catch {
    /* retry */
  }
}

if (!ready) {
  console.error('[fun-cap] browser never ready');
  iwsdk(['dev', 'down']);
  child.kill('SIGTERM');
  process.exit(1);
}

console.log('[fun-cap] browser run fun-slice');
const run = iwsdk([
  'browser',
  'run',
  'scripts/browser-record-fun-slice.mjs',
  '--timeout',
  '100000',
]);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);

console.log('[fun-cap] encode outside lease');
const enc = spawnSync(process.execPath, [path.join(root, 'scripts', 'encode-fun-slice-frames.mjs')], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
if (enc.stdout) process.stdout.write(enc.stdout);
if (enc.stderr) process.stderr.write(enc.stderr);

console.log('[fun-cap] dev down');
iwsdk(['dev', 'down']);
try {
  child.kill('SIGTERM');
} catch {
  /* ignore */
}
fs.closeSync(logFd);
const code = run.status === 0 && enc.status === 0 ? 0 : 1;
process.exit(code);
