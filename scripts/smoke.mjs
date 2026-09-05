/**
 * Headless smoke test: load the game, wait for canvas + factory coins growth.
 * Requires playwright (optional, not a project dependency):
 *   npm i -D playwright && npx playwright install chromium
 *   node scripts/smoke.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 15000 });

// Wait for Phaser + GameScene to boot and produce coins
const result = await page.waitForFunction(
  () => {
    const g = window.__tfrGame;
    if (!g) return null;
    const reg = g.registry?.get?.('game');
    if (!reg?.factory) return null;
    return {
      coins: reg.factory.economy.coins,
      sold: reg.factory.economy.productsSold,
      scenes: g.scene.getScenes(true).map((s) => s.sys.settings.key),
    };
  },
  { timeout: 20000 },
).then((h) => h.jsonValue());

// First product needs ~6s through the full line; wait for a sale
await page.waitForFunction(
  () => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return (reg?.factory?.economy?.productsSold ?? 0) >= 1;
  },
  { timeout: 20000 },
);

await page.waitForTimeout(12000);

const after = await page.evaluate(() => {
  const g = window.__tfrGame;
  const reg = g.registry.get('game');
  const factory = reg.factory;
  let bought = false;
  if (factory.economy.canAfford(factory.upgrades.costFor(0, 'speed'))) {
    bought = factory.buyUpgrade(0, 'speed');
  }
  factory.clickMachine(0);
  return {
    coins: factory.economy.coins,
    sold: factory.economy.productsSold,
    bought,
    speedLevel: factory.upgrades.getLevel(0, 'speed'),
    processMs: factory.machines[0].processMs,
    itemsOnBelts: factory.conveyors.reduce((n, c) => n + c.length, 0),
    machineSlots: factory.machines.map((m) => m.occupancy),
  };
});

// Save roundtrip check
await page.evaluate(() => {
  const reg = window.__tfrGame.registry.get('game');
  reg.saveSystem.save();
});
const saveRaw = await page.evaluate(() => localStorage.getItem('tiny-factory-rush-save'));

await browser.close();

console.log(JSON.stringify({ result, after, hasSave: !!saveRaw, errors }, null, 2));

if (errors.length) {
  console.error('SMOKE FAILED: page errors');
  process.exit(1);
}
if (!result || result.sold < 0) {
  console.error('SMOKE FAILED: game did not boot');
  process.exit(1);
}
if (after.sold < 1) {
  console.error('SMOKE FAILED: no products sold');
  process.exit(1);
}
if (!saveRaw) {
  console.error('SMOKE FAILED: save missing');
  process.exit(1);
}
console.log('SMOKE OK');
