import Matter from "matter-js";
import { levels, type Material } from "./levels";
import {
  SAVE_KEY,
  SHOTS,
  shotVelocity,
  aimFromPoint,
  parseProgress,
  progressPercent,
} from "./core.mjs";
import "./style.css";
import { createWorld, addShot, applyMagnet } from "./physics.mjs";
const { Engine, Composite, Events } = Matter;
type Kind = "standard" | "heavy" | "magnet";
type Piece = {
  body: Matter.Body;
  material: Material;
  w: number;
  h: number;
  broken: boolean;
  hp: number;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};
const palette = { wood: "#cc9659", glass: "#9dcac1", metal: "#577d70" };
const origin = { x: 165, y: 423 };
let lang: "en" | "es" = navigator.language.startsWith("es") ? "es" : "en";
let storageOK = true;
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    storageOK = false;
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    storageOK = false;
  }
}
const savedLang = read("scrapshot.language");
if (savedLang === "en" || savedLang === "es") lang = savedLang;
let progress = parseProgress(read(SAVE_KEY), levels.length);
let levelIndex = progress.unlocked,
  kind: Kind = "standard",
  angle = 18,
  power = 85,
  shots = SHOTS;
let pieces: Piece[] = [],
  projectiles: { body: Matter.Body; kind: Kind; born: number }[] = [],
  particles: Particle[] = [];
let engine = Engine.create({
  gravity: { x: 0, y: 1.3 },
  positionIterations: 8,
  velocityIterations: 8,
});
let phase: "ready" | "flight" | "won" | "lost" = "ready",
  paused = false,
  simTime = 0,
  shotTime = 0,
  settling = 0;
let percent = 0,
  peak = 0,
  combo = 0,
  comboTime = -100,
  shake = 0,
  aiming = false,
  pointerID: number | null = null;
let levelStart = performance.now(),
  firstShot = false;
let muted = read("scrapshot.muted") === "true",
  audio: AudioContext | undefined;
