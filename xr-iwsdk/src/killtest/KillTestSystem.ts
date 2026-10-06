/**
 * Interaction-first kill-test scene (G-P1 / A-004).
 *
 * Scenario: one fallback table, one large module, three snap pads, ten tokens.
 * No factory simulation / economy / overflow.
 */

import {
  createSystem,
  Grabbed,
  Hovered,
  OneHandGrabbable,
  RayInteractable,
  Types,
} from '@iwsdk/core';
import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import {
  DEFAULT_KILLTEST_CONFIG,
  FALLBACK_TABLE,
  SNAP_SLOTS,
  type KillTestConfig,
} from './config.js';
import { IntentHistoryBuffer, TrackingLossMachine } from './intent.js';
import { KillTestMetrics } from './metrics.js';
import { selectSnapTarget, type SnapTarget, type Vec3 } from './snap.js';

type ModuleVisual = {
  entityObject: Object3D;
  body: Mesh;
  material: MeshStandardMaterial;
};

type SnapPadVisual = {
  id: string;
  mesh: Mesh;
  material: MeshStandardMaterial;
  position: Vec3;
};

const COLOR_IDLE = new Color(0x4a6fa5);
const COLOR_HOVER = new Color(0x7ec8e3);
const COLOR_GRABBED = new Color(0xf0c75e);
const COLOR_SNAP_OK = new Color(0x5cb85c);
const COLOR_SNAP_BAD = new Color(0xd9534f);
const COLOR_PAD = new Color(0x2f3e46);
const COLOR_PAD_ACTIVE = new Color(0x88c999);
const COLOR_TOKEN = new Color(0xe8a838);

