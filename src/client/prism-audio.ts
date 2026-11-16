// Web Audio API procedural synthesizer for PRISM
// Zero external asset downloads, zero network latency

class PrismAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const stored = localStorage.getItem('prism_muted');
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
      localStorage.setItem('prism_muted', String(this.muted));
    } catch {
      // Ignore
    }
    return this.muted;
  }

  // Tactile mirror placement or rotation click
  public playClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  }

  // Resonant glass chime when light strikes and activates a crystal
  public playCrystalActive(color: string) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq =
        color === 'magenta'
          ? 587.33 // D5
          : color === 'yellow'
            ? 659.25 // E5
            : color === 'cyan'
              ? 783.99 // G5
              : 880.0; // A5 (white / others)

      [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45 + idx * 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
      });
    } catch {
      // Ignore
    }
  }

  // Celestial chord when all crystals in chamber are awakened
  public playChamberComplete() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Radiant E Major 9 chord (E4, G#4, B4, D#5, F#5)
      const freqs = [329.63, 415.3, 493.88, 622.25, 739.99];

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.01, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.07 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.85);
      });
    } catch {
      // Ignore
    }
  }
}

export const prismSounds = new PrismAudio();
