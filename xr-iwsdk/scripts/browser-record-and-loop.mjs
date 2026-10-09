/**
 * Parallel CDP screenshots + IWER hand XR loop (non-blocking so capture can run).
 * Encodes with ffmpeg-static.
 * Label: IWSDK EMULATOR — DEVELOPMENT CHECKPOINT
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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
    [
      'xr',
      action,
      '--input-json',
      JSON.stringify(payload),
      '--timeout',
      '30000',
    ],
    cwd,
  );
}

export default async function run({ page, cdp, workspaceRoot }) {
  const bin = path.join(workspaceRoot, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
  const videoDir = path.join(
    workspaceRoot,
    '..',
    'evidence',
    'comp',
    'checkpoint-01',
    'short-video',
  );
  const framesDir = path.join(videoDir, '_frames');
  const webmPath = path.join(videoDir, 'IWSDK-EMULATOR-HAND-LOOP.webm');
  const mp4Path = path.join(videoDir, 'IWSDK-EMULATOR-HAND-LOOP.mp4');
  const tracePath = path.join(videoDir, 'VIDEO-HAND-LOOP.json');
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
    console.log('[rec+loop]', step);
  };

  let capturing = true;
  let frameIdx = 0;
  let captureErrors = 0;
  const captureTask = (async () => {
    while (capturing) {
      try {
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 62,
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
      await sleep(100);
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
  await sleep(350);

  mark('build-jam');
  await sleep(4200);

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
  await sleep(900);

  mark('wait-grade');
  let gradeSeen = false;
  for (let i = 0; i < 48; i += 1) {
    if (consoleLines.some((l) => l.text.includes('shiftEnd'))) {
      gradeSeen = true;
      break;
    }
    await sleep(900);
  }
  mark(gradeSeen ? 'grade' : 'grade-timeout');
  await sleep(1000);

  mark('stop-capture');
  capturing = false;
  await captureTask;

  const frameCount = frameIdx;
  console.log('[rec+loop] frames', frameCount, 'captureErrors', captureErrors);
  if (frameCount < 40) {
    throw new Error(`Too few capture frames: ${frameCount}`);
  }

  const ffmpegPath = require(
    path.join(workspaceRoot, 'node_modules', 'ffmpeg-static'),
  );

  const encode = (args) =>
    new Promise((resolve) => {
      const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d;
      });
      child.on('exit', (code) => resolve({ status: code ?? 1, stderr }));
    });

  mark('encode-webm');
  const encWebm = await encode([
    '-y',
    '-framerate',
    '8',
    '-i',
    path.join(framesDir, 'f_%05d.jpg'),
    '-c:v',
    'libvpx',
    '-b:v',
    '2M',
    '-pix_fmt',
    'yuv420p',
    webmPath,
  ]);
  if (encWebm.status !== 0) {
    throw new Error(`ffmpeg webm failed: ${encWebm.stderr.slice(-800)}`);
  }

  mark('encode-mp4');
  const encMp4 = await encode([
    '-y',
    '-framerate',
    '8',
    '-i',
    path.join(framesDir, 'f_%05d.jpg'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4Path,
  ]);
  const mp4Ok = encMp4.status === 0 && fs.existsSync(mp4Path);

  const silentDir = path.join(
    workspaceRoot,
    '..',
    'evidence',
    'xr',
    'marketing',
    'silent-10s',
  );
  fs.mkdirSync(silentDir, { recursive: true });
  const heroWebm = path.join(silentDir, 'HERO-LOOP-10S.webm');
  const heroMp4 = path.join(silentDir, 'HERO-LOOP-10S.mp4');
  const startFrame = Math.max(0, Math.floor(frameCount * 0.1));
  await encode([
    '-y',
    '-framerate',
    '8',
    '-start_number',
    String(startFrame),
    '-i',
    path.join(framesDir, 'f_%05d.jpg'),
    '-frames:v',
    '80',
    '-c:v',
    'libvpx',
    '-b:v',
    '2M',
    '-pix_fmt',
    'yuv420p',
    heroWebm,
  ]);
  if (mp4Ok) {
    await encode([
      '-y',
      '-framerate',
      '8',
      '-start_number',
      String(startFrame),
      '-i',
      path.join(framesDir, 'f_%05d.jpg'),
      '-frames:v',
      '80',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      heroMp4,
    ]);
  }

  const bytes = fs.readFileSync(webmPath);
  const joined = consoleLines.map((l) => l.text).join('\n');
  const flags = {
    grabXr: joined.includes('grabSuccess') && joined.includes('inputSource: xr'),
    snapOk: joined.includes('snapSuccess') && joined.includes('inputSource: xr'),
    interventionOk: joined.includes('interventionSuccess'),
    recovered: joined.includes('flowRecovered'),
    gradeSeen: joined.includes('shiftEnd') || gradeSeen,
    keyboardFallbackUsed:
      joined.includes('dev-keyboard') || joined.includes('DEV_ONLY'),
  };

  const events = [
    'shiftStart',
    'grabAttempt',
    'grabSuccess',
    'snapSuccess',
    'interventionSuccess',
    'flowRecovered',
    'shiftEnd',
  ].map((event) => ({
    event,
    present: joined.includes(event),
    firstMs: consoleLines.find((l) => l.text.includes(event))
      ? consoleLines.find((l) => l.text.includes(event)).t - t0
      : null,
  }));

  const report = {
    label: 'IWSDK EMULATOR — DEVELOPMENT CHECKPOINT',
    captureMethod:
      'CDP Page.captureScreenshot async loop + ffmpeg-static (libvpx/libx264)',
    inputPath: 'hand-right pinch via IWER',
    expectedInputSource: 'xr',
    ...flags,
    events,
    timeline,
    video: {
      webm: 'evidence/comp/checkpoint-01/short-video/IWSDK-EMULATOR-HAND-LOOP.webm',
      mp4: mp4Ok
        ? 'evidence/comp/checkpoint-01/short-video/IWSDK-EMULATOR-HAND-LOOP.mp4'
        : null,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      frameCount,
      captureErrors,
      approxFps: 8,
      durationSecApprox: Number((frameCount / 8).toFixed(1)),
      mp4Available: mp4Ok,
      hero10sWebm: fs.existsSync(heroWebm)
        ? 'evidence/xr/marketing/silent-10s/HERO-LOOP-10S.webm'
        : null,
      hero10sMp4: fs.existsSync(heroMp4)
        ? 'evidence/xr/marketing/silent-10s/HERO-LOOP-10S.mp4'
        : null,
    },
    logsExcerpt: joined.slice(0, 12000),
  };
  fs.writeFileSync(tracePath, JSON.stringify(report, null, 2));
  fs.rmSync(framesDir, { recursive: true, force: true });

  if (
    !flags.grabXr ||
    !flags.snapOk ||
    !flags.interventionOk ||
    bytes.length < 50_000
  ) {
    throw new Error(
      `VIDEO_CAPTURE_INCOMPLETE ${JSON.stringify(flags)} size=${bytes.length} frames=${frameCount}`,
    );
  }

  return {
    ok: true,
    VIDEO_CAPTURE: 'PASS',
    ...flags,
    bytes: bytes.length,
    frameCount,
    mp4Ok,
  };
}
