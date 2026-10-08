import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const outDir = 'evidence/comp/checkpoint-01/screenshots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
page.on('console', (msg) => {
  const t = msg.text();
  if (
    t.includes('[factory]') ||
    t.includes('walking skeleton') ||
    t.toLowerCase().includes('error')
  ) {
    console.log('CONSOLE', t.slice(0, 240));
  }
});

await page.goto('https://127.0.0.1:5173/', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForTimeout(5000);
await page.screenshot({
  path: path.join(outDir, '01-cold-start-BROWSER.png'),
});

const texts = await page.locator('button, [role="button"]').allTextContents();
console.log('buttons', texts.slice(0, 30));

for (const label of [/VR/i, /AR/i, /Enter/i, /Start/i, /XR/i]) {
  const el = page.getByText(label).first();
  if ((await el.count()) > 0) {
    await el.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(2500);
    break;
  }
}

await page.screenshot({
  path: path.join(outDir, '02-after-enter-attempt.png'),
});
await page.waitForTimeout(10000);
await page.screenshot({
  path: path.join(outDir, '03-mid-shift-window.png'),
});
await page.waitForTimeout(15000);
await page.screenshot({
  path: path.join(outDir, '04-later-shift-window.png'),
});

const hud = await page
  .locator('#factory-hud')
  .innerText()
  .catch(() => null);
console.log('HUD', hud);
await page.screenshot({
  path: path.join(outDir, '05-final-capture.png'),
});
await browser.close();
console.log('capture complete');
