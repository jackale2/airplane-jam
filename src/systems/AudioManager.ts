import type Phaser from 'phaser';
import { fireHaptic, HAPTIC_MIN_GAP_MS, type Haptic } from './haptics.ts';
import { loadSamples, SAMPLES } from './samples.ts';
import { MusicEngine, midiHz, type Flavour } from './MusicEngine.ts';
import type { SaveManager } from './SaveManager.ts';

export type Sfx =
  | 'click'
  | 'popup'
  | 'popclose'
  | 'coin'
  | 'tap'
  | 'bump'
  | 'taxi'
  | 'park'
  | 'takeoff'
  | 'chime'
  | 'win'
  | 'star'
  | 'fail'
  | 'combo'
  | 'unlock'
  | 'whoosh'
  | 'gate'
  | 'shuffle'
  | 'sort'
  | 'tick';

const PENTA = [0, 2, 4, 7, 9];

/**
 * Every sound is synthesized (no files to load): soft bubble pops tuned to the music's key, glassy bells,
 * airy whooshes, all through a compressor and a gentle reverb so nothing is harsh. Missing WebAudio means
 * silence, never an error.
 */
export class AudioManager {
  private readonly game: Phaser.Game;
  private readonly save: SaveManager;
  private graph?: { sfx: GainNode; musicBus: GainNode; reverb: ConvolverNode; comp: DynamicsCompressorNode };
  music?: MusicEngine;
  private noise?: AudioBuffer;
  private clips = new Map<string, AudioBuffer>();
  private lastHaptic: Partial<Record<Haptic, number>> = {};
  private mood = { root: 60, flavour: 'major' as Flavour, calm: false };

  constructor(game: Phaser.Game, save: SaveManager) {
    this.game = game;
    this.save = save;
    // start the music as soon as the browser allows audio (first tap)
    this.game.sound.once('unlocked', () => this.syncMusic());
  }

  private get settings() {
    return this.save.data.settings;
  }

  private get ctx(): AudioContext | undefined {
    const c = (this.game.sound as Phaser.Sound.WebAudioSoundManager).context;
    return c && typeof c.createGain === 'function' ? c : undefined;
  }

  /** Build the mixer lazily (the context exists only after Phaser's sound manager starts). */
  private mixer() {
    if (this.graph) return this.graph;
    const c = this.ctx;
    if (!c) return undefined;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(c.destination);
    const sfx = c.createGain();
    sfx.connect(comp);
    const musicBus = c.createGain();
    musicBus.connect(comp);
    const reverb = c.createConvolver();
    reverb.buffer = this.impulse(c, 2.4);
    const wet = c.createGain();
    wet.gain.value = 0.5;
    reverb.connect(wet).connect(comp);
    this.graph = { sfx, musicBus, reverb, comp };
    void loadSamples(c).then((m) => (this.clips = m));
    this.music = new MusicEngine(c, musicBus, reverb);
    this.music.setMood(this.mood.root, this.mood.flavour, this.mood.calm);
    this.applyVolumes();
    return this.graph;
  }

