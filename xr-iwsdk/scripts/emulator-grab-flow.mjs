import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');

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
  spawnSync(process.execPath, ['-e', `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`]);
}

run([
  'xr',
  'set-transform',
  '--input-json',
  JSON.stringify({
    device: 'controller-right',
    position: { x: 0, y: 0.85, z: -0.95 },
  }),
  '--timeout',
  '30000',
]);

run([
  'xr',
  'set-gamepad-state',
  '--input-json',
  JSON.stringify({
    device: 'controller-right',
    buttons: [{ index: 1, value: 1 }],
  }),
  '--timeout',
  '30000',
]);
sleep(800);

run([
  'xr',
  'set-transform',
  '--input-json',
  JSON.stringify({
    device: 'controller-right',
    position: { x: 0.35, y: 0.9, z: -0.95 },
  }),
  '--timeout',
  '30000',
]);
sleep(800);

run([
  'xr',
  'set-gamepad-state',
  '--input-json',
  JSON.stringify({
    device: 'controller-right',
    buttons: [{ index: 1, value: 0 }],
  }),
  '--timeout',
  '30000',
]);
sleep(800);

run([
  'browser',
  'screenshot',
  '--output-file',
  path.join(
    root,
    '..',
    'evidence',
    'xr',
    'killtest-iwsdk',
    'EMULATOR-after-grab-snap.png',
  ),
  '--timeout',
  '90000',
]);

const logs = run([
  'browser',
  'logs',
  '--count',
  '80',
  '--pattern',
  'killtest',
  '--timeout',
  '30000',
]);
import fs from 'node:fs';
fs.writeFileSync(
  path.join(root, '..', 'evidence', 'xr', 'killtest-iwsdk', 'EMULATOR-console-after-grab.json'),
  logs,
);

console.log('GRAB_FLOW_DONE');
