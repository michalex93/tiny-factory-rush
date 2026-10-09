/**
 * Fun-slice CDP frames + proven IWER hand path (no page reload / no ?capture=1).
 * Encode runs outside the browser-run lease via encode-fun-slice-frames.mjs.
 *
 * Note: default ~150s shift — we capture healthy→jam→grab→snap→recovery,
 * then stop (grade may not land inside the lease).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runIwsdk(bin, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      stderr += d;
      process.stderr.write(d);
    });
    child.on('exit', (code) => resolve({ status: code ?? 0, stdout, stderr }));
  });
}

function xr(bin, cwd, action, payload = {}) {
  return runIwsdk(
    bin,
    ['xr', action, '--input-json', JSON.stringify(payload), '--timeout', '30000'],
    cwd,
  );
}

export default async function run({ page, cdp, workspaceRoot }) {
  const bin = path.join(workspaceRoot, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
  const videoDir = path.join(workspaceRoot, '..', 'evidence', 'xr', 'fun-slice', 'video');
  const framesDir = path.join(videoDir, '_frames');
  const metaPath = path.join(videoDir, '_capture-meta.json');
  fs.mkdirSync(videoDir, { recursive: true });
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const consoleLines = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[factory]')) consoleLines.push({ t: Date.now(), text: t });
  });

  const MODULE = { x: -0.28, y: 0.83, z: -0.62 };
  const PAD = { x: 0.0, y: 0.83, z: -0.62 };
  const timeline = [];
  const t0 = Date.now();
  const mark = (step) => {
    timeline.push({ ms: Date.now() - t0, step });
    console.log('[fun-slice]', step);
  };

  let capturing = true;
  let frameIdx = 0;
  let captureErrors = 0;
  const captureTask = (async () => {
    while (capturing) {
      try {
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 55,
          fromSurface: true,
        });
        const i = frameIdx++;
        fs.writeFileSync(
          path.join(framesDir, `f_${String(i).padStart(5, '0')}.jpg`),
          Buffer.from(shot.data, 'base64'),
        );
      } catch {
        captureErrors += 1;
      }
      await sleep(140);
    }
  })();

  mark('enter-xr');
  await xr(bin, workspaceRoot, 'enter', {});
  await sleep(700);
  mark('hand-mode');
  await xr(bin, workspaceRoot, 'set-input-mode', { mode: 'hand' });
  await sleep(300);

  mark('reset-shift');
  await page.keyboard.press('r');
  await sleep(400);

  mark('healthy-pressure');
  let jamSeen = false;
  for (let i = 0; i < 55; i += 1) {
    if (consoleLines.some((l) => l.text.includes('jamStart'))) {
      jamSeen = true;
      break;
    }
    await sleep(700);
  }
  mark(jamSeen ? 'jam' : 'jam-timeout');
  await sleep(500);

  mark('grab');
  await xr(bin, workspaceRoot, 'set-transform', {
    device: 'hand-right',
    position: MODULE,
  });
  await sleep(180);
  await xr(bin, workspaceRoot, 'set-select-value', {
    device: 'hand-right',
    value: 1,
  });
  await sleep(400);

  mark('snap');
  await xr(bin, workspaceRoot, 'animate-to', {
    device: 'hand-right',
    position: PAD,
    duration: 0.35,
  });
  await sleep(450);
  await xr(bin, workspaceRoot, 'set-select-value', {
    device: 'hand-right',
    value: 0,
  });
  await sleep(1500);

  mark('recovery-hold');
  await sleep(2500);

  mark('stop-capture');
  capturing = false;
  await captureTask;

  const joined = consoleLines.map((l) => l.text).join('\n');
  const flags = {
    jamSeen: joined.includes('jamStart') || jamSeen,
    grabXr: joined.includes('grabSuccess') && joined.includes('inputSource: xr'),
    snapOk: joined.includes('snapSuccess') && joined.includes('inputSource: xr'),
    interventionOk: joined.includes('interventionSuccess'),
    recovered: joined.includes('flowRecovered'),
    gradeSeen: joined.includes('shiftEnd'),
    keyboardFallbackUsed:
      joined.includes('dev-keyboard') || joined.includes('DEV_ONLY'),
  };

  const meta = {
    label: 'IWSDK EMULATOR — FUN SLICE',
    note: 'Default shift (~150s); capture stops after recovery (grade optional in lease).',
    frameCount: frameIdx,
    captureErrors,
    timeline,
    flags,
    logsExcerpt: joined.slice(-8000),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (frameIdx < 40) throw new Error(`Too few frames: ${frameIdx}`);
  if (!flags.grabXr || !flags.snapOk || !flags.interventionOk) {
    throw new Error(`FUN_SLICE_CAPTURE_INCOMPLETE ${JSON.stringify(flags)}`);
  }

  return { ok: true, FRAMES_CAPTURE: 'PASS', ...flags, frameCount: frameIdx };
}
