// Simulated DOM integration, NOT a real-browser or visual/touch-device test.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";
const bundle = readFileSync(
  new URL(
    "../dist/assets/" +
      readdirSync(new URL("../dist/assets/", import.meta.url)).find((n) =>
        n.endsWith(".js"),
      ),
    import.meta.url,
  ),
  "utf8",
);
function boot(saved) {
  const dom = new JSDOM('<div id="app"></div>', {
    url: "https://scrapshot.test",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  let next,
    now = 100;
  w.matchMedia = () => ({ matches: true });
  w.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: () => () => {}, set: () => true });
  w.requestAnimationFrame = (callback) => {
    next = callback;
    return 1;
  };
  if (saved) w.localStorage.setItem("scrapshot.progress.v1", saved);
  w.eval(bundle);
  return {
    w,
    dom,
    el: (id) => w.document.getElementById(id),
    tick: (n = 600) => {
      for (let i = 0; i < n; i++) {
        now += 1000 / 60;
        next(now);
      }
    },
    range: (id, value) => {
      const input = w.document.getElementById(id);
      input.value = String(value);
      input.dispatchEvent(new w.Event("input"));
    },
  };
}
test("compiled app completes all ten sites through its actual UI handlers and preserves progress", () => {
  const a = boot();
  const { el, tick, range } = a;
  for (let site = 0; site < 10; site++) {
    tick(120);
    range("angle", [5,5,5,18,5,25,5,5,35,25][site]);
    range("power", [70,100,70,100,70,85,85,70,70,85][site]);
    for (let shot = 0; shot < 3 && el("overlay").hidden; shot++) {
      assert.equal(el("fire").disabled, false);
      el("fire").click();
      assert.equal(el("fire").disabled, true);
      tick(600);
    }
    assert.equal(el("overlay").hidden, false);
    assert.match(
      el("result-title").textContent,
      /Beautiful|YARD COMPLETE/,
      `site ${site + 1}`,
    );
    if (site < 9) el("next").click();
  }
  const saved = a.w.localStorage.getItem("scrapshot.progress.v1");
  assert.equal(JSON.parse(saved).unlocked, 9);
  a.dom.window.close();
  const restored = boot(saved);
  assert.match(restored.el("eyebrow").textContent, /10/);
  restored.dom.window.close();
});
test("pause freezes simulation; poor shots exhaust budget; retry restores it; language updates", () => {
  const a = boot();
  a.tick(120);
  a.el("pause").click();
  const before = a.el("score").textContent;
  a.tick(600);
  assert.equal(a.el("score").textContent, before);
  assert.equal(a.el("fire").disabled, true);
  a.el("next").click();
  a.range("angle", 70);
  a.range("power", 20);
  for (let i = 0; i < 3; i++) {
    a.el("fire").click();
    a.tick(600);
  }
  assert.match(a.el("result-title").textContent, /Almost/);
  a.el("next").click();
  assert.equal(a.el("overlay").hidden, true);
  assert.match(a.el("shots").textContent, /●●●/);
  a.el("lang").click();
  assert.equal(a.w.document.documentElement.lang, "es");
  assert.match(a.el("fire").textContent, /DISPARAR/);
  a.dom.window.close();
});

test("workshop upgrades spend once, extend the round, lock during play and persist", () => {
  const a = boot(JSON.stringify({ unlocked: 0, best: [3] }));
  assert.match(a.el("wallet").textContent, /160/);
  a.el("buy-impact").click();
  assert.match(a.el("wallet").textContent, /60/);
  assert.equal(a.el("buy-impact").disabled, true);
  assert.equal(a.el("buy-magazine").disabled, true);
  a.w.document.querySelector('[data-level="0"]').click();
  a.tick(120);
  a.range("angle", 5);
  a.range("power", 70);
  a.el("fire").click();
  a.tick(600);
  assert.match(a.el("result-title").textContent, /Beautiful/);
  const before = a.w.localStorage.getItem("scrapshot.progress.v1");
  a.tick(600);
  assert.equal(a.w.localStorage.getItem("scrapshot.progress.v1"), before);
  assert.equal(JSON.parse(before).coins, 85);
  a.dom.window.close();
  const b = boot(
    JSON.stringify({
      schema: 2,
      unlocked: 0,
      best: [],
      coins: 180,
      upgrades: { impact: 0, magazine: 0 },
    }),
  );
  b.el("buy-magazine").click();
  assert.match(b.el("shots").textContent, /●●●●/);
  assert.match(b.el("wallet").textContent, /0/);
  b.el("fire").click();
  assert.equal(b.el("buy-magazine").disabled, true);
  const save = b.w.localStorage.getItem("scrapshot.progress.v1");
  b.dom.window.close();
  const c = boot(save);
  assert.match(c.el("shots").textContent, /●●●●/);
  c.dom.window.close();
});

