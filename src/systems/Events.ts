import {
  EVENTS,
  MACHINE_COUNT,
  type MachineId,
} from '../config/balance';

export interface ActiveBoost {
  kind: 'productionBoost' | 'overdrive';
  remainingMs: number;
  machineId?: MachineId;
}

export interface EventsSnapshot {
  boostCooldownMs: number;
  overdriveCooldownMs: number;
  active: ActiveBoost | null;
  /** When true, timed multipliers do not start (onboarding lock). */
  suppressed?: boolean;
}

export interface EventHooks {
  onBoostStart?: (boost: ActiveBoost) => void;
  onBoostEnd?: (kind: ActiveBoost['kind']) => void;
  onGoldenSpawn?: () => void;
  onSuppressedAttempt?: (kind: 'productionBoost' | 'overdrive' | 'golden') => void;
}

/**
 * Simple timed/chance events. Pure logic — no Phaser.
 * Toggle via EVENTS.enabled / per-event flags in balance.ts.
 * `suppressed` blocks global multipliers during first-session goal.
 */
export class Events {
  active: ActiveBoost | null = null;
  hooks: EventHooks = {};
  /** When true: no boost/overdrive/golden. Cooldowns freeze. */
  suppressed = false;

  private boostCooldownMs: number;
  private overdriveCooldownMs: number;

  constructor(snapshot?: Partial<EventsSnapshot>) {
    this.boostCooldownMs =
      snapshot?.boostCooldownMs ?? EVENTS.productionBoost.firstDelayMs;
    this.overdriveCooldownMs =
      snapshot?.overdriveCooldownMs ?? EVENTS.overdrive.firstDelayMs;
    this.active = snapshot?.active ?? null;
    this.suppressed = snapshot?.suppressed ?? false;
  }

  /** Freeze timed events; clear any active multiplier. */
  suppress(): void {
    this.suppressed = true;
    if (this.active) {
      const kind = this.active.kind;
      this.active = null;
      this.hooks.onBoostEnd?.(kind);
    }
  }

  /**
   * Re-enable events. Resets cooldowns to firstDelay so a boost
   * does not fire immediately after onboarding.
   */
  resume(): void {
    this.suppressed = false;
    this.boostCooldownMs = EVENTS.productionBoost.firstDelayMs;
    this.overdriveCooldownMs = EVENTS.overdrive.firstDelayMs;
  }

  update(dtMs: number): void {
    if (!EVENTS.enabled) return;

    if (this.suppressed) {
      // Expire active if somehow present, but do not start new ones
      if (this.active) {
        this.active.remainingMs -= dtMs;
        if (this.active.remainingMs <= 0) {
          const kind = this.active.kind;
          this.active = null;
          this.hooks.onBoostEnd?.(kind);
        }
      }
      return;
    }

    if (this.active) {
      this.active.remainingMs -= dtMs;
      if (this.active.remainingMs <= 0) {
        const kind = this.active.kind;
        this.active = null;
        this.hooks.onBoostEnd?.(kind);
      }
    }

    if (!this.active) {
      if (EVENTS.productionBoost.enabled) this.boostCooldownMs -= dtMs;
      if (EVENTS.overdrive.enabled) this.overdriveCooldownMs -= dtMs;

      const boostReady =
        EVENTS.productionBoost.enabled && this.boostCooldownMs <= 0;
      const overReady = EVENTS.overdrive.enabled && this.overdriveCooldownMs <= 0;

      if (boostReady && overReady) {
        if (this.boostCooldownMs <= this.overdriveCooldownMs) {
          this.startProductionBoost();
        } else {
          this.startOverdrive();
        }
      } else if (boostReady) {
        this.startProductionBoost();
      } else if (overReady) {
        this.startOverdrive();
      }
    }
  }

  rollGolden(): boolean {
    if (!EVENTS.enabled || !EVENTS.golden.enabled) return false;
    if (this.suppressed) {
      this.hooks.onSuppressedAttempt?.('golden');
      return false;
    }
    const hit = Math.random() < EVENTS.golden.chance;
    if (hit) this.hooks.onGoldenSpawn?.();
    return hit;
  }

  get productionMult(): number {
    if (this.suppressed) return 1;
    if (this.active?.kind === 'productionBoost') return EVENTS.productionBoost.mult;
    return 1;
  }

  machineSpeedMult(machineId: MachineId): number {
    if (this.suppressed) return 1;
    if (
      this.active?.kind === 'overdrive' &&
      this.active.machineId === machineId
    ) {
      return EVENTS.overdrive.speedMult;
    }
    return 1;
  }

  trigger(kind: 'productionBoost' | 'overdrive', machineId?: MachineId): boolean {
    if (!EVENTS.enabled || this.active) return false;
    if (this.suppressed) {
      this.hooks.onSuppressedAttempt?.(kind);
      return false;
    }
    if (kind === 'productionBoost') {
      this.startProductionBoost();
      return true;
    }
    this.startOverdrive(machineId);
    return true;
  }

  load(snapshot: EventsSnapshot | undefined): void {
    if (!snapshot) return;
    this.boostCooldownMs = snapshot.boostCooldownMs;
    this.overdriveCooldownMs = snapshot.overdriveCooldownMs;
    this.active = snapshot.active;
    this.suppressed = snapshot.suppressed ?? false;
  }

  private startProductionBoost(): void {
    if (this.suppressed) {
      this.hooks.onSuppressedAttempt?.('productionBoost');
      this.boostCooldownMs = EVENTS.productionBoost.cooldownMs;
      return;
    }
    this.active = {
      kind: 'productionBoost',
      remainingMs: EVENTS.productionBoost.durationMs,
    };
    this.boostCooldownMs = EVENTS.productionBoost.cooldownMs;
    this.hooks.onBoostStart?.(this.active);
  }

  private startOverdrive(forced?: MachineId): void {
    if (this.suppressed) {
      this.hooks.onSuppressedAttempt?.('overdrive');
      this.overdriveCooldownMs = EVENTS.overdrive.cooldownMs;
      return;
    }
    const machineId =
      forced ?? ((Math.floor(Math.random() * MACHINE_COUNT) as MachineId));
    this.active = {
      kind: 'overdrive',
      remainingMs: EVENTS.overdrive.durationMs,
      machineId,
    };
    this.overdriveCooldownMs = EVENTS.overdrive.cooldownMs;
    this.hooks.onBoostStart?.(this.active);
  }

  snapshot(): EventsSnapshot {
    return {
      boostCooldownMs: this.boostCooldownMs,
      overdriveCooldownMs: this.overdriveCooldownMs,
      active: this.active
        ? {
            kind: this.active.kind,
            remainingMs: this.active.remainingMs,
            machineId: this.active.machineId,
          }
        : null,
      suppressed: this.suppressed,
    };
  }
}
