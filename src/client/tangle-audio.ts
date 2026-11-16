// Karplus-Strong and Harmonic String Physical Synthesizer for Tangle
// Pure Web Audio API: Zero external audio files, zero network latency

class TangleSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const stored = localStorage.getItem('tangle_muted');
      if (stored !== null) {
        this.muted = stored === 'true';
      }
    } catch {
      // Ignore
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('tangle_muted', String(this.muted));
    } catch {
      // Ignore
    }
    return this.muted;
  }

  // Tactile wooden peg lift
  public playPinLift() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.035);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  // Tactile pin set-down with soft resonance
  public playPinDrop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  // Acoustic plucked string sound when thread crosses or uncrosses
  public playStringPluck(pitchFactor: number = 1.0) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const fundamental = 330 * pitchFactor; // E4 base

      // Two harmonic oscillators for warm acoustic body
      const harmonics = [1, 2, 3];
      const gains = [0.12, 0.04, 0.015];

      harmonics.forEach((h, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(fundamental * h, now);

        gain.gain.setValueAtTime(gains[i] ?? 0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.28 / h);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  // Delicate metallic chime when remaining crossings decrease
  public playUncrossStep(remaining: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Musical pentatonic scale stepping up as crossings drop
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const index = Math.min(pentatonic.length - 1, Math.max(0, 10 - remaining));
      const freq = pentatonic[index] ?? 659.25;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // Ignore
    }
  }

  // Radiant celestial major 9th chord on 0 crossings
  public playVictoryChord() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // D Major 9: D4, F#4, A4, C#5, E5
      const notes = [293.66, 369.99, 440.0, 554.37, 659.25];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.01, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.06 + 0.95);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 1.0);
      });
    } catch {
      // Ignore
    }
  }
  // Convenience aliases for gameplay actions
  public playGrab() {
    this.playPinLift();
  }

  public playDrop() {
    this.playPinDrop();
  }

  public playUncross(remaining: number) {
    this.playUncrossStep(remaining);
  }

  public playSolved() {
    this.playVictoryChord();
  }
}

export const tangleSounds = new TangleSoundEngine();
