import test from "node:test";
import assert from "node:assert/strict";
import {
  shotVelocity,
  aimFromPoint,
  progressPercent,
  parseProgress,
} from "../src/core.mjs";
test("corrupt and out-of-range saves cannot unlock non-existent sites", () => {
  assert.deepEqual(parseProgress("broken", 5), {
    unlocked: 0,
    best: [0, 0, 0, 0, 0],
  });
  assert.deepEqual(parseProgress('{"unlocked":999,"best":[8,-5,"oops"]}', 5), {
    unlocked: 4,
    best: [3, 0, 0, 0, 0],
  });
});
test("aim is bounded for touch coordinates beyond the launcher", () => {
  const a = aimFromPoint(-100, -500, { x: 165, y: 423 });
  assert.equal(a.angle, 70);
  assert.equal(a.power, 100);
  for (const angle of [-90, 0, 90, Infinity]) {
    const v = shotVelocity(angle, 100, "heavy");
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
    assert.ok(v.x > 0);
    assert.ok(v.y < 0);
  }
});
test("a piece above the screen is not counted as demolished", () => {
  assert.equal(
    progressPercent(
      [{ broken: false, minY: -100, maxY: -50, minX: 400, maxX: 500 }],
      400,
    ),
    0,
  );
  assert.equal(
    progressPercent(
      [
        { broken: true },
        { broken: false, minY: 450, maxY: 500, minX: 100, maxX: 200 },
      ],
      400,
    ),
    100,
  );
});
