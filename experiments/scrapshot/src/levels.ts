export type Material = "wood" | "glass" | "metal";
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
};
export type Level = {
  name: string;
  es: string;
  hint: string;
  hintEs: string;
  line: number;
  goal: number;
  blocks: Block[];
};
const b = (
  x: number,
  y: number,
  w: number,
  h: number,
  material: Material,
): Block => ({ x, y, w, h, material });
export const levels: Level[] = [
  {
    name: "The first domino",
    es: "La primera ficha",
    hint: "Aim low. Break a support. Let gravity do the rest.",
    hintEs: "Apunta abajo. Rompe un soporte y deja actuar a la gravedad.",
    line: 440,
    goal: 75,
    blocks: [
      b(665, 452, 26, 112, "glass"),
      b(775, 452, 26, 112, "glass"),
      b(720, 383, 158, 24, "wood"),
      b(680, 336, 26, 68, "wood"),
      b(760, 336, 26, 68, "wood"),
      b(720, 289, 134, 24, "wood"),
      b(697, 257, 38, 38, "metal"),
      b(745, 257, 38, 38, "wood"),
    ],
  },
  {
    name: "Double trouble",
    es: "Doble problema",
    hint: "One falling tower can do the work of two shots.",
    hintEs: "Una torre puede derribar la otra. Busca el efecto dominó.",
    line: 418,
    goal: 75,
    blocks: [
      b(625, 452, 24, 112, "glass"),
      b(695, 452, 24, 112, "wood"),
      b(660, 383, 112, 24, "wood"),
      b(638, 341, 34, 58, "wood"),
      b(682, 341, 34, 58, "metal"),
      b(660, 300, 110, 22, "glass"),
      b(790, 453, 28, 110, "glass"),
      b(870, 453, 28, 110, "glass"),
      b(830, 385, 128, 24, "wood"),
      b(809, 344, 34, 56, "metal"),
      b(851, 344, 34, 56, "wood"),
      b(830, 303, 110, 24, "wood"),
    ],
  },
  {
    name: "Heavy industry",
    es: "Peso pesado",
    hint: "Heavy shots carry more momentum. Aim for the glass feet.",
    hintEs: "La bola pesada empuja más. Apunta a los pies de vidrio.",
    line: 420,
    goal: 75,
    blocks: [
      b(680, 463, 32, 90, "glass"),
      b(800, 463, 32, 90, "glass"),
      b(740, 405, 168, 24, "metal"),
      b(686, 360, 30, 64, "wood"),
      b(794, 360, 30, 64, "wood"),
      b(740, 315, 166, 24, "metal"),
      b(715, 280, 42, 44, "metal"),
      b(765, 280, 42, 44, "wood"),
    ],
  },
  {
    name: "Magnetic personality",
    es: "Atracción fatal",
    hint: "Magnet shots pull nearby metal for a few seconds.",
    hintEs: "La bola magnética atrae metal cercano durante unos segundos.",
    line: 440,
    goal: 75,
    blocks: [
      b(650, 448, 24, 120, "wood"),
      b(754, 448, 24, 120, "glass"),
      b(702, 376, 150, 22, "wood"),
      b(668, 342, 38, 44, "metal"),
      b(722, 342, 38, 44, "metal"),
      b(850, 461, 26, 94, "glass"),
      b(904, 461, 26, 94, "wood"),
      b(877, 402, 90, 22, "wood"),
      b(877, 365, 40, 50, "metal"),
      b(702, 307, 126, 22, "glass"),
    ],
  },
  {
    name: "The grand collapse",
    es: "El gran derrumbe",
    hint: "Three shots. Three materials. Make every reaction count.",
    hintEs: "Tres disparos, tres materiales. Haz que cada reacción cuente.",
    line: 402,
    goal: 80,
    blocks: [
      b(600, 451, 24, 114, "glass"),
      b(700, 451, 24, 114, "wood"),
      b(650, 381, 146, 24, "metal"),
      b(616, 334, 26, 68, "wood"),
      b(684, 334, 26, 68, "glass"),
      b(650, 287, 120, 24, "wood"),
      b(650, 250, 44, 48, "metal"),
      b(810, 451, 24, 114, "glass"),
      b(910, 451, 24, 114, "wood"),
      b(860, 381, 146, 24, "wood"),
      b(826, 334, 26, 68, "metal"),
      b(894, 334, 26, 68, "glass"),
      b(860, 287, 120, 24, "wood"),
      b(860, 250, 44, 48, "metal"),
    ],
  },
];
