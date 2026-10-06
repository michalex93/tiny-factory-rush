/**
 * EMULATOR-only evidence: grab → rotate → release.
 * Does not change kill-test architecture; only drives IWER controllers.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
const evidenceDir = path.join(root, '..', 'evidence', 'xr', 'killtest-iwsdk');

function run(args) {
  const r = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout;
}

function sleep(ms) {
  spawnSync(process.execPath, [
    '-e',
    `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`,
  ]);
}

function setController(position, orientation) {
  const payload = {
    device: 'controller-right',
    position,
  };
  if (orientation) payload.orientation = orientation;
  run([
    'xr',
    'set-transform',
    '--input-json',
    JSON.stringify(payload),
    '--timeout',
    '30000',
  ]);
}

function setSqueeze(value) {
  run([
    'xr',
    'set-gamepad-state',
    '--input-json',
    JSON.stringify({
      device: 'controller-right',
      buttons: [{ index: 1, value }],
    }),
    '--timeout',
    '30000',
  ]);
}

const before = run([
  'xr',
  'get-device-state',
  '--timeout',
  '30000',
]);

// Approach module at center slot and grab (squeeze).
setController({ x: 0, y: 0.85, z: -0.95 });
sleep(400);
setSqueeze(1);
sleep(600);

// Rotate while held: yaw ~90° then pitch change via controller orientation.
setController(
  { x: 0.05, y: 0.9, z: -0.9 },
  { pitch: 15, yaw: 90, roll: 0 },
);
sleep(700);
setController(
  { x: 0.1, y: 0.92, z: -0.88 },
  { pitch: 25, yaw: 140, roll: 10 },
);
sleep(700);

run([
  'browser',
  'screenshot',
  '--output-file',
  path.join(evidenceDir, 'EMULATOR-during-rotate.png'),
  '--timeout',
  '90000',
]);

setSqueeze(0);
sleep(800);

run([
  'browser',
  'screenshot',
  '--output-file',
  path.join(evidenceDir, 'EMULATOR-after-rotate-release.png'),
  '--timeout',
  '90000',
]);

const after = run([
  'xr',
  'get-device-state',
  '--timeout',
  '30000',
]);

const logs = run([
  'browser',
  'logs',
  '--count',
  '100',
  '--pattern',
  'killtest',
  '--timeout',
  '30000',
]);

fs.writeFileSync(
  path.join(evidenceDir, 'EMULATOR-console-rotate.json'),
  logs,
);
fs.writeFileSync(
  path.join(evidenceDir, 'EMULATOR-device-state-before-rotate.json'),
  before,
);
fs.writeFileSync(
  path.join(evidenceDir, 'EMULATOR-device-state-after-rotate.json'),
  after,
);

console.log('ROTATE_FLOW_DONE');
