/**
 * Lightweight factory audio language — Web Audio oscillators only.
 * No external samples → no copyright risk for state cues.
 */

export type FactorySfx =
  | 'delivery'
  | 'jamWarn'
  | 'grab'
  | 'snap'
  | 'recovery'
  | 'result'
  | 'reject';

export class FactoryAudio {
  private ctx: AudioContext | null = null;
  private rhythmTimer: number | null = null;
  private rhythmMode: 'healthy' | 'jam' | 'off' = 'off';
  private muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.muted) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call once from a user/XR gesture if needed. */
  unlock(): void {
    this.ensure();
  }

  setRhythm(mode: 'healthy' | 'jam' | 'off'): void {
    if (mode === this.rhythmMode) return;
    this.rhythmMode = mode;
    if (this.rhythmTimer != null) {
      window.clearInterval(this.rhythmTimer);
      this.rhythmTimer = null;
    }
    if (mode === 'off') return;
    const period = mode === 'jam' ? 420 : 280;
    this.rhythmTimer = window.setInterval(() => {
      this.tickRhythm(mode);
    }, period);
  }

  private tickRhythm(mode: 'healthy' | 'jam'): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mode === 'jam' ? 'sawtooth' : 'triangle';
    osc.frequency.value = mode === 'jam' ? 88 : 120;
    gain.gain.setValueAtTime(mode === 'jam' ? 0.03 : 0.018, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  play(sfx: FactorySfx): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    switch (sfx) {
      case 'delivery':
        this.blip(ctx, t0, 520, 0.06, 'sine', 0.04);
        break;
      case 'jamWarn':
        this.blip(ctx, t0, 180, 0.18, 'square', 0.05);
        this.blip(ctx, t0 + 0.1, 140, 0.2, 'square', 0.04);
        break;
      case 'grab':
        this.blip(ctx, t0, 240, 0.05, 'triangle', 0.05);
        break;
      case 'snap':
        this.blip(ctx, t0, 360, 0.04, 'triangle', 0.06);
        this.blip(ctx, t0 + 0.04, 540, 0.08, 'sine', 0.05);
        break;
      case 'recovery':
        this.blip(ctx, t0, 300, 0.08, 'sine', 0.05);
        this.blip(ctx, t0 + 0.1, 420, 0.1, 'sine', 0.05);
        this.blip(ctx, t0 + 0.22, 560, 0.14, 'triangle', 0.04);
        break;
      case 'result':
        this.blip(ctx, t0, 440, 0.12, 'sine', 0.05);
        this.blip(ctx, t0 + 0.14, 660, 0.18, 'sine', 0.04);
        break;
      case 'reject':
        this.blip(ctx, t0, 110, 0.12, 'sawtooth', 0.04);
        break;
      default:
        break;
    }
  }

  private blip(
    ctx: AudioContext,
    t0: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  dispose(): void {
    this.setRhythm('off');
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