export class KillTestSystem extends createSystem(
  {
    moduleGrabbed: { required: [Grabbed] },
    moduleHovered: { required: [Hovered] },
  },
  {
    intentHistoryWindowMs: {
      type: Types.Float32,
      default: DEFAULT_KILLTEST_CONFIG.intentHistoryWindowMs,
    },
    trackingLossGraceMs: {
      type: Types.Float32,
      default: DEFAULT_KILLTEST_CONFIG.trackingLossGraceMs,
    },
    snapRadius: {
      type: Types.Float32,
      default: DEFAULT_KILLTEST_CONFIG.snapRadius,
    },
  },
) {
  readonly metrics = new KillTestMetrics();
  private tunables: KillTestConfig = { ...DEFAULT_KILLTEST_CONFIG };
  private intent = new IntentHistoryBuffer(
    DEFAULT_KILLTEST_CONFIG.intentHistoryWindowMs,
  );
  private tracking = new TrackingLossMachine(
    DEFAULT_KILLTEST_CONFIG.trackingLossGraceMs,
  );
  private module: ModuleVisual | null = null;
  private pads: SnapPadVisual[] = [];
  private tokens: Mesh[] = [];
  private occupiedSlot: string | null = 'slot-center';
  private grabStartedAt: number | null = null;
  private wasGrabbed = false;
  private rejectFlashUntil = 0;
  private built = false;

  init(): void {
    this.cleanupFuncs.push(
      this.config.intentHistoryWindowMs.subscribe((v) => {
        this.tunables.intentHistoryWindowMs = v;
        this.intent.setWindowMs(v);
      }),
      this.config.trackingLossGraceMs.subscribe((v) => {
        this.tunables.trackingLossGraceMs = v;
        this.tracking.setGraceMs(v);
      }),
      this.config.snapRadius.subscribe((v) => {
        this.tunables.snapRadius = v;
      }),
    );

    this.queries.moduleGrabbed.subscribe('qualify', () => {
      this.onGrabStart();
    });
    this.queries.moduleGrabbed.subscribe('disqualify', () => {
      this.onGrabEnd();
    });

    this.buildScene();
    // eslint-disable-next-line no-console
    console.info('[killtest] scene ready', {
      mode: 'EMULATOR_OR_QUEST',
      table: 'DEV_FALLBACK_PLANE',
      tunables: this.tunables,
      note: 'Values labeled TUNABLE — not design truth',
    });
  }

  update(delta: number, _time: number): void {
    if (!this.built || !this.module) return;

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const grabbed = this.queries.moduleGrabbed.entities.size > 0;
    const hovered = this.queries.moduleHovered.entities.size > 0;

    this.intent.push(now, grabbed);
    this.updateTracking(now);
    this.updateModuleColor(grabbed, hovered, now);
    this.updatePadColors(grabbed);
    this.updateTokens(delta);
  }

  private buildScene(): void {
    const tableMat = new MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });
    const table = new Mesh(
      new BoxGeometry(...FALLBACK_TABLE.size),
      tableMat,
    );
    table.position.set(...FALLBACK_TABLE.position);
    table.name = 'killtest-fallback-table';
    this.world.createTransformEntity(table);

    for (const slot of SNAP_SLOTS) {
      const material = new MeshStandardMaterial({
        color: COLOR_PAD,
        emissive: COLOR_PAD,
        emissiveIntensity: 0.15,
      });
      const mesh = new Mesh(new BoxGeometry(0.22, 0.02, 0.22), material);
      mesh.position.set(...slot.position);
      mesh.name = `killtest-snap-${slot.id}`;
      this.world.createTransformEntity(mesh);
      this.pads.push({
        id: slot.id,
        mesh,
        material,
        position: slot.position,
      });
    }

    const [mx, my, mz] = this.tunables.moduleSize;
    const material = new MeshStandardMaterial({
      color: COLOR_IDLE,
      emissive: COLOR_IDLE,
      emissiveIntensity: 0.2,
      metalness: 0.2,
      roughness: 0.45,
    });
    const body = new Mesh(new BoxGeometry(mx, my, mz), material);
    const start = SNAP_SLOTS.find((s) => s.id === 'slot-center')!.position;
    body.position.set(start[0], start[1] + my / 2, start[2]);
    body.name = 'killtest-module';

    const entity = this.world
      .createTransformEntity(body)
      .addComponent(RayInteractable)
      .addComponent(OneHandGrabbable, {
        translate: true,
        rotate: true,
      });

    this.module = {
      entityObject: entity.object3D!,
      body,
      material,
    };

    for (let i = 0; i < this.tunables.tokenCount; i += 1) {
      const token = new Mesh(
        new SphereGeometry(0.03, 12, 12),
        new MeshStandardMaterial({ color: COLOR_TOKEN }),
      );
      token.name = `killtest-token-${i}`;
      token.userData.phase = (i / this.tunables.tokenCount) * Math.PI * 2;
      this.world.createTransformEntity(token);
      this.tokens.push(token);
    }

    this.built = true;
  }

  private onGrabStart(): void {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.metrics.log('grabAttempt');
    this.metrics.log('grabSuccess');
    this.grabStartedAt = now;
    this.wasGrabbed = true;
    if (this.occupiedSlot) {
      this.occupiedSlot = null;
    }
  }

  private onGrabEnd(): void {
    if (!this.module || !this.wasGrabbed) return;
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.metrics.log('release');

    if (this.grabStartedAt != null) {
      this.metrics.log('interactionDuration', {
        ms: Math.round(now - this.grabStartedAt),
      });
      this.grabStartedAt = null;
    }

    const pos = this.module.entityObject.position;
    const modulePos: Vec3 = [pos.x, pos.y, pos.z];
    const targets = this.currentSnapTargets();
    const decision = selectSnapTarget(
      modulePos,
      targets,
      this.tunables.snapRadius,
    );

    if (decision.kind === 'snap') {
      const [, my] = this.tunables.moduleSize;
      this.module.entityObject.position.set(
        decision.position[0],
        decision.position[1] + my / 2,
        decision.position[2],
      );
      this.occupiedSlot = decision.targetId;
      this.metrics.log('snapSuccess', {
        targetId: decision.targetId,
        distance: Number(decision.distance.toFixed(3)),
      });
    } else {
      this.rejectFlashUntil = now + 450;
      this.metrics.log('snapRejected', {
        reason: decision.reason,
        nearestId: decision.nearestId,
        distance: decision.distance,
      });
      // Recover to nearest free slot if any; else stay put with invalid flash.
      const free = targets.find((t) => !t.occupied);
      if (free) {
        const [, my] = this.tunables.moduleSize;
        this.module.entityObject.position.set(
          free.position[0],
          free.position[1] + my / 2,
          free.position[2],
        );
        this.occupiedSlot = free.id;
      }
    }

    this.wasGrabbed = false;
  }

  private currentSnapTargets(): SnapTarget[] {
    return this.pads.map((pad) => ({
      id: pad.id,
      position: pad.position,
      occupied: this.occupiedSlot === pad.id,
    }));
  }

  private updateModuleColor(grabbed: boolean, hovered: boolean, now: number): void {
    if (!this.module) return;
    let color = COLOR_IDLE;
    if (now < this.rejectFlashUntil) color = COLOR_SNAP_BAD;
    else if (grabbed) color = COLOR_GRABBED;
    else if (hovered) color = COLOR_HOVER;
    else if (this.occupiedSlot) color = COLOR_SNAP_OK;
    this.module.material.color.copy(color);
    this.module.material.emissive.copy(color);
  }

  private updatePadColors(grabbed: boolean): void {
    if (!this.module) return;
    const pos = this.module.entityObject.position;
    const modulePos: Vec3 = [pos.x, pos.y, pos.z];
    const decision = selectSnapTarget(
      modulePos,
      this.currentSnapTargets().map((t) => ({ ...t, occupied: false })),
      this.tunables.snapRadius,
    );

    for (const pad of this.pads) {
      const active =
        grabbed &&
        decision.kind === 'snap' &&
        decision.targetId === pad.id;
      pad.material.color.copy(active ? COLOR_PAD_ACTIVE : COLOR_PAD);
      pad.material.emissive.copy(active ? COLOR_PAD_ACTIVE : COLOR_PAD);
      pad.material.emissiveIntensity = active ? 0.45 : 0.15;
    }
  }

  private updateTokens(delta: number): void {
    // Deterministic oval path above the table — runtime/render load only.
    const [tx, ty, tz] = FALLBACK_TABLE.position;
    for (const token of this.tokens) {
      const phase = (token.userData.phase as number) + delta * 0.7;
      token.userData.phase = phase;
      token.position.set(
        tx + Math.cos(phase) * 0.38,
        ty + 0.12,
        tz + Math.sin(phase) * 0.22 - 0.05,
      );
    }
  }

  private updateTracking(now: number): void {
    // Approximate hand/session tracking for kill-test instrumentation.
    // Real Quest validation happens later; emulator evidence is labeled EMULATOR.
    const xr = this.input?.xr as
      | {
          gamepads?: { left?: unknown; right?: unknown };
          hands?: { left?: unknown; right?: unknown };
        }
      | undefined;
    const pads = xr?.gamepads;
    const hands = xr?.hands;
    const hasHandOrGamepad = Boolean(
      pads?.left || pads?.right || hands?.left || hands?.right,
    );
    // Outside an XR session, treat as tracked so non-immersive boot stays quiet.
    const sessionLikely = Boolean(pads || hands);
    const isTracked = !sessionLikely || hasHandOrGamepad;

    const { lost, recovered } = this.tracking.update(now, isTracked);
    if (lost) this.metrics.log('trackingLost', { state: this.tracking.getState() });
    if (recovered) {
      this.metrics.log('trackingRecovered', { state: this.tracking.getState() });
    }
  }
}
