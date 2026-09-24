import Matter from "matter-js";
const { Engine, Bodies, Composite, Events, Body } = Matter;
/** @param {any[]} blocks @param {()=>boolean} isActive @param {(piece:any)=>void} onBreak @param {(speed:number)=>void} onHit */
export function createWorld(
  blocks,
  isActive = () => true,
  onBreak = () => {},
  onHit = () => {},
) {
  const engine = Engine.create({
    gravity: { x: 0, y: 1.3 },
    positionIterations: 10,
    velocityIterations: 8,
  });
  const pieces = blocks.map((def) => ({
    body: Bodies.rectangle(def.x, def.y, def.w, def.h, {
      density:
        def.material === "metal"
          ? 0.004
          : def.material === "glass"
            ? 0.0015
            : 0.002,
      friction: 0.55,
      frictionStatic: 0.85,
      restitution: 0.08,
      chamfer: { radius: 2 },
      label: def.material,
    }),
    material: def.material,
    w: def.w,
    h: def.h,
    broken: false,
    hp: def.material === "glass" ? 1 : def.material === "wood" ? 2 : 999,
  }));
  Composite.add(engine.world, [
    Bodies.rectangle(500, 529, 1600, 42, {
      isStatic: true,
      friction: 0.7,
      label: "ground",
    }),
    Bodies.rectangle(-100, 300, 50, 1200, { isStatic: true }),
    Bodies.rectangle(1140, 300, 50, 1200, { isStatic: true }),
    ...pieces.map((p) => p.body),
  ]);
  Events.on(engine, "collisionStart", (ev) => {
    if (!isActive()) return;
    for (const pair of ev.pairs) {
      const { bodyA: a, bodyB: b } = pair;
      const relative = Math.hypot(
        a.velocity.x - b.velocity.x,
        a.velocity.y - b.velocity.y,
      );
      if (relative < 2.3) continue;
      for (const body of [a, b]) {
        const p = pieces.find((p) => p.body === body && !p.broken);
        if (!p || p.material === "metal") continue;
        const other = body === a ? b : a;
        const direct = other.label === "shot";
        const threshold =
          p.material === "glass" ? (direct ? 2.3 : 3.4) : direct ? 4 : 5.5;
        if (relative > threshold) {
          p.hp--;
          if (p.hp <= 0) {
            p.broken = true;
            Composite.remove(engine.world, p.body);
            onBreak(p);
          }
        }
      }
      onHit(relative);
    }
  });
  return { engine, pieces };
}
export function addShot(engine, origin, velocity, kind) {
  const radius = kind === "heavy" ? 20 : 16;
  const body = Bodies.circle(origin.x, origin.y, radius, {
    density: kind === "heavy" ? 0.03 : 0.015,
    restitution: kind === "standard" ? 0.7 : 0.25,
    friction: 0.4,
    frictionAir: 0.008,
    label: "shot",
  });
  Composite.add(engine.world, body);
  Body.setVelocity(body, velocity);
  return body;
}
export function applyMagnet(body, pieces) {
  for (const piece of pieces) {
    if (piece.material !== "metal" || piece.broken) continue;
    const dx = body.position.x - piece.body.position.x,
      dy = body.position.y - piece.body.position.y,
      d = Math.hypot(dx, dy);
    if (d > 20 && d < 185) {
      const strength = piece.body.mass * 0.0025 * (1 - d / 185);
      Body.applyForce(piece.body, piece.body.position, {
        x: (dx / d) * strength,
        y: (dy / d) * strength,
      });
    }
  }
}
export function cleared(pieces, line) {
  return (
    (pieces.filter(
      (p) =>
        p.broken ||
        p.body.bounds.min.y >= line ||
        p.body.bounds.max.x < 0 ||
        p.body.bounds.min.x > 1000,
    ).length /
      pieces.length) *
    100
  );
}
