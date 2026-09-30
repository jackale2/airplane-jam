import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type Phaser from 'phaser';
import type { SaveData } from './SaveManager.ts';

export type Sfx = 'click' | 'popup' | 'coin' | 'tick' | 'pop' | 'chime' | 'bump' | 'taxi' | 'takeoff' | 'win' | 'fail';
const FILE_SFX = new Set<Sfx>(['click', 'popup', 'coin', 'tick']);

/**
 * Plays the loaded Kenney files and synthesizes the rest with WebAudio (bump, taxi, takeoff, win, fail).
 * Phaser unlocks the audio context on the first tap. A missing sound or context is silently skipped,
 * so sound never blocks gameplay.
 */
export class AudioManager {
  private readonly game: Phaser.Game;
  private readonly settings: SaveData['settings'];
  private noise?: AudioBuffer;
  sfxVolume = 0.8;

  constructor(game: Phaser.Game, settings: SaveData['settings']) {
    this.game = game;
    this.settings = settings;
  }

  /** Start or stop the looping music to match the Music setting. No music file means nothing plays. */
  syncMusic() {
    try {
      if (!this.game.cache.audio.exists('music')) return;
      let m = this.game.sound.get('music');
      m ??= this.game.sound.add('music', { loop: true, volume: 0.4 });
      if (this.settings.music && !m.isPlaying) m.play();
      else if (!this.settings.music && m.isPlaying) m.stop();
    } catch {
      /* audio is best-effort */
    }
  }

  private get ctx(): AudioContext | undefined {
    return (this.game.sound as Phaser.Sound.WebAudioSoundManager).context;
  }

  play(name: Sfx, opts: { rate?: number } = {}) {
    if (!this.settings.sound) return;
    try {
      if (FILE_SFX.has(name)) {
        if (this.game.cache.audio.exists(name)) this.game.sound.play(name, { volume: this.sfxVolume, rate: opts.rate ?? 1 });
      } else this.synth(name, opts.rate ?? 1);
    } catch {
      /* audio is best-effort */
    }
  }

  /** Boarding: a bubble pop plus a haptic tick. Pitch rises as the plane fills (fill is 0..1). */
  board(fill: number) {
    this.play('pop', { rate: 0.8 + fill * 0.9 });
    this.haptic('light');
  }

  haptic(style: 'light' | 'medium' = 'light') {
    if (!this.settings.vibration) return;
    Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => navigator.vibrate?.(15));
  }

  private noiseBuffer(ctx: AudioContext) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private synth(name: Sfx, rate: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(ctx.destination);
    const env = (dur: number, peak: number) => {
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peak * this.sfxVolume, t + 0.02);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + start);
      o.frequency.exponentialRampToValueAtTime(f1, t + start + dur);
      o.connect(out);
      o.start(t + start);
      o.stop(t + start + dur);
    };
    const whoosh = (dur: number, f0: number, f1: number, q: number, type: BiquadFilterType) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(ctx);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      src.connect(f).connect(out);
      src.start(t);
      src.stop(t + dur);
    };

    switch (name) {
      case 'pop': { // bubble pop: soft upward chirp plus a quiet octave layer, pitch nudged each time so it never sounds robotic
        const r = rate * (0.96 + Math.random() * 0.08);
        env(0.11, 0.6);
        tone('sine', 380 * r, 950 * r, 0, 0.08);
        tone('triangle', 760 * r, 1500 * r, 0, 0.05);
        break;
      }
      case 'chime': // soft two-note "done" when a plane takes off
        env(0.5, 0.25);
        tone('sine', 880, 880, 0, 0.3);
        tone('sine', 1320, 1320, 0.08, 0.35);
        break;
      case 'bump':
        env(0.18, 0.9);
        tone('sine', 140, 50, 0, 0.18);
        break;
      case 'taxi':
        env(0.5, 0.35);
        whoosh(0.5, 400, 1400, 1.2, 'bandpass');
        break;
      case 'takeoff':
        env(0.6, 0.5);
        whoosh(0.6, 300, 3500, 0.8, 'lowpass');
        break;
      case 'win':
        env(0.6, 0.5);
        [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, i * 0.12, 0.18));
        break;
      case 'fail':
        env(0.5, 0.5);
        tone('sawtooth', 300, 200, 0, 0.25);
        tone('sawtooth', 220, 110, 0.25, 0.25);
        break;
    }
  }
}
