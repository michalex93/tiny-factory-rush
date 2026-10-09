/**
 * Premium desk-toy silhouettes — readable at tabletop distance.
 * Not final art; procedural identity for SOURCE / PROCESSOR / BUFFER / SINK / BOOST / products.
 */

import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import type { StationId } from './sim.js';

export const PALETTE = {
  source: new Color(0x2f8fbf),
  procA: new Color(0x5a6578),
  buffer: new Color(0xd4a84b),
  procB: new Color(0x6b7385),
  sink: new Color(0x3fa06a),
  metal: new Color(0x9aa3b0),
  darkMetal: new Color(0x3a424c),
  accent: new Color(0xffd166),
  warn: new Color(0xf08a3c),
  productGear: new Color(0xf0b429),
  productBolt: new Color(0xc0c8d4),
  productCase: new Color(0xe07a3d),
  productChip: new Color(0x5ec8a0),
  moduleBody: new Color(0x4f8cff),
  moduleCore: new Color(0xffd166),
};

function mat(
  color: Color,
  opts: { emissive?: number; metal?: number; rough?: number } = {},
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opts.emissive ?? 0.14,
    metalness: opts.metal ?? 0.4,
    roughness: opts.rough ?? 0.42,
  });
}

export type StationBuild = {
  root: Group;
  body: Mesh;
  material: MeshStandardMaterial;
  spinner: Object3D | null;
  light: Mesh | null;
};

/** SOURCE = hopper / feeder / depósito */
export function buildSource(): StationBuild {
  const root = new Group();
  const material = mat(PALETTE.source, { emissive: 0.18 });
  const body = new Mesh(new CylinderGeometry(0.055, 0.095, 0.14, 16), material);
  body.position.y = 0.02;
  const hopper = new Mesh(
    new ConeGeometry(0.1, 0.12, 16, 1, true),
    mat(PALETTE.source, { emissive: 0.12, metal: 0.25, rough: 0.5 }),
  );
  hopper.position.y = 0.14;
  hopper.rotation.x = Math.PI;
  const spout = new Mesh(
    new CylinderGeometry(0.028, 0.035, 0.05, 10),
    mat(PALETTE.darkMetal, { emissive: 0.05, metal: 0.7 }),
  );
  spout.position.y = -0.06;
  const spinner = new Mesh(
    new BoxGeometry(0.09, 0.018, 0.018),
    mat(PALETTE.metal, { metal: 0.75, rough: 0.28, emissive: 0.05 }),
  );
  spinner.position.y = 0.2;
  root.add(body, hopper, spout, spinner);
  return { root, body, material, spinner, light: null };
}

/** PROCESSOR = compact machine with rollers / moving head */
export function buildProcessor(kind: 'procA' | 'procB'): StationBuild {
  const root = new Group();
  const baseColor = kind === 'procA' ? PALETTE.procA : PALETTE.procB;
  const material = mat(baseColor, { emissive: 0.14, metal: 0.45 });
  const body = new Mesh(
    new BoxGeometry(kind === 'procB' ? 0.17 : 0.15, kind === 'procB' ? 0.14 : 0.11, 0.16),
    material,
  );
  body.position.y = kind === 'procB' ? 0.02 : 0;
  // Twin rollers
  const rollerMat = mat(PALETTE.darkMetal, { metal: 0.8, rough: 0.25, emissive: 0.04 });
  const rollerGroup = new Group();
  const r1 = new Mesh(new CylinderGeometry(0.035, 0.035, 0.14, 14), rollerMat);
  r1.rotation.z = Math.PI / 2;
  r1.position.set(0, 0.08, 0.02);
  const r2 = r1.clone();
  r2.position.y = 0.08;
  r2.position.z = -0.04;
  rollerGroup.add(r1, r2);
  // Press / moving head
  const head = new Mesh(
    new BoxGeometry(0.1, 0.04, 0.08),
    mat(kind === 'procB' ? PALETTE.warn : PALETTE.metal, {
      emissive: kind === 'procB' ? 0.22 : 0.08,
      metal: 0.55,
    }),
  );
  head.position.set(0, kind === 'procB' ? 0.16 : 0.12, 0);
  const light = new Mesh(
    new SphereGeometry(0.018, 8, 8),
    mat(PALETTE.accent, { emissive: 0.55, metal: 0.1, rough: 0.35 }),
  );
  light.position.set(0.06, kind === 'procB' ? 0.12 : 0.08, 0.07);
  root.add(body, rollerGroup, head, light);
  return { root, body, material, spinner: rollerGroup, light };
}

