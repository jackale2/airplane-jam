import Phaser from 'phaser';
import { view } from '../config.ts';
import { logLevelCheck } from '../core/devChecks.ts';
import { Game } from '../core/Game.ts';
import { makeRng } from '../core/rng.ts';
import { hintPlane, shuffleBoard } from '../core/Solver.ts';
import type { GameEvent, LevelData, PlaneData } from '../core/types.ts';
import { COLOR_HEX } from '../data/colors.ts';
import { loadLevel, loadZenLevel } from '../data/levelSource.ts';
import { TUNING, type BoosterId } from '../data/tuning.ts';
import { BoardView } from '../layout/boardView.ts';
import { fitBoard, gameLayout, type GameLayout, type Rect } from '../layout/view.ts';
import { destinationFor, DESTINATIONS } from '../meta/destinations.ts';
import { BOOSTER_UNLOCK, isHardLevel, starsFor, type Stars, type WinReward } from '../meta/progress.ts';
import type { LevelResult, MetaNotice } from '../systems/MetaManager.ts';
import { ensureLivery } from '../systems/artLoader.ts';
import { services } from '../systems/services.ts';
import { Button } from '../ui/Button.ts';
import { confetti, floatText, forever, puff, ring, sparkle } from '../ui/fx.ts';
import { icon } from '../ui/icons.ts';
import { Popup, toast } from '../ui/Popup.ts';
import { queuePoints } from '../ui/queueShapes.ts';
import { palette, sceneryTex, type Pal, type ThemeId } from '../ui/scenery.ts';
import { fmt, text, UI } from '../ui/theme.ts';
import { BaseScene } from './BaseScene.ts';
import { drawTray, PlaneView } from './game/board.ts';
import { Coach } from './game/coach.ts';
import { GateRow } from './game/gates.ts';
import { BOOSTER_INFO, BoosterBar, GameHud } from './game/hud.ts';
import { characterFor, drawWalkway, idleBob, makePax } from './game/queue.ts';

const QUEUE_SLOTS = 14;
const HOP_MS = 270;

type Mode = 'level' | 'zen';
type QItem =
  | { kind: 'board'; e: Extract<GameEvent, { type: 'PASSENGER_BOARDED' }> }
  | { kind: 'depart'; e: Extract<GameEvent, { type: 'PLANE_DEPARTED' }> }
  | { kind: 'chain'; n: number }
  | { kind: 'end'; status: 'won' | 'failed' };

interface WinInfo {
  stars: Stars;
  reward: WinReward;
  result: LevelResult;
}
interface ZenState {
  seed: number;
  boarded: number;
  boards: number;
}
interface Resume {
  g: Game;
  level: LevelData;
  boostersUsed: number;
  continues: number;
  popup: 'pause' | 'win' | 'fail' | null;
  win?: WinInfo;
  zen?: ZenState;
}
export interface GameInit {
  mode?: Mode;
  level?: number;
  resume?: Resume;
}

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, () => r()));

export class GameScene extends BaseScene {
  private mode: Mode = 'level';
  private levelNo = 1;
  private level!: LevelData;
  private g!: Game;
  private L!: GameLayout;
  private bv!: BoardView;
  private pal!: Pal;
  private livery = 'classic';
  private outfit = 'casual';
  private symbols = true;
  private reduced = false;

  // views
  private planes = new Map<number, PlaneView>();
  private cur = new Map<number, PlaneData>(); // where each apron plane stands now
  private pax = new Map<number, Phaser.GameObjects.Container>(); // queue index -> traveler
  private slotPts: { x: number; y: number }[] = [];
  private paxH = 100;
  private gates!: GateRow;
  private hud!: GameHud;
  private bar?: BoosterBar;
  private coach!: Coach;
  private levelObjs: Phaser.GameObjects.GameObject[] = [];
  private leftText?: Phaser.GameObjects.Text;
  private headGlow?: Phaser.GameObjects.Image;

  // animation state
  private shownHead = 0;
  private boardQ: QItem[] = [];
  private working = false;
  private running = 0;
  private idleWaiters: (() => void)[] = [];
  private gateFree: Promise<void>[] = [];
  private freeGate = new Map<number, () => void>();
  private arrivals = new Map<number, Promise<void>>();
  private landings = new Map<number, Promise<void>>();

  // session
  private boostersUsed = 0;
  private continues = 0;
  private popup?: Popup;
  private popupKind: Resume['popup'] = null;
  private win?: WinInfo;
  private zen?: ZenState;
  private alive = true;
  private ready = false;
  private pendingRelayout = false;
  private lastInput = 0;
  private hintObjs: Phaser.GameObjects.GameObject[] = [];
  private tutorialStep = 0;
  private notices: string[] = [];
  private noticeBusy = false;
  private resumeData?: Resume;

  constructor() {
    super('Game');
  }

  init(data: GameInit) {
    const s = services();
    this.mode = data.mode ?? 'level';
    this.levelNo = data.level ?? s.save.data.level;
    this.resumeData = data.resume;
    this.planes = new Map();
    this.cur = new Map();
    this.pax = new Map();
    this.levelObjs = [];
    this.boardQ = [];
    this.working = false;
    this.running = 0;
    this.idleWaiters = [];
    this.gateFree = [];
    this.freeGate = new Map();
    this.arrivals = new Map();
    this.landings = new Map();
    this.boostersUsed = data.resume?.boostersUsed ?? 0;
    this.continues = data.resume?.continues ?? 0;
    this.popup = undefined;
    this.popupKind = null;
    this.win = data.resume?.win;
    this.zen = data.resume?.zen ?? (this.mode === 'zen' ? { seed: (Date.now() % 100000) + s.save.data.stats.zenBoards, boarded: 0, boards: 0 } : undefined);
    this.alive = true;
    this.ready = false;
    this.pendingRelayout = false;
    this.hintObjs = [];
    this.tutorialStep = 0;
    this.notices = [];
    this.noticeBusy = false;
    this.shuffling = false;
  }

