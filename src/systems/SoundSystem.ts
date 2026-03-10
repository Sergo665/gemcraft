/**
 * SoundSystem — programmatic audio generation via Web Audio API.
 * No audio files needed. All sounds are synthesized at runtime.
 * Singleton: stored in Phaser game.registry for global access.
 */
export class SoundSystem {
  private audioContext: AudioContext | null = null;
  private isMuted = false;
  private masterVolume = 0.3;
  private cascadeLevel = 0;

  constructor() {
    this.initContext();
  }

  /** Initialize AudioContext (lazy, resumes on first user gesture). */
  private initContext(): void {
    try {
      this.audioContext = new AudioContext();
    } catch {
      // Web Audio API not supported
      this.audioContext = null;
    }
  }

  /** Ensure context is running (browsers require user gesture). */
  private async ensureContext(): Promise<AudioContext | null> {
    if (!this.audioContext) return null;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  // ─── Utility builders ──────────────────────────────────────

  /** Create a gain node with an ADSR-like envelope. */
  private createEnvelope(
    ctx: AudioContext,
    startTime: number,
    attack: number,
    decay: number,
    sustainLevel: number,
    sustainDuration: number,
    release: number,
    peakVolume?: number,
  ): GainNode {
    const gain = ctx.createGain();
    const peak = (peakVolume ?? 1.0) * this.masterVolume;
    const t = startTime;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.linearRampToValueAtTime(peak * sustainLevel, t + attack + decay);
    gain.gain.setValueAtTime(peak * sustainLevel, t + attack + decay + sustainDuration);
    gain.gain.linearRampToValueAtTime(0, t + attack + decay + sustainDuration + release);

    return gain;
  }

  /** Create an oscillator with frequency automation. */
  private createOscillator(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number | null,
    startTime: number,
    duration: number,
  ): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== null && endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(endFreq, 1),
        startTime + duration,
      );
    }
    osc.start(startTime);
    osc.stop(startTime + duration);
    return osc;
  }

  /** Play a simple tone. */
  private async playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number | null,
    duration: number,
    attack: number,
    decay: number,
    sustainLevel: number,
    volume?: number,
  ): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const totalDur = duration / 1000;
    const attackS = attack / 1000;
    const decayS = decay / 1000;
    const releaseS = Math.max(0.01, totalDur - attackS - decayS);

    const gain = this.createEnvelope(ctx, now, attackS, decayS, sustainLevel, 0, releaseS, volume);
    gain.connect(ctx.destination);

    const osc = this.createOscillator(ctx, type, startFreq, endFreq, now, totalDur + 0.05);
    osc.connect(gain);
  }

  // ─── Sound effects ─────────────────────────────────────────

  /** Soft whoosh when swapping gems (100ms, 400→600 Hz). */
  public async playSwap(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.1;

    // Filtered noise-like effect using triangle wave sweep
    const gain = this.createEnvelope(ctx, now, 0.01, 0.06, 0.2, 0, 0.03, 0.5);
    gain.connect(ctx.destination);

    const osc = this.createOscillator(ctx, 'triangle', 400, 600, now, dur + 0.02);
    osc.connect(gain);
  }

  /** Pleasant high chime on match (150ms, 800 Hz base, pitch rises with combo). */
  public async playMatch(comboLevel: number = 0): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.15;
    // Each combo level raises pitch by ~a semitone (factor 1.06)
    const pitchFactor = Math.pow(1.06, comboLevel);
    const freq = 800 * pitchFactor;

    const gain = this.createEnvelope(ctx, now, 0.005, 0.05, 0.3, 0, 0.095, 0.6);
    gain.connect(ctx.destination);

    const osc = this.createOscillator(ctx, 'sine', freq, freq * 0.8, now, dur + 0.02);
    osc.connect(gain);

    // Soft harmonic overtone
    const gain2 = this.createEnvelope(ctx, now, 0.005, 0.03, 0.15, 0, 0.07, 0.25);
    gain2.connect(ctx.destination);

    const osc2 = this.createOscillator(ctx, 'sine', freq * 2, freq * 1.5, now, dur + 0.02);
    osc2.connect(gain2);
  }

  /** Cascade chime — match sound with incrementing pitch for chain reactions. */
  public async playCascade(): Promise<void> {
    this.cascadeLevel++;
    await this.playMatch(this.cascadeLevel);
  }

  /** Reset cascade counter (call at beginning of each player move). */
  public resetCascade(): void {
    this.cascadeLevel = 0;
  }

  /** Magical ascending sweep for special gem creation (300ms, 600→1200 Hz). */
  public async playSpecialCreate(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.3;

    // Main sweep
    const gain1 = this.createEnvelope(ctx, now, 0.01, 0.1, 0.4, 0.05, 0.14, 0.6);
    gain1.connect(ctx.destination);
    const osc1 = this.createOscillator(ctx, 'sine', 600, 1200, now, dur + 0.02);
    osc1.connect(gain1);

    // Shimmer harmonic
    const gain2 = this.createEnvelope(ctx, now + 0.05, 0.01, 0.08, 0.2, 0.03, 0.1, 0.3);
    gain2.connect(ctx.destination);
    const osc2 = this.createOscillator(ctx, 'triangle', 900, 1800, now + 0.05, dur - 0.03);
    osc2.connect(gain2);

    // Sparkle top
    const gain3 = this.createEnvelope(ctx, now + 0.15, 0.005, 0.05, 0.1, 0, 0.1, 0.2);
    gain3.connect(ctx.destination);
    const osc3 = this.createOscillator(ctx, 'sine', 1500, 2400, now + 0.15, 0.15);
    osc3.connect(gain3);
  }

  /** Powerful activation burst (400ms, 200→800 Hz + harmonics). */
  public async playSpecialActivate(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.4;

    // Deep base sweep
    const gain1 = this.createEnvelope(ctx, now, 0.01, 0.15, 0.3, 0.05, 0.19, 0.7);
    gain1.connect(ctx.destination);
    const osc1 = this.createOscillator(ctx, 'sine', 200, 800, now, dur + 0.02);
    osc1.connect(gain1);

    // Bright harmonic
    const gain2 = this.createEnvelope(ctx, now, 0.02, 0.1, 0.2, 0.05, 0.15, 0.4);
    gain2.connect(ctx.destination);
    const osc2 = this.createOscillator(ctx, 'triangle', 600, 1600, now, dur);
    osc2.connect(gain2);

    // High sparkle
    const gain3 = this.createEnvelope(ctx, now + 0.05, 0.01, 0.08, 0.15, 0, 0.2, 0.25);
    gain3.connect(ctx.destination);
    const osc3 = this.createOscillator(ctx, 'sine', 1200, 2000, now + 0.05, dur - 0.05);
    osc3.connect(gain3);
  }

  /** Bomb: thud + chime (200ms, 100 Hz thud + 600 Hz ring). */
  public async playBomb(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Deep thud
    const gain1 = this.createEnvelope(ctx, now, 0.005, 0.08, 0.1, 0, 0.12, 0.8);
    gain1.connect(ctx.destination);
    const osc1 = this.createOscillator(ctx, 'sine', 100, 50, now, 0.2);
    osc1.connect(gain1);

    // Bright chime
    const gain2 = this.createEnvelope(ctx, now + 0.02, 0.01, 0.06, 0.2, 0, 0.12, 0.5);
    gain2.connect(ctx.destination);
    const osc2 = this.createOscillator(ctx, 'triangle', 600, 400, now + 0.02, 0.18);
    osc2.connect(gain2);
  }

  /** Rainbow: magical shimmering sound (500ms, sweeping notes). */
  public async playRainbow(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pentatonic notes for a magical feel: C5, D5, E5, G5, A5
    const notes = [523.25, 587.33, 659.26, 783.99, 880.0];
    const noteLen = 0.09;

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * noteLen;
      const gain = this.createEnvelope(ctx, t, 0.005, 0.03, 0.3, 0.01, 0.04, 0.4);
      gain.connect(ctx.destination);
      const osc = this.createOscillator(ctx, 'sine', notes[i], notes[i] * 1.01, t, noteLen + 0.02);
      osc.connect(gain);

      // Soft overtone for shimmer
      const gain2 = this.createEnvelope(ctx, t, 0.005, 0.02, 0.15, 0, 0.05, 0.15);
      gain2.connect(ctx.destination);
      const osc2 = this.createOscillator(ctx, 'triangle', notes[i] * 2, notes[i] * 2.01, t, noteLen + 0.01);
      osc2.connect(gain2);
    }
  }

  /** Ice break: crunchy crack (100ms, noise burst + 1200 Hz). */
  public async playIceBreak(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.1;

    // Noise-like crunch using detuned square waves
    const gain1 = this.createEnvelope(ctx, now, 0.002, 0.03, 0.15, 0, 0.05, 0.4);
    gain1.connect(ctx.destination);

    // Use two detuned oscillators to approximate noise/crunch
    const osc1 = ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(3000, now);
    osc1.frequency.exponentialRampToValueAtTime(500, now + dur);
    osc1.start(now);
    osc1.stop(now + dur + 0.02);
    osc1.connect(gain1);

    // High crack
    const gain2 = this.createEnvelope(ctx, now, 0.003, 0.02, 0.2, 0, 0.06, 0.5);
    gain2.connect(ctx.destination);
    const osc2 = this.createOscillator(ctx, 'sine', 1200, 800, now, dur);
    osc2.connect(gain2);
  }

  /** Victory fanfare: ascending C major arpeggio (800ms). */
  public async playVictory(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C4, E4, G4, C5 (major arpeggio)
    const notes = [261.63, 329.63, 392.0, 523.25];
    const noteLen = 0.18;

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * noteLen;
      const isLast = i === notes.length - 1;
      const sustainTime = isLast ? 0.1 : 0.02;
      const releaseTime = isLast ? 0.15 : 0.06;
      const vol = isLast ? 0.7 : 0.5;

      const gain = this.createEnvelope(ctx, t, 0.01, 0.04, 0.5, sustainTime, releaseTime, vol);
      gain.connect(ctx.destination);
      const osc = this.createOscillator(ctx, 'sine', notes[i], null, t, noteLen + (isLast ? 0.2 : 0.05));
      osc.connect(gain);

      // Octave harmonic for richness
      const gain2 = this.createEnvelope(ctx, t, 0.01, 0.03, 0.2, sustainTime * 0.5, releaseTime, vol * 0.3);
      gain2.connect(ctx.destination);
      const osc2 = this.createOscillator(ctx, 'triangle', notes[i] * 2, null, t, noteLen + (isLast ? 0.15 : 0.03));
      osc2.connect(gain2);
    }
  }

  /** Defeat: descending minor notes (500ms, C-Ab-F-Eb). */
  public async playDefeat(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C4, Ab3, F3, Eb3 (descending minor feel)
    const notes = [261.63, 207.65, 174.61, 155.56];
    const noteLen = 0.12;

    for (let i = 0; i < notes.length; i++) {
      const t = now + i * noteLen;
      const isLast = i === notes.length - 1;
      const releaseTime = isLast ? 0.15 : 0.05;

      const gain = this.createEnvelope(ctx, t, 0.01, 0.04, 0.35, 0.02, releaseTime, 0.45);
      gain.connect(ctx.destination);
      const osc = this.createOscillator(ctx, 'sine', notes[i], null, t, noteLen + 0.08);
      osc.connect(gain);
    }
  }

  /** Button click (50ms, 600 Hz short pop). */
  public async playButtonClick(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = this.createEnvelope(ctx, now, 0.003, 0.02, 0.1, 0, 0.025, 0.4);
    gain.connect(ctx.destination);
    const osc = this.createOscillator(ctx, 'sine', 600, 500, now, 0.05);
    osc.connect(gain);
  }

  /** Gem select highlight (80ms, 1000 Hz tone). */
  public async playGemSelect(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = this.createEnvelope(ctx, now, 0.005, 0.025, 0.2, 0, 0.05, 0.35);
    gain.connect(ctx.destination);
    const osc = this.createOscillator(ctx, 'sine', 1000, 950, now, 0.08);
    osc.connect(gain);
  }

  /** Gem landing thud (60ms, 300 Hz soft bump). */
  public async playGemLand(): Promise<void> {
    if (this.isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = this.createEnvelope(ctx, now, 0.003, 0.02, 0.1, 0, 0.035, 0.3);
    gain.connect(ctx.destination);
    const osc = this.createOscillator(ctx, 'triangle', 300, 200, now, 0.06);
    osc.connect(gain);
  }

  // ─── Controls ──────────────────────────────────────────────

  /** Toggle mute on/off. Returns new muted state. */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /** Get current mute state. */
  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Set master volume (0..1). */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  /** Get master volume. */
  public getMasterVolume(): number {
    return this.masterVolume;
  }
}