/** BUFFER = rack / tray accumulator */
export function buildBuffer(): StationBuild {
  const root = new Group();
  const material = mat(PALETTE.buffer, { emissive: 0.16, metal: 0.25, rough: 0.5 });
  const body = new Mesh(new BoxGeometry(0.2, 0.05, 0.16), material);
  body.position.y = -0.02;
  // Vertical rack shelves
  for (let i = 0; i < 3; i += 1) {
    const shelf = new Mesh(
      new BoxGeometry(0.18, 0.012, 0.14),
      mat(PALETTE.metal, { metal: 0.55, rough: 0.4, emissive: 0.05 }),
    );
    shelf.position.y = 0.02 + i * 0.045;
    root.add(shelf);
    const postL = new Mesh(
      new BoxGeometry(0.012, 0.14, 0.012),
      mat(PALETTE.darkMetal, { metal: 0.6, emissive: 0.04 }),
    );
    postL.position.set(-0.085, 0.05, 0.06);
    const postR = postL.clone();
    postR.position.x = 0.085;
    if (i === 0) root.add(postL, postR);
  }
  const spinner = new Mesh(
    new CylinderGeometry(0.04, 0.04, 0.02, 12),
    mat(PALETTE.accent, { emissive: 0.25, metal: 0.3 }),
  );
  spinner.position.set(0, 0.14, 0);
  root.add(body, spinner);
  return { root, body, material, spinner, light: null };
}

/** SINK = packing dock / mini pallet bay */
export function buildSink(): StationBuild {
  const root = new Group();
  const material = mat(PALETTE.sink, { emissive: 0.16, metal: 0.3 });
  const body = new Mesh(new BoxGeometry(0.18, 0.06, 0.2), material);
  body.position.y = -0.02;
  // Pallet slats
  for (let i = 0; i < 3; i += 1) {
    const slat = new Mesh(
      new BoxGeometry(0.16, 0.015, 0.035),
      mat(PALETTE.darkMetal, { metal: 0.2, rough: 0.65, emissive: 0.03 }),
    );
    slat.position.set(0, 0.025, -0.05 + i * 0.05);
    root.add(slat);
  }
  // Dock gate / arch
  const postL = new Mesh(
    new BoxGeometry(0.02, 0.14, 0.02),
    mat(PALETTE.metal, { metal: 0.55, emissive: 0.06 }),
  );
  postL.position.set(-0.08, 0.08, 0.08);
  const postR = postL.clone();
  postR.position.x = 0.08;
  const lintel = new Mesh(
    new BoxGeometry(0.18, 0.02, 0.02),
    mat(PALETTE.metal, { metal: 0.55, emissive: 0.06 }),
  );
  lintel.position.set(0, 0.15, 0.08);
  const light = new Mesh(
    new SphereGeometry(0.022, 10, 10),
    mat(PALETTE.accent, { emissive: 0.55, metal: 0.1 }),
  );
  light.position.set(0, 0.18, 0.08);
  // Mini “truck bay” lip
  const bay = new Mesh(
    new BoxGeometry(0.14, 0.03, 0.06),
    mat(PALETTE.darkMetal, { metal: 0.5, emissive: 0.05 }),
  );
  bay.position.set(0, 0.0, 0.12);
  root.add(body, postL, postR, lintel, light, bay);
  return { root, body, material, spinner: null, light };
}

export function buildStationSilhouette(id: StationId): StationBuild {
  if (id === 'source') return buildSource();
  if (id === 'procA') return buildProcessor('procA');
  if (id === 'procB') return buildProcessor('procB');
  if (id === 'buffer') return buildBuffer();
  return buildSink();
}

/**
 * BOOST = industrial turbo / motor cartridge that “plugs” into the pad.
 * Returns the grabbable root mesh (BoxGeometry body for grab bounds).
 */
