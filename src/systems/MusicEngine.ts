/**
 * Generative lo-fi music made with WebAudio: a warm pad, sparse electric-piano notes, a soft bass and a
 * brushed shaker, all through a gentle reverb. Nothing is loaded, it never repeats exactly, and the mood
 * (key and flavour) follows the destination. Zen mode is slower, with no percussion.
 */
export type Flavour = 'major' | 'lydian' | 'dorian' | 'mixolydian';

const CHORDS: Record<Flavour, [number, number[]][]> = {
  // [root offset in semitones, voicing]
  major: [[0, [0, 4, 7, 11, 14]], [9, [0, 3, 7, 10, 14]], [5, [0, 4, 7, 11, 16]], [7, [0, 2, 7, 9, 14]]],
  lydian: [[0, [0, 4, 7, 11, 14]], [2, [0, 4, 7, 14, 16]], [0, [0, 4, 6, 11, 14]], [7, [0, 2, 7, 11, 14]]],
  dorian: [[0, [0, 3, 7, 10, 14]], [5, [0, 4, 7, 10, 14]], [0, [0, 3, 7, 10, 17]], [10, [0, 4, 7, 11, 14]]],
  mixolydian: [[0, [0, 4, 7, 10, 14]], [10, [0, 4, 7, 11, 14]], [5, [0, 4, 7, 11, 14]], [0, [0, 4, 9, 14, 16]]],
};
const PENTA: Record<Flavour, number[]> = {
  major: [0, 2, 4, 7, 9],
  lydian: [0, 2, 4, 7, 11],
  dorian: [0, 3, 5, 7, 10],
  mixolydian: [0, 2, 4, 7, 9],
};

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * Notes are scheduled this far ahead on the audio clock. The scheduler runs on the main thread, so a
 * long frame (a level being built, a slow phone) must never leave the audio thread without notes.
 */
const LOOKAHEAD = 1.5;
const TICK_MS = 200;

export class MusicEngine {
  private readonly ctx: AudioContext;
  readonly out: GainNode;
  private readonly reverbIn: GainNode;
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextTime = 0;
  private step = 0; // eighth notes
  private root = 60;
  private flavour: Flavour = 'major';
  private calm = false;
  private pending?: { root: number; flavour: Flavour; calm: boolean };
  private lastMel = 0;
  private playing = false;
  /** Per-session bus: stopping cuts off the notes already scheduled ahead. */
  private bus?: GainNode;
  private hats?: AudioNode;
  private snare?: AudioNode;

  constructor(ctx: AudioContext, dest: AudioNode, reverb: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 5200;
    this.out.connect(tone).connect(dest);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0.55;
    this.out.connect(this.reverbIn).connect(reverb);
  }

  get key() {
    return { root: this.root, flavour: this.flavour, scale: PENTA[this.flavour] };
  }

  /** Change key and feel at the next bar (immediately if not playing). */
  setMood(root: number, flavour: Flavour, calm: boolean) {
    if (!this.playing) {
      this.root = root;
      this.flavour = flavour;
      this.calm = calm;
      return;
    }
    if (root !== this.root || flavour !== this.flavour || calm !== this.calm) this.pending = { root, flavour, calm };
  }

  start(volume: number) {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(volume, t + 2.5);
    if (this.playing) return;
    this.playing = true;
    this.openBus();
    this.nextTime = t + 0.1;
    this.step = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  /** Fresh bus with the shared percussion filters (one filter each instead of one per hit). */
  private openBus() {
    const c = this.ctx;
    const bus = c.createGain();
    bus.connect(this.out);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    hp.connect(bus);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    bp.connect(bus);
    this.bus = bus;
    this.hats = hp;
    this.snare = bp;
  }

  setVolume(v: number) {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(v, t, 0.15);
  }

  stop() {
    if (!this.playing) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.8);
    this.playing = false;
    clearInterval(this.timer);
    this.timer = undefined;
    // notes already scheduled ahead fade with the bus and are then cut off
    const bus = this.bus;
    this.bus = undefined;
    if (bus) {
      bus.gain.setTargetAtTime(0, t, 0.2);
      setTimeout(() => bus.disconnect(), 1500);
    }
  }

  private get beat() {
    return 60 / (this.calm ? 62 : 74);
  }

