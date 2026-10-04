/**
 * BLACKOUT — Procedural Atmospheric Audio Synthesizer
 * 
 * An original sound system built around:
 * electricity + distant pulses + spatial tension + silence.
 * 
 * Multi-layer architecture:
 * Layer 1: Ambient Low-Frequency Hum (55Hz / 110Hz detuned electronic atmosphere)
 * Layer 2: Electrical Pulses (periodic environmental respirations)
 * Layer 3: Player Presence (subtle kinetic glide in darkness)
 * Layer 4: Spatial Danger Tension (stereo-panned rising proximity frequency)
 * Layer 5: Signature Blackout Drop (crackle -> silence -> deep sub-pulse -> darkness)
 * 
 * Zero external audio files, 0 KB bundle weight, 100% procedural Web Audio API.
 */

import { storage } from '../storage/StorageManager';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Drone synthesizer nodes (Layer 1)
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private isDronePlaying = false;

  // Player movement kinetic presence (Layer 3)
  private lastMoveSoundTime = 0;

  // Spatial Danger Tension system (Layer 4)
  private dangerPanner: StereoPannerNode | null = null;
  private dangerGain: GainNode | null = null;
  private lastDangerPulseTime = 0;

  constructor() {
    // Initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext(): void {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      const settings = storage.getSettings();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(settings.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(settings.soundEnabled ? 1 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(settings.musicEnabled ? 0.32 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Setup stereo panner for spatial danger system if supported
      if (this.ctx.createStereoPanner) {
        this.dangerPanner = this.ctx.createStereoPanner();
        this.dangerGain = this.ctx.createGain();
        this.dangerGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.dangerPanner.connect(this.dangerGain);
        this.dangerGain.connect(this.sfxGain);
      }
    } catch (e) {
      console.warn('Web Audio API not supported in this environment', e);
    }
  }

  public ensureContext(): void {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public updateSettings(): void {
    const settings = storage.getSettings();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(settings.volume, t, 0.05);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(settings.soundEnabled ? 1 : 0, t, 0.05);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(settings.musicEnabled ? 0.32 : 0, t, 0.05);
    }

    if (settings.musicEnabled && !this.isDronePlaying) {
      this.startAmbientDrone();
    } else if (!settings.musicEnabled && this.isDronePlaying) {
      this.stopAmbientDrone();
    }
  }

  /**
   * Layer 3: Player Presence — subtle kinetic glide through darkness.
   * Soft, low-frequency electromagnetic whisper that confirms movement without clutter.
   */
  public playMove(): void {
    const now = Date.now();
    if (now - this.lastMoveSoundTime < 190) return;
    this.lastMoveSoundTime = now;

    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);

      gain.gain.setValueAtTime(0.028, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Layer 4: Spatial Danger Tension System
   * Evaluates closest hazard distance (normalized 0 to 1) and stereo pan (-1 left to 1 right).
   * Generates a rising, accelerating tonal pulse as hazard draws near.
   */
  public updateSpatialDanger(distRatio: number, panX: number): void {
    // distRatio: 0 = touching player, 1 = far away (> 240px)
    if (distRatio >= 0.95) return;

    const now = Date.now();
    // Pulse tempo accelerates as danger nears: from every 800ms down to 140ms
    const interval = 140 + distRatio * 660;
    if (now - this.lastDangerPulseTime < interval) return;
    this.lastDangerPulseTime = now;

    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch rises as danger draws closer (from 160Hz up to 480Hz)
      const baseFreq = 160 + (1 - distRatio) * 320;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, t + 0.06);

      // Volume increases slightly when close (0.02 to 0.08)
      const vol = 0.025 + (1 - distRatio) * 0.065;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      // Spatial stereo panning
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), t);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        osc.connect(gain);
        gain.connect(this.sfxGain);
      }

      osc.start(t);
      osc.stop(t + 0.07);
    } catch {}
  }

  /**
   * Layer 5: THE SIGNATURE BLACKOUT MOMENT
   * Sequence:
   * LIGHT -> short electrical crackle -> sudden drop into silence -> deep sub-pulse -> BLACKOUT.
   */
  public playSignatureBlackout(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;

      // 1. High-voltage electrical arc crackle (0 to 0.08s)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2400, t);
      noiseFilter.Q.setValueAtTime(4.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      whiteNoise.start(t);

      // 2. Momentary vacuum drop of silence (~0.08s to 0.12s)

      // 3. Deep sub-pulse (at 0.12s: 130Hz -> 36Hz resonant sub-drop)
      const subOsc = this.ctx.createOscillator();
      const subFilter = this.ctx.createBiquadFilter();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, t + 0.1);
      subOsc.frequency.exponentialRampToValueAtTime(36, t + 0.65);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(260, t + 0.1);
      subFilter.frequency.exponentialRampToValueAtTime(50, t + 0.65);

      subGain.gain.setValueAtTime(0.001, t);
      subGain.gain.setValueAtTime(0.32, t + 0.1);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(t + 0.1);
      subOsc.stop(t + 0.7);
    } catch {}
  }

  /**
   * Tactical Flashlight Ignition:
   * Crisp filament click and high-voltage excitation, fading into steady optic focus.
   */
  public playFlashlightOn(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;

      // Relay switch click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1400, t);
      clickOsc.frequency.exponentialRampToValueAtTime(300, t + 0.025);
      clickGain.gain.setValueAtTime(0.18, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(t);
      clickOsc.stop(t + 0.03);

      // High-frequency filament surge
      const humOsc = this.ctx.createOscillator();
      const humGain = this.ctx.createGain();
      humOsc.type = 'sine';
      humOsc.frequency.setValueAtTime(840, t);
      humOsc.frequency.exponentialRampToValueAtTime(1280, t + 0.07);
      humGain.gain.setValueAtTime(0.08, t);
      humGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      humOsc.connect(humGain);
      humGain.connect(this.sfxGain);
      humOsc.start(t);
      humOsc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Flashlight Capacitor Discharge on shutoff
   */
  public playFlashlightOff(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + 0.06);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch {}
  }

  /**
   * Minimal Harmonic Crystalline Confirmation (Sector Clear).
   * Pure mathematical overtone series [440, 660, 880, 1320 Hz].
   * No generic coin sound: pure, crisp, satisfying acoustic resonance.
   */
  public playSectorClear(isExtreme = false): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const overtones = isExtreme
        ? [523.25, 783.99, 1046.5, 1567.98, 2093.0]
        : [440, 660, 880, 1320];

      overtones.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.035);

        const vol = 0.12 / (1 + idx * 0.2);
        gain.gain.setValueAtTime(vol, t + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (isExtreme ? 0.9 : 0.65));

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + idx * 0.035);
        osc.stop(t + (isExtreme ? 0.9 : 0.65));
      });

      // Subtle warm sub-pulse of completion
      const sub = this.ctx.createOscillator();
      const subG = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(55, t + 0.4);
      subG.gain.setValueAtTime(0.18, t);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      sub.connect(subG);
      subG.connect(this.sfxGain);
      sub.start(t);
      sub.stop(t + 0.45);
    } catch {}
  }

  /**
   * Heart-stopping Close Call / Near Miss
   * A visceral, high-velocity atmospheric displacement click + low bass thump.
   */
  public playNearMiss(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }

  /**
   * Risk Core Extraction Confirmation
   * High-resonance prismatic pulse.
   */
  public playRiskCollect(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(920, t);
      osc1.frequency.exponentialRampToValueAtTime(1840, t + 0.12);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1380, t);
      osc2.frequency.exponentialRampToValueAtTime(2760, t + 0.12);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.14);
      osc2.stop(t + 0.14);
    } catch {}
  }

  /**
   * Timed laser gate transition hum
   */
  public playDoorState(isOpen: boolean): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      if (isOpen) {
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.09);
      } else {
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(160, t + 0.09);
      }

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.11);
    } catch {}
  }

  /**
   * Subtle radar scan sweep during Reveal Phase
   */
  public playRadarTick(pitchMultiplier = 1.0): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740 * pitchMultiplier, t);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.045);
    } catch {}
  }

  /**
   * Extreme Protocol Klaxon:
   * Low discordant dual-frequency pulse.
   */
  public playExtremeAlert(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      [0, 0.16].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, t + offset);
        osc.frequency.linearRampToValueAtTime(190, t + offset + 0.12);

        gain.gain.setValueAtTime(0.14, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.13);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + offset);
        osc.stop(t + offset + 0.13);
      });
    } catch {}
  }

  /**
   * Game Over Sound:
   * Electrical disruption -> brief 60ms vacuum silence -> heavy low resonant impact -> dissipation.
   * Under 1.2 seconds, highly tactile, no cartoon explosions.
   */
  public playGameOver(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;

      // 1. Initial sharp severance crackle (0 to 0.04s)
      const zap = this.ctx.createOscillator();
      const zapG = this.ctx.createGain();
      zap.type = 'sawtooth';
      zap.frequency.setValueAtTime(900, t);
      zap.frequency.exponentialRampToValueAtTime(120, t + 0.04);
      zapG.gain.setValueAtTime(0.18, t);
      zapG.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      zap.connect(zapG);
      zapG.connect(this.sfxGain);
      zap.start(t);
      zap.stop(t + 0.045);

      // 2. Heavy low-frequency implosion impact (0.06s to 0.75s)
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(26, t + 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t + 0.06);
      filter.frequency.exponentialRampToValueAtTime(45, t + 0.7);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.38, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + 0.06);
      osc.stop(t + 0.75);
    } catch {}
  }

  /**
   * Layer 1: Ambient Electronic Atmosphere
   * Continuous, quiet 55Hz sub-bass with gentle 0.12Hz slow breathing filter modulation.
   */
  public startAmbientDrone(): void {
    const settings = storage.getSettings();
    if (!settings.musicEnabled) return;

    this.ensureContext();
    if (!this.ctx || !this.musicGain || this.isDronePlaying) return;

    try {
      const t = this.ctx.currentTime;

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneLfo = this.ctx.createOscillator();

      const lfoGain = this.ctx.createGain();

      // Fundamental 55Hz (A1) and subtle 55.5Hz detuned harmonic
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(55, t);

      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(55.5, t);

      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.setValueAtTime(115, t);
      this.droneFilter.Q.setValueAtTime(2.8, t);

      // Slow 8-second breathing LFO modulation
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.setValueAtTime(0.12, t);
      lfoGain.gain.setValueAtTime(32, t);

      this.droneLfo.connect(lfoGain);
      lfoGain.connect(this.droneFilter.frequency);

      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.musicGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
      this.droneLfo.start();

      this.isDronePlaying = true;
    } catch (e) {
      console.warn('Failed to start ambient drone', e);
    }
  }

  public stopAmbientDrone(): void {
    if (!this.isDronePlaying) return;
    try {
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
      this.droneLfo?.stop();
      this.droneOsc1?.disconnect();
      this.droneOsc2?.disconnect();
      this.droneFilter?.disconnect();
      this.droneLfo?.disconnect();
    } catch {}
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
    this.droneLfo = null;
    this.isDronePlaying = false;
  }
}

export const sound = new SoundSynthesizer();
