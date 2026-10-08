/**
 * Provisional Tiny Factory Rush XR walking skeleton (IWSDK checkpoint).
 * DEV FALLBACK table. Complete crude loop — not final art / signature / engine.
 */

import {
  createSystem,
  Grabbed,
  Hovered,
  OneHandGrabbable,
  RayInteractable,
} from '@iwsdk/core';
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  type Object3D,
} from 'three';
import { selectSnapTarget } from '../killtest/snap.js';
import {
  BOOST_SLOT,
  MODULE_SIZE,
  SNAP_RADIUS,
  STATION_POS,
  TABLE,
} from './config.js';
import { FactoryHud } from './hud.js';
import {
  FactoryMetrics,
  isDevFallbackEnabled,
  type FactoryInputSource,
} from './metrics.js';
import { FactorySim, type ProductState, type StationId } from './sim.js';

const C = {
  table: new Color(0x6e5843),
  source: new Color(0x3d7ea6),
  proc: new Color(0x4a5568),
  buffer: new Color(0xc4a35a),
  sink: new Color(0x3f8f6b),
  product: new Color(0xe8a838),
  jam: new Color(0xd9534f),
  moduleIdle: new Color(0x5b8def),
  moduleHover: new Color(0x7ec8e3),
  moduleGrab: new Color(0xf0c75e),
  moduleOk: new Color(0x5cb85c),
  pad: new Color(0x2f3e46),
  padHot: new Color(0x88c999),
};

type StationVisual = {
  id: StationId;
  root: Mesh;
  material: MeshStandardMaterial;
};

