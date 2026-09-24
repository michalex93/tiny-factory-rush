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
export function parseProgress(raw, count) {
  try {
    const p = JSON.parse(raw || "{}");
    return {
      unlocked: Math.max(
        0,
        Math.min(count - 1, Number.isInteger(p.unlocked) ? p.unlocked : 0),
      ),
      best: Array.from({ length: count }, (_, i) =>
        Number.isFinite(p.best?.[i])
          ? Math.max(0, Math.min(3, Math.floor(p.best[i])))
          : 0,
      ),
    };
  } catch {
    return { unlocked: 0, best: Array(count).fill(0) };
  }
}
