/**
 * Public GitHub Pages smoke test + screenshot.
 * Label: PUBLIC BUILD SMOKE — not Quest.
 */
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const outDir = path.join(root, 'evidence/comp/checkpoint-01/public-smoke');
mkdirSync(outDir, { recursive: true });

const URL = 'https://michalex93.github.io/tiny-factory-rush/';
const commit = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
const consoleErrors = [];
const failedRequests = [];
const network = [];

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));
page.on('requestfailed', (req) => {
  failedRequests.push({
    url: req.url(),
    failure: req.failure()?.errorText ?? 'unknown',
  });
});
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('tiny-factory-rush') || u.includes('assets/')) {
    network.push({ url: u, status: res.status() });
  }
});

const started = new Date().toISOString();
const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(8000);
const hud = await page.locator('#factory-hud').innerText().catch(() => null);
const shotPath = path.join(outDir, 'PUBLIC-SMOKE-01.png');
await page.screenshot({ path: shotPath, fullPage: false });

const factoryReady = consoleErrors.every((e) => !/fatal|uncaught/i.test(e));
const asset404 = network.filter((n) => n.status === 404);
const success =
  (resp?.status() ?? 0) === 200 &&
  asset404.length === 0 &&
  Boolean(hud) &&
  /CASH|TINY FACTORY/i.test(hud ?? '');

const report = {
  url: URL,
  timestamp: started,
  commit,
  browser: 'Chromium (Playwright channel=chrome)',
  viewport: '1280x720',
  httpStatus: resp?.status() ?? null,
  success,
  hud,
  consoleErrors,
  failedRequests,
  asset404,
  networkSample: network.slice(0, 40),
  screenshot: 'PUBLIC-SMOKE-01.png',
  screenshotSha256: createHash('sha256').update(readFileSync(shotPath)).digest('hex'),
  notes:
    'PUBLIC BUILD SMOKE — browser page load. Not immersive XR / not Quest / not hand-loop proof.',
};

writeFileSync(path.join(outDir, 'PUBLIC-SMOKE.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify({ success, hud: hud?.slice(0, 80), errors: consoleErrors.length, asset404: asset404.length }, null, 2));
process.exit(success ? 0 : 2);
