/**
 * Procedural Web Audio — SFX + a light generative background track.
 * No audio files: keeps the download tiny while giving every action a
 * distinct, pleasant sound (CrazyGames quality: consistent levels, music
 * that complements the visuals).
 */
export type SfxId =
  | 'click'
  | 'machine'
  | 'sell'
  | 'upgrade'
  | 'unlock'
  | 'event'
  | 'golden'
  | 'goal'
  | 'deny'
  | 'pop';

const MUSIC_PREF_KEY = 'tfr-music';

function readMusicPref(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeMusicPref(on: boolean): void {
  try {
    window.localStorage.setItem(MUSIC_PREF_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export class AudioSystem {
  muted = false;
  musicOn = typeof window !== 'undefined' ? readMusicPref() : true;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  private lastPlay: Partial<Record<SfxId, number>> = {};
  private music: MusicLoop | null = null;

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGains();
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    writeMusicPref(on);
    this.applyGains();
    if (on) this.startMusic();
  }

  /** Call from a user gesture so browsers allow audio (also resumes on iOS). */
  unlock(): void {
    this.ensureCtx();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.unlocked) {
      this.unlocked = true;
      this.startMusic();
    }
  }

  /** Pause/resume everything (tab hidden, ads). */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.unlocked && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(id: SfxId, variant = 0): void {
    if (this.muted) return;
    this.ensureCtx();
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    if (ctx.state === 'suspended') void ctx.resume();

    // Anti-spam: very frequent sounds are rate-limited
    const now = ctx.currentTime;
    const minGap: Partial<Record<SfxId, number>> = { machine: 0.07, sell: 0.045, click: 0.03 };
    const gap = minGap[id] ?? 0;
    if (gap && now - (this.lastPlay[id] ?? -1) < gap) return;
    this.lastPlay[id] = now;

    const t = now + 0.005;
    const jitter = 1 + (Math.random() - 0.5) * 0.06;
    switch (id) {
      case 'click':
        this.tone(t, 'sine', 620 * jitter, 260, 0.07, 0.22);
        this.hiss(t, 0.02, 0.06, 4000);
        break;
      case 'machine': {
        const base = [150, 120, 180][variant % 3]!;
        this.tone(t, 'triangle', base * jitter, base * 0.55, 0.08, 0.14);
        this.hiss(t, 0.03, 0.03, 1800);
        break;
      }
      case 'sell':
        this.tone(t, 'sine', 1318 * jitter, 1318 * jitter, 0.16, 0.13);
        this.tone(t + 0.045, 'sine', 1976 * jitter, 1976 * jitter, 0.22, 0.1);
        break;
      case 'golden':
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.05, 'triangle', f, f, 0.25, 0.12));
        this.hiss(t, 0.25, 0.04, 7000);
        break;
      case 'upgrade':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.045, 'square', f, f * 1.01, 0.09, 0.07));
        this.sweep(t, 0.22);
        break;
      case 'unlock':
        [523, 659, 784].forEach((f) => this.tone(t, 'triangle', f, f, 0.5, 0.1));
        [1046, 1318, 1568].forEach((f, i) => this.tone(t + 0.18 + i * 0.07, 'sine', f, f, 0.4, 0.09));
        this.sweep(t, 0.35);
        break;
      case 'goal':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.08, 'triangle', f, f, 0.3, 0.11));
        break;
      case 'event':
        [392, 587, 784].forEach((f, i) => this.tone(t + i * 0.07, 'triangle', f, f, 0.2, 0.11));
        break;
      case 'deny':
        this.tone(t, 'square', 220, 160, 0.12, 0.06);
        break;
      case 'pop':
        this.tone(t, 'sine', 400, 900, 0.08, 0.12);
        break;
    }
  }

  // ── internals ────────────────────────────────────────────────

  private ensureCtx(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfxBus.gain.value = 0.9;
    // white-noise buffer for hiss / shakers
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.applyGains();
  }

  private applyGains(): void {
    if (!this.ctx || !this.master || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.55 : 0, t, 0.15);
  }

  private startMusic(): void {
    if (!this.unlocked || !this.musicOn) return;
    this.ensureCtx();
    if (!this.ctx || !this.musicBus || !this.noise) return;
    if (!this.music) this.music = new MusicLoop(this.ctx, this.musicBus, this.noise);
    this.music.start();
  }

  private tone(
    when: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, when);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.sfxBus!);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  private hiss(when: number, dur: number, gain: number, cutoff: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus!);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  private sweep(when: number, dur: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(600, when);
    f.frequency.exponentialRampToValueAtTime(5000, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.05, when + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus!);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
}

/**
 * Tiny generative "workshop lo-fi" loop: I–vi–IV–V with soft pads, a plucky
 * bass, a shaker and an occasional pentatonic lead. Scheduled with a
 * look-ahead timer so it never drifts.
 */
class MusicLoop {
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private readonly bpm = 104;
  private readonly chords = [
    [261.63, 329.63, 392.0], // C
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [196.0, 246.94, 293.66], // G
  ];
  private readonly bass = [65.41, 55.0, 87.31, 98.0];
  private readonly lead = [523.25, 587.33, 659.25, 783.99, 880.0];

  constructor(
    private ctx: AudioContext,
    private out: GainNode,
    private noise: AudioBuffer,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private schedule(): void {
    const spb = 60 / this.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number, spb: number): void {
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const chord = this.chords[bar]!;
    if (inBar === 0) {
      for (const f of chord) this.voice(t, 'triangle', f, spb * 7.5, 0.028, 900);
    }
    if (inBar === 0 || inBar === 3 || inBar === 6) {
      this.voice(t, 'sine', this.bass[bar]! * (inBar === 3 ? 2 : 1), spb * 1.6, 0.11, 400);
    }
    if (inBar % 2 === 1) this.shaker(t, 0.018);
    if (inBar === 4) this.shaker(t, 0.03);
    // sparse melody (deterministic-ish pattern + variation)
    if ((inBar === 2 || inBar === 5) && (step * 7 + bar) % 3 !== 0) {
      const f = this.lead[(step * 3 + bar * 2) % this.lead.length]!;
      this.voice(t, 'sine', f, spb * 1.2, 0.03, 3000);
    }
  }

  private voice(t: number, type: OscillatorType, f: number, dur: number, gain: number, lp: number): void {
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    filt.type = 'lowpass';
    filt.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private shaker(t: number, gain: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start(t, Math.random() * 0.3);
    src.stop(t + 0.07);
  }
}