let lastHitSound = -100;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const session = crypto.randomUUID?.() ?? String(Date.now());
let telemetry: {
  event: string;
  at: number;
  level: number;
  [key: string]: unknown;
}[] = [];
try {
  const parsed = JSON.parse(read("scrapshot.events.v1") || "[]");
  if (Array.isArray(parsed)) telemetry = parsed.slice(-150);
} catch {}
function track(event: string, extra: Record<string, unknown> = {}) {
  telemetry.push({
    event,
    at: Date.now(),
    session,
    level: levelIndex + 1,
    ...extra,
  });
  telemetry = telemetry.slice(-200);
  write("scrapshot.events.v1", JSON.stringify(telemetry));
}
const words = {
  en: {
    tag: "PHYSICS PLAYGROUND",
    title: "A little shot. A big reaction.",
    sub: "Find the weak spot. Bring the whole thing down.",
    sector: "SITE",
    shot: "SHOTS LEFT",
    clear: "CLEARED",
    target: "TARGET",
    loadout: "Choose your shot",
    loadDesc: "Different tools. Different chain reactions.",
    standard: "Ricochet",
    standardDesc: "Light & bouncy",
    heavy: "Wrecking ball",
    heavyDesc: "More momentum",
    magnet: "Magnet",
    magnetDesc: "Pulls nearby metal",
    angle: "ANGLE",
    power: "POWER",
    fire: "FIRE SHOT ↗",
    wait: "WATCH IT FALL…",
    retry: "↻ Retry",
    hint: "Drag on the scene to aim. Release to fire.",
    keyboard: "Adjust the sliders, then press Fire.\nP pauses · R retries",
    wood: "Wood",
    glass: "Glass",
    metal: "Metal",
    levelLabel: "Five little experiments.\nOne very satisfying collapse.",
    footer: "PROTOTYPE 01 / THE SCRAPYARD",
    privacy: "Playtest data stays on this device.",
    export: "Export playtest",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound on",
    mute: "Sound off",
    win: "Beautiful destruction.",
    winDesc: "A small action. A chain reaction.",
    next: "NEXT SITE →",
    end: "YARD COMPLETE ✓",
    endDesc: "Five sites cleared. Try fewer shots or another tool.",
    replay: "PLAY AGAIN ↻",
    lost: "Almost a masterpiece.",
    lostDesc: "Try a lower angle, a different tool, or a weaker support.",
    paused: "Take a breather.",
    pausedDesc: "The scrapyard can wait.",
    storage: "Progress cannot be saved in this browser.",
    goal: "Bring enough pieces below the dashed line.",
    cancel: "Drag outside the scene to cancel.",
  },
  es: {
    tag: "LABORATORIO DE FÍSICAS",
    title: "Un disparo. Una gran reacción.",
    sub: "Encuentra el punto débil. Derríbalo todo.",
    sector: "ZONA",
    shot: "DISPAROS",
    clear: "DERRIBADO",
    target: "META",
    loadout: "Elige tu disparo",
    loadDesc: "Distintas herramientas. Distintas reacciones.",
    standard: "Rebote",
    standardDesc: "Ligera y elástica",
    heavy: "Bola pesada",
    heavyDesc: "Más impulso",
    magnet: "Imán",
    magnetDesc: "Atrae metal cercano",
    angle: "ÁNGULO",
    power: "POTENCIA",
    fire: "DISPARAR ↗",
    wait: "MIRA CÓMO CAE…",
    retry: "↻ Reintentar",
    hint: "Arrastra en la escena para apuntar. Suelta para disparar.",
    keyboard: "Ajusta los controles y pulsa Disparar.\nP pausa · R reinicia",
    wood: "Madera",
    glass: "Vidrio",
    metal: "Metal",
    levelLabel: "Cinco pequeños retos.\nUn derrumbe satisfactorio.",
    footer: "PROTOTIPO 01 / EL DESGUACE",
    privacy: "Los datos de prueba se quedan en este dispositivo.",
    export: "Exportar prueba",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido activo",
    mute: "Sin sonido",
    win: "Un hermoso desastre.",
    winDesc: "Una pequeña acción. Una reacción en cadena.",
    next: "SIGUIENTE ZONA →",
    end: "DESGUACE COMPLETO ✓",
    endDesc: "Cinco zonas listas. Prueba con menos disparos u otra bola.",
    replay: "VOLVER A JUGAR ↻",
    lost: "Casi una obra maestra.",
    lostDesc: "Prueba un ángulo menor, otra bola o un soporte más débil.",
    paused: "Tómate un respiro.",
    pausedDesc: "El desguace puede esperar.",
    storage: "Este navegador no permite guardar el progreso.",
    goal: "Derriba suficientes piezas por debajo de la línea.",
    cancel: "Arrastra fuera de la escena para cancelar.",
  },
};
const t = () => words[lang];
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header><div class="brand"><span class="brand-mark" aria-hidden="true">↗</span>scrapshot<span class="tag" id="tag"></span></div><div class="toolbar"><button class="quiet" id="lang">ES</button><button class="quiet" id="sound"></button><button class="quiet" id="pause"></button></div></header>
<main><div class="intro"><div><p class="eyebrow" id="eyebrow"></p><h1 id="title"></h1><p class="subtitle" id="subtitle"></p></div><span class="level-count" id="counter"></span></div>
<div class="game-layout"><section class="stage" aria-label="Scrapshot"><div class="progress-track"><div class="progress-fill" id="fill"></div></div><div class="canvas-wrap"><div class="stage-top"><span class="pill" id="shots"></span><span class="pill" id="score"></span></div><canvas id="game" width="1000" height="560" aria-label="Aim using the angle and power controls, then Fire"></canvas><div class="overlay" id="overlay" hidden><div class="result" role="dialog" aria-modal="true" aria-labelledby="result-title" tabindex="-1"><div class="symbol" id="symbol">✦</div><h2 id="result-title"></h2><p id="result-desc"></p><button class="fire" id="next"></button><button class="retry" id="again"></button></div></div></div><div class="stage-bottom"><p class="hint" id="hint"></p><button class="retry" id="retry"></button></div></section>
<aside class="panel"><h2 id="load-title"></h2><p class="panel-desc" id="load-desc"></p>${(["standard", "heavy", "magnet"] as Kind[]).map((k) => `<button class="ammo ${k === "standard" ? "active" : ""}" data-kind="${k}" aria-pressed="${k === "standard"}"><span class="orb ${k}" aria-hidden="true"></span><span><b id="${k}-title"></b><small id="${k}-desc"></small></span></button>`).join("")}
<div class="control"><label for="angle"><span id="angle-label"></span><output id="angle-value">18°</output></label><input id="angle" type="range" min="5" max="70" value="18"></div><div class="control"><label for="power"><span id="power-label"></span><output id="power-value">85%</output></label><input id="power" type="range" min="20" max="100" value="85"></div><button class="fire" id="fire"></button><p class="keyboard" id="keyboard"></p></aside></div>
<div class="bottom-row"><nav class="levels" aria-label="Levels">${levels.map((_, i) => `<button class="level" data-level="${i}">${String(i + 1).padStart(2, "0")}</button>`).join("")}<span class="level-label" id="level-label"></span></nav><div class="legend">${(["wood", "glass", "metal"] as Material[]).map((m) => `<span><i class="dot" style="background:${palette[m]}"></i><span id="legend-${m}"></span></span>`).join("")}</div></div>
<p class="notice" id="notice" hidden></p><div class="footer"><span id="footer"></span><span><span id="privacy"></span> <button id="export"></button></span></div><p id="status" class="sr-only" aria-live="polite"></p></main>`;
function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}
const canvas = el<HTMLCanvasElement>("game"),
  ctx = canvas.getContext("2d")!;
const overlay = el("overlay");
function text(id: string, value: string) {
  el(id).textContent = value;
}
function tone(freq = 200, duration = 0.08) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.45,
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.065, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {}
}
function labels() {
  document.documentElement.lang = lang;
  const w = t();
  text("tag", w.tag);
  text("title", w.title);
  text("subtitle", w.sub);
  text("load-title", w.loadout);
  text("load-desc", w.loadDesc);
  text("lang", lang === "en" ? "ES" : "EN");
  el("lang").setAttribute(
    "aria-label",
    lang === "en" ? "Cambiar a español" : "Switch to English",
  );
  text("sound", muted ? w.mute : w.sound);
  el("sound").setAttribute("aria-pressed", String(!muted));
  text("pause", paused ? w.resume : w.pause);
  text("retry", w.retry);
  text("angle-label", w.angle);
  text("power-label", w.power);
  text("keyboard", w.keyboard);
  text("level-label", w.levelLabel);
  text("footer", w.footer);
  text("privacy", w.privacy);
  text("export", w.export);
  text("notice", w.storage);
  el("notice").hidden = storageOK;
  (["standard", "heavy", "magnet"] as const).forEach((k) => {
    text(`${k}-title`, w[k]);
    text(`${k}-desc`, w[`${k}Desc`]);
  });
  (["wood", "glass", "metal"] as const).forEach((m) =>
    text(`legend-${m}`, w[m]),
  );
  canvas.setAttribute("aria-label", `${w.hint} ${w.goal}`);
  hud();
  updateOverlay();
}
function hud() {
  const l = levels[levelIndex],
    w = t();
  text(
    "eyebrow",
    `${w.sector} ${String(levelIndex + 1).padStart(2, "0")} / ${lang === "es" ? l.es : l.name}`,
  );
  text("counter", `${String(levelIndex + 1).padStart(2, "0")} / 05`);
  text("shots", `${w.shot}  ${"●".repeat(shots)}${"○".repeat(SHOTS - shots)}`);
  text("score", `${percent}% ${w.clear} · ${w.target} ${l.goal}%`);
  el("fill").style.width = `${percent}%`;
  text("hint", firstShot ? (lang === "es" ? l.hintEs : l.hint) : w.hint);
  text("fire", phase === "flight" ? w.wait : w.fire);
  el<HTMLButtonElement>("fire").disabled = phase !== "ready" || paused;
  for (const c of document.querySelectorAll<HTMLButtonElement>(".ammo")) {
    c.disabled = phase !== "ready" || paused;
    c.classList.toggle("active", c.dataset.kind === kind);
    c.setAttribute("aria-pressed", String(c.dataset.kind === kind));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(".level")) {
    const i = Number(button.dataset.level);
    button.disabled = i > progress.unlocked;
    button.classList.toggle("selected", i === levelIndex);
    button.classList.toggle("done", progress.best[i] > 0);
    button.setAttribute(
      "aria-label",
      `${w.sector} ${i + 1}: ${lang === "es" ? levels[i].es : levels[i].name}`,
    );
    button.setAttribute("aria-current", i === levelIndex ? "step" : "false");
  }
  text("angle-value", `${Math.round(angle)}°`);
  text("power-value", `${Math.round(power)}%`);
  el<HTMLInputElement>("angle").value = String(angle);
  el<HTMLInputElement>("power").value = String(power);
  el<HTMLInputElement>("angle").disabled = phase !== "ready" || paused;
  el<HTMLInputElement>("power").disabled = phase !== "ready" || paused;
}
let previousFocus: HTMLElement | null = null;
function updateOverlay() {
  const show = paused || phase === "won" || phase === "lost",
    was = !overlay.hidden;
  overlay.hidden = !show;
  if (show) {
    const w = t(),
      won = phase === "won",
      last = levelIndex === levels.length - 1;
    text(
      "result-title",
      paused ? w.paused : won ? (last ? w.end : w.win) : w.lost,
    );
    text("symbol", paused ? "Ⅱ" : won ? "✦" : "↻");
    text(
      "result-desc",
      paused
        ? w.pausedDesc
        : won
          ? last
            ? w.endDesc
            : `${w.winDesc} ${"★".repeat(Math.min(3, shots + 1))}`
          : w.lostDesc,
    );
    text(
      "next",
      paused ? w.resume : won ? (last ? w.replay : w.next) : w.retry,
    );
    text("again", w.retry);
    el("again").hidden = paused || !won;
    if (!was) {
      previousFocus = document.activeElement as HTMLElement;
      el("next").focus();
    }
  } else if (was) previousFocus?.focus();
}
function loadLevel(i: number) {
  Events.off(engine, "collisionStart");
  Composite.clear(engine.world, false);
  Engine.clear(engine);
  engine = Engine.create({
    gravity: { x: 0, y: 1.3 },
    positionIterations: 10,
    velocityIterations: 8,
  });
  levelIndex = i;
  pieces = [];
  projectiles = [];
  particles = [];
  shots = SHOTS;
  phase = "ready";
  paused = false;
  aiming = false;
  pointerID = null;
  simTime = 0;
  settling = 0;
  percent = 0;
  peak = 0;
  combo = 0;
  shake = 0;
  firstShot = false;
  angle = 18;
  power = 85;
  levelStart = performance.now();
  const world = createWorld(
    levels[i].blocks,
    () => firstShot,
    (p: Piece) => breakPiece(p),
    (relative: number) => {
      if (simTime - lastHitSound > 0.12) {
        tone(90 + Math.min(300, relative * 12), 0.06);
        lastHitSound = simTime;
      }
    },
  );
  engine = world.engine;
  pieces = world.pieces;
  lastHitSound = -100;
  track("level_start", { kind });
  labels();
  text("status", lang === "es" ? levels[i].es : levels[i].name);
}
function breakPiece(p: Piece) {
  combo = simTime - comboTime < 1 ? combo + 1 : 1;
  comboTime = simTime;
  shake = reducedMotion ? 0 : Math.min(5, combo + 1);
  for (let n = 0; n < (reducedMotion ? 3 : 10); n++)
    particles.push({
      x: p.body.position.x,
      y: p.body.position.y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 5,
      life: 1,
      color: palette[p.material],
      size: 3 + Math.random() * 5,
    });
}
function fire() {
  if (paused || phase !== "ready" || shots <= 0) return;
  firstShot = true;
  shots--;
  phase = "flight";
  shotTime = simTime;
  settling = 0;
  combo = 0;
  const body = addShot(engine, origin, shotVelocity(angle, power, kind), kind);
  projectiles.push({ body, kind, born: simTime });
  tone(350, 0.15);
  track("shot", {
    kind,
    angle: Math.round(angle),
    power: Math.round(power),
    shotsLeft: shots,
    elapsedMs: Math.round(performance.now() - levelStart),
  });
  hud();
  text("status", `${t().shot}: ${shots}`);
}
function finish(won: boolean) {
  phase = won ? "won" : "lost";
  if (won) {
    progress.best[levelIndex] = Math.max(
      progress.best[levelIndex],
      Math.min(3, shots + 1),
    );
    progress.unlocked = Math.max(
      progress.unlocked,
      Math.min(levels.length - 1, levelIndex + 1),
    );
    write(SAVE_KEY, JSON.stringify(progress));
    tone(620, 0.3);
  }
  track(won ? "level_complete" : "level_failed", {
    shotsUsed: SHOTS - shots,
    percent,
    elapsedMs: Math.round(performance.now() - levelStart),
  });
  hud();
  updateOverlay();
  text("status", won ? t().win : t().lost);
}
function step() {
  if (paused || phase === "won" || phase === "lost") return;
  simTime += 1 / 60;
  for (const p of projectiles)
    if (p.kind === "magnet" && simTime - p.born < 3.2)
      applyMagnet(p.body, pieces);
  Engine.update(engine, 1000 / 60);
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16;
    p.life -= 0.025;
  }
  shake *= 0.88;
  const current = progressPercent(
    pieces.map((p) => ({
      broken: p.broken,
      minY: p.body.bounds.min.y,
      maxY: p.body.bounds.max.y,
      minX: p.body.bounds.min.x,
      maxX: p.body.bounds.max.x,
    })),
    levels[levelIndex].line,
  );
  if (current !== percent) {
    percent = current;
    peak = Math.max(peak, percent);
    hud();
  }
  if (phase === "flight") {
    const elapsed = simTime - shotTime;
    const speed = Math.max(
      0,
      ...pieces.filter((p) => !p.broken).map((p) => p.body.speed),
      ...projectiles.map((p) => p.body.speed),
    );
    settling = speed < 0.35 ? settling + 1 / 60 : 0;
    if (
      percent >= levels[levelIndex].goal &&
      elapsed > 1.2 &&
      settling > 0.55
    ) {
      finish(true);
      return;
    }
    if (elapsed > 8 || (elapsed > 2.5 && settling > 0.75)) {
      if (percent >= levels[levelIndex].goal) finish(true);
      else if (shots === 0) finish(false);
      else {
        phase = "ready";
        hud();
        text("status", `${percent}% ${t().clear}. ${t().shot}: ${shots}`);
      }
    }
  }
}
function rounded(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function draw() {
  ctx.clearRect(0, 0, 1000, 560);
  ctx.fillStyle = "#e8edda";
  ctx.fillRect(0, 0, 1000, 560);
  // A quiet, original procedural scrapyard: distant silhouettes, grid and paper grain.
  ctx.fillStyle = "#dce4cf";
  for (let i = 0; i < 9; i++) {
    const x = i * 139 - 35,
      h = 40 + (i % 3) * 24;
    ctx.fillRect(x, 390 - h, 110, h);
    ctx.fillRect(x + 12, 340 - h, 20, 50);
  }
  ctx.strokeStyle = "#d3ddc6";
  ctx.lineWidth = 1;
  for (let x = 30; x < 1000; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 98);
    ctx.lineTo(x, 508);
    ctx.stroke();
  }
  for (let y = 108; y < 508; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1000, y);
    ctx.stroke();
  }
  ctx.save();
  if (shake > 0.1)
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const l = levels[levelIndex];
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "#d77546";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(460, l.line);
  ctx.lineTo(970, l.line);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#b16d45";
  ctx.font = "bold 11px system-ui";
  ctx.fillText(`${t().target} ↓`, 900, l.line - 9);
  rounded(0, 508, 1000, 52, 0, "#c7d3b6");
  rounded(0, 508, 1000, 5, 0, "#859b72");
  ctx.strokeStyle = "#adbf9a";
  for (let i = 0; i < 1000; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 534);
    ctx.lineTo(i + 10, 534);
    ctx.stroke();
  }
  // Launcher bot.
  ctx.fillStyle = "#173e3520";
  ctx.beginPath();
  ctx.ellipse(154, 508, 63, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  rounded(115, 473, 75, 30, 10, "#21483c");
  rounded(127, 448, 52, 32, 8, "#edb36c");
  rounded(136, 455, 32, 12, 5, "#173e35");
  ctx.fillStyle = "#ededd5";
  ctx.fillRect(141, 459, 5, 4);
  ctx.fillRect(158, 459, 5, 4);
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate((-angle * Math.PI) / 180);
  rounded(-31, -17, 62, 34, 8, "#365e4c");
  rounded(18, -20, 15, 40, 4, "#ed7947");
  ctx.restore();
  ctx.strokeStyle = "#365e4c";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(148, 450);
  ctx.lineTo(165, 423);
  ctx.stroke();
  for (const p of pieces) {
    if (p.broken) continue;
    const { x, y } = p.body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.body.angle);
    rounded(-p.w / 2 + 3, -p.h / 2 + 5, p.w, p.h, 3, "#173e3518");
    rounded(-p.w / 2, -p.h / 2, p.w, p.h, 3, palette[p.material]);
    ctx.strokeStyle = p.material === "glass" ? "#dff3e6" : "#173e3540";
    ctx.lineWidth = 2;
    ctx.strokeRect(-p.w / 2 + 4, -p.h / 2 + 4, p.w - 8, p.h - 8);
    if (p.material === "wood") {
      ctx.strokeStyle = "#a5774244";
      ctx.beginPath();
      ctx.moveTo(-p.w / 2 + 7, -p.h / 4);
      ctx.lineTo(p.w / 2 - 7, -p.h / 4);
      ctx.moveTo(-p.w / 2 + 7, p.h / 4);
      ctx.lineTo(p.w / 2 - 7, p.h / 4);
      ctx.stroke();
    } else if (p.material === "glass") {
      ctx.beginPath();
      ctx.moveTo(-p.w / 2 + 6, p.h / 2 - 7);
      ctx.lineTo(p.w / 2 - 6, -p.h / 2 + 7);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#bdd0b9";
      for (const dx of [-1, 1])
        for (const dy of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(dx * (p.w / 2 - 7), dy * (p.h / 2 - 7), 2, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    ctx.restore();
  }
  if (phase === "ready" && !paused) {
    const v = shotVelocity(angle, power, kind);
    ctx.fillStyle = "#e9743990";
    for (let i = 1; i <= 18; i++) {
      const tick = i * 1.6;
      const x = origin.x + v.x * tick,
        y = origin.y + v.y * tick + 0.5 * 0.36 * tick * tick;
      if (y > 500 || x > 970) break;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, 4 - i * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#647a57";
    ctx.font = "12px system-ui";
    ctx.fillText(
      lang === "es" ? "APUNTA AL SOPORTE" : "AIM FOR THE SUPPORT",
      60,
      358,
    );
    ctx.strokeStyle = "#a0b58b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 367);
    ctx.quadraticCurveTo(235, 379, 229, 406);
    ctx.stroke();
  }
  for (const p of projectiles) {
    const { x, y } = p.body.position;
    if (p.kind === "magnet" && simTime - p.born < 3.2) {
      ctx.strokeStyle = "#8897e13a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 100 + Math.sin(simTime * 6) * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle =
      p.kind === "standard"
        ? "#ed7947"
        : p.kind === "heavy"
          ? "#173e35"
          : "#8897e1";
    ctx.beginPath();
    ctx.arc(x, y, p.body.circleRadius || 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff65";
    ctx.beginPath();
    ctx.arc(x - 5, y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    rounded(p.x, p.y, p.size, p.size, 1, p.color);
  }
  ctx.globalAlpha = 1;
  if (combo > 1 && simTime - comboTime < 1.6) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#e97439";
    ctx.font = "900 32px system-ui";
    ctx.fillText(`${combo}× CHAIN!`, 750, 160);
    ctx.textAlign = "left";
  }
  ctx.restore();
}
let last = 0,
  accumulator = 0;
function frame(now: number) {
  if (!last) last = now;
  accumulator += Math.min((now - last) / 1000, 0.1);
  last = now;
  while (accumulator >= 1 / 60) {
    step();
    accumulator -= 1 / 60;
  }
  draw();
  requestAnimationFrame(frame);
}
function retry() {
  track("retry", { phase, peak, shotsUsed: SHOTS - shots });
  loadLevel(levelIndex);
}
function pause(value: boolean) {
  paused = value;
  aiming = false;
  pointerID = null;
  track(value ? "pause" : "resume");
  labels();
  if (value) void audio?.suspend();
  else if (!muted) void audio?.resume();
}
el("fire").onclick = fire;
el("retry").onclick = retry;
el("again").onclick = retry;
el("next").onclick = () => {
  if (paused) pause(false);
  else if (phase === "won") {
    if (levelIndex === levels.length - 1) {
      track("campaign_replay");
      loadLevel(0);
    } else loadLevel(levelIndex + 1);
  } else retry();
};
el("pause").onclick = () => pause(!paused);
el("lang").onclick = () => {
  lang = lang === "en" ? "es" : "en";
  write("scrapshot.language", lang);
  labels();
};
el("sound").onclick = () => {
  muted = !muted;
  write("scrapshot.muted", String(muted));
  if (!muted) tone(400, 0.08);
  labels();
};
for (const button of document.querySelectorAll<HTMLButtonElement>(".ammo"))
  button.onclick = () => {
    kind = button.dataset.kind as Kind;
    track("tool_selected", { kind });
    hud();
  };
for (const button of document.querySelectorAll<HTMLButtonElement>(".level"))
  button.onclick = () => loadLevel(Number(button.dataset.level));
el<HTMLInputElement>("angle").oninput = (e) => {
  angle = Number((e.target as HTMLInputElement).value);
  hud();
};
el<HTMLInputElement>("power").oninput = (e) => {
  power = Number((e.target as HTMLInputElement).value);
  hud();
};
function point(e: PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * 1000) / r.width,
    y: ((e.clientY - r.top) * 560) / r.height,
    inside:
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom,
  };
}
function aim(e: PointerEvent) {
  const p = point(e);
  const a = aimFromPoint(p.x, p.y, origin);
  angle = a.angle;
  power = a.power;
  hud();
}
canvas.onpointerdown = (e) => {
  if (phase !== "ready" || paused || e.button !== 0 || pointerID !== null)
    return;
  aiming = true;
  pointerID = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  aim(e);
};
canvas.onpointermove = (e) => {
  if (aiming && e.pointerId === pointerID) aim(e);
};
canvas.onpointerup = (e) => {
  if (!aiming || e.pointerId !== pointerID) return;
  aiming = false;
  pointerID = null;
  if (canvas.hasPointerCapture(e.pointerId))
    canvas.releasePointerCapture(e.pointerId);
  if (point(e).inside) {
    aim(e);
    fire();
  }
};
canvas.onpointercancel = () => {
  aiming = false;
  pointerID = null;
};
document.addEventListener("keydown", (e) => {
  if (!overlay.hidden && e.key === "Tab") {
    const buttons = Array.from(
      overlay.querySelectorAll<HTMLButtonElement>("button"),
    ).filter((b) => !b.hidden);
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (e.key.toLowerCase() === "p") pause(!paused);
  if (e.key.toLowerCase() === "r") retry();
  if (e.key === "Escape" && paused) pause(false);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !paused) pause(true);
});
el("export").onclick = () => {
  track("export");
  const blob = new Blob(
    [
      JSON.stringify(
        {
          schema: 1,
          prototype: "0.1.0",
          note: "Local events only; not validated retention or revenue.",
          progress,
          events: telemetry,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scrapshot-playtest.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
loadLevel(levelIndex);
requestAnimationFrame(frame);