export class FactorySystem extends createSystem({
  moduleGrabbed: { required: [Grabbed] },
  moduleHovered: { required: [Hovered] },
}) {
  readonly metrics = new FactoryMetrics();
  private sim = new FactorySim();
  private hud: FactoryHud | null = null;
  private stations: StationVisual[] = [];
  private productMeshes: Mesh[] = [];
  private moduleObject: Object3D | null = null;
  private moduleMaterial: MeshStandardMaterial | null = null;
  private padMesh: Mesh | null = null;
  private padMaterial: MeshStandardMaterial | null = null;
  private occupiedSlot: string | null = null;
  private wasGrabbed = false;
  private rejectUntil = 0;
  private built = false;
  private jamPulse = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private unsubSim: (() => void) | null = null;
  private lastInterventionSource: FactoryInputSource | null = null;
  private activeGrabSource: FactoryInputSource | null = null;
  private resultBoard: Mesh | null = null;
  private resultTexture: CanvasTexture | null = null;
  private lastShownGrade: string | null = null;

  init(): void {
    const host =
      document.getElementById('scene-container') ?? document.body;
    this.hud = new FactoryHud(host);
    const devFallback = isDevFallbackEnabled();

    this.unsubSim = this.sim.on((e) => {
      if (e.type === 'shiftStart') this.metrics.log('shiftStart');
      else if (e.type === 'firstProduct') this.metrics.log('firstProduct');
      else if (e.type === 'jamStart') this.metrics.log('jamStart');
      else if (e.type === 'interventionStart')
        this.metrics.log('interventionStart', {
          inputSource: this.lastInterventionSource,
        });
      else if (e.type === 'interventionSuccess')
        this.metrics.log('interventionSuccess', {
          kind: e.kind,
          inputSource: this.lastInterventionSource,
        });
      else if (e.type === 'flowRecovered')
        this.metrics.log('flowRecovered', {
          inputSource: this.lastInterventionSource,
        });
      else if (e.type === 'productDelivered')
        this.metrics.log('productDelivered', { total: e.total });
      else if (e.type === 'spill')
        this.metrics.log('spill', { count: e.count });
      else if (e.type === 'shiftEnd')
        this.metrics.log('shiftEnd', {
          grade: e.grade,
          cash: e.cash,
          delivered: e.delivered,
          jamSec: Number(e.jamSec.toFixed(2)),
        });
      else if (e.type === 'shiftReset') this.metrics.log('shiftReset');
    });

    this.queries.moduleGrabbed.subscribe('qualify', () => this.onGrabStart());
    this.queries.moduleGrabbed.subscribe('disqualify', () => this.onGrabEnd());

    this.keyHandler = (ev: KeyboardEvent) => {
      // Restart is always available (result screen).
      if (ev.key === 'r' || ev.key === 'R') {
        this.sim.reset();
        this.occupiedSlot = null;
        this.lastInterventionSource = null;
        this.resetModuleHome();
      }
      // DEV ONLY (?dev=1): keyboard boost — not hero / not Quest evidence.
      if (devFallback && (ev.key === 'b' || ev.key === 'B')) {
        this.devApplyBoostAtPad('dev-keyboard');
      }
    };
    window.addEventListener('keydown', this.keyHandler);
    if (devFallback) {
      (
        window as unknown as {
          __factoryApplyBoost?: () => void;
        }
      ).__factoryApplyBoost = () => this.devApplyBoostAtPad('automation');
    }
    this.cleanupFuncs.push(() => {
      if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
      this.unsubSim?.();
      this.hud?.dispose();
      if (devFallback) {
        delete (window as unknown as { __factoryApplyBoost?: () => void })
          .__factoryApplyBoost;
      }
    });

    this.buildScene();
    this.sim.start();
    // eslint-disable-next-line no-console
    console.info('[factory] walking skeleton ready', {
      mode: 'EMULATOR_OR_QUEST',
      table: 'DEV_FALLBACK_PLANE',
      note: 'PROVISIONAL CHECKPOINT — D-007 OPEN',
      devFallback,
    });
  }

  update(delta: number): void {
    if (!this.built) return;
    this.sim.step(Math.min(0.05, delta));
    const snap = this.sim.snapshot();
    this.syncProducts(snap.products);
    this.pulseStations(snap.jamActive, delta);
    this.updateModuleVisual(delta);
    const hint = snap.boosted
      ? 'Line accelerating — keep shipping'
      : snap.jamActive
        ? 'JAM at slow machine — grab BOOST cube → snap onto glowing pad'
        : 'Orders flowing — watch the slow machine';
    this.hud?.update(snap, hint);
    this.syncResultBoard(snap);
  }

  private buildScene(): void {
    const table = new Mesh(
      new BoxGeometry(...TABLE.size),
      new MeshStandardMaterial({ color: C.table, roughness: 0.9 }),
    );
    table.position.set(...TABLE.position);
    table.name = 'factory-table';
    this.world.createTransformEntity(table);

    const stationDefs: Array<{
      id: StationId;
      geo: BoxGeometry | CylinderGeometry;
      color: Color;
      yScale?: number;
    }> = [
      {
        id: 'source',
        geo: new CylinderGeometry(0.07, 0.08, 0.16, 16),
        color: C.source,
      },
      {
        id: 'procA',
        geo: new BoxGeometry(0.14, 0.12, 0.14),
        color: C.proc,
      },
      {
        id: 'buffer',
        geo: new BoxGeometry(0.18, 0.08, 0.14),
        color: C.buffer,
      },
      {
        id: 'procB',
        geo: new BoxGeometry(0.14, 0.18, 0.14),
        color: C.proc,
      },
      {
        id: 'sink',
        geo: new CylinderGeometry(0.09, 0.09, 0.1, 6),
        color: C.sink,
      },
    ];

    for (const def of stationDefs) {
      const material = new MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.12,
        metalness: 0.25,
        roughness: 0.45,
      });
      const mesh = new Mesh(def.geo, material);
      const p = STATION_POS[def.id];
      mesh.position.set(p[0], p[1], p[2]);
      mesh.name = `factory-${def.id}`;
      this.world.createTransformEntity(mesh);
      this.stations.push({ id: def.id, root: mesh, material });
    }

    // Labels via tiny colored caps already distinct — no text meshes.

    this.padMaterial = new MeshStandardMaterial({
      color: C.pad,
      emissive: C.pad,
      emissiveIntensity: 0.2,
    });
    this.padMesh = new Mesh(
      new BoxGeometry(0.24, 0.02, 0.24),
      this.padMaterial,
    );
    this.padMesh.position.set(...BOOST_SLOT.position);
    this.padMesh.name = 'factory-boost-pad';
    this.world.createTransformEntity(this.padMesh);

    this.moduleMaterial = new MeshStandardMaterial({
      color: C.moduleIdle,
      emissive: C.moduleIdle,
      emissiveIntensity: 0.25,
      metalness: 0.35,
      roughness: 0.4,
    });
    const body = new Mesh(new BoxGeometry(...MODULE_SIZE), this.moduleMaterial);
    body.position.set(
      BOOST_SLOT.position[0] - 0.28,
      BOOST_SLOT.position[1] + MODULE_SIZE[1] / 2,
      BOOST_SLOT.position[2],
    );
    body.name = 'factory-boost-module';
    const entity = this.world
      .createTransformEntity(body)
      .addComponent(RayInteractable)
      .addComponent(OneHandGrabbable, { translate: true, rotate: true });
    this.moduleObject = entity.object3D!;

    for (let i = 0; i < this.sim.config.maxProducts; i += 1) {
      const mesh = new Mesh(
        new SphereGeometry(0.028, 12, 12),
        new MeshStandardMaterial({
          color: C.product,
          emissive: C.product,
          emissiveIntensity: 0.15,
        }),
      );
      mesh.visible = false;
      mesh.name = `factory-product-${i}`;
      this.world.createTransformEntity(mesh);
      this.productMeshes.push(mesh);
    }

    // World-space result board (DOM HUD is invisible inside immersive XR).
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    this.resultTexture = new CanvasTexture(canvas);
    this.resultBoard = new Mesh(
      new PlaneGeometry(0.55, 0.28),
      new MeshBasicMaterial({
        map: this.resultTexture,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.resultBoard.position.set(0, 1.05, -0.7);
    this.resultBoard.visible = false;
    this.resultBoard.name = 'factory-result-board';
    this.world.createTransformEntity(this.resultBoard);

    this.built = true;
  }

  private syncResultBoard(snap: ReturnType<FactorySim['snapshot']>): void {
    if (!this.resultBoard || !this.resultTexture) return;
    if (snap.phase !== 'ended' || !snap.grade) {
      this.resultBoard.visible = false;
      this.lastShownGrade = null;
      return;
    }
    this.resultBoard.visible = true;
    const key = `${snap.grade}:${snap.cash}:${snap.delivered}`;
    if (key === this.lastShownGrade) return;
    this.lastShownGrade = key;
    const canvas = this.resultTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(20,24,28,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f0c75e';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#f4f1ea';
    ctx.font = 'bold 36px Segoe UI, sans-serif';
    ctx.fillText('SHIFT COMPLETE', 36, 70);
    ctx.fillStyle = '#f0c75e';
    ctx.font = 'bold 96px Segoe UI, sans-serif';
    ctx.fillText(`GRADE ${snap.grade}`, 36, 170);
    ctx.fillStyle = '#c8d0d8';
    ctx.font = '28px Segoe UI, sans-serif';
    ctx.fillText(
      `CASH ${Math.floor(snap.cash)}   OUT ${snap.delivered}`,
      36,
      220,
    );
    this.resultTexture.needsUpdate = true;
  }

  private syncProducts(states: ProductState[]): void {
    for (let i = 0; i < this.productMeshes.length; i += 1) {
      const mesh = this.productMeshes[i]!;
      const state = states[i];
      if (!state || state.kind === 'idle') {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const mat = mesh.material as MeshStandardMaterial;
      if (state.kind === 'at') {
        const p = STATION_POS[state.station];
        const stack = states
          .slice(0, i)
          .filter((s) => s.kind === 'at' && s.station === state.station).length;
        mesh.position.set(p[0], p[1] + 0.08 + stack * 0.04, p[2]);
        mat.color.copy(C.product);
      } else if (state.kind === 'moving') {
        const a = STATION_POS[state.from];
        const b = STATION_POS[state.to];
        const t = easeInOut(state.t);
        mesh.position.set(
          a[0] + (b[0] - a[0]) * t,
          a[1] + 0.1 + Math.sin(t * Math.PI) * 0.04,
          a[2] + (b[2] - a[2]) * t,
        );
        mat.color.copy(C.product);
      } else if (state.kind === 'spill') {
        // OVERFLOW PLACEHOLDER — pile toward near table edge, capped.
        mesh.position.set(
          state.edgeX * 0.15,
          TABLE.position[1] + 0.06 + Math.min(0.12, state.age * 0.02),
          TABLE.position[2] + 0.28 + state.edgeX * 0.05,
        );
        mat.color.copy(C.jam);
      }
    }
  }

  private pulseStations(jam: boolean, delta: number): void {
    this.jamPulse += delta * (jam ? 6 : 2);
    for (const s of this.stations) {
      if (s.id === 'procB') {
        s.material.emissive.copy(jam ? C.jam : C.proc);
        s.material.emissiveIntensity = jam
          ? 0.25 + 0.25 * Math.sin(this.jamPulse)
          : 0.12;
        s.root.scale.y = jam ? 1 + 0.04 * Math.sin(this.jamPulse) : 1;
      } else if (s.id === 'buffer') {
        s.material.emissiveIntensity = jam ? 0.3 : 0.12;
      }
    }
  }

  private updateModuleVisual(_delta: number): void {
    if (!this.moduleMaterial || !this.padMaterial || !this.moduleObject) return;
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const grabbed = this.queries.moduleGrabbed.entities.size > 0;
    const hovered = this.queries.moduleHovered.entities.size > 0;
    let color = C.moduleIdle;
    if (now < this.rejectUntil) color = C.jam;
    else if (grabbed) color = C.moduleGrab;
    else if (hovered) color = C.moduleHover;
    else if (this.occupiedSlot) color = C.moduleOk;
    this.moduleMaterial.color.copy(color);
    this.moduleMaterial.emissive.copy(color);

    const pos = this.moduleObject.position;
    const decision = selectSnapTarget(
      [pos.x, pos.y, pos.z],
      [
        {
          id: BOOST_SLOT.id,
          position: BOOST_SLOT.position,
          occupied: false,
        },
      ],
      SNAP_RADIUS,
    );
    const hot = grabbed && decision.kind === 'snap';
    this.padMaterial.color.copy(hot ? C.padHot : C.pad);
    this.padMaterial.emissive.copy(hot ? C.padHot : C.pad);
    this.padMaterial.emissiveIntensity = hot ? 0.55 : 0.2;
  }

  private onGrabStart(): void {
    // ECS Grabbed tag = XR GrabSystem path (IWER hand/controller), not keyboard.
    this.activeGrabSource = 'xr';
    this.metrics.log('grabAttempt', { inputSource: 'xr' });
    this.metrics.log('grabSuccess', { inputSource: 'xr' });
    this.wasGrabbed = true;
    this.occupiedSlot = null;
  }

  private onGrabEnd(): void {
    if (!this.moduleObject || !this.wasGrabbed) return;
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const inputSource: FactoryInputSource = this.activeGrabSource ?? 'xr';
    this.metrics.log('release', { inputSource });
    const pos = this.moduleObject.position;
    const decision = selectSnapTarget(
      [pos.x, pos.y, pos.z],
      [
        {
          id: BOOST_SLOT.id,
          position: BOOST_SLOT.position,
          occupied: Boolean(this.sim.snapshot().boosted),
        },
      ],
      SNAP_RADIUS,
    );

    if (decision.kind === 'snap') {
      this.moduleObject.position.set(
        decision.position[0],
        decision.position[1] + MODULE_SIZE[1] / 2,
        decision.position[2],
      );
      this.occupiedSlot = decision.targetId;
      this.lastInterventionSource = inputSource;
      this.metrics.log('snapSuccess', {
        targetId: decision.targetId,
        inputSource,
      });
      const result = this.sim.tryApplyBoost();
      if (!result.ok) {
        this.rejectUntil = now + 450;
        this.metrics.log('snapRejected', {
          reason: result.reason,
          inputSource,
        });
        this.resetModuleHome();
        this.occupiedSlot = null;
        this.lastInterventionSource = null;
      }
    } else {
      this.rejectUntil = now + 450;
      this.metrics.log('snapRejected', {
        reason: decision.reason,
        inputSource,
      });
      this.resetModuleHome();
    }
    this.wasGrabbed = false;
    this.activeGrabSource = null;
  }

  private resetModuleHome(): void {
    if (!this.moduleObject) return;
    this.moduleObject.position.set(
      BOOST_SLOT.position[0] - 0.28,
      BOOST_SLOT.position[1] + MODULE_SIZE[1] / 2,
      BOOST_SLOT.position[2],
    );
  }

  /**
   * DEV ONLY (?dev=1): keyboard / automation boost.
   * Not hero evidence. Not Quest evidence. Normal XR flow must not need this.
   */
  private devApplyBoostAtPad(inputSource: 'dev-keyboard' | 'automation'): void {
    if (!this.moduleObject) return;
    if (!isDevFallbackEnabled()) return;
    this.lastInterventionSource = inputSource;
    this.metrics.log('grabAttempt', { inputSource, path: 'DEV_ONLY' });
    this.metrics.log('grabSuccess', { inputSource, path: 'DEV_ONLY' });
    this.moduleObject.position.set(
      BOOST_SLOT.position[0],
      BOOST_SLOT.position[1] + MODULE_SIZE[1] / 2,
      BOOST_SLOT.position[2],
    );
    this.occupiedSlot = BOOST_SLOT.id;
    this.metrics.log('snapSuccess', {
      targetId: BOOST_SLOT.id,
      inputSource,
      path: 'DEV_ONLY',
    });
    const result = this.sim.tryApplyBoost();
    if (!result.ok) {
      this.metrics.log('snapRejected', {
        reason: result.reason,
        inputSource,
      });
      this.resetModuleHome();
      this.occupiedSlot = null;
      this.lastInterventionSource = null;
    }
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
