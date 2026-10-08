import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const outDir = 'evidence/comp/checkpoint-01/screenshots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const logs = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (t.includes('[factory]')) {
    logs.push({ t: Date.now(), text: t });
    console.log(t.slice(0, 220));
  }
});

await page.goto('https://127.0.0.1:5173/', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(outDir, 'LOOP-01-start.png') });

// Wait for jam
for (let i = 0; i < 40; i += 1) {
  const text = await page.locator('#factory-hud').innerText().catch(() => '');
  if (text.includes('JAM')) break;
  await page.waitForTimeout(500);
}
await page.screenshot({ path: path.join(outDir, 'LOOP-02-jam.png') });

// DEV FALLBACK keyboard intervention (labeled — not Quest hand grab)
await page.keyboard.press('b');
await page.waitForTimeout(1500);
await page.screenshot({
  path: path.join(outDir, 'LOOP-03-intervention-DEV-FALLBACK-KEY.png'),
});

for (let i = 0; i < 20; i += 1) {
  const text = await page.locator('#factory-hud').innerText().catch(() => '');
  if (text.includes('BOOST ON') && !text.includes('JAM')) break;
  await page.waitForTimeout(400);
}
await page.screenshot({ path: path.join(outDir, 'LOOP-04-recovered.png') });

// Fast-forward via many steps is not available; wait toward end or note mid-shift
await page.waitForTimeout(8000);
await page.screenshot({ path: path.join(outDir, 'LOOP-05-flow.png') });

const hud = await page.locator('#factory-hud').innerText().catch(() => '');
writeFileSync(
  'evidence/xr/factory-checkpoint/RUNTIME-BROWSER-LOG.json',
  JSON.stringify(
    {
      label: 'BROWSER runtime — not Quest',
      interventionPath: 'DEV_FALLBACK_KEY (b)',
      hud,
      factoryLogs: logs,
    },
    null,
    2,
  ),
);
console.log('HUD final\n', hud);
await browser.close();
