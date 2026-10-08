/**
 * Complete factory checkpoint loop via IWER XR hands (not keyboard B).
 * Label: IWSDK EMULATOR — DEVELOPMENT CHECKPOINT
 *
 * Critical: CLI screenshots are slow (~7s). Reset shift with R immediately
 * before the intervention window so snap lands while phase=running.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
const shotDir = path.join(
  root,
  '..',
  'evidence',
  'comp',
  'checkpoint-01',
  'screenshots',
);
const silentDir = path.join(
  root,
  '..',
  'evidence',
  'xr',
  'marketing',
  'silent-10s',
);
const outJson = path.join(
  root,
  '..',
  'evidence',
  'xr',
  'factory-checkpoint',
  'EMULATOR-HAND-LOOP.json',
);

fs.mkdirSync(shotDir, { recursive: true });
fs.mkdirSync(silentDir, { recursive: true });
fs.mkdirSync(path.dirname(outJson), { recursive: true });

function run(args, { allowFail = false } = {}) {
  const r = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (!allowFail && r.status !== 0) process.exit(r.status ?? 1);
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

function screenshot(name) {
  return run([
    'browser',
    'screenshot',
    '--output-file',
    path.join(shotDir, name),
    '--timeout',
    '90000',
  ]);
}

function logs(pattern, count = 80) {
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

function pressKey(key) {
  return run([
    'browser',
    'interact',
    '--input-json',
    JSON.stringify({ steps: [{ action: 'press', key }] }),
    '--timeout',
    '15000',
  ]);
}

const MODULE = { x: -0.28, y: 0.83, z: -0.62 };
const PAD = { x: 0.0, y: 0.83, z: -0.62 };
const timeline = [];
const t0 = Date.now();
function mark(step) {
  timeline.push({ ms: Date.now() - t0, step });
  console.log('[loop]', step);
}

mark('reload');
run(['browser', 'reload', '--timeout', '60000']);
sleep(2000);

mark('enter-xr');
xr('enter', {});
sleep(800);

mark('hand-mode');
xr('set-input-mode', { mode: 'hand' });
sleep(300);

// Fresh shift clock — do not spend the shift on screenshots first.
mark('reset-shift');
pressKey('r');
sleep(500);

mark('build-jam');
sleep(5000);

mark('move-hand-to-module');
xr('set-transform', { device: 'hand-right', position: MODULE });
sleep(250);

mark('pinch-grab');
xr('set-select-value', { device: 'hand-right', value: 1 });
sleep(500);

mark('move-to-pad');
xr('animate-to', {
  device: 'hand-right',
  position: PAD,
  duration: 0.45,
});
sleep(550);

mark('release-snap');
xr('set-select-value', { device: 'hand-right', value: 0 });
sleep(1200);

const afterSnap = logs('interventionSuccess', 40);
const afterSnapAll = logs('factory', 100);
const snapOk =
  afterSnapAll.stdout.includes('snapSuccess') &&
  afterSnapAll.stdout.includes('inputSource: xr');
const interventionOk =
  afterSnap.stdout.includes('interventionSuccess') ||
  afterSnapAll.stdout.includes('interventionSuccess');
const recovered = afterSnapAll.stdout.includes('flowRecovered');
mark(
  `post-snap snapOk=${snapOk} interventionOk=${interventionOk} recovered=${recovered}`,
);

screenshot('HERO-04-recovery.png');
fs.copyFileSync(
  path.join(shotDir, 'HERO-04-recovery.png'),
  path.join(silentDir, '04-recovery.png'),
);

mark('wait-grade');
let gradeSeen = false;
for (let i = 0; i < 65; i += 1) {
  const l = logs('shiftEnd', 20);
  if (l.stdout.includes('shiftEnd')) {
    gradeSeen = true;
    break;
  }
  sleep(1000);
}
mark(gradeSeen ? 'grade-detected' : 'grade-timeout');
screenshot('HERO-05-grade.png');
fs.copyFileSync(
  path.join(shotDir, 'HERO-05-grade.png'),
  path.join(silentDir, '05-grade.png'),
);

// Visual hero frames for running/jam/hand (same emulator session, fresh shift)
mark('visual-pass-reset');
pressKey('r');
sleep(800);
screenshot('HERO-01-running.png');
fs.copyFileSync(
  path.join(shotDir, 'HERO-01-running.png'),
  path.join(silentDir, '01-running.png'),
);
sleep(4500);
screenshot('HERO-02-jam.png');
fs.copyFileSync(
  path.join(shotDir, 'HERO-02-jam.png'),
  path.join(silentDir, '02-jam.png'),
);

// Hand pose at module (visual only — intervention already proven above)
xr('set-transform', { device: 'hand-right', position: MODULE });
xr('set-select-value', { device: 'hand-right', value: 1 });
sleep(400);
screenshot('HERO-03-hand-intervention.png');
fs.copyFileSync(
  path.join(shotDir, 'HERO-03-hand-intervention.png'),
  path.join(silentDir, '03-hand-intervention.png'),
);
xr('set-select-value', { device: 'hand-right', value: 0 });

const factoryLogs = logs('factory', 200);
const grabXr =
  factoryLogs.stdout.includes('grabSuccess') &&
  factoryLogs.stdout.includes('inputSource: xr');
const noDevKey =
  !factoryLogs.stdout.includes('dev-keyboard') &&
  !factoryLogs.stdout.includes('DEV_ONLY');

fs.writeFileSync(
  outJson,
  JSON.stringify(
    {
      label: 'IWSDK EMULATOR — DEVELOPMENT CHECKPOINT',
      inputPath: 'hand-right pinch via IWER',
      expectedInputSource: 'xr',
      grabXr,
      snapOk,
      interventionOk,
      recovered,
      gradeSeen,
      noDevKey,
      note: 'HERO-01/02/03 visual pass after proven intervention; HERO-04/05 from intervention shift',
      timeline,
      logsExcerpt: factoryLogs.stdout.slice(0, 16000),
    },
    null,
    2,
  ),
);

console.log('FACTORY_HAND_LOOP_DONE', {
  grabXr,
  snapOk,
  interventionOk,
  recovered,
  gradeSeen,
  noDevKey,
});

if (!grabXr || !snapOk || !interventionOk) {
  console.error('HAND_LOOP_INCOMPLETE');
  process.exit(2);
}
process.exit(0);
