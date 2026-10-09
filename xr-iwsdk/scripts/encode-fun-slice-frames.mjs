import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const videoDir = path.join(root, '..', 'evidence', 'xr', 'fun-slice', 'video');
const framesDir = path.join(videoDir, '_frames');
const metaPath = path.join(videoDir, '_capture-meta.json');
const webmPath = path.join(videoDir, 'FUN-SLICE-HAND-LOOP.webm');
const mp4Path = path.join(videoDir, 'FUN-SLICE-HAND-LOOP.mp4');
const heroWebm = path.join(videoDir, 'FUN-SLICE-HERO-15S.webm');
const heroMp4 = path.join(videoDir, 'FUN-SLICE-HERO-15S.mp4');
const tracePath = path.join(videoDir, 'FUN-SLICE-HAND-LOOP.json');
const stillDir = path.join(root, '..', 'evidence', 'xr', 'fun-slice', 'stills');

if (!fs.existsSync(metaPath)) {
  console.error('missing capture meta');
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const frameCount = meta.frameCount || 0;
if (frameCount < 40) {
  console.error('too few frames', frameCount);
  process.exit(1);
}

const ffmpegPath = require(path.join(root, 'node_modules', 'ffmpeg-static'));
function encode(args) {
  const r = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-800));
    throw new Error(`ffmpeg failed ${r.status}`);
  }
}

encode([
  '-y',
  '-framerate',
  '7',
  '-i',
  path.join(framesDir, 'f_%05d.jpg'),
  '-c:v',
  'libvpx',
  '-b:v',
  '1.8M',
  '-pix_fmt',
  'yuv420p',
  webmPath,
]);
let mp4Ok = true;
try {
  encode([
    '-y',
    '-framerate',
    '7',
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
} catch {
  mp4Ok = false;
}

const startFrame = Math.max(0, Math.floor(frameCount * 0.32));
encode([
  '-y',
  '-framerate',
  '7',
  '-start_number',
  String(startFrame),
  '-i',
  path.join(framesDir, 'f_%05d.jpg'),
  '-frames:v',
  '105',
  '-c:v',
  'libvpx',
  '-b:v',
  '1.8M',
  '-pix_fmt',
  'yuv420p',
  heroWebm,
]);
if (mp4Ok) {
  try {
    encode([
      '-y',
      '-framerate',
      '7',
      '-start_number',
      String(startFrame),
      '-i',
      path.join(framesDir, 'f_%05d.jpg'),
      '-frames:v',
      '105',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      heroMp4,
    ]);
  } catch {
    /* optional */
  }
}

fs.mkdirSync(stillDir, { recursive: true });
const pick = (name, idx) => {
  const src = path.join(framesDir, `f_${String(idx).padStart(5, '0')}.jpg`);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(stillDir, name));
};
pick('01-healthy.jpg', Math.min(15, frameCount - 1));
pick('02-pressure.jpg', Math.min(60, frameCount - 1));
pick('03-jam.jpg', Math.min(Math.floor(frameCount * 0.38), frameCount - 1));
pick('04-recovery.jpg', Math.min(Math.floor(frameCount * 0.52), frameCount - 1));
pick('05-result.jpg', Math.max(0, frameCount - 4));

const bytes = fs.readFileSync(webmPath);
const report = {
  ...meta,
  VIDEO_CAPTURE: 'PASS',
  video: {
    webm: 'evidence/xr/fun-slice/video/FUN-SLICE-HAND-LOOP.webm',
    mp4: mp4Ok ? 'evidence/xr/fun-slice/video/FUN-SLICE-HAND-LOOP.mp4' : null,
    hero15s: 'evidence/xr/fun-slice/video/FUN-SLICE-HERO-15S.webm',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    frameCount,
    approxFps: 7,
    durationSecApprox: Number((frameCount / 7).toFixed(1)),
    mp4Available: mp4Ok,
  },
};
fs.writeFileSync(tracePath, JSON.stringify(report, null, 2));
fs.rmSync(framesDir, { recursive: true, force: true });
console.log('[encode] VIDEO_CAPTURE PASS', report.video);
