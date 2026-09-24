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
test("compiled app completes all five sites through its actual UI handlers and preserves progress", () => {
  const a = boot();
  const { el, tick, range } = a;
  for (let site = 0; site < 5; site++) {
    tick(120);
    range("angle", site === 3 ? 10 : 5);
    range("power", site === 1 || site === 3 ? 100 : 70);
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
    if (site < 4) el("next").click();
  }
  const saved = a.w.localStorage.getItem("scrapshot.progress.v1");
  assert.equal(JSON.parse(saved).unlocked, 4);
  a.dom.window.close();
  const restored = boot(saved);
  assert.match(restored.el("eyebrow").textContent, /05/);
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