  private impulse(c: AudioContext, seconds: number) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * (1 - t) ** 3.2 * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1);
      }
    }
    return buf;
  }

  applyVolumes() {
    const g = this.graph;
    if (!g) return;
    const t = this.ctx!.currentTime;
    g.sfx.gain.setTargetAtTime(this.settings.sound ? this.settings.sfxVol : 0, t, 0.03);
    g.musicBus.gain.setTargetAtTime(this.settings.music ? this.settings.musicVol * 0.9 : 0, t, 0.1);
  }

  /** Start or stop the music to match the settings. A file at assets/audio/music/music.ogg replaces the generated music. */
  syncMusic() {
    try {
      if (this.game.cache.audio.exists('music')) {
        let m = this.game.sound.get('music');
        m ??= this.game.sound.add('music', { loop: true, volume: 0.4 * this.settings.musicVol });
        (m as Phaser.Sound.WebAudioSound).setVolume?.(0.4 * this.settings.musicVol);
        if (this.settings.music && !m.isPlaying) m.play();
        else if (!this.settings.music && m.isPlaying) m.stop();
        return;
      }
      const g = this.mixer();
      if (!g || !this.music) return;
      this.applyVolumes();
      if (this.settings.music) this.music.start(1);
      else this.music.stop();
    } catch {
      /* audio is best-effort */
    }
  }

  /** Key and feel for the current destination (sound effects follow the same key). */
  setMood(root: number, flavour: Flavour, calm = false) {
    this.mood = { root, flavour, calm };
    this.music?.setMood(root, flavour, calm);
  }

  haptic(kind: Haptic) {
    if (!this.settings.vibration) return;
    const now = performance.now();
    if (now - (this.lastHaptic[kind] ?? -Infinity) < (HAPTIC_MIN_GAP_MS[kind] ?? 0)) return;
    this.lastHaptic[kind] = now;
    fireHaptic(kind);
  }

  /** Boarding pop: a bubbly note climbing the pentatonic scale as the plane fills. */
  board(seat: number, pan = 0) {
    const n = this.mood.root + 12 + PENTA[seat % 5]! + 12 * Math.floor(seat / 5);
    this.play('tap', { note: n, pan, kind: 'bubble' });
    this.haptic('board');
  }

  play(name: Sfx, o: { rate?: number; pan?: number; note?: number; kind?: 'bubble' } = {}) {
    if (!this.settings.sound) return;
    try {
      const g = this.mixer();
      const c = this.ctx;
      if (!g || !c || c.state !== 'running') return;
      if (!this.clip(c, g, name, o)) this.synth(c, g, name, o);
    } catch {
      /* audio is best-effort */
    }
  }

  /** Play the original clip for this sound if it is loaded. Boarding pops are pitched along the music's scale. */
  private clip(c: AudioContext, g: NonNullable<AudioManager['graph']>, name: Sfx, o: { rate?: number; note?: number; kind?: 'bubble' }) {
    const def = SAMPLES[name === 'tap' && o.kind === 'bubble' ? 'board' : name];
    const buf = def && this.clips.get(def.file);
    if (!def || !buf) return false;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (o.rate ?? 1) * (o.note !== undefined ? 2 ** (Math.min(12, o.note - (this.mood.root + 12)) / 12) : 1);
    const gain = c.createGain();
    gain.gain.value = def.gain;
    src.connect(gain).connect(g.sfx);
    src.start();
    return true;
  }

  private noiseBuf(c: AudioContext) {
    if (!this.noise) {
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private synth(c: AudioContext, g: NonNullable<AudioManager['graph']>, name: Sfx, o: { rate?: number; pan?: number; note?: number; kind?: 'bubble' }) {
    const t0 = c.currentTime + 0.005;
    const rate = o.rate ?? 1;
    const root = this.mood.root;
    // output for this sound: optional pan, dry to the sfx bus, plus a reverb send
    const out = c.createGain();
    let head: AudioNode = out;
    if (o.pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      out.connect(p);
      head = p;
    }
    head.connect(g.sfx);
    const send = c.createGain();
    send.gain.value = 0;
    head.connect(send).connect(g.reverb);
    const wet = (v: number) => (send.gain.value = v * (this.settings.sfxVol || 0));

    const tone = (type: OscillatorType, f0: number, f1: number, at: number, a: number, d: number, peak: number) => {
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t0 + at);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + at + Math.max(0.01, Math.min(d, 0.25)));
      env.gain.setValueAtTime(0.0001, t0 + at);
      env.gain.linearRampToValueAtTime(peak, t0 + at + a);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + a + d);
      osc.connect(env).connect(out);
      osc.start(t0 + at);
      osc.stop(t0 + at + a + d + 0.05);
    };
    const bell = (f: number, at: number, peak: number, d = 0.9) => {
      tone('sine', f, f, at, 0.004, d, peak);
      tone('sine', f * 2.76, f * 2.76, at, 0.002, d * 0.35, peak * 0.22);
      tone('sine', f * 5.4, f * 5.4, at, 0.002, d * 0.12, peak * 0.08);
    };
    const noise = (type: BiquadFilterType, f0: number, f1: number, q: number, at: number, a: number, d: number, peak: number) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf(c);
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, t0 + at);
      f.frequency.exponentialRampToValueAtTime(f1, t0 + at + a + d);
      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t0 + at);
      env.gain.linearRampToValueAtTime(peak, t0 + at + a);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + a + d);
      src.connect(f).connect(env).connect(out);
      src.start(t0 + at, Math.random() * 0.5);
      src.stop(t0 + at + a + d + 0.05);
    };
    const hz = (m: number) => midiHz(m) * rate;

    switch (name) {
      case 'tap':
        if (o.kind === 'bubble' && o.note !== undefined) {
          // bubble pop: quick upward blip settling on the note, a soft overtone and a tiny pluck
          const f = midiHz(o.note);
          tone('sine', f * 0.62, f, 0, 0.004, 0.2, 0.26);
          tone('sine', f * 2, f * 2, 0.002, 0.003, 0.07, 0.05);
          noise('highpass', 3500, 3000, 0.7, 0, 0.002, 0.018, 0.035);
          wet(0.28);
        } else {
          tone('sine', 260, 150, 0, 0.004, 0.08, 0.22);
          noise('bandpass', 2600, 1800, 1.2, 0, 0.002, 0.03, 0.05);
          wet(0.08);
        }
        break;
      case 'click':
        tone('sine', 1150 * rate, 720 * rate, 0, 0.002, 0.05, 0.16);
        tone('triangle', 2300 * rate, 1900 * rate, 0, 0.002, 0.02, 0.03);
        wet(0.06);
        break;
      case 'tick':
        tone('sine', 1800 * rate, 1500 * rate, 0, 0.002, 0.025, 0.05);
        break;
      case 'popup':
        noise('bandpass', 500, 2400, 1.1, 0, 0.03, 0.16, 0.08);
        tone('sine', 520, 900, 0, 0.01, 0.12, 0.08);
        wet(0.2);
        break;
      case 'popclose':
        noise('bandpass', 2000, 600, 1.1, 0, 0.02, 0.12, 0.06);
        tone('sine', 760, 480, 0, 0.01, 0.1, 0.06);
        break;
      case 'whoosh':
        noise('bandpass', 700, 2200, 0.9, 0, 0.04, 0.18, 0.07);
        break;
      case 'coin':
        bell(hz(root + 31), 0, 0.09, 0.35);
        bell(hz(root + 36), 0.045, 0.07, 0.4);
        wet(0.25);
        break;
      case 'bump':
        tone('triangle', 300, 170, 0, 0.004, 0.16, 0.2);
        tone('sine', 120, 62, 0, 0.004, 0.16, 0.3);
        wet(0.05);
        break;
      case 'taxi':
        noise('bandpass', 320, 1400, 0.9, 0, 0.06, 0.46, 0.14);
        tone('sine', 150, 230, 0, 0.05, 0.4, 0.05);
        wet(0.12);
        break;
      case 'park':
        tone('sine', 190, 125, 0, 0.004, 0.11, 0.18);
        noise('bandpass', 1500, 1200, 1.4, 0, 0.002, 0.04, 0.04);
        break;
      case 'takeoff':
        noise('lowpass', 480, 4800, 0.7, 0, 0.18, 0.85, 0.17);
        tone('sine', 220, 520, 0, 0.12, 0.75, 0.035);
        wet(0.3);
        break;
      case 'chime':
        // airport "ding-dong", in the music's key
        bell(midiHz(root + 19), 0, 0.12, 1.1);
        bell(midiHz(root + 16), 0.17, 0.11, 1.3);
        wet(0.5);
        break;
      case 'star':
        bell(midiHz(root + 24 + [0, 4, 7][Math.round(rate) - 1]!), 0, 0.14, 1);
        wet(0.45);
        break;
      case 'win':
        [0, 4, 7, 12, 16, 19].forEach((n, i) => bell(midiHz(root + 12 + n), i * 0.085, 0.11, 1.1));
        for (let i = 0; i < 6; i++) tone('sine', 2400 + Math.random() * 2400, 2400 + Math.random() * 2400, 0.4 + i * 0.07, 0.003, 0.2, 0.02);
        wet(0.55);
        break;
      case 'combo':
        [0, 2, 4, 7].forEach((d, i) => bell(midiHz(root + 24 + PENTA[d % 5]! + (d >= 5 ? 12 : 0)), i * 0.05, 0.07, 0.5));
        wet(0.45);
        break;
      case 'unlock':
        [0, 4, 7, 11, 14].forEach((n, i) => bell(midiHz(root + 12 + n), i * 0.07, 0.1, 1.2));
        noise('highpass', 5000, 9000, 0.5, 0.1, 0.2, 0.6, 0.02);
        wet(0.6);
        break;
      case 'fail':
        tone('sine', midiHz(root + 7), midiHz(root + 6), 0, 0.02, 0.4, 0.14);
        tone('sine', midiHz(root + 3), midiHz(root + 2), 0.28, 0.02, 0.6, 0.14);
        wet(0.3);
        break;
      case 'gate':
        noise('bandpass', 2200, 1800, 2, 0, 0.002, 0.05, 0.08);
        bell(midiHz(root + 19), 0.06, 0.09, 0.6);
        wet(0.3);
        break;
      case 'shuffle':
        for (let i = 0; i < 3; i++) noise('bandpass', 600 + i * 300, 1800 + i * 400, 1, i * 0.09, 0.03, 0.12, 0.06);
        wet(0.2);
        break;
      case 'sort':
        for (let i = 0; i < 4; i++) tone('sine', 700 + i * 180, 600 + i * 180, i * 0.06, 0.003, 0.05, 0.1);
        wet(0.15);
        break;
    }
  }
}
