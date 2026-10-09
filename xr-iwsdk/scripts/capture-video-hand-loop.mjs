/**
 * Orchestrate: MediaRecorder video + proven IWER hand XR loop.
 * Label: IWSDK EMULATOR — DEVELOPMENT CHECKPOINT
 *
 * Note: iwsdk browser-run lease max is 110000ms — keep recording under that.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
const stopFile = path.join(root, 'scripts', '.stop-factory-rec');
const videoDir = path.join(
  root,
  '..',
  'evidence',
  'comp',
  'checkpoint-01',
  'short-video',
);
const webmPath = path.join(videoDir, 'IWSDK-EMULATOR-HAND-LOOP.webm');
const tracePath = path.join(videoDir, 'VIDEO-HAND-LOOP.json');

fs.mkdirSync(videoDir, { recursive: true });
if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);

function run(args, { allowFail = false } = {}) {
  const r = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (!allowFail && r.status !== 0) {
    throw new Error(`iwsdk ${args.join(' ')} failed: ${r.status}`);
  }
  return { status: r.status ?? 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function sleep(ms) {
  spawnSync(process.execPath, [
    '-e',
    `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`,
  ]);
}

function xr(action, payload = {}) {
  return run([
    'xr',
    action,
    '--input-json',
    JSON.stringify(payload),
    '--timeout',
    '60000',
  ]);
}

function logs(pattern, count = 100) {
  return run(
    [
      'browser',
      'logs',
      '--count',
      String(count),
      '--pattern',
      pattern,
      '--timeout',
      '30000',
    ],
    { allowFail: true },
  );
}

const MODULE = { x: -0.28, y: 0.83, z: -0.62 };
const PAD = { x: 0.0, y: 0.83, z: -0.62 };
const timeline = [];
const t0 = Date.now();
function mark(step) {
  timeline.push({ ms: Date.now() - t0, step });
  console.log('[video-loop]', step);
}

mark('reload');
run(['browser', 'reload', '--timeout', '60000']);
sleep(2000);

mark('enter-xr');
xr('enter', {});
sleep(900);

mark('hand-mode');
xr('set-input-mode', { mode: 'hand' });
sleep(400);

// Start recorder AFTER XR is live (lease ≤110s)
mark('start-recorder');
const recLog = path.join(videoDir, 'recorder-run.log');
const recOut = fs.openSync(recLog, 'w');
const recorder = spawn(
  process.execPath,
  [bin, 'browser', 'run', 'scripts/browser-record-webm.mjs', '--timeout', '105000'],
  { cwd: root, stdio: ['ignore', recOut, recOut] },
);
sleep(2000);

mark('reset-shift');
run([
  'browser',
  'interact',
  '--input-json',
  JSON.stringify({ steps: [{ action: 'press', key: 'r' }] }),
  '--timeout',
  '15000',
]);
sleep(400);

mark('build-jam');
sleep(4500);

mark('pinch-grab');
xr('set-transform', { device: 'hand-right', position: MODULE });
sleep(200);
xr('set-select-value', { device: 'hand-right', value: 1 });
sleep(450);

mark('snap');
xr('animate-to', { device: 'hand-right', position: PAD, duration: 0.4 });
sleep(500);
xr('set-select-value', { device: 'hand-right', value: 0 });
sleep(1200);

const after = logs('factory', 120);
const grabXr =
  after.stdout.includes('grabSuccess') && after.stdout.includes('inputSource: xr');
const snapOk =
  after.stdout.includes('snapSuccess') && after.stdout.includes('inputSource: xr');
const interventionOk = after.stdout.includes('interventionSuccess');
const recovered = after.stdout.includes('flowRecovered');
mark(
  `post-snap grabXr=${grabXr} snapOk=${snapOk} interventionOk=${interventionOk} recovered=${recovered}`,
);

mark('wait-grade');
let gradeSeen = false;
for (let i = 0; i < 58; i += 1) {
  const l = logs('shiftEnd', 20);
  if (l.stdout.includes('shiftEnd')) {
    gradeSeen = true;
    break;
  }
  sleep(1000);
}
mark(gradeSeen ? 'grade-detected' : 'grade-timeout');
sleep(2000);

mark('stop-recorder');
fs.writeFileSync(stopFile, 'stop\n');

const exit = await new Promise((resolve) => {
  const timer = setTimeout(() => {
    try {
      recorder.kill();
    } catch {
      /* ignore */
    }
    resolve(-1);
  }, 30000);
  recorder.on('exit', (code) => {
    clearTimeout(timer);
    resolve(code ?? 0);
  });
});
fs.closeSync(recOut);

const factoryLogs = logs('factory', 200);
const events = [];
for (const name of [
  'shiftStart',
  'grabAttempt',
  'grabSuccess',
  'snapSuccess',
  'interventionSuccess',
  'flowRecovered',
  'shiftEnd',
]) {
  events.push({ event: name, present: factoryLogs.stdout.includes(name) });
}

const webmExists = fs.existsSync(webmPath);
const webmSize = webmExists ? fs.statSync(webmPath).size : 0;
const sha = webmExists
  ? createHash('sha256').update(fs.readFileSync(webmPath)).digest('hex')
  : null;

const report = {
  label: 'IWSDK EMULATOR — DEVELOPMENT CHECKPOINT',
  captureMethod: 'canvas.captureStream + MediaRecorder via iwsdk browser run',
  inputPath: 'hand-right pinch via IWER',
  expectedInputSource: 'xr',
  keyboardFallbackUsed: false,
  grabXr,
  snapOk,
  interventionOk,
  recovered,
  gradeSeen,
  events,
  timeline,
  video: {
    path: webmExists ? 'evidence/comp/checkpoint-01/short-video/IWSDK-EMULATOR-HAND-LOOP.webm' : null,
    bytes: webmSize,
    sha256: sha,
    recorderExit: exit,
    recorderLog: fs.existsSync(recLog)
      ? fs.readFileSync(recLog, 'utf8').slice(0, 2000)
      : null,
  },
  logsExcerpt: factoryLogs.stdout.slice(0, 12000),
};

fs.writeFileSync(tracePath, JSON.stringify(report, null, 2));
console.log('VIDEO_HAND_LOOP_DONE', {
  grabXr,
  snapOk,
  interventionOk,
  recovered,
  gradeSeen,
  webmExists,
  webmSize,
  recorderExit: exit,
});

if (!grabXr || !snapOk || !interventionOk || !webmExists || webmSize < 20_000) {
  console.error('VIDEO_CAPTURE_INCOMPLETE');
  process.exit(2);
}
console.log('VIDEO_CAPTURE=PASS');
process.exit(0);
