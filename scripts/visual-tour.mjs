import { chromium } from 'playwright';
// Fast-forwards the real game with a simple bot and screenshots each phase.
const b = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.route('**/sdk.crazygames.com/**', (r) => r.abort());
await p.goto(process.env.URL || 'http://127.0.0.1:4173/');
await p.waitForTimeout(2500);
await p.mouse.click(640, 330);

const prefix = process.env.PREFIX || 'tour';
const marks = (process.env.MARKS || '60,120,200,300,420,540,660,780').split(',').map(Number);
let simSec = 0;
for (const mark of marks) {
  const info = await p.evaluate(async (target) => {
    const g = window.__tfrGame;
    const gs = g.scene.getScene('GameScene');
    const f = gs.factory;
    let t = 0;
    const log = [];
    while (t < target * 1000) {
      for (let i = 0; i < 10; i++) {
        gs.update(0, 100);
        t += 100;
      }
      if (f.sessionGoal.phase === 'awaiting_choice') f.selectOptimizationBranch('throughput');
      if (f.mc.phase === 'funding_choice') gs.buyUpgrade(1, 'speed');
      if (gs.tryUnlockNext()) log.push('unlock@' + Math.round(t / 1000));
      const keys = [...f.relevantUpgradeKeys()];
      const cand = keys.length ? keys : [`${f.suggestedUpgradeMachine()}:speed`];
      for (const k of cand) {
        const [m, type] = k.split(':');
        const cost = f.upgrades.costFor(+m, type);
        if (f.economy.canAfford(cost) && Math.random() < 0.6) {
          gs.buyUpgrade(+m, type);
          break;
        }
      }
    }
    return {
      log,
      coins: Math.floor(f.economy.coins),
      product: f.economy.currentProduct,
      goal: f.sessionLabel(),
      phase: f.sessionGoal.phase,
      mc: f.mc.phase,
    };
  }, mark - simSec);
  simSec = mark;
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `shots/${prefix}-${mark}.png` });
  console.log(mark, JSON.stringify(info));
}
console.log('errors:', JSON.stringify(errs.slice(0, 5)));
await b.close();
