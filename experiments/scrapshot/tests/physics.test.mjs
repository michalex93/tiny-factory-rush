import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import { levels } from "../src/levels.ts";
import { createWorld, addShot, applyMagnet, cleared } from "../src/physics.mjs";
import { shotVelocity } from "../src/core.mjs";
for (const [i, level] of levels.entries()) {
  test(`site ${i + 1}: tower remains standing for 10 seconds before input`, () => {
    const { engine, pieces } = createWorld(level.blocks, () => false, undefined, undefined, level.obstacles);
    for (let t = 0; t < 600; t++) Matter.Engine.update(engine, 1000 / 60);
    const result = cleared(pieces, level.line);
    assert.equal(result, 0, `pre-shot collapse: ${result}%`);
  });
  test(`site ${i + 1}: at least one three-shot solution exists`, () => {
    let solution;
    outer: for (const kind of ["standard", "heavy", "magnet"])
      for (const angle of [5, 10, 18, 25, 35, 45, 55, 65])
        for (const power of [70, 85, 100]) {
          let active = false;
          const { engine, pieces } = createWorld(level.blocks, () => active, undefined, undefined, level.obstacles);
          for (let t = 0; t < 120; t++) Matter.Engine.update(engine, 1000 / 60);
          active = true;
          for (let attempt = 1; attempt <= 3; attempt++) {
            const projectile = addShot(
              engine,
              { x: 165, y: 423 },
              shotVelocity(angle, power, kind),
              kind,
            );
            for (let t = 0; t < 480; t++) {
              if (kind === "magnet" && t < 192) applyMagnet(projectile, pieces);
              Matter.Engine.update(engine, 1000 / 60);
            }
            const result = cleared(pieces, level.line);
            if (result >= level.goal) {
              solution = { kind, angle, power, attempt, result };
              break outer;
            }
          }
        }
    assert.ok(solution, `No reachable solution for ${level.name}`);
    console.log(`Site ${i + 1} solution: ${JSON.stringify(solution)}`);
  });
}
test("magnet attracts metal but leaves wood force unchanged", () => {
  const { engine, pieces } = createWorld([
    { x: 400, y: 300, w: 30, h: 30, material: "metal" },
    { x: 400, y: 350, w: 30, h: 30, material: "wood" },
  ]);
  const ball = addShot(engine, { x: 450, y: 300 }, { x: 0, y: 0 }, "magnet");
  applyMagnet(ball, pieces);
  assert.ok(pieces[0].body.force.x > 0);
  assert.equal(pieces[1].body.force.x, 0);
});

test("impact tiers change the first collision, caliber and nearby destruction", () => {
  const outcomes = [0,1,2,3].map(rank => {
    const {engine,pieces} = createWorld([
      {x:400,y:450,w:30,h:116,material:'wood'},
      {x:435,y:400,w:20,h:20,material:'glass'},
      {x:440,y:450,w:20,h:20,material:'metal'},
    ]);
    const ball = addShot(engine,{x:300,y:423},{x:12,y:0},'standard',rank);
    for(let i=0;i<30 && pieces[0].hp === 2;i++) Matter.Engine.update(engine,1000/60);
    return {pieces,ball};
  });
  assert.equal(outcomes[0].pieces[0].hp,1);
  assert.equal(outcomes[1].pieces[0].broken,true);
  assert.equal(outcomes[2].ball.circleRadius,20);
  assert.equal(outcomes[3].ball.plugin.pulsed,true);
  assert.equal(outcomes[3].pieces[1].broken,true);
  assert.equal(outcomes[3].pieces[2].broken,false);
});
for(const index of [3,5,8,9]) test(`site ${index+1}: six maximum-power low shots cannot bypass its wall, even fully upgraded`,()=>{
  for(const kind of ['standard','heavy','magnet']) {
    const l=levels[index];
    const {engine,pieces}=createWorld(l.blocks,undefined,undefined,undefined,l.obstacles);
    for(let i=0;i<6;i++) {
      const ball=addShot(engine,{x:165,y:423},shotVelocity(5,100,kind),kind,3);
      for(let t=0;t<480;t++) {
        if(kind==='magnet' && t<300) applyMagnet(ball,pieces);
        Matter.Engine.update(engine,1000/60);
      }
    }
    assert.ok(cleared(pieces,l.line)<l.goal,`${kind} bypassed wall`);
  }
});
