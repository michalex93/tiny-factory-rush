import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProgress, recoverScrap, buildProject, toolAvailable,
  purchaseUpgrade,
  rewardClear,
  shotBudget,
  upgradeCost,
} from "../src/core.mjs";
import { createWorld, addShot } from "../src/physics.mjs";
test("legacy progress receives one-time credit and purchases survive reload", () => {
  const p = parseProgress(
    JSON.stringify({ unlocked: 4, best: [3, 2, 1, 0, 0] }),
    10,
  );
  assert.equal(p.coins, 480);
  assert.equal(p.unlocked, 4);
  assert.equal(purchaseUpgrade(p, "impact"), true);
  assert.equal(p.coins, 380);
  assert.equal(purchaseUpgrade(p, "magazine"), true);
  assert.equal(p.coins, 200);
  const restored = parseProgress(JSON.stringify(p), 10);
  assert.deepEqual(restored, p);
  assert.equal(shotBudget(restored), 4);
});
test("insufficient funds, maximum ranks and unknown upgrades never deduct coins", () => {
  const p = parseProgress(null, 10);
  assert.equal(purchaseUpgrade(p, "impact"), false);
  assert.equal(purchaseUpgrade(p, "unknown"), false);
  p.coins = 2000;
  for (let i = 0; i < 3; i++) assert.equal(purchaseUpgrade(p, "impact"), true);
  const balance = p.coins;
  assert.equal(upgradeCost(p, "impact"), null);
  assert.equal(purchaseUpgrade(p, "impact"), false);
  assert.equal(p.coins, balance);
});
test("first clear, improved stars and replay rewards have distinct payouts", () => {
  const p = parseProgress(null, 10);
  assert.equal(rewardClear(p, 0, 3), 120);
  assert.equal(rewardClear(p, 0, 1), 65);
  assert.equal(rewardClear(p, 0, 1), 25);
  assert.equal(p.coins, 210);
  assert.equal(p.best[0], 3);
  assert.equal(p.unlocked, 1);
  const q = parseProgress(null, 10);
  q.upgrades.magazine = 2;
  rewardClear(q, 0, 5);
  assert.equal(q.best[0], 1);
});
test("corrupt economy is bounded and reinforced impact increases actual projectile mass", () => {
  const p = parseProgress(
    '{"schema":2,"coins":-9,"upgrades":{"impact":999,"magazine":"bad"}}',
    10,
  );
  assert.equal(p.coins, 0);
  assert.deepEqual(p.upgrades, { impact: 3, magazine: 0 });
  const { engine } = createWorld([]);
  const base = addShot(engine, { x: 0, y: 0 }, { x: 10, y: 0 }, "standard");
  const upgraded = addShot(
    engine,
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    "standard",
    3,
  );
  assert.ok(Math.abs(upgraded.mass / base.mass - 1.75) < 1e-10);
});

test("partial recovery survives failure and reload without retry farming", () => {
  let p = parseProgress(null, 10);
  assert.equal(recoverScrap(p, 0, 35), 35);
  p = parseProgress(JSON.stringify(p), 10);
  assert.equal(recoverScrap(p, 0, 20), 0);
  assert.equal(recoverScrap(p, 0, 35), 0);
  assert.equal(recoverScrap(p, 0, 80), 45);
  assert.equal(recoverScrap(p, 0, 1000), 20);
  assert.equal(p.salvage, 100);
  assert.equal(buildProject(p), true);
  assert.equal(p.salvage, 10);
  assert.equal(buildProject(p), false);
  assert.equal(p.coins, 0);
});
test("old saves retain tools, currency and upgrades while new players unlock at sites 3 and 4", () => {
  const p = parseProgress(null, 10);
  assert.equal(toolAvailable(p, "heavy"), false);
  p.unlocked = 2;
  assert.equal(toolAvailable(p, "heavy"), true);
  assert.equal(toolAvailable(p, "magnet"), false);
  p.unlocked = 3;
  assert.equal(toolAvailable(p, "magnet"), true);
  const old = parseProgress(JSON.stringify({schema:2, coins:532, best:[3], upgrades:{impact:2,magazine:1}}),10);
  assert.equal(old.coins,532);
  assert.equal(old.salvage,100);
  assert.equal(toolAvailable(old,"magnet"),true);
  assert.deepEqual(parseProgress(JSON.stringify(old),10), old);
});
