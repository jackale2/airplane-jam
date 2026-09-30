import Phaser from 'phaser';
import { view } from '../config.ts';
import { DESTINATIONS, destinationIndex, LEVELS_PER_DESTINATION } from '../meta/destinations.ts';
import { isHardLevel } from '../meta/progress.ts';
import { services } from '../systems/services.ts';
import { forever } from '../ui/fx.ts';
import { canvasTex, css, lighten, mix } from '../ui/gfx.ts';
import { icon } from '../ui/icons.ts';
import { NavBar, NAV_H, TOP_H, topBar } from '../ui/menu.ts';
import { ribbonTex } from '../ui/Popup.ts';
import { palette, sceneryTex, type ThemeId } from '../ui/scenery.ts';
import { ScrollView } from '../ui/ScrollView.ts';
import { text, UI } from '../ui/theme.ts';
import { BaseScene } from './BaseScene.ts';

const GAP = 180; // vertical distance between level nodes
const CITY_H = 620; // city art at the start of each section
const SECTION_H = LEVELS_PER_DESTINATION * GAP + CITY_H + 60;

/** The world tour: a long vertical map, one section per destination, level 1 at the very bottom. */
export class MapScene extends BaseScene {
  private sv!: ScrollView;
  private sections = new Map<number, Phaser.GameObjects.Container>();
  private count = 1;
  private theme: ThemeId = 'day';
  private scrollKeep?: number;

  constructor() {
    super('Map');
  }

  init(data: { scroll?: number }) {
    this.sections = new Map();
    this.scrollKeep = data.scroll;
  }

  create() {
    this.setup(0x8fd6f7);
    const s = services();
    const level = s.save.data.level;
    this.theme = s.save.data.cosmetics.theme as ThemeId;
    this.moodFor(level);
    this.count = destinationIndex(level) + 2; // the current destination plus a peek at the next one
    const area = { x: 0, y: TOP_H, w: view.w, h: view.h - TOP_H - NAV_H + 30 };
    this.sv = new ScrollView(this, area, this.count * SECTION_H, { mask: false, onScroll: (y) => this.cull(y), depth: 5 });

    // top and bottom chrome swallow taps so nothing under them is pressed by accident
    this.add.rectangle(view.w / 2, TOP_H / 2, view.w, TOP_H, 0x6ec8f5, 0.001).setInteractive().setDepth(205);
    const fade = canvasTex(this, `mapfade_${view.w}`, view.w, TOP_H + 60, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, TOP_H + 60);
      g.addColorStop(0, css(0x5fb6ec, 0.95));
      g.addColorStop(0.7, css(0x5fb6ec, 0.6));
      g.addColorStop(1, css(0x5fb6ec, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, view.w, TOP_H + 60);
    });
    this.add.image(0, 0, fade).setOrigin(0, 0).setScale(1 / view.res).setDepth(204);
    topBar(this, { left: { icon: 'home', onClick: () => this.go('Home') }, title: 'World Tour' });
    new NavBar(this, 'Map');

