/**
 * Internal development timings for the fun-slice (not judging claims).
 */

export type FunTimingKey =
  | 'timeToFirstUsefulAction'
  | 'timeToJamRecognition'
  | 'timeFromJamToGrab'
  | 'timeFromGrabToSnap'
  | 'timeFromSnapToRecovery'
  | 'jamDuration'
  | 'productsDelivered'
  | 'shiftScore'
  | 'grade'
  | 'restartSelected';

export type FunTimings = Partial<Record<FunTimingKey, number | string | boolean>>;

export class FunMetrics {
  private shiftStartMs: number | null = null;
  private jamStartMs: number | null = null;
  private grabMs: number | null = null;
  private snapMs: number | null = null;
  private recoveryMs: number | null = null;
  readonly timings: FunTimings = {};

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  onShiftStart(): void {
    this.shiftStartMs = this.now();
    this.jamStartMs = null;
    this.grabMs = null;
    this.snapMs = null;
    this.recoveryMs = null;
    for (const k of Object.keys(this.timings)) delete this.timings[k as FunTimingKey];
  }

  onFirstProduct(): void {
    if (this.shiftStartMs == null) return;
    if (this.timings.timeToFirstUsefulAction != null) return;
    this.timings.timeToFirstUsefulAction = (this.now() - this.shiftStartMs) / 1000;
  }

  onJamStart(): void {
    this.jamStartMs = this.now();
    if (this.shiftStartMs != null) {
      this.timings.timeToJamRecognition = (this.jamStartMs - this.shiftStartMs) / 1000;
    }
  }

  onGrab(): void {
    this.grabMs = this.now();
    if (this.jamStartMs != null && this.timings.timeFromJamToGrab == null) {
      this.timings.timeFromJamToGrab = (this.grabMs - this.jamStartMs) / 1000;
    }
  }

  onSnap(): void {
    this.snapMs = this.now();
    if (this.grabMs != null && this.timings.timeFromGrabToSnap == null) {
      this.timings.timeFromGrabToSnap = (this.snapMs - this.grabMs) / 1000;
    }
  }

  onRecovery(): void {
    this.recoveryMs = this.now();
    if (this.snapMs != null && this.timings.timeFromSnapToRecovery == null) {
      this.timings.timeFromSnapToRecovery = (this.recoveryMs - this.snapMs) / 1000;
    }
  }

  onShiftEnd(input: {
    jamSec: number;
    delivered: number;
    cash: number;
    grade: string;
  }): void {
    this.timings.jamDuration = input.jamSec;
    this.timings.productsDelivered = input.delivered;
    this.timings.shiftScore = input.cash;
    this.timings.grade = input.grade;
    // eslint-disable-next-line no-console
    console.info('[factory] funTimings', { ...this.timings });
  }

  onRestart(): void {
    this.timings.restartSelected = true;
  }
}