test("new players unlock tools gradually; workshop projects persist without duplicate spending", () => {
  const fresh = boot();
  assert.equal(fresh.w.document.querySelector('[data-kind="heavy"]').disabled, true);
  assert.equal(fresh.w.document.querySelector('[data-kind="magnet"]').disabled, true);
  fresh.dom.window.close();
  const a = boot(JSON.stringify({schema: 2, best: [3,3,3,3,3,3], unlocked: 6, coins: 777, upgrades: {impact: 2, magazine: 1}}));
  assert.equal(a.w.document.querySelector('[data-kind="magnet"]').disabled, false);
  a.el("build-project").click();
  a.el("build-project").click();
  a.el("build-project").click();
  assert.equal(a.el("build-project").disabled, true);
  assert.match(a.el("shots").textContent, /●●●●●/);
  const saved = JSON.parse(a.w.localStorage.getItem("scrapshot.progress.v1"));
  assert.equal(saved.salvage, 50);
  assert.equal(saved.projects, 3);
  assert.equal(saved.coins, 777);
  a.dom.window.close();
  const b = boot(JSON.stringify(saved));
  assert.equal(b.el("build-project").disabled, true);
  assert.equal(b.w.document.querySelectorAll('.building.built').length, 3);
  b.dom.window.close();
});

test("visible bilingual aiming instructions and modal isolation protect the current round", () => {
  const a = boot();
  assert.match(a.el("instructions").textContent, /Drag on the scene.*Release to fire.*cancel/);
  a.el("lang").click();
  assert.match(a.el("instructions").textContent, /Arrastra.*Suelta.*cancelar/);
  a.tick(120);
  a.el("fire").click();
  a.el("pause").click();
  const score = a.el("score").textContent;
  const shots = a.el("shots").textContent;
  assert.equal(a.w.document.querySelector("main").hasAttribute("inert"), true);
  assert.equal(a.el("overlay").parentElement.id, "app");
  a.el("retry").click();
  a.w.document.dispatchEvent(new a.w.KeyboardEvent("keydown", {key:"r", bubbles:true}));
  a.tick(600);
  assert.equal(a.el("overlay").hidden, false);
  assert.equal(a.el("shots").textContent, shots);
  assert.equal(a.el("score").textContent, score);
  a.w.document.dispatchEvent(new a.w.KeyboardEvent("keydown", {key:"Escape", bubbles:true}));
  assert.equal(a.el("overlay").hidden, true);
  assert.equal(a.w.document.querySelector("main").hasAttribute("inert"), false);
  a.tick(600);
  assert.match(a.el("result-title").textContent, /desastre/);
  a.el("next").click();
  assert.equal(a.el("overlay").hidden, true);
  assert.match(a.el("eyebrow").textContent, /02/);
  a.dom.window.close();
});

test("submission build contains no playtest controls and writes no telemetry", () => {
  const a=boot();
  assert.equal(a.el("export"),null);
  assert.doesNotMatch(a.el("footer").textContent,/PROTOTYPE|PROTOTIPO/);
  a.el("fire").click();a.tick(600);
  assert.equal(a.w.localStorage.getItem("scrapshot.events.v1"),null);
  assert.ok(a.w.localStorage.getItem("scrapshot.progress.v1"));
  a.dom.window.close();
});
