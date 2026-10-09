/**
 * Trusted IWSDK browser-run recorder (Node side + page MediaRecorder).
 * Stops when workspace file `scripts/.stop-factory-rec` appears.
 *
 *   npx iwsdk browser run scripts/browser-record-webm.mjs --timeout 180000
 */
import fs from 'node:fs';
import path from 'node:path';

export default async function run({ page, workspaceRoot }) {
  const stopFile = path.join(workspaceRoot, 'scripts', '.stop-factory-rec');
  const outWebm = path.join(
    workspaceRoot,
    '..',
    'evidence',
    'comp',
    'checkpoint-01',
    'short-video',
    'IWSDK-EMULATOR-HAND-LOOP.webm',
  );
  fs.mkdirSync(path.dirname(outWebm), { recursive: true });
  if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);

  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const canvas =
      document.querySelector('canvas') ||
      document.querySelector('#scene-container canvas');
    if (!canvas) throw new Error('No canvas for MediaRecorder');
    const stream = canvas.captureStream(20);
    let mime = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 5_000_000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    window.__factoryRec = {
      chunks,
      recorder,
      mime,
      startedAt: performance.now(),
    };
    recorder.start(200);
  });

  // Stay under managed browser-run lease (~110s).
  const maxMs = 95_000;
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (fs.existsSync(stopFile)) break;
    await page.waitForTimeout(300);
  }

  const payload = await page.evaluate(async () => {
    const r = window.__factoryRec;
    if (!r) return { ok: false, error: 'no recorder' };
    if (r.recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        r.recorder.onstop = resolve;
        r.recorder.stop();
      });
    }
    const blob = new Blob(r.chunks, { type: r.mime || 'video/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    const chars = [];
    for (let i = 0; i < buf.length; i += 1) chars.push(String.fromCharCode(buf[i]));
    return {
      ok: true,
      mime: r.mime,
      byteLength: buf.length,
      durationMs: performance.now() - r.startedAt,
      b64: btoa(chars.join('')),
    };
  });

  if (!payload.ok || !payload.b64) {
    throw new Error(`Recording failed: ${payload.error || 'empty'}`);
  }

  const bytes = Buffer.from(payload.b64, 'base64');
  fs.writeFileSync(outWebm, bytes);
  if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);

  return {
    ok: true,
    path: outWebm,
    mime: payload.mime,
    byteLength: bytes.length,
    durationMs: payload.durationMs,
  };
}