    const target = this.scrollKeep ?? this.nodeY(level) - area.h * 0.6;
    this.sv.scrollTo(target);
    this.cull(this.sv.scroll);
  }

  protected override relayoutData() {
    return { scroll: this.sv?.scroll };
  }

  /** Content y of a level node. */
  private nodeY(level: number) {
    const k = destinationIndex(level);
    const i = (level - 1) % LEVELS_PER_DESTINATION;
    const top = (this.count - 1 - k) * SECTION_H;
    return top + SECTION_H - CITY_H - GAP * 0.4 - i * GAP;
  }

  private nodeX(level: number) {
    const amp = Math.min(view.w * 0.28, 300);
    return view.w / 2 + Math.sin(level * 0.82) * amp;
  }

  /** Build the sections near the viewport and drop the far ones. */
  private cull(scroll: number) {
    const vh = view.h;
    for (let k = 0; k < this.count; k++) {
      const top = (this.count - 1 - k) * SECTION_H;
      const near = top < scroll + vh + 400 && top + SECTION_H > scroll - 400;
      const has = this.sections.get(k);
      if (near && !has) this.sections.set(k, this.buildSection(k, top));
      else if (!near && has) {
        has.destroy();
        this.sections.delete(k);
      }
    }
  }

  private buildSection(k: number, top: number) {
    const s = services();
    const unlocked = s.save.data.level;
    const d = DESTINATIONS[k % DESTINATIONS.length]!;
    const pal = palette(k, this.theme);
    const c = this.add.container(0, top);
    this.sv.content.add(c);
    const w = view.w;

    // sky of this leg of the trip, then the city at its start (bottom); the sky ends in the city's own top color
    const skyKey = canvasTex(this, `mapsky_${k % DESTINATIONS.length}_${this.theme}`, 8, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, css(lighten(palette((k + 1) % DESTINATIONS.length, this.theme).skyBot, 0.1)));
      g.addColorStop(0.6, css(mix(pal.skyTop, pal.skyBot, 0.5)));
      g.addColorStop(1, css(pal.skyTop));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 256);
    });
    c.add(this.add.image(0, 0, skyKey).setOrigin(0, 0).setDisplaySize(w, SECTION_H - CITY_H + 4));
    const city = sceneryTex(this, { dest: k % DESTINATIONS.length, theme: this.theme, w, h: CITY_H, horizon: CITY_H * 0.72, layout: 'hero' });
    c.add(this.add.image(0, SECTION_H - CITY_H, city).setOrigin(0, 0).setScale(1 / view.res));
    // soften the top edge of the city art (the sun's glow would end in a hard line)
    const edge = canvasTex(this, `mapedge_${k % DESTINATIONS.length}_${this.theme}`, 8, 64, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, css(pal.skyTop, 1));
      g.addColorStop(1, css(pal.skyTop, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 64);
    });
    c.add(this.add.image(0, SECTION_H - CITY_H - 2, edge).setOrigin(0, 0).setDisplaySize(w, 80));
    // clouds drifting across this leg
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.image(((i * 0.37 + k * 0.21) % 1) * w, 240 + i * ((SECTION_H - CITY_H - 400) / 5), 'fx_puff').setTint(0xffffff).setAlpha(0.7).setDisplaySize(260, 110);
      c.add(cloud);
    }

    // destination sign
    const signY = SECTION_H - CITY_H + 90;
    const rw = Math.min(560, w - 120);
    c.add(this.add.image(w / 2, signY, ribbonTex(this, k === 0 ? 'blue' : 'purple', rw, 104)).setDisplaySize(rw + 20, 124));
    c.add(text(this, w / 2, signY - 4, d.name, 50, { color: '#FFFFFF', stroke: '#35206E', strokeW: 9 }));
    const tour = Math.floor(k / DESTINATIONS.length) + 1;
    c.add(text(this, w / 2, signY + 70, tour > 1 ? `World tour ${tour}` : d.tagline, 30, { color: '#FFFFFF', stroke: '#1B2A52', strokeW: 7 }));

    // path between nodes
    const first = k * LEVELS_PER_DESTINATION + 1;
    const path = this.add.graphics();
    c.add(path);
    for (let l = first; l < first + LEVELS_PER_DESTINATION; l++) {
      const a = { x: this.nodeX(l), y: this.nodeY(l) - top };
      const b = { x: this.nodeX(l + 1), y: this.nodeY(l + 1) - top };
      const done = l < unlocked;
      const steps = 7;
      for (let j = 1; j < steps; j++) {
        const t = j / steps;
        const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI) * 18;
        const y = a.y + (b.y - a.y) * t;
        path.fillStyle(0xffffff, done ? 0.95 : 0.45).fillCircle(x, y, done ? 7 : 5);
      }
    }

    // level nodes
    for (let l = first; l < first + LEVELS_PER_DESTINATION; l++) c.add(this.node(l, this.nodeX(l), this.nodeY(l) - top, unlocked, pal.accent));
    return c;
  }

  private node(level: number, x: number, y: number, unlocked: number, accent: number) {
    const s = services();
    const current = level === unlocked;
    const locked = level > unlocked;
    const hard = isHardLevel(level);
    const stars = s.save.data.stars[level] ?? 0;
    const r = current ? 62 : 48;
    const n = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x0f1c3d, 0.25).fillCircle(0, 7, r);
    if (locked) {
      g.fillStyle(0xdbe3ef, 0.92).fillCircle(0, 0, r).lineStyle(5, 0xb4c0d6, 1).strokeCircle(0, 0, r);
    } else if (current) {
      g.fillStyle(0x1f8540, 1).fillCircle(0, 5, r).fillStyle(0x3fca63, 1).fillCircle(0, 0, r).lineStyle(6, 0xffffff, 1).strokeCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.3).fillEllipse(-r * 0.25, -r * 0.45, r * 0.9, r * 0.4);
    } else {
      g.fillStyle(0xffffff, 1).fillCircle(0, 0, r).lineStyle(7, hard ? 0xff5a5f : accent, 1).strokeCircle(0, 0, r - 3);
    }
    n.add(g);
    n.add(text(this, 0, -2, String(level), current ? 50 : 40, { color: current ? '#FFFFFF' : locked ? '#9AA6BF' : UI.inkCss, stroke: current ? '#17702F' : undefined, strokeW: current ? 8 : 0 }));
    if (hard) n.add(icon(this, r * 0.72, -r * 0.72, 'flame', 40, 0xff5a5f));
    if (locked) n.add(icon(this, 0, r * 0.62, 'lock', 34, 0x9aa6bf));
    if (!locked && !current) {
      for (let i = 0; i < 3; i++) n.add(icon(this, (i - 1) * 34, r + 16 + (i === 1 ? 4 : 0), i < stars ? 'starGold' : 'starEmpty', 36));
    }
    if (current) {
      const marker = icon(this, 0, -r - 58, 'plane', 76, 0xff5a5f).setAngle(-45);
      n.add(marker);
      forever(this, { targets: marker, y: marker.y - 14, duration: 650, yoyo: true, ease: 'Sine.InOut' });
      forever(this, { targets: g, scale: 1.06, duration: 700, yoyo: true, ease: 'Sine.InOut' });
    }
    if (!locked) {
      n.setSize(r * 2.4, r * 2.4).setInteractive({ useHandCursor: true });
      let down: { x: number; y: number } | undefined;
      n.on('pointerdown', (p: Phaser.Input.Pointer) => (down = { x: p.x, y: p.y }));
      n.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (!down || Math.hypot(p.x - down.x, p.y - down.y) > 14 * this.scale.displayScale.x) return;
        down = undefined;
        services().audio.play('click');
        this.go('Game', { mode: 'level', level });
      });
    }
    return n;
  }
}

