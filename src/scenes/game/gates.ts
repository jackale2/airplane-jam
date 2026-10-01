import Phaser from 'phaser';
import { view } from '../../config.ts';
import { COLOR_HEX } from '../../data/colors.ts';
import type { Rect } from '../../layout/view.ts';
import { bubbles } from '../../ui/fx.ts';
import { canvasTex, css, rr } from '../../ui/gfx.ts';
import { icon } from '../../ui/icons.ts';
import { text } from '../../ui/theme.ts';

const GAP = 12;

interface Slot {
  x: number; // center
  y: number;
  w: number;
  h: number;
  c: Phaser.GameObjects.Container;
  dots: Phaser.GameObjects.Graphics;
  cap: number;
  filled: number;
  color: number;
}

function standTex(scene: Phaser.Scene, w: number, h: number, locked: boolean) {
  const W = Math.round(w);
  const H = Math.round(h);
  return canvasTex(scene, `stand_${W}x${H}_${locked ? 'l' : 'o'}`, W + 16, H + 16, (ctx) => {
    const x = 8;
    const y = 8;
    ctx.fillStyle = 'rgba(12,20,52,0.22)';
    rr(ctx, x, y + 5, W, H, 24);
    ctx.fill();
    ctx.fillStyle = locked ? 'rgba(40,52,86,0.38)' : 'rgba(26,38,78,0.78)';
    rr(ctx, x, y, W, H, 24);
    ctx.fill();
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.35)' : 'rgba(255,210,74,0.95)';
    ctx.lineWidth = 4;
    if (locked) ctx.setLineDash([12, 9]);
    rr(ctx, x + 2, y + 2, W - 4, H - 4, 22);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!locked) {
      // stand centerline and stop bar
      ctx.strokeStyle = 'rgba(255,210,74,0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(x + W / 2, y + 14);
      ctx.lineTo(x + W / 2, y + H - 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      rr(ctx, x + 6, y + 5, W - 12, H * 0.22, 18);
      ctx.fill();
      ctx.fillStyle = css(0xffd24a, 0.6);
      rr(ctx, x + W * 0.3, y + 10, W * 0.4, 5, 2.5);
      ctx.fill();
    }
  });
}

/** The row of gate stands: parked planes sit nose up, seat dots below fill in the passenger color. */
export class GateRow {
  private readonly scene: Phaser.Scene;
  private readonly region: Rect;
  private readonly onLocked: () => void;
  private slots: Slot[] = [];
  unlocked = 0;

  constructor(scene: Phaser.Scene, region: Rect, onLocked: () => void) {
    this.scene = scene;
    this.region = region;
    this.onLocked = onLocked;
  }

  get count() {
    return this.slots.length;
  }

  rect(i: number) {
    return this.slots[i]!;
  }

  /** Plane center and scale for a parked plane of `len` cells drawn at `cell` px per cell. */
  dock(i: number, len: number, cell: number) {
    const s = this.slots[i]!;
    const dotsH = s.h * 0.24;
    const availH = s.h - dotsH - 18;
    const scale = Math.min(availH / (cell * len), (s.w - 14) / cell) * 0.96;
    return { x: s.x, y: s.y - s.h / 2 + 8 + availH / 2, scale };
  }

  build(unlocked: number) {
    for (const s of this.slots) s.c.destroy();
    this.slots = [];
    this.unlocked = unlocked;
    const n = Math.max(6, unlocked);
    const r = this.region;
    const w = Math.min(190, (r.w - (n - 1) * GAP) / n);
    const total = n * w + (n - 1) * GAP;
    for (let i = 0; i < n; i++) {
      const x = r.x + (r.w - total) / 2 + i * (w + GAP) + w / 2;
      const y = r.y + r.h / 2;
      const locked = i >= unlocked;
      const c = this.scene.add.container(x, y).setDepth(5);
      c.add(this.scene.add.image(0, 0, standTex(this.scene, w, r.h, locked)).setScale(1 / view.res));
      const dots = this.scene.add.graphics();
      c.add(dots);
      if (locked) {
        c.add(icon(this.scene, 0, -8, 'lock', Math.min(56, w * 0.42), 0xdfe6f5).setAlpha(0.85));
        c.add(text(this.scene, 0, r.h / 2 - 26, '+1', 30, { color: '#DFE6F5' }).setAlpha(0.85));
        c.setSize(w, r.h).setInteractive({ useHandCursor: true }).on('pointerup', () => this.onLocked());
      } else {
        c.add(text(this.scene, -w / 2 + 22, -r.h / 2 + 22, String(i + 1), 26, { color: '#FFD24A' }));
      }
      this.slots.push({ x, y, w, h: r.h, c, dots, cap: 0, filled: 0, color: 0 });
    }
  }

