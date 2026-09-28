import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});
await p.route('**/sdk.crazygames.com/**', (r) => r.abort());
await p.goto(process.env.URL || 'http://127.0.0.1:4173/');
const prefix = process.env.PREFIX || 'new';
const shots = (process.env.SHOTS || '3,10,25,45').split(',').map(Number);
let last = 0;
for (const t of shots) {
  await p.waitForTimeout((t - last) * 1000);
  last = t;
  if (t === 10) {
    for (let i = 0; i < 4; i++) {
      await p.mouse.click(640, 330);
      await p.waitForTimeout(120);
    }
  }
  if (t >= 25) {
    for (const x of [640, 300, 972, 546, 734]) {
      await p.mouse.click(x, 640);
      await p.waitForTimeout(80);
    }
  }
  await p.screenshot({ path: `shots/${prefix}-${t}.png` });
}
console.log('errors:', JSON.stringify(errs.slice(0, 8)));
await b.close();