  private schedule() {
    if (this.ctx.state !== 'running' || !this.bus) return;
    const now = this.ctx.currentTime;
    const half = this.beat / 2;
    // after a stall longer than the lookahead, skip the missed eighths but stay on the beat grid
    if (this.nextTime < now + 0.02) {
      const missed = Math.ceil((now + 0.05 - this.nextTime) / half);
      this.nextTime += missed * half;
      this.step += missed;
    }
    while (this.nextTime < now + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.beat / 2;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const barStep = step % 16; // 2 bars of 4/4 per chord, in eighths
    if (barStep === 0 && this.pending) {
      ({ root: this.root, flavour: this.flavour, calm: this.calm } = this.pending);
      this.pending = undefined;
    }
    const chordIdx = Math.floor(step / 16) % 4;
    const [off, voicing] = CHORDS[this.flavour][chordIdx]!;
    const chordRoot = this.root + off - 12;
    const swing = step % 2 ? this.beat * 0.08 : 0;
    const tt = t + swing;

    if (barStep === 0) {
      this.pad(voicing.map((v) => midiHz(chordRoot + 12 + v)), tt, this.beat * 8.4);
      this.bass(midiHz(chordRoot - 12 + (chordRoot < 50 ? 12 : 0)), tt, this.beat * 3);
    }
    if (barStep === 8 && !this.calm) this.bass(midiHz(chordRoot - 12 + (chordRoot < 50 ? 12 : 0) + 7), tt, this.beat * 2);

    // melody: sparse pentatonic notes that lean toward chord tones
    const p = this.calm ? 0.2 : 0.32;
    if (Math.random() < (step % 4 === 0 ? p + 0.15 : p)) {
      const scale = PENTA[this.flavour];
      let deg = this.lastMel + Math.round((Math.random() - 0.5) * 4);
      deg = Math.max(0, Math.min(9, deg));
      this.lastMel = deg;
      const note = this.root + 12 + scale[deg % 5]! + 12 * Math.floor(deg / 5);
      this.keys(midiHz(note), tt + (Math.random() - 0.5) * 0.02, 0.1 + Math.random() * 0.08);
      if (Math.random() < 0.18) this.keys(midiHz(note + 12), tt + this.beat * 0.25, 0.05);
    }
    if (!this.calm) {
      if (step % 2 === 1) this.shaker(tt, step % 4 === 3 ? 0.05 : 0.03);
      if (barStep === 0 || barStep === 8) this.kick(tt);
      if (barStep === 4 || barStep === 12) this.snap(tt);
    }
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  /** A whole chord through one filter and one envelope; the outer notes get a detuned twin for width. */
  private pad(freqs: number[], t: number, dur: number) {
    const c = this.ctx;
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(800, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.034, t + 1.6);
    g.gain.setValueAtTime(0.034, t + dur - 1.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    lp.connect(g).connect(this.bus!);
    freqs.forEach((f, i) => {
      const dets = i === 0 || i === freqs.length - 1 ? [-7, 7] : [i % 2 ? 5 : -5];
      for (const det of dets) {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.7);
      }
    });
  }

  private keys(f: number, t: number, vel: number) {
    const c = this.ctx;
    const g = c.createGain();
    this.env(g, t, 0.008, vel, 1.6);
    g.connect(this.bus!);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    this.env(g2, t, 0.005, vel * 0.25, 0.5);
    o2.connect(g2).connect(this.bus!);
    for (const x of [o, o2]) {
      x.start(t);
      x.stop(t + 1.8);
    }
  }

  private bass(f: number, t: number, dur: number) {
    const c = this.ctx;
    const g = c.createGain();
    this.env(g, t, 0.03, 0.11, dur);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g).connect(this.bus!);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  private noise?: AudioBuffer;
  private noiseBuf() {
    if (!this.noise) {
      const c = this.ctx;
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private shaker(t: number, vel: number) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf();
    const g = c.createGain();
    this.env(g, t, 0.004, vel, 0.07);
    src.connect(g).connect(this.hats!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.1);
  }

  private kick(t: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    this.env(g, t, 0.004, 0.16, 0.22);
    o.connect(g).connect(this.bus!);
    o.start(t);
    o.stop(t + 0.3);
  }

  private snap(t: number) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf();
    const g = c.createGain();
    this.env(g, t, 0.003, 0.06, 0.12);
    src.connect(g).connect(this.snare!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.15);
  }
}
