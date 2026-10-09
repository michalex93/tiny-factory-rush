/**
 * Tiny Factory Rush XR — fun-slice vertical presentation (IWSDK).
 * DEV FALLBACK table. Premium desk-toy readability, not final art.
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
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  type Object3D,
} from 'three';
import { selectSnapTarget } from '../killtest/snap.js';
import { FactoryAudio } from './audio.js';
import {
  BOOST_SLOT,
  MODULE_SIZE,
  SNAP_RADIUS,
  STATION_POS,
  TABLE,
} from './config.js';
import { FunMetrics } from './funMetrics.js';
import { FactoryHud } from './hud.js';
import {
  FactoryMetrics,
  isDevFallbackEnabled,
  type FactoryInputSource,
} from './metrics.js';
import { FactorySim, type ProductState, type StationId } from './sim.js';
import {
  buildBoostModule,
  buildProductMesh,
  buildStationSilhouette,
  productKindForIndex,
} from './silhouettes.js';

const C = {
  table: new Color(0x5c4a38),
  tableTop: new Color(0x7a6348),
  jam: new Color(0xe24b4b),
  warn: new Color(0xf08a3c),
  moduleIdle: new Color(0x4f8cff),
  moduleHover: new Color(0x8ed7f0),
  moduleGrab: new Color(0xffd166),
  moduleOk: new Color(0x5ed17a),
  pad: new Color(0x243038),
  padHot: new Color(0x7ddea0),
  belt: new Color(0x2a3038),
  procB: new Color(0x6b7385),
};

type StationVisual = {
  id: StationId;
  root: Group;
  body: Mesh;
  material: MeshStandardMaterial;
  spinner: Object3D | null;
  light: Mesh | null;
};

export class FactorySystem extends createSystem({
  moduleGrabbed: { required: [Grabbed] },
  moduleHovered: { required: [Hovered] },
}) {
  readonly metrics = new FactoryMetrics();
  readonly funMetrics = new FunMetrics();
  private sim = new FactorySim(readCaptureTuning());
  private audio = new FactoryAudio();
  private hud: FactoryHud | null = null;
  private stations: StationVisual[] = [];
  private productMeshes: Mesh[] = [];
  private moduleObject: Object3D | null = null;
  private moduleMaterial: MeshStandardMaterial | null = null;
  private padMesh: Mesh | null = null;
  private padMaterial: MeshStandardMaterial | null = null;
  private beacon: Mesh | null = null;
  private recoveryRipples: Mesh[] = [];
  private occupiedSlot: string | null = null;
  private wasGrabbed = false;
  private rejectUntil = 0;
  private built = false;
  private jamPulse = 0;
  private aliveT = 0;
  private recoveryJuice = 0;
  private snapSettleT = 0;
  private snapFrom: [number, number, number] | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private unsubSim: (() => void) | null = null;
  private lastInterventionSource: FactoryInputSource | null = null;
  private activeGrabSource: FactoryInputSource | null = null;
  private resultBoard: Mesh | null = null;
  private resultTexture: CanvasTexture | null = null;
  private lastShownGrade: string | null = null;
  private promptBoard: Mesh | null = null;
  private promptTexture: CanvasTexture | null = null;
  private lastPromptKey: string | null = null;
  private lastDelivered = 0;

  init(): void {
    const host = document.getElementById('scene-container') ?? document.body;
    this.hud = new FactoryHud(host);
    const devFallback = isDevFallbackEnabled();

    this.unsubSim = this.bindSimEvents();

    this.queries.moduleGrabbed.subscribe('qualify', () => this.onGrabStart());
    this.queries.moduleGrabbed.subscribe('disqualify', () => this.onGrabEnd());

    this.keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'r' || ev.key === 'R') {
        this.funMetrics.onRestart();
        // Recreate sim so ?capture=1 (replaceState, no reload) can retune the arc.
        this.unsubSim?.();
        this.sim = new FactorySim(readCaptureTuning());
        this.unsubSim = this.bindSimEvents();
        this.sim.start();
        this.occupiedSlot = null;
        this.lastInterventionSource = null;
        this.lastDelivered = 0;
        this.recoveryJuice = 0;
        this.resetModuleHome();
      }
      if (devFallback && (ev.key === 'b' || ev.key === 'B')) {
        this.devApplyBoostAtPad('dev-keyboard');
      }
    };
    window.addEventListener('keydown', this.keyHandler);
    if (devFallback) {
      (
        window as unknown as { __factoryApplyBoost?: () => void }
      ).__factoryApplyBoost = () => this.devApplyBoostAtPad('automation');
    }
    this.cleanupFuncs.push(() => {
      if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
      this.unsubSim?.();
      this.hud?.dispose();
      this.audio.dispose();
      if (devFallback) {
        delete (window as unknown as { __factoryApplyBoost?: () => void })
          .__factoryApplyBoost;
      }
    });

    this.buildScene();
    this.sim.start();
    // eslint-disable-next-line no-console
    console.info('[factory] fun-slice ready', {
      mode: 'EMULATOR_OR_QUEST',
      table: 'DEV_FALLBACK_PLANE',
      shiftSec: this.sim.config.shiftDurationSec,
      note: 'FUN SLICE — D-007 OPEN',
      devFallback,
    });
  }

  private bindSimEvents(): () => void {
    return this.sim.on((e) => {
      if (e.type === 'shiftStart') {
        this.metrics.log('shiftStart');
        this.funMetrics.onShiftStart();
        this.audio.unlock();
        this.audio.setRhythm('healthy');
      } else if (e.type === 'firstProduct') {
        this.metrics.log('firstProduct');
        this.funMetrics.onFirstProduct();
      } else if (e.type === 'jamStart') {
        this.metrics.log('jamStart');
        this.funMetrics.onJamStart();
        this.audio.play('jamWarn');
        this.audio.setRhythm('jam');
      } else if (e.type === 'interventionStart')
        this.metrics.log('interventionStart', {
          inputSource: this.lastInterventionSource,
        });
      else if (e.type === 'interventionSuccess')
        this.metrics.log('interventionSuccess', {
          kind: e.kind,
          inputSource: this.lastInterventionSource,
        });
      else if (e.type === 'flowRecovered') {
        this.metrics.log('flowRecovered', {
          inputSource: this.lastInterventionSource,
        });
        this.funMetrics.onRecovery();
        this.recoveryJuice = 2.6;
        this.audio.play('recovery');
        this.audio.setRhythm('healthy');
      } else if (e.type === 'productDelivered') {
        this.metrics.log('productDelivered', { total: e.total });
        if (e.total > this.lastDelivered) this.audio.play('delivery');
        this.lastDelivered = e.total;
      } else if (e.type === 'spill') this.metrics.log('spill', { count: e.count });
      else if (e.type === 'shiftEnd') {
        this.metrics.log('shiftEnd', {
          grade: e.grade,
          cash: e.cash,
          delivered: e.delivered,
          jamSec: Number(e.jamSec.toFixed(2)),
        });
        this.funMetrics.onShiftEnd({
          jamSec: e.jamSec,
          delivered: e.delivered,
          cash: e.cash,
          grade: e.grade,
        });
        this.audio.setRhythm('off');
        this.audio.play('result');
      } else if (e.type === 'shiftReset') this.metrics.log('shiftReset');
    });
  }

  update(delta: number): void {
    if (!this.built) return;
    const dt = Math.min(0.05, delta);
    this.aliveT += dt;
    this.sim.step(dt);
    const snap = this.sim.snapshot();
    this.syncProducts(snap.products, snap.jamSeverity);
    this.animateStations(snap, dt);
    this.updateModuleVisual(snap.jamActive && !snap.boosted, dt);
    this.updateBeacon(snap);
    this.updateRecoveryRipple(dt);
    const hint = snap.phase === 'ended'
      ? 'SHIFT COMPLETE — press R to run again'
      : snap.boosted
        ? 'FLOW RESTORED — keep shipping'
        : snap.jamActive
          ? 'JAM! GRAB BOOST → SNAP HERE'
          : snap.pressure > 0.35
            ? 'Pressure rising — watch the slow machine'
            : 'Line healthy — watch products move';
    this.hud?.update(snap, hint);
    this.syncPromptBoard(snap);
    this.syncResultBoard(snap);
  }

  private buildScene(): void {
    const table = new Mesh(
      new BoxGeometry(...TABLE.size),
      new MeshStandardMaterial({
        color: C.table,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    table.position.set(...TABLE.position);
    table.name = 'factory-table';
    this.world.createTransformEntity(table);

    const top = new Mesh(
      new BoxGeometry(TABLE.size[0] * 0.96, 0.008, TABLE.size[2] * 0.92),
      new MeshStandardMaterial({ color: C.tableTop, roughness: 0.7 }),
    );
    top.position.set(TABLE.position[0], TABLE.position[1] + 0.022, TABLE.position[2]);
    this.world.createTransformEntity(top);

    // Belt path under the line.
    const belt = new Mesh(
      new BoxGeometry(1.12, 0.012, 0.11),
      new MeshStandardMaterial({
        color: C.belt,
        metalness: 0.4,
        roughness: 0.55,
        emissive: C.belt,
        emissiveIntensity: 0.08,
      }),
    );
    belt.position.set(0, TABLE.position[1] + 0.035, STATION_POS.source[2]);
    belt.name = 'factory-belt';
    this.world.createTransformEntity(belt);

    const order: StationId[] = ['source', 'procA', 'buffer', 'procB', 'sink'];
    for (const id of order) this.stations.push(this.buildStation(id));

    this.padMaterial = new MeshStandardMaterial({
      color: C.pad,
      emissive: C.pad,
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.4,
    });
    // Dock socket the BOOST turbo plugs into.
    this.padMesh = new Mesh(new CylinderGeometry(0.12, 0.14, 0.035, 24), this.padMaterial);
    this.padMesh.position.set(...BOOST_SLOT.position);
    this.padMesh.name = 'factory-boost-pad';
    this.world.createTransformEntity(this.padMesh);
    const socket = new Mesh(
      new CylinderGeometry(0.045, 0.05, 0.025, 16),
      new MeshStandardMaterial({
        color: C.padHot,
        emissive: C.padHot,
        emissiveIntensity: 0.2,
        metalness: 0.35,
        roughness: 0.4,
      }),
    );
    socket.position.set(
      BOOST_SLOT.position[0],
      BOOST_SLOT.position[1] + 0.02,
      BOOST_SLOT.position[2],
    );
    this.world.createTransformEntity(socket);
    const ring = new Mesh(
      new CylinderGeometry(0.16, 0.16, 0.008, 28),
      new MeshStandardMaterial({
        color: C.padHot,
        emissive: C.padHot,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.55,
      }),
    );
    ring.position.set(
      BOOST_SLOT.position[0],
      BOOST_SLOT.position[1] - 0.01,
      BOOST_SLOT.position[2],
    );
    this.world.createTransformEntity(ring);

    this.moduleMaterial = new MeshStandardMaterial({
      color: C.moduleIdle,
      emissive: C.moduleIdle,
      emissiveIntensity: 0.3,
      metalness: 0.45,
      roughness: 0.35,
    });
    const body = buildBoostModule(this.moduleMaterial);
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
      const mesh = buildProductMesh(productKindForIndex(i));
      mesh.visible = false;
      mesh.name = `factory-product-${i}`;
      this.world.createTransformEntity(mesh);
      this.productMeshes.push(mesh);
    }

    this.beacon = new Mesh(
      new CylinderGeometry(0.02, 0.035, 0.16, 10),
      new MeshStandardMaterial({
        color: C.jam,
        emissive: C.jam,
        emissiveIntensity: 0.6,
      }),
    );
    this.beacon.position.set(
      STATION_POS.procB[0],
      STATION_POS.procB[1] + 0.22,
      STATION_POS.procB[2],
    );
    this.beacon.visible = false;
    this.beacon.name = 'factory-jam-beacon';
    this.world.createTransformEntity(this.beacon);

    for (let i = 0; i < 5; i += 1) {
      const rip = new Mesh(
        new SphereGeometry(0.04, 10, 10),
        new MeshBasicMaterial({
          color: C.moduleOk,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      );
      rip.visible = false;
      this.world.createTransformEntity(rip);
      this.recoveryRipples.push(rip);
    }

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = 640;
    resultCanvas.height = 360;
    this.resultTexture = new CanvasTexture(resultCanvas);
    this.resultBoard = new Mesh(
      new PlaneGeometry(0.7, 0.4),
      new MeshBasicMaterial({
        map: this.resultTexture,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.resultBoard.position.set(0, 1.08, -0.68);
    this.resultBoard.visible = false;
    this.resultBoard.name = 'factory-result-board';
    this.world.createTransformEntity(this.resultBoard);

    const promptCanvas = document.createElement('canvas');
    promptCanvas.width = 640;
    promptCanvas.height = 256;
    this.promptTexture = new CanvasTexture(promptCanvas);
    this.promptBoard = new Mesh(
      new PlaneGeometry(0.72, 0.3),
      new MeshBasicMaterial({
        map: this.promptTexture,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.promptBoard.position.set(
      BOOST_SLOT.position[0],
      BOOST_SLOT.position[1] + 0.42,
      BOOST_SLOT.position[2] + 0.08,
    );
    this.promptBoard.visible = false;
    this.promptBoard.name = 'factory-prompt-board';
    this.world.createTransformEntity(this.promptBoard);

    this.built = true;
  }

  private buildStation(id: StationId): StationVisual {
    const built = buildStationSilhouette(id);
    built.root.name = `factory-${id}`;
    const p = STATION_POS[id];
    built.root.position.set(p[0], p[1], p[2]);
    this.world.createTransformEntity(built.root);
    return {
      id,
      root: built.root,
      body: built.body,
      material: built.material,
      spinner: built.spinner,
      light: built.light,
    };
  }

  private syncPromptBoard(snap: ReturnType<FactorySim['snapshot']>): void {
    if (!this.promptBoard || !this.promptTexture) return;
    if (snap.phase === 'ended') {
      this.promptBoard.visible = false;
      this.lastPromptKey = null;
      return;
    }
    const showJam = snap.jamActive && !snap.boosted;
    const showOk = snap.boosted && this.recoveryJuice > 0;
    const showPressure =
      !snap.boosted && !snap.jamActive && snap.pressure > 0.4;
    const showIdle = !showJam && !showOk && !showPressure;
    this.promptBoard.visible = true;
    const key = showJam
      ? 'jam'
      : showOk
        ? 'ok'
        : showPressure
          ? 'pressure'
          : 'idle';
    if (key === this.lastPromptKey) return;
    this.lastPromptKey = key;
    const canvas = this.promptTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showJam) {
      ctx.fillStyle = 'rgba(90, 18, 18, 0.94)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#ff6b5e';
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#ff6b5e';
      ctx.font = 'bold 78px Segoe UI, sans-serif';
      ctx.fillText('JAM!', 40, 95);
      ctx.fillStyle = '#fff6e8';
      ctx.font = 'bold 42px Segoe UI, sans-serif';
      ctx.fillText('1. GRAB BOOST', 40, 160);
      ctx.fillText('2. SNAP HERE', 40, 215);
    } else if (showOk) {
      ctx.fillStyle = 'rgba(12, 52, 30, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#5ed17a';
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#8fd99a';
      ctx.font = 'bold 56px Segoe UI, sans-serif';
      ctx.fillText('FLOW RESTORED', 36, 140);
      ctx.fillStyle = '#e8f5e9';
      ctx.font = '30px Segoe UI, sans-serif';
      ctx.fillText('You fixed the line', 36, 195);
    } else if (showPressure) {
      ctx.fillStyle = 'rgba(60, 36, 12, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#f08a3c';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#ffc078';
      ctx.font = 'bold 40px Segoe UI, sans-serif';
      ctx.fillText('PRESSURE BUILDING', 36, 120);
      ctx.fillStyle = '#ffe8d0';
      ctx.font = '30px Segoe UI, sans-serif';
      ctx.fillText('Watch the tall machine', 36, 175);
    } else if (showIdle) {
      ctx.fillStyle = 'rgba(18, 28, 36, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#7ec8e3';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#f4f1ea';
      ctx.font = 'bold 40px Segoe UI, sans-serif';
      ctx.fillText('LINE RUNNING', 40, 120);
      ctx.fillStyle = '#c8d0d8';
      ctx.font = '28px Segoe UI, sans-serif';
      ctx.fillText('Products flowing — stay ready', 40, 175);
    }
    this.promptTexture.needsUpdate = true;
  }

  private syncResultBoard(snap: ReturnType<FactorySim['snapshot']>): void {
    if (!this.resultBoard || !this.resultTexture) return;
    if (snap.phase !== 'ended' || !snap.grade) {
      this.resultBoard.visible = false;
      this.lastShownGrade = null;
      return;
    }
    this.resultBoard.visible = true;
    const key = `${snap.grade}:${snap.cash}:${snap.delivered}:${snap.jamSec.toFixed(1)}`;
    if (key === this.lastShownGrade) return;
    this.lastShownGrade = key;
    const canvas = this.resultTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(16, 20, 26, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f0c75e';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = '#f4f1ea';
    ctx.font = 'bold 34px Segoe UI, sans-serif';
    ctx.fillText('SHIFT COMPLETE', 40, 60);
    ctx.fillStyle = '#f0c75e';
    ctx.font = 'bold 92px Segoe UI, sans-serif';
    ctx.fillText(`GRADE ${snap.grade}`, 40, 155);
    ctx.fillStyle = '#d7dee6';
    ctx.font = '28px Segoe UI, sans-serif';
    ctx.fillText(`PROFIT  ${Math.floor(snap.cash)}`, 40, 210);
    ctx.fillText(`DELIVERIES  ${snap.delivered}`, 40, 248);
    ctx.fillText(`JAM TIME  ${snap.jamSec.toFixed(1)}s`, 40, 286);
    ctx.fillStyle = '#8fd99a';
    ctx.font = 'bold 30px Segoe UI, sans-serif';
    ctx.fillText('RUN AGAIN — reset for next shift', 40, 330);
    this.resultTexture.needsUpdate = true;
  }

  private syncProducts(states: ProductState[], jamSeverity: number): void {
    const jamMachine = STATION_POS.procB;
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
        mesh.position.set(p[0], p[1] + 0.11 + stack * 0.05, p[2]);
        mesh.rotation.y = this.aliveT * 1.2 + i * 0.7;
        mat.emissiveIntensity = 0.22;
      } else if (state.kind === 'moving') {
        const a = STATION_POS[state.from];
        const b = STATION_POS[state.to];
        const t = easeInOut(state.t);
        mesh.position.set(
          a[0] + (b[0] - a[0]) * t,
          a[1] + 0.13 + Math.sin(t * Math.PI) * 0.05,
          a[2] + (b[2] - a[2]) * t,
        );
        mesh.rotation.y = t * Math.PI * 2;
        mat.emissiveIntensity = 0.32;
      } else if (state.kind === 'spill') {
        // Physically pile around the jammed processor (procB).
        const fall = Math.min(1, state.age * 1.6);
        const ang = state.edgeX * 4.2 + i * 0.35;
        const radius = 0.12 + Math.min(0.1, state.age * 0.04);
        mesh.position.set(
          jamMachine[0] + Math.cos(ang) * radius,
          jamMachine[1] - 0.02 + fall * 0.02 + (i % 3) * 0.025,
          jamMachine[2] + Math.sin(ang) * radius + 0.04,
        );
        mesh.rotation.set(fall * 1.1, ang, fall * 0.7);
        mat.emissiveIntensity = 0.2 + jamSeverity * 0.25;
        if (jamSeverity > 0.45) {
          mat.emissive.copy(C.jam);
        }
      }
    }
  }

  private animateStations(
    snap: ReturnType<FactorySim['snapshot']>,
    dt: number,
  ): void {
    this.jamPulse += dt * (snap.jamActive ? 7 : 2.2 + snap.pressure);
    for (const s of this.stations) {
      const working =
        !snap.jamActive || s.id === 'source' || s.id === 'sink';
      const spinRate = snap.recoveryBurstLeft > 0
        ? 10
        : snap.jamActive && s.id === 'procB'
          ? 1.2
          : working
            ? 4.5
            : 2;
      if (s.spinner) {
        // Rollers / hoppers / racks — recovery spins harder; jam almost freezes procB.
        if (s.id === 'procA' || s.id === 'procB') {
          s.spinner.rotation.x += dt * spinRate;
        } else {
          s.spinner.rotation.y += dt * spinRate;
        }
      }
      if (s.id === 'procB') {
        s.material.emissive.copy(
          snap.jamActive ? C.jam : snap.pressure > 0.5 ? C.warn : C.procB,
        );
        s.material.emissiveIntensity = snap.jamActive
          ? 0.4 + 0.4 * Math.sin(this.jamPulse)
          : snap.recoveryBurstLeft > 0
            ? 0.35
            : 0.14 + snap.pressure * 0.15;
        s.root.rotation.z = snap.jamActive
          ? Math.sin(this.jamPulse * 1.6) * 0.06 * snap.jamSeverity
          : 0;
        s.root.scale.y = snap.jamActive
          ? 1 + 0.05 * Math.sin(this.jamPulse)
          : snap.recoveryBurstLeft > 0
            ? 1.04
            : 1;
      } else if (s.id === 'buffer') {
        s.material.emissiveIntensity =
          0.12 + snap.bufferFill * 0.12 + (snap.jamActive ? 0.15 : 0);
      } else if (s.id === 'sink' && s.light) {
        const lm = s.light.material as MeshStandardMaterial;
        lm.emissiveIntensity =
          0.35 + (snap.recoveryBurstLeft > 0 ? 0.4 : 0) + Math.sin(this.aliveT * 6) * 0.1;
      } else {
        s.material.emissiveIntensity =
          0.12 + (snap.recoveryBurstLeft > 0 ? 0.2 : 0);
      }
    }
  }

  private updateBeacon(snap: ReturnType<FactorySim['snapshot']>): void {
    if (!this.beacon) return;
    const on = snap.jamActive && !snap.boosted;
    this.beacon.visible = on;
    if (!on) return;
    const mat = this.beacon.material as MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(this.jamPulse * 2);
    this.beacon.position.y =
      STATION_POS.procB[1] + 0.22 + 0.03 * Math.sin(this.jamPulse * 2);
  }

  private updateRecoveryRipple(dt: number): void {
    if (this.recoveryJuice > 0) this.recoveryJuice = Math.max(0, this.recoveryJuice - dt);
    const active = this.recoveryJuice > 0;
    const order: StationId[] = ['source', 'procA', 'buffer', 'procB', 'sink'];
    for (let i = 0; i < this.recoveryRipples.length; i += 1) {
      const rip = this.recoveryRipples[i]!;
      if (!active) {
        rip.visible = false;
        continue;
      }
      const t = 1 - this.recoveryJuice / 2.6;
      const wave = Math.max(0, Math.min(1, t * 5 - i));
      rip.visible = wave > 0 && wave < 1;
      const id = order[i]!;
      const p = STATION_POS[id];
      rip.position.set(p[0], p[1] + 0.18 + wave * 0.08, p[2]);
      const s = 0.6 + wave * 1.4;
      rip.scale.setScalar(s);
      const mat = rip.material as MeshBasicMaterial;
      mat.opacity = (1 - wave) * 0.55;
    }
  }

  private updateModuleVisual(jamNeedsAction: boolean, dt: number): void {
    if (
      !this.moduleMaterial ||
      !this.padMaterial ||
      !this.moduleObject ||
      !this.padMesh
    )
      return;
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const grabbed = this.queries.moduleGrabbed.entities.size > 0;
    const hovered = this.queries.moduleHovered.entities.size > 0;

    if (this.snapSettleT > 0 && this.snapFrom && !grabbed) {
      this.snapSettleT = Math.max(0, this.snapSettleT - dt);
      const u = 1 - this.snapSettleT / 0.22;
      const e = easeOutBack(Math.min(1, u));
      const target: [number, number, number] = [
        BOOST_SLOT.position[0],
        BOOST_SLOT.position[1] + MODULE_SIZE[1] / 2,
        BOOST_SLOT.position[2],
      ];
      this.moduleObject.position.set(
        this.snapFrom[0] + (target[0] - this.snapFrom[0]) * e,
        this.snapFrom[1] + (target[1] - this.snapFrom[1]) * e,
        this.snapFrom[2] + (target[2] - this.snapFrom[2]) * e,
      );
      this.moduleObject.rotation.y = (1 - e) * 0.4;
    }

    let color = C.moduleIdle;
    if (now < this.rejectUntil) color = C.jam;
    else if (grabbed) color = C.moduleGrab;
    else if (hovered) color = C.moduleHover;
    else if (this.occupiedSlot) color = C.moduleOk;
    else if (jamNeedsAction) color = C.moduleGrab;
    this.moduleMaterial.color.copy(color);
    this.moduleMaterial.emissive.copy(color);
    this.moduleMaterial.emissiveIntensity =
      jamNeedsAction && !grabbed
        ? 0.6 + 0.35 * Math.sin(this.jamPulse)
        : grabbed
          ? 0.5
          : hovered
            ? 0.4
            : 0.28;

    const homeY = BOOST_SLOT.position[1] + MODULE_SIZE[1] / 2;
    if (jamNeedsAction && !grabbed && !this.occupiedSlot && this.snapSettleT <= 0) {
      this.moduleObject.position.y =
        homeY + 0.035 * (0.5 + 0.5 * Math.sin(this.jamPulse * 1.5));
      this.moduleObject.scale.setScalar(1.1 + 0.05 * Math.sin(this.jamPulse * 1.5));
    } else if (!grabbed && this.snapSettleT <= 0) {
      this.moduleObject.scale.setScalar(hovered ? 1.06 : 1);
      if (!this.occupiedSlot) this.moduleObject.position.y = homeY;
    } else if (grabbed) {
      this.moduleObject.scale.setScalar(1.12);
    }

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
    const padAttract = jamNeedsAction || hot;
    this.padMaterial.color.copy(hot || padAttract ? C.padHot : C.pad);
    this.padMaterial.emissive.copy(hot || padAttract ? C.padHot : C.pad);
    this.padMaterial.emissiveIntensity = hot
      ? 0.85
      : padAttract
        ? 0.4 + 0.3 * Math.sin(this.jamPulse)
        : 0.22;
    const padScale = hot ? 1.25 : padAttract ? 1.18 + 0.06 * Math.sin(this.jamPulse) : 1;
    this.padMesh.scale.set(padScale, 1, padScale);
  }

  private onGrabStart(): void {
    this.activeGrabSource = 'xr';
    this.metrics.log('grabAttempt', { inputSource: 'xr' });
    this.metrics.log('grabSuccess', { inputSource: 'xr' });
    this.funMetrics.onGrab();
    this.audio.unlock();
    this.audio.play('grab');
    this.wasGrabbed = true;
    this.occupiedSlot = null;
    this.snapSettleT = 0;
    this.snapFrom = null;
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
      this.snapFrom = [pos.x, pos.y, pos.z];
      this.snapSettleT = 0.22;
      this.occupiedSlot = decision.targetId;
      this.lastInterventionSource = inputSource;
      this.metrics.log('snapSuccess', {
        targetId: decision.targetId,
        inputSource,
      });
      this.funMetrics.onSnap();
      this.audio.play('snap');
      const result = this.sim.tryApplyBoost();
      if (!result.ok) {
        this.rejectUntil = now + 450;
        this.metrics.log('snapRejected', {
          reason: result.reason,
          inputSource,
        });
        this.audio.play('reject');
        this.resetModuleHome();
        this.occupiedSlot = null;
        this.lastInterventionSource = null;
        this.snapSettleT = 0;
        this.snapFrom = null;
      }
    } else {
      this.rejectUntil = now + 450;
      this.metrics.log('snapRejected', {
        reason: decision.reason,
        inputSource,
      });
      this.audio.play('reject');
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
    this.moduleObject.rotation.set(0, 0, 0);
    this.moduleObject.scale.setScalar(1);
  }

  private devApplyBoostAtPad(inputSource: 'dev-keyboard' | 'automation'): void {
    if (!this.moduleObject) return;
    if (!isDevFallbackEnabled()) return;
    this.lastInterventionSource = inputSource;
    this.metrics.log('grabAttempt', { inputSource, path: 'DEV_ONLY' });
    this.metrics.log('grabSuccess', { inputSource, path: 'DEV_ONLY' });
    this.funMetrics.onGrab();
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
    this.funMetrics.onSnap();
    this.audio.play('snap');
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

function easeOutBack(t: number): number {
  const c = 1.70158;
  const x = t - 1;
  return 1 + c * x * x * x + x * x;
}

/** Evidence-only shorter arc (`?capture=1`). Quest/public default stays ~150s. */
function readCaptureTuning(): Partial<import('./sim.js').SimConfig> {
  if (typeof window === 'undefined') return {};
  try {
    if (new URLSearchParams(window.location.search).get('capture') !== '1') {
      return {};
    }
  } catch {
    return {};
  }
  return {
    shiftDurationSec: 55,
    pressureRampStartSec: 3,
    pressureRampDurationSec: 8,
    sourcePeriodSec: 0.65,
    sourcePeriodStressedSec: 0.36,
    procBPeriodSec: 1.35,
    procBPeriodStressedSec: 2.7,
    jamBufferThreshold: 2,
    bufferCapacity: 2,
  };
}
