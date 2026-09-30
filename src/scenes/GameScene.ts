import Phaser from 'phaser';
import { Game } from '../core/Game.ts';
import { makeRng } from '../core/rng.ts';
import { hintPlane, shuffleBoard } from '../core/Solver.ts';
import { DIR_VEC, type GameEvent, type LevelData, type PlaneData } from '../core/types.ts';
import { cellSize, REGION, THEME, W } from '../config.ts';
import { planeKey } from '../data/assets.ts';
import { COLOR_HEX, OUTLINE_HEX } from '../data/colors.ts';
import { loadLevel } from '../data/levelSource.ts';
import { TUNING, type BoosterId } from '../data/tuning.ts';
import { services } from '../systems/services.ts';
import { BoosterBar } from '../ui/BoosterBar.ts';
import { FONT, label } from '../ui/Button.ts';
import { Hud } from '../ui/Hud.ts';
import { Popup } from '../ui/Popup.ts';
import { queuePoints } from '../ui/queueShapes.ts';
import { Button } from '../ui/Button.ts';

const ROT = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 } as const;
const QUEUE_SLOTS = 16;
const TUTORIAL = ['Tap a plane to send it out.', 'Planes park at a gate and board passengers of the same color.', 'A blocked plane bumps. Clear the way first.'];

type View = Phaser.GameObjects.Container;

