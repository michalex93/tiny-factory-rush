export const SAVE_KEY = "scrapshot.progress.v1";
export const SHOTS = 3;
export function shotVelocity(angle, power, kind) {
  const safeAngle = Math.max(5, Math.min(70, Number(angle) || 5));
  const safePower = Math.max(20, Math.min(100, Number(power) || 20));
  const speed = (10 + safePower * 0.13) * (kind === "heavy" ? 0.88 : 1);
  return {
    x: Math.cos((safeAngle * Math.PI) / 180) * speed,
    y: -Math.sin((safeAngle * Math.PI) / 180) * speed,
  };
}
export function aimFromPoint(x, y, origin) {
  const dx = x - origin.x,
    dy = origin.y - y;
  return {
    angle: Math.max(
      5,
      Math.min(70, (Math.atan2(dy, Math.max(1, dx)) * 180) / Math.PI),
    ),
    power: Math.max(20, Math.min(100, Math.hypot(dx, dy) / 4)),
  };
}
export function progressPercent(bodies, line) {
  if (!bodies.length) return 0;
  return Math.round(
    (bodies.filter(
      (b) => b.broken || b.minY >= line || b.maxX < 0 || b.minX > 1000,
    ).length /
      bodies.length) *
      100,
  );
}
export const UPGRADE_COSTS = { impact: [100, 220, 380], magazine: [180, 360] };
const integer = (value, max) =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export function parseProgress(raw, count) {
  let p;
  try {
    p = JSON.parse(raw || "{}") || {};
  } catch {
    p = {};
  }
  const best = Array.from({ length: count }, (_, i) => integer(p.best?.[i], 3));
  const legacyCredit = best.reduce(
    (sum, stars, i) => sum + (stars ? 100 + i * 20 + stars * 20 : 0),
    0,
  );
  return {
    schema: 2,
    unlocked: Math.max(
      integer(p.unlocked, count - 1),
      Math.min(
        count - 1,
        best.reduce((last, stars, i) => (stars ? i + 1 : last), 0),
      ),
    ),
    best,
    coins: p.schema === 2 ? integer(p.coins, 1000000) : legacyCredit,
    upgrades: {
      impact: p.schema === 2 ? integer(p.upgrades?.impact, 3) : 0,
      magazine: p.schema === 2 ? integer(p.upgrades?.magazine, 2) : 0,
    },
  };
}
export function shotBudget(progress) {
  return SHOTS + progress.upgrades.magazine;
}
export function starsForShots(used) {
  return Math.max(1, 4 - used);
}
export function upgradeCost(progress, key) {
  return UPGRADE_COSTS[key]?.[progress.upgrades[key]] ?? null;
}
export function purchaseUpgrade(progress, key) {
  const cost = upgradeCost(progress, key);
  if (cost === null || progress.coins < cost) return false;
  progress.coins -= cost;
  progress.upgrades[key]++;
  return true;
}
export function rewardClear(progress, index, shotsUsed) {
  const stars = starsForShots(shotsUsed),
    previous = progress.best[index];
  const reward =
    (previous === 0 ? 100 + index * 20 : 25 + index * 5) +
    Math.max(0, stars - previous) * 20;
  progress.coins = Math.min(1000000, progress.coins + reward);
  progress.best[index] = Math.max(previous, stars);
  progress.unlocked = Math.max(
    progress.unlocked,
    Math.min(progress.best.length - 1, index + 1),
  );
  return reward;
}