export function buildBoostModule(bodyMaterial: MeshStandardMaterial): Mesh {
  const body = new Mesh(new BoxGeometry(0.15, 0.13, 0.15), bodyMaterial);
  // Motor can
  const can = new Mesh(
    new CylinderGeometry(0.055, 0.055, 0.11, 16),
    mat(PALETTE.darkMetal, { metal: 0.75, rough: 0.28, emissive: 0.06 }),
  );
  can.rotation.z = Math.PI / 2;
  can.position.set(0, 0.01, 0);
  body.add(can);
  // Cooling fins
  for (let i = 0; i < 4; i += 1) {
    const fin = new Mesh(
      new BoxGeometry(0.01, 0.08, 0.04),
      mat(PALETTE.metal, { metal: 0.65, emissive: 0.05 }),
    );
    fin.position.set(-0.02 + i * 0.02, 0.06, 0.06);
    body.add(fin);
  }
  // Turbo intake
  const intake = new Mesh(
    new CylinderGeometry(0.03, 0.04, 0.04, 12),
    mat(PALETTE.moduleCore, { emissive: 0.45, metal: 0.2 }),
  );
  intake.position.set(0.08, 0.02, 0);
  intake.rotation.z = Math.PI / 2;
  body.add(intake);
  // Plug peg that seats into pad
  const peg = new Mesh(
    new CylinderGeometry(0.035, 0.04, 0.035, 12),
    mat(PALETTE.moduleCore, { emissive: 0.35, metal: 0.3 }),
  );
  peg.position.y = -0.085;
  body.add(peg);
  // Handle ridge
  const handle = new Mesh(
    new BoxGeometry(0.06, 0.03, 0.08),
    mat(PALETTE.moduleBody, { emissive: 0.2, metal: 0.35 }),
  );
  handle.position.set(0, 0.09, -0.02);
  body.add(handle);
  return body;
}

export type ProductKind = 'gear' | 'bolt' | 'case' | 'chip';

export function productKindForIndex(i: number): ProductKind {
  const kinds: ProductKind[] = ['gear', 'bolt', 'case', 'chip'];
  return kinds[i % kinds.length]!;
}

/** Thematic product piece — not identical cubes. */
export function buildProductMesh(kind: ProductKind): Mesh {
  if (kind === 'gear') {
    const g = new Mesh(
      new CylinderGeometry(0.028, 0.028, 0.016, 10),
      mat(PALETTE.productGear, { emissive: 0.28, metal: 0.35, rough: 0.4 }),
    );
    const hub = new Mesh(
      new CylinderGeometry(0.01, 0.01, 0.02, 8),
      mat(PALETTE.darkMetal, { metal: 0.7, emissive: 0.05 }),
    );
    g.add(hub);
    for (let t = 0; t < 6; t += 1) {
      const tooth = new Mesh(
        new BoxGeometry(0.012, 0.014, 0.01),
        mat(PALETTE.productGear, { emissive: 0.25, metal: 0.3 }),
      );
      const a = (t / 6) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.028, 0, Math.sin(a) * 0.028);
      g.add(tooth);
    }
    return g;
  }
  if (kind === 'bolt') {
    const shaft = new Mesh(
      new CylinderGeometry(0.01, 0.01, 0.05, 8),
      mat(PALETTE.productBolt, { emissive: 0.15, metal: 0.8, rough: 0.25 }),
    );
    const head = new Mesh(
      new CylinderGeometry(0.018, 0.018, 0.012, 6),
      mat(PALETTE.productBolt, { emissive: 0.18, metal: 0.75 }),
    );
    head.position.y = 0.028;
    shaft.add(head);
    return shaft;
  }
  if (kind === 'case') {
    const c = new Mesh(
      new BoxGeometry(0.042, 0.028, 0.055),
      mat(PALETTE.productCase, { emissive: 0.2, metal: 0.15, rough: 0.55 }),
    );
    const window = new Mesh(
      new BoxGeometry(0.02, 0.012, 0.002),
      mat(PALETTE.accent, { emissive: 0.35, metal: 0.1 }),
    );
    window.position.z = 0.028;
    c.add(window);
    return c;
  }
  // chip
  const chip = new Mesh(
    new BoxGeometry(0.04, 0.01, 0.04),
    mat(PALETTE.productChip, { emissive: 0.25, metal: 0.2, rough: 0.45 }),
  );
  const die = new Mesh(
    new BoxGeometry(0.018, 0.008, 0.018),
    mat(PALETTE.darkMetal, { emissive: 0.08, metal: 0.4 }),
  );
  die.position.y = 0.008;
  chip.add(die);
  return chip;
}