export class GameScene extends Phaser.Scene {
  private levelNo = 1;
  private level!: LevelData;
  private g!: Game;
  private cell = 100;
  private ox = 0;
  private oy = 0;
  private views = new Map<number, View>(); // plane id -> sprite, apron and gates
  private cur = new Map<number, PlaneData>(); // plane id -> where it stands on the apron now
  private pax = new Map<number, View>(); // queue index -> passenger sprite
  private slotPts: { x: number; y: number }[] = [];
  private paxSize = 64;
  private gateGfx: Phaser.GameObjects.GameObject[] = [];
  private gateText: Phaser.GameObjects.Text[] = [];
  private queueText!: Phaser.GameObjects.Text;
  private hud!: Hud;
  private bar!: BoosterBar;
  private hand?: Phaser.GameObjects.Image;
  private bubble?: Phaser.GameObjects.Container;
  private popup?: Popup;
  private busy = false;
  private alive = true;
  private colorblind = false;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }) {
    this.levelNo = data.level ?? services().save.data.level;
    this.views = new Map();
    this.cur = new Map();
    this.pax = new Map();
    this.gateGfx = [];
    this.gateText = [];
    this.busy = false;
    this.alive = true;
    this.popup = undefined;
    this.hand = undefined;
    this.bubble = undefined;
  }

  async create() {
    this.events.once('shutdown', () => (this.alive = false));
    this.cameras.main.setBackgroundColor(THEME.sky);
    const wait = this.add.text(W / 2, 900, 'Preparing level...', { fontFamily: FONT, fontSize: '54px', color: '#FFFFFF' }).setOrigin(0.5);
    try {
      this.level = await loadLevel(this.levelNo);
    } catch (e) {
      wait.setText('Could not load level');
      console.error(e);
      return;
    }
    if (!this.alive) return;
    wait.destroy();
    this.build();
    // pause when the app goes to the background
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this));
  }

  // ---------- building ----------

  private build() {
    const s = services();
    this.colorblind = s.save.data.settings.colorblind;
    this.g = Game.create(this.level);
    this.cell = cellSize(this.level.cols, this.level.rows);
    const boardW = this.level.cols * this.cell;
    const boardH = this.level.rows * this.cell;
    this.ox = (W - boardW) / 2;
    this.oy = REGION.apron.y + (REGION.apron.h - boardH) / 2;

    this.drawBackground();
    this.drawApron(boardW, boardH);
    this.level.planes.forEach((p) => this.views.set(p.id, this.makePlane(p)));

    const box = { x: 90, y: REGION.queue.y + 40, w: W - 180, h: REGION.queue.h - 70 };
    this.slotPts = queuePoints(this.level.queueShape, QUEUE_SLOTS, box);
    // passengers are sized to the gap between neighbouring slots so they never overlap
    this.paxSize = Math.min(72, Math.floor(Math.min(...this.slotPts.slice(1).map((p, i) => Math.hypot(p.x - this.slotPts[i]!.x, p.y - this.slotPts[i]!.y))) * 0.92));
    this.drawQueueTrack();
    this.queueText = this.add.text(W - 60, REGION.queue.y + REGION.queue.h - 20, '', { fontFamily: FONT, fontSize: '40px', color: '#FFFFFF', stroke: '#1B2340', strokeThickness: 8 }).setOrigin(1, 1).setDepth(30);
    this.syncQueue(false);
    this.buildGates();

    this.hud = new Hud(this, this.levelNo, () => this.showPause(), () => this.scene.restart({ level: this.levelNo }));
    this.hud.setDepth(60);
    this.bar = new BoosterBar(this, (id) => this.useBooster(id));
    this.bar.setDepth(60);
    this.showTutorial();
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(THEME.skyDark, 1).fillRect(0, REGION.queue.y, W, REGION.queue.h + REGION.gate.h);
    g.fillStyle(0x1e2a44, 1).fillRect(0, REGION.hud.h, W, 0); // reserved
  }

  private drawApron(w: number, h: number) {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(THEME.apron, 1).fillRoundedRect(this.ox - 16, this.oy - 16, w + 32, h + 32, 28);
    g.lineStyle(4, THEME.taxiLine, 0.4);
    const dash = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      for (let d = 0; d < len; d += 36) {
        const a = d / len, b = Math.min(len, d + 20) / len;
        g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
      }
    };
    for (let c = 1; c < this.level.cols; c++) dash(this.ox + c * this.cell, this.oy, this.ox + c * this.cell, this.oy + h);
    for (let r = 1; r < this.level.rows; r++) dash(this.ox, this.oy + r * this.cell, this.ox + w, this.oy + r * this.cell);
  }

  private drawQueueTrack() {
    const g = this.add.graphics().setDepth(2);
    const pts = this.slotPts;
    g.lineStyle(this.paxSize + 12, 0x3d6f93, 0.55);
    g.beginPath().moveTo(pts[0]!.x, pts[0]!.y);
    pts.forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();
    g.fillStyle(THEME.taxiLine, 0.9).fillCircle(pts[0]!.x, pts[0]!.y, 12); // head marker
  }

  // ---------- sprites ----------

  private symbol(color: number, size: number) {
    return this.add.image(0, 0, `symbol${color}`).setDisplaySize(size, size);
  }

  private planeCenter(p: PlaneData) {
    const [dx, dy] = DIR_VEC[p.dir];
    const k = (p.length - 1) / 2;
    return { x: this.ox + (p.x - dx * k + 0.5) * this.cell, y: this.oy + (p.y - dy * k + 0.5) * this.cell };
  }

  private makePlane(p: PlaneData): View {
    this.cur.set(p.id, p);
    const c = this.add.container(0, 0).setDepth(10);
    c.add(this.add.image(0, 0, planeKey(p.length, p.color)).setDisplaySize(this.cell, this.cell * p.length));
    if (this.colorblind) c.add(this.symbol(p.color, this.cell * 0.5));
    c.setSize(this.cell, this.cell * p.length);
    this.placePlane(c, p);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.onTap(p.id));
    return c;
  }

  private placePlane(c: View, p: PlaneData) {
    const { x, y } = this.planeCenter(p);
    c.setPosition(x, y).setRotation(ROT[p.dir]).setScale(1).setAlpha(1);
    const sym = c.list[1] as Phaser.GameObjects.Image | undefined;
    sym?.setRotation(-c.rotation);
  }

  private slotRect(i: number) {
    const n = this.g.gate.length;
    const w = Math.min(160, (W - 80) / n - 12);
    const total = n * (w + 12) - 12;
    return { x: (W - total) / 2 + i * (w + 12) + w / 2, y: REGION.gate.y + REGION.gate.h / 2, w, h: REGION.gate.h - 16 };
  }

  private buildGates() {
    this.gateGfx.forEach((o) => o.destroy());
    this.gateText.forEach((o) => o.destroy());
    this.gateGfx = [];
    this.gateText = [];
    this.g.gate.forEach((_, i) => {
      const r = this.slotRect(i);
      const gfx = this.add.graphics().setDepth(3);
      gfx.fillStyle(THEME.gateFree, 1).fillRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 18);
      gfx.lineStyle(5, THEME.gateEdge, 0.9).strokeRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 18);
      const num = this.add.text(r.x - r.w / 2 + 12, r.y - r.h / 2 + 6, String(i + 1), { fontFamily: FONT, fontSize: '28px', color: '#FDD835' }).setDepth(4);
      const fill = this.add.text(r.x, r.y + r.h / 2 - 6, '', { fontFamily: FONT, fontSize: '28px', color: '#FFFFFF', stroke: '#1B2340', strokeThickness: 6 }).setOrigin(0.5, 1).setDepth(12);
      this.gateGfx.push(gfx, num);
      this.gateText.push(fill);
    });
    this.g.gate.forEach((pid, i) => {
      if (pid === null) return;
      this.dockPlane(this.views.get(pid)!, i);
      this.updateFill(i);
    });
  }

  /** Scale a plane sprite to sit upright in a gate slot. */
  private gateScale(p: PlaneData, slot: number) {
    const r = this.slotRect(slot);
    return Math.min((r.h - 44) / (this.cell * p.length), (r.w - 12) / this.cell);
  }

  private dockPlane(v: View, slot: number) {
    const pid = this.g.gate[slot]!;
    const p = this.g.planeInfo(pid);
    const r = this.slotRect(slot);
    v.setPosition(r.x, r.y - 10).setRotation(0).setScale(this.gateScale(p, slot)).setDepth(11);
    (v.list[1] as Phaser.GameObjects.Image | undefined)?.setRotation(0);
  }

  private updateFill(slot: number) {
    const pid = this.g.gate[slot];
    this.gateText[slot]?.setText(pid === null || pid === undefined ? '' : `${this.g.filled.get(pid)}/${Game.capacity(this.g.planeInfo(pid))}`);
  }

  private makePassenger(idx: number): View {
    const color = this.g.queue[idx]!;
    const size = this.paxSize;
    const c = this.add.container(0, 0).setDepth(20);
    // artwork per color; a neutral sprite tinted in code covers any extra color
    const tex = this.textures.exists(`passenger${color}`) ? `passenger${color}` : 'passengerNeutral';
    const img = this.add.image(0, 0, tex).setDisplaySize(size, size);
    if (tex === 'passengerNeutral') img.setTint(COLOR_HEX[color]);
    c.add(img);
    if (this.colorblind) c.add(this.symbol(color, size * 0.4));
    return c;
  }

  /** Make queue sprites match `queueIdx`: create those entering the window, slide the rest forward. */
  private syncQueue(animate: boolean, rebuild = false) {
    if (rebuild) {
      this.pax.forEach((v) => v.destroy());
      this.pax.clear();
    }
    const head = this.g.queueIdx;
    for (const [i, v] of this.pax) {
      if (i < head) {
        v.destroy();
        this.pax.delete(i);
      }
    }
    for (let i = head; i < Math.min(head + QUEUE_SLOTS, this.g.queue.length); i++) {
      const target = this.slotPts[i - head]!;
      let v = this.pax.get(i);
      if (!v) {
        v = this.makePassenger(i);
        v.setPosition(target.x, target.y).setAlpha(animate ? 0 : 1);
        this.pax.set(i, v);
        if (animate) this.tweens.add({ targets: v, alpha: 1, duration: 150 });
      } else if (animate) this.tweens.add({ targets: v, x: target.x, y: target.y, duration: 90 });
      else v.setPosition(target.x, target.y);
    }
    this.queueText.setText(`${this.g.queue.length - head} left`);
  }

  // ---------- input and event playback ----------

  private onTap(id: number) {
    if (this.busy || this.popup || this.g.status !== 'playing') return;
    this.clearHint();
    void this.play(this.g.tap(id));
  }

  private tweenP(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }

  private async play(events: GameEvent[]) {
    this.busy = true;
    try {
      for (const e of events) {
        if (!this.alive) return;
        await this.handle(e);
      }
    } finally {
      this.busy = false;
    }
    if (!this.alive) return;
    if (this.g.status === 'won') this.onWon();
    else if (this.g.status === 'failed') this.onFailed();
    else this.showHint();
  }

  private async handle(e: GameEvent) {
    const a = services().audio;
    switch (e.type) {
      case 'PLANE_BUMP': {
        const v = this.views.get(e.plane)!;
        a.play('bump');
        a.haptic('light');
        const x0 = v.x;
        await this.tweenP({ targets: v, x: x0 + 10, duration: TUNING.bumpMs / 6, yoyo: true, repeat: 2 });
        v.x = x0;
        break;
      }
      case 'PLANE_TAXI': {
        const v = this.views.get(e.plane)!;
        const p = this.g.planeInfo(e.plane);
        const cur = { x: v.x, y: v.y };
        const [dx, dy] = DIR_VEC[this.cur.get(e.plane)!.dir];
        v.setDepth(50);
        a.play('taxi');
        // leg 1: straight out along the nose direction until the plane has left the apron
        const half = (this.cell * p.length) / 2;
        const toEdge = dx > 0 ? this.ox + this.level.cols * this.cell - cur.x : dx < 0 ? cur.x - this.ox : dy > 0 ? this.oy + this.level.rows * this.cell - cur.y : cur.y - this.oy;
        const dist = toEdge + half + 10;
        await this.tweenP({ targets: v, x: cur.x + dx * dist, y: cur.y + dy * dist, duration: (dist / TUNING.taxiPxPerSec) * 1000, ease: 'Quad.In' });
        // leg 2: swing round into the gate slot
        const r = this.slotRect(e.gate);
        const sym = v.list[1] as Phaser.GameObjects.Image | undefined;
        const tgtRot = 0;
        const rot0 = v.rotation;
        await this.tweenP({
          targets: v,
          x: r.x,
          y: r.y - 10,
          scale: this.gateScale(p, e.gate),
          duration: 320,
          ease: 'Sine.InOut',
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            v.rotation = Phaser.Math.Angle.Wrap(rot0) * (1 - tw.progress) + tgtRot * tw.progress;
            sym?.setRotation(-v.rotation);
          },
        });
        v.setRotation(0).setDepth(11);
        break;
      }
      case 'PLANE_PARKED':
        this.updateFill(e.gate);
        break;
      case 'PASSENGER_BOARDED': {
        const pv = this.pax.get(e.queueIndex);
        const plane = this.views.get(e.plane)!;
        const cap = Game.capacity(this.g.planeInfo(e.plane));
        if (pv) {
          this.pax.delete(e.queueIndex);
          pv.setDepth(55);
          await this.tweenP({ targets: pv, x: plane.x, y: plane.y, scale: 0.4, duration: TUNING.boardMs, ease: 'Sine.In' });
          pv.destroy();
        }
        // fill count shown as if this passenger is now aboard
        this.gateText[e.gate]?.setText(`${e.seat + 1}/${cap}`);
        a.tick((e.seat + 1) / cap);
        this.syncQueueAfter(e.queueIndex + 1);
        break;
      }
      case 'PLANE_DEPARTED': {
        const v = this.views.get(e.plane)!;
        a.play('takeoff');
        this.emitPuff(v.x, v.y);
        this.gateText[e.gate]?.setText('');
        this.views.delete(e.plane);
        v.setDepth(55);
        await this.tweenP({ targets: v, y: v.y - 260, scale: v.scale * 1.5, alpha: 0, duration: TUNING.takeoffMs, ease: 'Quad.In' });
        v.destroy();
        break;
      }
      case 'LEVEL_WON':
      case 'LEVEL_FAILED':
        break;
    }
  }

  /** During event playback the core has already advanced; move sprites using the playback position instead. */
  private syncQueueAfter(nextHead: number) {
    for (let i = nextHead; i < Math.min(nextHead + QUEUE_SLOTS, this.g.queue.length); i++) {
      const target = this.slotPts[i - nextHead]!;
      let v = this.pax.get(i);
      if (!v) {
        v = this.makePassenger(i);
        v.setPosition(target.x, target.y).setAlpha(0);
        this.pax.set(i, v);
        this.tweens.add({ targets: v, alpha: 1, duration: 150 });
      } else this.tweens.add({ targets: v, x: target.x, y: target.y, duration: 90 });
    }
    this.queueText.setText(`${this.g.queue.length - nextHead} left`);
  }

  private emitPuff(x: number, y: number) {
    const em = this.add.particles(x, y, 'puff', { speed: { min: 60, max: 180 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 500, emitting: false }).setDepth(54);
    em.explode(10);
    this.time.delayedCall(700, () => em.destroy());
  }

  // ---------- tutorial ----------

  private showTutorial() {
    if (this.levelNo > 3 || services().save.data.tutorialSeen) return;
    const text = TUTORIAL[this.levelNo - 1]!;
    const t = this.add.text(0, 0, text, { fontFamily: 'KenVectorThin, sans-serif', fontSize: '36px', color: '#1B2340', align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, 620, t.height + 50, 0xffffff, 0.95).setStrokeStyle(6, OUTLINE_HEX);
    this.bubble = this.add.container(W / 2, REGION.queue.y + REGION.queue.h / 2 + 10, [bg, t]).setDepth(40);
    this.showHint();
  }

  private showHint() {
    if (!this.bubble || this.g.status !== 'playing') return;
    const id = hintPlane(this.g);
    const v = id === undefined ? undefined : this.views.get(id);
    this.clearHint();
    if (!v) return;
    this.hand = this.add.image(v.x + this.cell * 0.2, v.y + this.cell * 0.4, 'hand').setDisplaySize(90, 90).setDepth(45);
    this.tweens.add({ targets: this.hand, y: this.hand.y + 24, duration: 450, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hand?.destroy();
    this.hand = undefined;
  }

  // ---------- boosters ----------

  private useBooster(id: BoosterId) {
    if (this.busy || this.popup || this.g.status !== 'playing') return;
    const eco = services().economy;
    const attempt = () => this.applyBooster(id);
    if (eco.count(id) > 0) {
      if (attempt()) eco.use(id);
      this.bar.refresh();
      return;
    }
    const cost = TUNING.boosterCost[id];
    let granted = false;
    this.openPopup({
      title: 'Get booster',
      body: `Use it now for ${cost} coins, or watch an ad.`,
      buttons: [
        {
          text: `${cost} coins`,
          keepOpen: true,
          onClick: () => {
            if (eco.coins < cost) return this.toast('Not enough coins');
            if (attempt()) {
              eco.buy(id);
              this.hud.coins.refresh();
            }
            this.popup?.close();
            this.popup = undefined;
          },
        },
        {
          text: 'Watch ad',
          onClick: async () => {
            this.popup = undefined;
            if (granted || !(await services().ads.showRewarded())) return;
            granted = true;
            if (!attempt()) eco.add(id); // keep the reward if it had no effect right now
            this.bar.refresh();
          },
        },
        { text: 'Cancel', onClick: () => (this.popup = undefined) },
      ],
    });
  }

  private applyBooster(id: BoosterId): boolean {
    switch (id) {
      case 'extraGate':
        this.g.addGate();
        this.buildGates();
        return true;
      case 'sortQueue':
        if (!this.g.sortQueue()) return this.toast('Queue is already sorted'), false;
        this.syncQueue(false, true);
        return true;
      case 'shuffleBoard':
        if (this.g.board.count < 2) return this.toast('Nothing to shuffle'), false;
        this.reshuffle();
        return true;
    }
  }

  private reshuffle() {
    shuffleBoard(this.g, makeRng(Date.now()));
    this.busy = true;
    this.tweens.add({
      targets: [...this.views].filter(([id]) => this.g.board.has(id)).map(([, v]) => v),
      alpha: 0,
      duration: 120,
      onComplete: () => {
        for (const p of this.g.board.list()) {
          const v = this.views.get(p.id)!;
          this.cur.set(p.id, p);
          this.placePlane(v, p);
          v.removeAllListeners('pointerdown').on('pointerdown', () => this.onTap(p.id));
          v.setAlpha(0);
          this.tweens.add({ targets: v, alpha: 1, duration: 200 });
        }
        this.busy = false;
        this.showHint();
      },
    });
  }

  private toast(msg: string) {
    const t = label(this, W / 2, 1560, msg, 44, '#FFFFFF').setStroke('#1B2340', 10).setDepth(1200);
    this.tweens.add({ targets: t, y: 1480, alpha: 0, duration: 1200, delay: 300, onComplete: () => t.destroy() });
    return true;
  }

  // ---------- popups and results ----------

  private openPopup(opts: ConstructorParameters<typeof Popup>[1]) {
    this.popup = new Popup(this, opts);
    this.popup.once(Phaser.GameObjects.Events.DESTROY, () => (this.popup = undefined));
    return this.popup;
  }

  private onHidden() {
    if (this.alive && this.g && this.g.status === 'playing' && !this.popup) this.showPause();
  }

  private showPause() {
    if (this.popup) return;
    const s = services();
    this.openPopup({
      title: 'Paused',
      buttons: [
        { text: 'Resume', onClick: () => undefined },
        { text: 'Restart', onClick: () => this.scene.restart({ level: this.levelNo }) },
        { text: 'Home', onClick: () => this.scene.start('Menu') },
      ],
      height: 800,
      content: (c, y) => {
        const mk = (x: number, name: string, key: 'sound' | 'music') => {
          const b = new Button(this, x, y + 20, 300, 100, '', () => {
            s.save.data.settings[key] = !s.save.data.settings[key];
            s.save.save();
            s.audio.syncMusic();
            b.text.setText(`${name} ${s.save.data.settings[key] ? 'On' : 'Off'}`);
          }, { small: true, size: 36 });
          b.text.setText(`${name} ${s.save.data.settings[key] ? 'On' : 'Off'}`);
          c.add(b);
        };
        mk(-170, 'Sound', 'sound');
        mk(170, 'Music', 'music');
      },
    });
  }

  private onWon() {
    const s = services();
    s.audio.play('win');
    const reward = s.economy.claimWinReward();
    if (s.save.data.level === this.levelNo) s.save.data.level = this.levelNo + 1;
    if (this.levelNo >= 3) s.save.data.tutorialSeen = true;
    s.save.save();
    this.hud.coins.refresh();
    this.bubble?.destroy();
    this.confetti();
    let doubled = false;
    this.time.delayedCall(500, () => {
      if (!this.alive) return;
      const body = `+${reward.base} coins` + (reward.daily ? `\n+${reward.daily} daily bonus` : '');
      this.openPopup({
        title: 'Level complete!',
        body,
        height: 720,
        buttons: [
          {
            text: 'Double coins (ad)',
            keepOpen: true,
            onClick: async () => {
              if (doubled) return;
              doubled = true;
              if (await s.ads.showRewarded()) {
                s.economy.addCoins(reward.total);
                s.audio.play('coin');
                this.hud.coins.refresh();
                this.toast(`+${reward.total} coins`);
              } else doubled = false;
            },
          },
          {
            text: 'Next level',
            onClick: async () => {
              this.popup = undefined;
              await s.ads.maybeShowInterstitial(this.levelNo);
              this.scene.restart({ level: this.levelNo + 1 });
            },
          },
        ],
      });
    });
  }

  private confetti() {
    const em = this.add.particles(W / 2, 700, 'sparkStar', { speed: { min: 300, max: 800 }, angle: { min: 200, max: 340 }, gravityY: 900, scale: { start: 0.8, end: 0.1 }, lifespan: 1400, tint: [...COLOR_HEX], emitting: false }).setDepth(900);
    em.explode(60);
    this.time.delayedCall(1800, () => em.destroy());
  }

  private onFailed() {
    const s = services();
    s.audio.play('fail');
    this.bubble?.destroy();
    let revived = false;
    this.time.delayedCall(400, () => {
      if (!this.alive) return;
      this.openPopup({
        title: 'Deadlock!',
        body: 'Every gate is full and nobody can board.',
        height: 820,
        buttons: [
          {
            text: 'Revive (ad)',
            keepOpen: true,
            onClick: async () => {
              if (revived) return;
              revived = true;
              if (await s.ads.showRewarded()) {
                this.popup?.close();
                this.popup = undefined;
                this.g.addGate();
                this.buildGates();
                this.showHint();
              } else revived = false;
            },
          },
          { text: 'Retry', onClick: () => this.scene.restart({ level: this.levelNo }) },
          { text: 'Home', onClick: () => this.scene.start('Menu') },
        ],
      });
    });
  }
}