  async create() {
    this.setup();
    const s = services();
    this.events.once('shutdown', () => {
      this.alive = false;
      this.idleWaiters.forEach((f) => f());
    });
    this.livery = s.save.data.cosmetics.livery;
    this.outfit = s.save.data.cosmetics.outfit;
    this.symbols = s.save.data.settings.symbols;
    this.reduced = s.save.data.settings.reducedMotion;
    this.L = gameLayout(view);
    const destLevel = this.mode === 'zen' ? s.save.data.level : this.levelNo;
    const theme = s.save.data.cosmetics.theme as ThemeId;
    this.pal = palette(destinationFor(destLevel).index, theme);
    this.moodFor(destLevel, this.mode === 'zen');

    // background first so a slow level load shows something nice
    const gl = this.zenLayout(this.L).gates;
    const terminal = this.L.mode === 'wide' ? { y: gl.y - 20, h: gl.h + 40 } : { y: gl.y - 26, h: gl.h + 52 };
    this.add
      .image(0, 0, sceneryTex(this, { dest: destinationFor(destLevel).index, theme, w: view.w, h: view.h, horizon: terminal.y - 16, layout: 'sides', terminal }))
      .setOrigin(0, 0)
      .setScale(1 / view.res)
      .setDepth(-10);

    let spinner: Phaser.GameObjects.Container | undefined;
    const loadingTimer = this.time.delayedCall(250, () => {
      spinner = this.add.container(view.w / 2, view.h / 2, [
        this.add.graphics().fillStyle(0x1f3566, 0.85).fillRoundedRect(-240, -60, 480, 120, 60),
        text(this, 0, 0, 'Preparing level...', 44, { color: '#FFFFFF' }),
      ]).setDepth(500);
    });
    try {
      await ensureLivery(this, this.livery);
      if (this.resumeData) this.level = this.resumeData.level;
      else this.level = this.mode === 'zen' ? await loadZenLevel(this.zen!.seed) : await loadLevel(this.levelNo);
    } catch (e) {
      console.error(e);
      toast(this, 'Could not load the level', view.h / 2);
      this.time.delayedCall(1500, () => this.go('Home'));
      return;
    }
    loadingTimer.remove();
    spinner?.destroy();
    if (!this.alive) return;
    if (this.mode === 'zen') void loadZenLevel(this.zen!.seed + 1); // warm up the next board
    else if (this.levelNo >= 100) void loadLevel(this.levelNo + 1).catch(() => undefined);

    this.g = this.resumeData?.g ?? Game.create(this.level);
    if (import.meta.env.DEV && this.mode === 'level' && !this.resumeData) logLevelCheck(this.level);
    this.buildStatic();
    this.buildLevel(!this.resumeData);
    this.bindInput();
    this.ready = true;
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this));
    if (this.pendingRelayout) {
      // the window changed shape while the level was loading
      this.pendingRelayout = false;
      super.relayout();
      return;
    }

    const r = this.resumeData;
    if (r?.popup === 'pause') this.showPause();
    else if (r?.popup === 'win' && this.win) this.showWin(this.win, false);
    else if (r?.popup === 'fail') this.showFail();
    else if (!r) this.time.delayedCall(this.reduced ? 100 : 750, () => this.afterIntro());
    this.resumeData = undefined;
    if (import.meta.env.DEV) (window as unknown as { __aj: unknown }).__aj = { scene: this, tapHint: () => this.devTapHint() };
  }

  // ---------- building ----------

  private buildStatic() {
    const L = this.zenLayout(this.L);
    this.L = L;
    this.coach = new Coach(this);
    this.hud = new GameHud(this, L.hud, {
      zen: this.mode === 'zen',
      level: this.levelNo,
      hard: this.mode === 'level' && isHardLevel(this.levelNo),
      onPause: () => (this.mode === 'zen' ? this.go('Home') : this.showPause()),
    });
    if (this.zen) this.hud.setZenCount(this.zen.boarded, this.zen.boards);
    if (this.mode === 'level') this.bar = new BoosterBar(this, L.boosters, L.boostersVertical, this.levelNo, (id) => void this.useBooster(id));
  }

  /** Zen has no boosters: give their space to the board (or the queue on wide screens). */
  private zenLayout(L: GameLayout): GameLayout {
    if (this.mode !== 'zen') return L;
    if (L.mode === 'tall') return { ...L, board: { ...L.board, h: L.board.h + L.boosters.h - 20 } };
    if (L.mode === 'compact') return { ...L, board: { ...L.board, w: L.board.w + L.boosters.w + 24 } };
    return { ...L, queue: { ...L.queue, h: L.queue.h + L.boosters.h * 0.5 }, gates: { ...L.gates, y: L.gates.y + L.boosters.h * 0.5 } };
  }

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.levelObjs.push(o);
    return o;
  }

  /** Everything that depends on the level: tray, planes, queue, gates. */
  private buildLevel(entrance: boolean) {
    const L = this.L;
    const fit = fitBoard(L.board, this.level.cols, this.level.rows);
    this.bv = new BoardView(fit, this.level.rows);
    const tray = drawTray(this, this.bv, this.pal);
    this.track(tray.img);
    tray.lights.forEach((l) => this.track(l));

    // planes on the apron
    for (const p of this.g.board.list()) {
      this.cur.set(p.id, p);
      const v = this.makePlaneView(p);
      this.placeOnBoard(v, p);
    }

    // gates
    this.gates = new GateRow(this, L.gates, () => void this.useBooster('extraGate'));
    this.gates.build(this.g.gate.length);
    this.gateFree = this.g.gate.map(() => Promise.resolve());
    this.g.gate.forEach((pid, i) => {
      if (pid === null) return;
      const p = this.g.planeInfo(pid);
      const v = this.makePlaneView(p);
      const d = this.gates.dock(i, p.length, this.bv.cell);
      v.c.setPosition(d.x, d.y).setRotation(0).setScale(d.scale).setDepth(11);
      v.base = d.scale;
      v.arrow.setVisible(false);
      this.gates.setSeats(i, Game.capacity(p), this.g.filled.get(pid) ?? 0, p.color);
      this.arrivals.set(pid, Promise.resolve());
      this.claimGate(i, pid);
    });

    this.buildQueue();
    if (entrance && !this.reduced) this.entrance();
  }

  private makePlaneView(p: PlaneData) {
    const v = new PlaneView(this, p, this.bv.cell, this.livery, this.symbols);
    this.planes.set(p.id, v);
    return v;
  }

  private placeOnBoard(v: PlaneView, p: PlaneData) {
    const c = this.bv.planeCenter(p);
    v.c.setPosition(c.x, c.y).setRotation(this.bv.angle(p.dir)).setScale(1).setAlpha(1).setDepth(10);
    v.arrow.setVisible(true);
    v.sync();
  }

  private buildQueue() {
    const q = this.L.queue;
    const panel = this.track(this.add.graphics().setDepth(2));
    panel.fillStyle(0x0f1c3d, 0.12).fillRoundedRect(q.x, q.y + 12, q.w, q.h - 12, 36);
    panel.fillStyle(this.pal.panel, this.pal.panelA).fillRoundedRect(q.x, q.y + 6, q.w, q.h - 12, 36);
    panel.lineStyle(3, 0xffffff, 0.55).strokeRoundedRect(q.x + 2, q.y + 8, q.w - 4, q.h - 16, 34);

    // passengers are sized to the gap between neighbouring slots; boxes leave headroom for their heads
    let paxH = Math.min(150, q.h * 0.26);
    let pts: { x: number; y: number }[] = [];
    for (let pass = 0; pass < 2; pass++) {
      const box: Rect = { x: q.x + 60, y: q.y + 16 + paxH * 0.95, w: q.w - 120, h: Math.max(60, q.h - paxH * 0.95 - 76) };
      pts = queuePoints(this.level.queueShape, QUEUE_SLOTS, box);
      const gap = Math.min(...pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y)));
      paxH = Math.min(150, q.h * 0.3, gap * 1.55);
    }
    this.slotPts = pts;
    this.paxH = paxH;
    const walk = drawWalkway(this, pts, paxH * 0.62, this.pal);
    this.track(walk.track);
    this.track(walk.posts);

    const head = pts[0]!;
    this.headGlow = this.track(this.add.image(head.x, head.y, 'fx_glow').setTint(0xffe27a).setDepth(15).setDisplaySize(paxH * 1.25, paxH * 0.55));
    forever(this, { targets: this.headGlow, alpha: 0.35, yoyo: true, duration: 700, ease: 'Sine.InOut' });
    const arrow = this.track(icon(this, head.x, q.y + q.h - 22, 'next', 40, 0xffc93c).setRotation(Math.PI / 2).setDepth(16));
    forever(this, { targets: arrow, y: arrow.y + 8, yoyo: true, duration: 500, ease: 'Sine.InOut' });

    // passengers left
    const pill = this.track(this.add.container(q.x + q.w - 120, q.y + q.h - 46).setDepth(30));
    const pg = this.add.graphics().fillStyle(UI.pill, 0.9).fillRoundedRect(-92, -30, 184, 60, 30);
    this.leftText = text(this, 18, 0, '', 34, { color: '#FFFFFF' });
    pill.add([pg, icon(this, -56, 0, 'person', 34, 0xbfd2ff), this.leftText]);

    this.shownHead = this.g.queueIdx;
    this.refreshQueue(false);
  }

  private makeTraveler(idx: number) {
    const c = makePax(this, { color: this.g.queue[idx]!, character: characterFor(this.level.seed, idx), outfit: this.outfit, height: this.paxH, symbols: this.symbols });
    idleBob(this, c, (idx * 137) % 900);
    return c;
  }

  /** Create the travelers in view and move everyone to their slot (animated hop or instant). */
  private refreshQueue(animate: boolean) {
    const head = this.shownHead;
    for (const [i, v] of this.pax) {
      if (i < head || i >= head + QUEUE_SLOTS) {
        v.destroy();
        this.pax.delete(i);
      }
    }
    for (let i = head; i < Math.min(head + QUEUE_SLOTS, this.g.queue.length); i++) {
      const pt = this.slotPts[i - head]!;
      let v = this.pax.get(i);
      if (!v) {
        v = this.makeTraveler(i);
        this.pax.set(i, v);
        v.setPosition(pt.x, pt.y).setDepth(20 + pt.y / 10000);
        if (animate) {
          v.setScale(0);
          this.tweens.add({ targets: v, scale: 1, duration: 260, ease: 'Back.Out' });
        }
      } else if (animate) this.hopTo(v, pt.x, pt.y, 150);
      else v.setPosition(pt.x, pt.y).setDepth(20 + pt.y / 10000);
    }
    this.leftText?.setText(fmt(Math.max(0, this.g.queue.length - head)));
  }

  /** A small hop along the line (a new hop replaces one still in the air). */
  private hopTo(v: Phaser.GameObjects.Container, x: number, y: number, ms: number) {
    const body = v.getData('body') as Phaser.GameObjects.Container;
    (v.getData('hop') as Phaser.Tweens.Tween | undefined)?.stop();
    const from = { x: v.x, y: v.y };
    const t = { p: 0 };
    const tw = this.tweens.add({
      targets: t,
      p: 1,
      duration: ms,
      ease: 'Sine.InOut',
      onUpdate: () => {
        v.setPosition(from.x + (x - from.x) * t.p, from.y + (y - from.y) * t.p);
        body.y = -Math.sin(t.p * Math.PI) * this.paxH * 0.1;
      },
      onComplete: () => {
        body.y = 0;
        v.setDepth(20 + y / 10000);
      },
    });
    v.setData('hop', tw);
  }

  /** Planes drop in, travelers pop in along the line. */
  private entrance() {
    const cx = this.bv.fit.ox + this.bv.width / 2;
    const cy = this.bv.fit.oy + this.bv.height / 2;
    for (const v of this.planes.values()) {
      const d = Math.hypot(v.c.x - cx, v.c.y - cy);
      v.c.setScale(0);
      this.tweens.add({ targets: v.c, scale: 1, duration: 380, delay: 80 + d * 0.45, ease: 'Back.Out' });
    }
    [...this.pax.values()].forEach((v, i) => {
      v.setScale(0);
      this.tweens.add({ targets: v, scale: 1, duration: 300, delay: 150 + i * 35, ease: 'Back.Out' });
    });
    services().audio.play('whoosh');
  }

  update() {
    for (const v of this.planes.values()) v.sync();
    if (this.ready && !this.popup && this.g?.status === 'playing' && !this.busy && this.time.now - this.lastInput > 7000) this.idleHint();
  }

  // ---------- input ----------

  private bindInput() {
    this.lastInput = this.time.now;
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length) return;
      this.onBoardPointer(ptr.worldX, ptr.worldY);
    });
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-ESC', () => !this.popup && (this.mode === 'zen' ? this.go('Home') : this.showPause()));
    kb.on('keydown-P', () => !this.popup && this.mode === 'level' && this.showPause());
    kb.on('keydown-R', () => !this.popup && this.mode === 'level' && this.restartLevel());
    kb.on('keydown-ONE', () => !this.popup && void this.useBooster('extraGate'));
    kb.on('keydown-TWO', () => !this.popup && void this.useBooster('sortQueue'));
    kb.on('keydown-THREE', () => !this.popup && void this.useBooster('shuffleBoard'));
  }

  /** Exact hit on a plane, or the nearest plane within half a 44 px target when cells are small on screen. */
  private onBoardPointer(x: number, y: number) {
    if (!this.canTap()) return;
    const ds = this.scale.displayScale.x / view.res; // design px per CSS px
    const slop = this.bv.cell / ds >= 44 ? 0 : 22 * ds;
    let best = -1;
    let bestD = Infinity;
    for (const p of this.g.board.list()) {
      const r = this.bv.planeRect(p);
      const d = Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1));
      if (d < bestD) {
        bestD = d;
        best = p.id;
      }
    }
    if (best !== -1 && bestD <= slop) this.onTap(best);
  }

  private canTap() {
    return this.ready && this.alive && !this.popup && this.g.status === 'playing' && !this.pendingRelayout && !this.shuffling;
  }

  private shuffling = false;

  private onTap(id: number) {
    this.lastInput = this.time.now;
    this.clearHint();
    const ev = this.g.tap(id);
    if (!ev.length) return;
    if (ev[0]!.type === 'PLANE_BUMP') {
      this.bump(id);
      return;
    }
    this.tutorialTapped();
    const items: QItem[] = [];
    let chain = 0;
    let end: QItem | undefined;
    for (const e of ev) {
      if (e.type === 'PLANE_TAXI') this.taxi(e.plane, e.gate);
      else if (e.type === 'PASSENGER_BOARDED') {
        chain++;
        items.push({ kind: 'board', e });
      } else if (e.type === 'PLANE_DEPARTED') items.push({ kind: 'depart', e });
      else if (e.type === 'LEVEL_WON') end = { kind: 'end', status: 'won' };
      else if (e.type === 'LEVEL_FAILED') end = { kind: 'end', status: 'failed' };
    }
    if (chain) items.push({ kind: 'chain', n: chain });
    if (end) items.push(end);
    this.boardQ.push(...items);
    void this.pump();
  }

  /** Play events that came from outside a tap (booster, continue, zen assist). */
  private playEvents(ev: GameEvent[]) {
    let chain = 0;
    for (const e of ev) {
      if (e.type === 'PASSENGER_BOARDED') {
        chain++;
        this.boardQ.push({ kind: 'board', e });
      } else if (e.type === 'PLANE_DEPARTED') this.boardQ.push({ kind: 'depart', e });
      else if (e.type === 'LEVEL_WON') this.boardQ.push({ kind: 'end', status: 'won' });
      else if (e.type === 'LEVEL_FAILED') this.boardQ.push({ kind: 'end', status: 'failed' });
    }
    if (chain >= 8) this.boardQ.splice(this.boardQ.length - (this.boardQ.at(-1)?.kind === 'end' ? 1 : 0), 0, { kind: 'chain', n: chain });
    void this.pump();
  }

  // ---------- animation bookkeeping ----------

  private get busy() {
    return this.running > 0 || this.working || this.boardQ.length > 0;
  }

  private begin() {
    this.running++;
  }
  private end() {
    this.running = Math.max(0, this.running - 1);
    this.checkIdle();
  }
  private checkIdle() {
    if (this.busy) return;
    const w = this.idleWaiters;
    this.idleWaiters = [];
    w.forEach((f) => f());
    if (this.pendingRelayout && this.alive) {
      this.pendingRelayout = false;
      super.relayout();
    }
  }
  private idle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => this.tweens.add({ ...cfg, onComplete: () => resolve() }));
  }

  /** Register `id` as the next plane for gate `i`; resolves when the previous occupant has left. */
  private claimGate(i: number, id: number) {
    const prev = this.gateFree[i] ?? Promise.resolve();
    let res!: () => void;
    this.gateFree[i] = new Promise((r) => (res = r));
    this.freeGate.set(id, res);
    return prev;
  }

  // ---------- plane motion ----------

  private bump(id: number) {
    const v = this.planes.get(id);
    const p = this.cur.get(id);
    if (!v || !p) return;
    const a = services().audio;
    a.play('bump');
    a.haptic('medium');
    const [dx, dy] = this.bv.vec(p.dir);
    const k = this.bv.cell * 0.16;
    const x0 = v.c.x;
    const y0 = v.c.y;
    this.tweens.add({ targets: v.c, x: x0 + dx * k, y: y0 + dy * k, duration: 70, yoyo: true, ease: 'Quad.Out', onComplete: () => v.c.setPosition(x0, y0) });
    // show who is in the way
    const blocker = this.g.board.blockers(id)[0];
    const bvw = blocker === undefined ? undefined : this.planes.get(blocker);
    if (bvw) {
      bvw.body.setTintFill(0xff5a5f);
      this.time.delayedCall(90, () => bvw.body.clearTint());
      this.time.delayedCall(180, () => bvw.body.setTintFill(0xff5a5f));
      this.time.delayedCall(270, () => bvw.body.clearTint());
      const bx = bvw.c.x;
      this.tweens.add({ targets: bvw.c, x: bx + 6, duration: 45, yoyo: true, repeat: 2, onComplete: () => (bvw.c.x = bx) });
    }
  }

  private taxi(id: number, gate: number) {
    const v = this.planes.get(id)!;
    const p = this.cur.get(id)!;
    this.cur.delete(id);
    const gateReady = this.claimGate(gate, id);
    this.begin();
    const arrival = (async () => {
      const a = services().audio;
      a.play('taxi');
      a.haptic('light');
      v.c.setDepth(50);
      ring(this, v.c.x, v.c.y, COLOR_HEX[p.color]!, this.bv.cell * 0.9, 49);
      // little squash as the engines spool up
      await this.tween({ targets: v.c, scaleX: 1.08, scaleY: 0.92, duration: 70, yoyo: true });
      const [dx, dy] = this.bv.vec(p.dir);
      const dist = this.bv.exitDistance(p) + 24;
      const start = { x: v.c.x, y: v.c.y };
      let lastPuff = 0;
      await this.tween({
        targets: v.c,
        x: start.x + dx * dist,
        y: start.y + dy * dist,
        duration: Math.max(170, (dist / TUNING.taxiPxPerSec) * 1000),
        ease: 'Quad.In',
        onUpdate: (tw: Phaser.Tweens.Tween) => {
          if (!this.reduced && tw.progress - lastPuff > 0.3) {
            lastPuff = tw.progress;
            const half = (p.length * this.bv.cell) / 2;
            puff(this, v.c.x - dx * half, v.c.y - dy * half, 2, 0xffffff, 48);
          }
        },
      });
      if (!this.alive) return;
      await gateReady;
      if (!this.alive) return;
      // curve into the gate, arriving nose up
      v.arrow.setVisible(false);
      const d = this.gates.dock(gate, p.length, this.bv.cell);
      const P0 = new Phaser.Math.Vector2(v.c.x, v.c.y);
      const reach = Math.max(80, Math.hypot(d.x - P0.x, d.y - P0.y) * 0.4);
      const P1 = new Phaser.Math.Vector2(P0.x + dx * reach, P0.y + dy * reach);
      const P3 = new Phaser.Math.Vector2(d.x, d.y);
      const P2 = new Phaser.Math.Vector2(d.x, d.y + reach);
      const curve = new Phaser.Curves.CubicBezier(P0, P1, P2, P3);
      const len = curve.getLength();
      const t = { p: 0 };
      await this.tween({
        targets: t,
        p: 1,
        duration: Math.min(900, Math.max(380, (len / 1500) * 1000)),
        ease: 'Sine.InOut',
        onUpdate: () => {
          const pt = curve.getPoint(t.p);
          const tan = curve.getTangent(Math.min(0.999, Math.max(0.001, t.p)));
          v.c.setPosition(pt.x, pt.y).setRotation(Math.atan2(tan.x, -tan.y)).setScale(1 + (d.scale - 1) * t.p);
        },
      });
      if (!this.alive) return;
      v.c.setPosition(d.x, d.y).setRotation(0).setScale(d.scale).setDepth(11);
      v.base = d.scale;
      this.gates.flash(gate);
      this.gates.setSeats(gate, Game.capacity(p), 0, p.color);
      a.play('park');
      this.tweens.add({ targets: v.c, scaleY: d.scale * 0.94, scaleX: d.scale * 1.05, duration: 80, yoyo: true });
    })().finally(() => this.end());
    this.arrivals.set(id, arrival);
  }

  // ---------- boarding pipeline ----------

  private async pump() {
    if (this.working) return;
    this.working = true;
    try {
      while (this.boardQ.length && this.alive) {
        const it = this.boardQ.shift()!;
        if (it.kind === 'board') await this.boardOne(it.e);
        else if (it.kind === 'depart') await this.depart(it.e);
        else if (it.kind === 'chain') this.praise(it.n);
        else {
          // wait for every animation to finish before the result (still busy, so nothing else starts)
          while (this.running > 0 && this.alive) await wait(this, 40);
          if (it.status === 'won') await this.onWon();
          else await this.onFailed();
        }
      }
    } finally {
      this.working = false;
      this.checkIdle();
    }
  }

  private async boardOne(e: Extract<GameEvent, { type: 'PASSENGER_BOARDED' }>) {
    await this.arrivals.get(e.plane);
    if (!this.alive) return;
    const v = this.planes.get(e.plane);
    const pv = this.pax.get(e.queueIndex);
    this.pax.delete(e.queueIndex);
    this.shownHead = e.queueIndex + 1;
    this.refreshQueue(true);
    const s = services();
    if (this.zen) {
      this.zen.boarded++;
      this.hud.setZenCount(this.zen.boarded, this.zen.boards);
    }
    const land = () => {
      this.gates.fillSeat(e.gate);
      const pan = v ? (v.c.x / view.w) * 1.4 - 0.7 : 0;
      s.audio.board(e.seat, pan);
      if (v) {
        const sc = v.base;
        v.bounce?.stop();
        v.c.setScale(sc);
        v.bounce = this.tweens.add({ targets: v.c, scaleX: sc * 1.06, scaleY: sc * 0.95, duration: 70, yoyo: true, onComplete: () => v.c.setScale(sc) });
        if (!this.reduced) sparkle(this, v.c.x, v.c.y - 20, COLOR_HEX[e.color]!, 4, 160);
      }
      this.notify(s.meta.track({ type: 'board', color: e.color, zen: this.mode === 'zen' }));
    };
    if (pv && v) {
      this.begin();
      const landed = this.hopIntoPlane(pv, v).then(land).finally(() => this.end());
      this.landings.set(e.plane, landed);
    } else land();
    const backlog = this.boardQ.length;
    await wait(this, backlog > 20 ? 60 : backlog > 8 ? 85 : 110);
  }

  private hopIntoPlane(pv: Phaser.GameObjects.Container, plane: PlaneView) {
    const body = pv.getData('body') as Phaser.GameObjects.Container;
    const shadow = pv.getData('shadow') as Phaser.GameObjects.Image;
    (pv.getData('hop') as Phaser.Tweens.Tween | undefined)?.stop();
    this.tweens.killTweensOf(pv);
    body.y = 0;
    pv.setScale(1).setDepth(55);
    const from = { x: pv.x, y: pv.y };
    const to = { x: plane.c.x, y: plane.c.y + this.bv.cell * 0.1 * plane.c.scaleX };
    const t = { p: 0 };
    const arc = Math.max(90, Math.abs(to.y - from.y) * 0.35);
    shadow.setVisible(false);
    return this.tween({
      targets: t,
      p: 1,
      duration: HOP_MS,
      ease: 'Sine.In',
      onUpdate: () => {
        const p = t.p;
        pv.setPosition(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * arc);
        pv.setScale(1 - 0.55 * p);
        body.setScale(1, 1);
        pv.setAlpha(p > 0.8 ? 1 - (p - 0.8) * 5 : 1);
      },
    }).then(() => pv.destroy());
  }

  private async depart(e: Extract<GameEvent, { type: 'PLANE_DEPARTED' }>) {
    await this.landings.get(e.plane);
    if (!this.alive) return;
    const v = this.planes.get(e.plane);
    this.landings.delete(e.plane);
    this.arrivals.delete(e.plane);
    const s = services();
    this.notify(s.meta.track({ type: 'depart', zen: this.mode === 'zen' }));
    if (!v) {
      this.gates.clearSeats(e.gate);
      this.freeGate.get(e.plane)?.();
      this.planes.delete(e.plane);
      return;
    }
    this.begin();
    void (async () => {
      s.audio.play('chime');
      await wait(this, 90);
      s.audio.play('takeoff');
      s.audio.haptic('medium');
      puff(this, v.c.x, v.c.y + this.bv.cell * v.length * v.c.scaleX * 0.4, 8, 0xffffff, 54);
      sparkle(this, v.c.x, v.c.y, [COLOR_HEX[v.color]!, 0xffffff], 10, 300);
      this.gates.clearSeats(e.gate);
      this.tweens.killTweensOf(v.c);
      v.c.setDepth(58).setScale(v.base);
      const y0 = v.c.y;
      const sc = v.base;
      let freed = false;
      await this.tween({
        targets: v.c,
        y: -this.bv.cell * 4,
        duration: TUNING.takeoffMs + 250,
        ease: 'Quad.In',
        onUpdate: (tw: Phaser.Tweens.Tween) => {
          const p = tw.progress;
          v.lift = p * 1.4;
          v.c.setScale(sc * (1 + p * 0.45));
          if (!freed && v.c.y < y0 - this.bv.cell * 1.4) {
            freed = true;
            this.freeGate.get(e.plane)?.();
          }
          if (!this.reduced && Math.random() < 0.35) puff(this, v.c.x, v.c.y + this.bv.cell * v.length * v.c.scaleX * 0.5, 1, 0xffffff, 57);
        },
      });
      if (!freed) this.freeGate.get(e.plane)?.();
      this.freeGate.delete(e.plane);
      this.planes.delete(e.plane);
      v.destroy();
    })().finally(() => this.end());
    await wait(this, 140);
  }

  private praise(n: number) {
    this.notify(services().meta.track({ type: 'chain', n }));
    if (n < 8) return;
    const words = n >= 20 ? 'AMAZING!' : n >= 14 ? 'GREAT!' : 'NICE!';
    const colors = n >= 20 ? '#FF7AE0' : n >= 14 ? '#FFD447' : '#7CF29A';
    const q = this.L.queue;
    floatText(this, view.w / 2, q.y + q.h * 0.45, words, 92, colors, '#1B2A52');
    services().audio.play('combo');
    sparkle(this, view.w / 2, q.y + q.h * 0.45, [0xffffff, 0xffd447], 14, 380);
  }

  // ---------- results ----------

  private async onWon() {
    const s = services();
    if (this.mode === 'zen') return this.zenCleared();
    const stars = starsFor({ boostersUsed: this.boostersUsed, continues: this.continues });
    const reward = s.economy.claimWin(this.levelNo, stars);
    const { result, notices } = s.meta.completeLevel(this.levelNo, stars);
    s.save.flush();
    this.win = { stars, reward, result };
    this.coach.clear();
    s.audio.play('win');
    s.audio.haptic('success');
    confetti(this, view.w * 0.2, view.h * 0.2, [...COLOR_HEX]);
    confetti(this, view.w * 0.8, view.h * 0.2, [...COLOR_HEX]);
    const banner = text(this, view.w / 2, view.h * 0.42, 'LEVEL COMPLETE!', 96, { color: '#FFFFFF', stroke: '#1B2A52', strokeW: 16, shadow: true }).setDepth(900).setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 420, ease: 'Back.Out' });
    await wait(this, 1100);
    banner.destroy();
    if (!this.alive) return;
    this.notify(notices);
    this.showWin(this.win, true);
  }

  private showWin(w: WinInfo, fresh: boolean) {
    const s = services();
    const hard = isHardLevel(this.levelNo);
    this.popupKind = 'win';
    const rows: string[] = [];
    if (w.reward.starBonus) rows.push(`Stars bonus  +${w.reward.starBonus}`);
    if (w.reward.hardBonus) rows.push(`HARD level  +${w.reward.hardBonus}`);
    if (w.reward.firstWin) rows.push(`First win today  +${w.reward.firstWin}`);
    this.popup = new Popup(this, {
      title: hard ? 'Hard Level Cleared!' : `Level ${this.levelNo} Complete!`,
      ribbon: hard ? 'red' : 'green',
      height: 720 + rows.length * 50,
      content: (c, area) => {
        const sy = area.y + 110;
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 190;
          const y = sy + (i === 1 ? -26 : 0);
          const size = i === 1 ? 190 : 156;
          c.add(icon(this, x, y, 'starEmpty', size));
          if (i < w.stars) {
            const st = icon(this, x, y, 'starGold', size).setScale(0);
            c.add(st);
            const target = size / st.width;
            this.tweens.add({
              targets: st,
              scale: { from: target * 2.2, to: target },
              alpha: { from: 0, to: 1 },
              duration: 360,
              delay: (fresh ? 380 : 0) + i * 280,
              ease: 'Back.Out',
              onStart: () => fresh && s.audio.play('star', { rate: i + 1 }),
              onComplete: () => fresh && sparkle(this, view.w / 2 + x, view.h / 2 + y, 0xffd447, 10, 300),
            });
          }
        }
        const tip = w.stars < 3 ? 'Win without boosters for 3 stars' : 'Perfect flight!';
        c.add(text(this, 0, sy + 130, tip, 34, { color: UI.softCss, weight: 600 }));
        const ry = sy + 220;
        const pill = this.add.graphics().fillStyle(0xfff3cf, 1).fillRoundedRect(-190, ry - 50, 380, 100, 50).lineStyle(4, 0xffc93c, 1).strokeRoundedRect(-190, ry - 50, 380, 100, 50);
        c.add([pill, icon(this, -110, ry, 'coin', 84), text(this, 30, ry, `+${w.reward.total}`, 64, { color: '#8A5A00' })]);
        rows.forEach((r, i) => c.add(text(this, 0, ry + 90 + i * 48, r, 34, { color: UI.softCss, weight: 600 })));
      },
      buttons: [
        { text: 'Home', icon: 'home', color: 'blue', onClick: () => this.go('Home') },
        { text: 'Next', icon: 'play', color: 'green', onClick: () => this.nextLevel() },
      ],
    });
    this.popup.once('destroy', () => {
      this.popup = undefined;
      this.popupKind = null;
    });
    if (fresh) {
      this.hud.coins.value = s.economy.coins - w.reward.total - (w.result.arrived !== null ? TUNING.destinationReward : 0);
      this.time.delayedCall(900, () => this.hud.coins.flyFrom(view.w / 2, view.h / 2 + 80, w.reward.total));
    }
  }

  private nextLevel() {
    const w = this.win;
    if (w?.result.arrived !== null && w?.result.arrived !== undefined) this.showPostcard(w.result.arrived, () => this.go('Game', { mode: 'level', level: this.levelNo + 1 }));
    else this.go('Game', { mode: 'level', level: this.levelNo + 1 });
  }

  private showPostcard(destIndex: number, then: () => void) {
    const d = DESTINATIONS[destIndex % DESTINATIONS.length]!;
    services().audio.play('unlock');
    const pw = Math.min(640, view.w - 200);
    const ph = Math.round(pw * 0.6);
    const pop = new Popup(this, {
      title: `Welcome to ${d.name}!`,
      ribbon: 'purple',
      height: ph + 560,
      content: (c, area) => {
        const cy = area.y + ph / 2 + 30;
        const card = this.add.graphics().fillStyle(0x0f1c3d, 0.2).fillRoundedRect(-pw / 2 - 14, cy - ph / 2 - 8, pw + 28, ph + 28, 18).fillStyle(0xffffff, 1).fillRoundedRect(-pw / 2 - 14, cy - ph / 2 - 14, pw + 28, ph + 28, 18);
        const key = sceneryTex(this, { dest: destIndex, theme: services().save.data.cosmetics.theme as ThemeId, w: pw, h: ph, horizon: ph * 0.8, layout: 'hero' });
        const img = this.add.image(0, cy, key).setScale(1 / view.res);
        const stamp = icon(this, pw / 2 - 40, cy - ph / 2 + 36, 'plane', 64, 0xff5a5f).setAngle(-12);
        c.add([card, img, stamp]);
        c.add(text(this, 0, cy + ph / 2 + 60, d.tagline, 38, { color: UI.softCss, weight: 600 }));
        c.add([icon(this, -70, cy + ph / 2 + 140, 'coin', 64), text(this, 30, cy + ph / 2 + 140, `+${TUNING.destinationReward}`, 52, { color: '#8A5A00' })]);
      },
      buttons: [{ text: "Let's fly!", icon: 'plane', onClick: then }],
    });
    confetti(this, view.w / 2, view.h * 0.3, [0xff7ae0, 0xffd447, 0x7cf29a, 0x7cc0ff]);
    return pop;
  }

  private async onFailed() {
    const s = services();
    if (this.mode === 'zen') return this.zenAssist();
    s.meta.failLevel();
    s.audio.play('fail');
    s.audio.haptic('warning');
    await wait(this, 450);
    if (this.alive) this.showFail();
  }

  private showFail() {
    const s = services();
    this.popupKind = 'fail';
    const owned = s.economy.count('extraGate');
    const unlocked = this.levelNo >= BOOSTER_UNLOCK.extraGate;
    const cost = TUNING.continueCost * 2 ** this.continues;
    const buttons = [
      { text: 'Retry', icon: 'restart' as const, color: 'blue' as const, onClick: () => this.restartLevel() },
      owned > 0 && unlocked
        ? { text: `Use Gate booster (${owned})`, icon: 'gate' as const, color: 'green' as const, onClick: () => this.continueWith('booster') }
        : { text: `+1 Gate  ${cost}`, icon: 'coin' as const, color: 'green' as const, keepOpen: true, onClick: () => this.continueWith('coins') },
    ];
    this.popup = new Popup(this, {
      title: 'Out of gates!',
      ribbon: 'red',
      body: 'Every gate is full and nobody in line can board.\nOpen one more gate to keep going.',
      buttons,
      onClose: () => this.go('Home'),
    });
    this.popup.once('destroy', () => {
      this.popup = undefined;
      this.popupKind = null;
    });
  }

  private continueWith(pay: 'booster' | 'coins') {
    const s = services();
    if (pay === 'coins') {
      const cost = TUNING.continueCost * 2 ** this.continues;
      if (!s.economy.spend(cost)) {
        toast(this, 'Not enough coins. Win levels and missions to earn more!', view.h * 0.22, 0xc93a3f);
        return;
      }
      this.hud.coins.refresh();
      this.popup?.close();
    } else s.economy.use('extraGate');
    this.continues++;
    this.bar?.refresh();
    this.addGate();
  }

  private addGate() {
    const s = services();
    this.g.addGate();
    this.rebuildGates();
    s.audio.play('gate');
    const r = this.gates.rect(this.g.gate.length - 1);
    sparkle(this, r.x, r.y, 0xffe27a, 12, 260);
    floatText(this, r.x, r.y - 40, '+1 GATE', 52, '#FFE27A');
    this.playEvents(this.g.resume());
  }

  /** Rebuild the gate row (its width changes past 6 gates) and move parked planes to their new stands. */
  private rebuildGates() {
    this.gates.build(this.g.gate.length);
    while (this.gateFree.length < this.g.gate.length) this.gateFree.push(Promise.resolve());
    this.g.gate.forEach((pid, i) => {
      if (pid === null) return;
      const p = this.g.planeInfo(pid);
      const v = this.planes.get(pid);
      const d = this.gates.dock(i, p.length, this.bv.cell);
      if (v) {
        v.base = d.scale;
        v.c.setScale(d.scale);
        this.tweens.add({ targets: v.c, x: d.x, y: d.y, duration: 220, ease: 'Sine.Out' });
      }
      this.gates.setSeats(i, Game.capacity(p), this.g.filled.get(pid) ?? 0, p.color);
    });
  }

  private restartLevel() {
    this.go('Game', { mode: 'level', level: this.levelNo });
  }

  // ---------- zen ----------

  private async zenCleared() {
    const s = services();
    this.zen!.boards++;
    this.hud.setZenCount(this.zen!.boarded, this.zen!.boards);
    s.economy.addCoins(TUNING.zenBoardReward);
    this.hud.coins.refresh();
    this.notify(s.meta.track({ type: 'zenBoard' }));
    s.audio.play('chime');
    floatText(this, view.w / 2, this.bv.fit.oy + this.bv.height / 2, `+${TUNING.zenBoardReward}`, 80, '#FFD447');
    sparkle(this, view.w / 2, this.bv.fit.oy + this.bv.height / 2, [0xffffff, 0x8ff0b4], 16, 340);
    await wait(this, 900);
    if (!this.alive) return;
    // fade out this board, fade in the next one
    await this.tween({ targets: this.levelObjs.filter((o) => 'alpha' in o), alpha: 0, duration: 260 });
    this.destroyLevel();
    this.zen!.seed++;
    try {
      this.level = await loadZenLevel(this.zen!.seed);
    } catch {
      this.go('Home');
      return;
    }
    if (!this.alive) return;
    void loadZenLevel(this.zen!.seed + 1);
    this.g = Game.create(this.level);
    this.buildLevel(true);
  }

  private destroyLevel() {
    for (const o of this.levelObjs) o.destroy();
    this.levelObjs = [];
    for (const v of this.planes.values()) v.destroy();
    this.planes.clear();
    for (const v of this.pax.values()) v.destroy();
    this.pax.clear();
    this.cur.clear();
    this.gates.destroy();
    this.arrivals.clear();
    this.landings.clear();
    this.freeGate.clear();
  }

  /** Zen never fails: open a gate (up to a limit) or bring a matching traveler to the front. */
  private zenAssist() {
    if (this.g.gate.length < TUNING.zenMaxGates) {
      this.addGate();
      return;
    }
    if (this.g.assistQueue()) {
      this.refreshQueueColors();
      floatText(this, view.w / 2, this.L.queue.y + this.L.queue.h * 0.5, 'Next, please!', 56, '#FFFFFF');
      this.playEvents(this.g.resume());
    }
  }

  /** The line order changed (Sort booster or a zen assist): redraw the travelers still waiting. */
  private refreshQueueColors() {
    for (const [i, v] of this.pax) {
      if (i >= this.g.queueIdx) {
        v.destroy();
        this.pax.delete(i);
      }
    }
    this.refreshQueue(true);
  }

  // ---------- boosters ----------

  private async useBooster(id: BoosterId) {
    if (this.mode !== 'level' || !this.ready || this.popup || this.g.status !== 'playing') return;
    if (this.levelNo < BOOSTER_UNLOCK[id]) return;
    this.lastInput = this.time.now;
    await this.idle();
    if (!this.alive || this.popup || this.g.status !== 'playing') return;
    const s = services();
    const info = BOOSTER_INFO[id];
    if (s.economy.count(id) > 0) {
      if (this.applyBooster(id)) {
        s.economy.use(id);
        this.boostersUsed++;
        this.notify(s.meta.track({ type: 'booster' }));
        this.bar?.refresh();
      }
      return;
    }
    const cost = TUNING.boosterCost[id];
    this.popup = new Popup(this, {
      title: `Need a ${info.name}?`,
      ribbon: info.color === 'yellow' ? 'blue' : info.color,
      body: info.tip,
      height: 700,
      content: (c, area) => c.add(icon(this, 0, area.y + 70, info.icon, 120, 0x3a82f0)),
      buttons: [
        { text: 'Not now', color: 'blue', onClick: () => undefined },
        {
          text: `Buy  ${cost}`,
          icon: 'coin',
          color: 'green',
          keepOpen: true,
          onClick: () => {
            if (!s.economy.spend(cost)) {
              toast(this, 'Not enough coins. Win levels and missions to earn more!', view.h * 0.22, 0xc93a3f);
              return;
            }
            this.popup?.close();
            this.hud.coins.refresh();
            if (this.applyBooster(id)) {
              this.boostersUsed++;
              this.notify(s.meta.track({ type: 'booster' }));
            } else s.economy.add(id); // keep it for later if it had no effect right now
            this.bar?.refresh();
          },
        },
      ],
    });
    this.popup.once('destroy', () => (this.popup = undefined));
  }

  private applyBooster(id: BoosterId): boolean {
    const a = services().audio;
    switch (id) {
      case 'extraGate':
        this.addGate();
        return true;
      case 'sortQueue':
        if (!this.g.sortQueue()) {
          toast(this, 'The line is already sorted', view.h * 0.3);
          return false;
        }
        a.play('sort');
        this.refreshQueueColors();
        sparkle(this, this.slotPts[0]!.x, this.slotPts[0]!.y - this.paxH / 2, 0x7cf29a, 12, 260);
        this.playEvents(this.g.resume());
        return true;
      case 'shuffleBoard':
        if (this.g.board.count < 2) {
          toast(this, 'Nothing to shuffle', view.h * 0.3);
          return false;
        }
        if (!shuffleBoard(this.g, makeRng(Date.now()))) {
          toast(this, 'No safe shuffle found', view.h * 0.3);
          return false;
        }
        a.play('shuffle');
        this.animateShuffle();
        return true;
    }
  }

  private animateShuffle() {
    this.shuffling = true;
    const list = this.g.board.list();
    let left = list.length;
    for (const p of list) {
      const v = this.planes.get(p.id)!;
      this.cur.set(p.id, p);
      const c = this.bv.planeCenter(p);
      v.c.setDepth(30);
      this.tweens.add({ targets: v.c, scale: 0.6, duration: 160, ease: 'Quad.Out' });
      this.tweens.add({
        targets: v.c,
        x: c.x,
        y: c.y,
        rotation: this.bv.angle(p.dir),
        delay: 120,
        duration: 420,
        ease: 'Sine.InOut',
        onComplete: () => {
          this.tweens.add({ targets: v.c, scale: 1, duration: 200, ease: 'Back.Out', onComplete: () => v.c.setDepth(10) });
          if (--left === 0) this.shuffling = false;
        },
      });
    }
  }

  // ---------- popups ----------

  private onHidden() {
    if (this.alive && this.ready && this.mode === 'level' && this.g.status === 'playing' && !this.popup) this.showPause();
  }

  private showPause() {
    if (this.popup || !this.ready) return;
    const s = services();
    this.popupKind = 'pause';
    const toggles: [('sound' | 'music' | 'vibration'), 'sound' | 'music' | 'vibrate', 'soundOff' | 'musicOff' | 'vibrate'][] = [
      ['sound', 'sound', 'soundOff'],
      ['music', 'music', 'musicOff'],
      ['vibration', 'vibrate', 'vibrate'],
    ];
    this.popup = new Popup(this, {
      title: 'Paused',
      height: 860,
      onClose: () => undefined,
      content: (c, area) => {
        toggles.forEach(([key, on, off], i) => {
          const x = (i - 1) * 170;
          const make = (): Button => {
            const val = s.save.data.settings[key];
            const b = new Button(this, x, area.y + 70, 130, 120, {
              icon: val ? on : off,
              color: val ? 'green' : 'white',
              onClick: () => {
                s.save.data.settings[key] = !s.save.data.settings[key];
                s.save.save();
                s.audio.syncMusic();
                s.audio.applyVolumes();
                b.destroy();
                c.add(make());
              },
            });
            return b;
          };
          c.add(make());
        });
      },
      buttons: [
        { text: 'Home', icon: 'home', color: 'blue', onClick: () => this.go('Home') },
        { text: 'Restart', icon: 'restart', color: 'yellow', onClick: () => this.restartLevel() },
        { text: 'Resume', icon: 'play', color: 'green', onClick: () => undefined },
      ],
    });
    this.popup.once('destroy', () => {
      this.popup = undefined;
      this.popupKind = null;
      this.lastInput = this.time.now;
    });
  }

  // ---------- onboarding and hints ----------

  private afterIntro() {
    if (!this.alive || this.popup) return;
    const s = services();
    // booster unlocks come with a free sample
    for (const id of ['extraGate', 'sortQueue', 'shuffleBoard'] as BoosterId[]) {
      if (this.mode === 'level' && this.levelNo === BOOSTER_UNLOCK[id] && !s.save.data.flags[`unlock_${id}`]) {
        s.save.data.flags[`unlock_${id}`] = true;
        s.economy.add(id, TUNING.boosterSample);
        this.bar?.refresh();
        const info = BOOSTER_INFO[id];
        s.audio.play('unlock');
        this.popupKind = null;
        this.popup = new Popup(this, {
          title: `New booster: ${info.name}!`,
          ribbon: 'purple',
          body: `${info.tip}\nHere are ${TUNING.boosterSample} for free.`,
          height: 780,
          content: (c, area) => c.add(icon(this, 0, area.y + 60, info.icon, 120, 0x8e5cf2)),
          buttons: [{ text: 'Got it!', onClick: () => this.bar?.pulse(id) }],
        });
        this.popup.once('destroy', () => {
          this.popup = undefined;
          this.time.delayedCall(300, () => this.afterIntro());
        });
        return;
      }
    }
    this.tutorial();
  }

  private tutorial() {
    const s = services();
    if (this.mode !== 'level' || this.levelNo > 3 || s.save.data.flags[`tut${this.levelNo}`]) return;
    const id = hintPlane(this.g);
    const p = id === undefined ? undefined : this.cur.get(id);
    if (!p) return;
    const r = this.bv.planeRect(p);
    const hole = { x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 };
    const msgY = this.L.gates.y + this.L.gates.h / 2;
    const hand = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    this.tutorialStep = this.levelNo;
    if (this.levelNo === 1) this.coach.show({ hole, msg: 'Tap a plane to send it to a gate!', msgY, hand });
    else if (this.levelNo === 2) {
      const blocked = this.g.board.list().find((q) => this.g.board.blockers(q.id).includes(p.id));
      const r2 = blocked ? this.bv.planeRect(blocked) : r;
      const big = { x: Math.min(r.x0, r2.x0), y: Math.min(r.y0, r2.y0), w: Math.max(r.x1, r2.x1) - Math.min(r.x0, r2.x0), h: Math.max(r.y1, r2.y1) - Math.min(r.y0, r2.y0) };
      this.coach.show({ hole: big, msg: 'A plane leaves only if nothing is in its way. Move the blocker first!', msgY, hand });
    } else {
      const gr = this.L.gates;
      this.coach.show({ hole: { x: gr.x, y: gr.y, w: gr.w, h: gr.h }, msg: 'Gates are limited! Park only planes whose passengers are near the front of the line.', msgY, hand });
    }
  }

  private tutorialTapped() {
    if (!this.tutorialStep) return;
    const s = services();
    s.save.data.flags[`tut${this.tutorialStep}`] = true;
    s.save.save();
    const step = this.tutorialStep;
    this.tutorialStep = 0;
    this.coach.clear();
    if (step === 1) {
      this.time.delayedCall(600, () => {
        if (!this.alive) return;
        const b = this.coach.bubble('Passengers board the plane of their color. Clear every plane to win!', this.L.queue.y + this.L.queue.h * 0.35);
        this.time.delayedCall(3200, () => this.tweens.add({ targets: b, alpha: 0, duration: 300, onComplete: () => b.destroy() }));
      });
    }
  }

  private idleHint() {
    if (this.hintObjs.length || this.tutorialStep || (this.mode === 'level' && this.levelNo > 15)) return;
    const id = hintPlane(this.g);
    const p = id === undefined ? undefined : this.cur.get(id);
    if (!p) return;
    const r = this.bv.planeRect(p);
    const g = this.add.graphics().setDepth(40);
    g.lineStyle(7, 0xffe27a, 1).strokeRoundedRect(r.x0 - 4, r.y0 - 4, r.x1 - r.x0 + 8, r.y1 - r.y0 + 8, 18);
    forever(this, { targets: g, alpha: 0.2, duration: 600, yoyo: true });
    this.hintObjs = [g, this.coach.hand((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)];
  }

  private clearHint() {
    this.hintObjs.forEach((o) => o.destroy());
    this.hintObjs = [];
  }

  /** Mission and achievement toasts, one at a time. */
  private notify(n: MetaNotice[]) {
    if (!n.length) return;
    this.notices.push(...n.map((x) => x.text));
    if (this.noticeBusy) return;
    const next = () => {
      const m = this.notices.shift();
      if (!m || !this.alive) {
        this.noticeBusy = false;
        return;
      }
      this.noticeBusy = true;
      services().audio.play('unlock');
      toast(this, m, this.L.hud.y + this.L.hud.h + 60, 0x6238c4);
      this.time.delayedCall(1700, next);
    };
    next();
  }

  // ---------- relayout ----------

  override relayout() {
    if (!this.ready || this.busy || this.shuffling) {
      this.pendingRelayout = true;
      return;
    }
    super.relayout();
  }

  protected override relayoutData(): GameInit {
    return {
      mode: this.mode,
      level: this.levelNo,
      resume: { g: this.g, level: this.level, boostersUsed: this.boostersUsed, continues: this.continues, popup: this.popupKind, win: this.win, zen: this.zen },
    };
  }

  /** Dev only: tap the solver's suggested plane (used by the automated playthrough). */
  private devTapHint() {
    const id = hintPlane(this.g);
    if (id !== undefined && this.canTap()) this.onTap(id);
    return id;
  }
}

