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

// Five distinct structures: bridges, stepped supports, metal loads and offset towers.
levels.push(
  { name: "The freight bridge", es: "El puente de carga", hint: "Remove a bridge pier to tip its cargo.", hintEs: "Quita un pilar del puente para volcar la carga.", line: 420, goal: 80, blocks: [
    b(620,452,26,112,"glass"), b(850,452,26,112,"wood"), b(735,383,280,24,"wood"),
    b(640,345,44,50,"metal"), b(710,345,44,50,"wood"), b(780,345,44,50,"metal"), b(835,345,44,50,"wood") ] },
  { name: "The staircase", es: "La escalera", hint: "Different heights need different angles. Start with the closest support.", hintEs: "Cada altura pide otro ángulo. Empieza por el soporte más cercano.", line: 440, goal: 80, blocks: [
    b(590,458,26,100,"glass"), b(640,458,26,100,"wood"), b(615,396,96,24,"wood"),
    b(745,438,28,140,"glass"), b(795,438,28,140,"wood"), b(770,356,100,24,"wood"),
    b(890,418,28,180,"glass"), b(940,418,28,180,"wood"), b(915,316,100,24,"metal") ] },
  { name: "Iron cargo", es: "Carga de hierro", hint: "Pull the metal load sideways with the magnet or push its glass supports.", hintEs: "Atrae la carga con el imán o empuja sus soportes de vidrio.", line: 430, goal: 80, blocks: [
    b(640,448,26,120,"glass"), b(790,448,26,120,"glass"), b(715,376,200,24,"metal"),
    b(655,341,40,44,"metal"), b(715,341,40,44,"metal"), b(775,341,40,44,"metal"),
    b(685,298,40,40,"wood"), b(745,298,40,40,"wood") ] },
  { name: "Off balance", es: "Fuera de equilibrio", hint: "The upper floors overhang to the right. Let their weight help.", hintEs: "Los pisos superiores sobresalen a la derecha. Aprovecha su peso.", line: 425, goal: 80, blocks: [
    b(660,448,30,120,"wood"), b(760,448,30,120,"glass"), b(720,376,164,24,"wood"),
    b(715,331,28,64,"wood"), b(785,331,28,64,"glass"), b(758,286,142,24,"wood"),
    b(744,250,38,46,"metal"), b(790,250,38,46,"wood") ] },
  { name: "The long yard", es: "El gran patio", hint: "Three separate structures. Save a shot for the far tower.", hintEs: "Tres estructuras separadas. Guarda un disparo para la torre del fondo.", line: 420, goal: 85, blocks: [
    b(560,458,24,100,"glass"), b(620,458,24,100,"wood"), b(590,396,100,24,"wood"), b(590,360,40,46,"metal"),
    b(725,443,24,130,"glass"), b(785,443,24,130,"wood"), b(755,366,100,24,"wood"), b(755,330,40,46,"metal"),
    b(880,458,24,100,"glass"), b(940,458,24,100,"wood"), b(910,396,100,24,"wood"), b(910,360,40,46,"metal") ] },
);
