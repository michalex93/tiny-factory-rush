/**
 * Lightweight Web Audio SFX — no asset files required.
 * Generates short oscillator beeps for click / machine / sell / upgrade / unlock.
 */
export type SfxId = 'click' | 'machine' | 'sell' | 'upgrade' | 'unlock' | 'event';

interface Tone {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const TONES: Record<SfxId, Tone[]> = {
  click: [{ freq: 520, duration: 0.04, type: 'square', gain: 0.08 }],
  machine: [{ freq: 180, duration: 0.06, type: 'triangle', gain: 0.06 }],
  sell: [
    { freq: 660, duration: 0.07, type: 'sine', gain: 0.09 },
    { freq: 880, duration: 0.08, type: 'sine', gain: 0.07 },
  ],
  upgrade: [
    { freq: 440, duration: 0.08, type: 'square', gain: 0.08 },
    { freq: 660, duration: 0.1, type: 'square', gain: 0.07 },
  ],
  unlock: [
    { freq: 523, duration: 0.1, type: 'sine', gain: 0.1 },
    { freq: 659, duration: 0.1, type: 'sine', gain: 0.1 },
    { freq: 784, duration: 0.14, type: 'sine', gain: 0.1 },
  ],
  event: [
    { freq: 392, duration: 0.1, type: 'triangle', gain: 0.1 },
    { freq: 587, duration: 0.12, type: 'triangle', gain: 0.09 },
  ],
};

export class AudioSystem {
  muted = false;
  private ctx: AudioContext | null = null;
  private unlocked = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Call from first user gesture so browsers allow audio. */
  unlock(): void {
    if (this.unlocked) return;
    this.ensureCtx();
    void this.ctx?.resume();
    this.unlocked = true;
  }

  play(id: SfxId): void {
    if (this.muted) return;
    this.ensureCtx();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const tones = TONES[id];
    let t = ctx.currentTime;
    for (const tone of tones) {
      this.beep(ctx, t, tone);
      t += tone.duration * 0.85;
    }
  }

  private ensureCtx(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
  }

  private beep(ctx: AudioContext, when: number, tone: Tone): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(tone.gain, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + tone.duration + 0.02);
  }
}