  private dotLayout(s: Slot, cap: number) {
    const perRow = cap > 4 ? Math.ceil(cap / 2) : cap;
    const rows = Math.ceil(cap / perRow);
    const rad = Math.min((s.w - 20) / (perRow * 2.5), s.h * 0.07, 12);
    const gap = rad * 2.5;
    const baseY = s.h / 2 - 12 - rad - (rows - 1) * gap;
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k < cap; k++) {
      const row = Math.floor(k / perRow);
      const inRow = Math.min(perRow, cap - row * perRow);
      const col = k % perRow;
      pts.push({ x: (col - (inRow - 1) / 2) * gap, y: baseY + row * gap });
    }
    return { pts, rad };
  }

  /** Show `cap` seats with `filled` of them taken, in the plane's color. */
  setSeats(i: number, cap: number, filled: number, color: number) {
    const s = this.slots[i];
    if (!s) return;
    Object.assign(s, { cap, filled, color });
    this.redraw(s);
  }

  private redraw(s: Slot) {
    s.dots.clear();
    if (!s.cap) return;
    const { pts, rad } = this.dotLayout(s, s.cap);
    pts.forEach((p, k) => {
      if (k < s.filled) {
        s.dots.fillStyle(0x000000, 0.25).fillCircle(p.x, p.y + 2, rad);
        s.dots.fillStyle(COLOR_HEX[s.color]!, 1).fillCircle(p.x, p.y, rad);
        s.dots.fillStyle(0xffffff, 0.55).fillCircle(p.x - rad * 0.3, p.y - rad * 0.35, rad * 0.32);
      } else {
        s.dots.fillStyle(0xffffff, 0.14).fillCircle(p.x, p.y, rad);
        s.dots.lineStyle(2, 0xffffff, 0.45).strokeCircle(p.x, p.y, rad);
      }
    });
  }

  /** Fill one more seat with a little pop. */
  fillSeat(i: number) {
    const s = this.slots[i];
    if (!s || s.filled >= s.cap) return;
    s.filled++;
    this.redraw(s);
    const { pts, rad } = this.dotLayout(s, s.cap);
    const p = pts[s.filled - 1]!;
    const x = s.x + p.x;
    const y = s.y + p.y;
    const color = COLOR_HEX[s.color]!;
    // the new seat light springs in big and settles, with a flash ring and a burst of bubbles
    const dot = this.scene.add.circle(x, y, rad, color).setDepth(7).setScale(1.9);
    this.scene.tweens.add({ targets: dot, scale: 1, duration: 260, ease: 'Back.Out', onComplete: () => dot.destroy() });
    const flash = this.scene.add.circle(x, y, rad, 0xffffff, 0.9).setDepth(8);
    this.scene.tweens.add({ targets: flash, scale: 1.5, alpha: 0, duration: 160, ease: 'Quad.Out', onComplete: () => flash.destroy() });
    const ring = this.scene.add.circle(x, y, rad).setStrokeStyle(Math.max(3, rad * 0.35), color).setDepth(6);
    this.scene.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 380, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    bubbles(this.scene, x, y, color, 7);
  }

  clearSeats(i: number) {
    const s = this.slots[i];
    if (!s) return;
    s.cap = 0;
    s.filled = 0;
    s.dots.clear();
  }

  /** Brief glow when a plane arrives. */
  flash(i: number) {
    const s = this.slots[i];
    if (!s) return;
    const g = this.scene.add.image(s.x, s.y, 'fx_glow').setTint(0xffe27a).setDepth(4).setAlpha(0.8);
    g.setDisplaySize(s.w * 1.8, s.h * 1.5);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
  }

  destroy() {
    for (const s of this.slots) s.c.destroy();
    this.slots = [];
  }
}
