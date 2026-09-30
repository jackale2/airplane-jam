import Phaser from 'phaser';
import type { Rect } from '../layout/view.ts';

/**
 * Vertical drag-to-scroll area with inertia and mouse-wheel support. Children go in `content`
 * (y = 0 is the top of the scrollable content). Buttons inside ignore drags (see Button).
 */
export class ScrollView {
  readonly content: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly rect: Rect;
  private height: number;
  private y = 0;
  private vel = 0;
  private drag?: { py: number; y0: number; last: number; t: number };
  private readonly onScroll?: (y: number) => void;

  constructor(scene: Phaser.Scene, rect: Rect, contentHeight: number, o: { mask?: boolean; onScroll?: (y: number) => void; depth?: number } = {}) {
    this.scene = scene;
    this.rect = rect;
    this.height = contentHeight;
    this.onScroll = o.onScroll;
    this.content = scene.add.container(rect.x, rect.y).setDepth(o.depth ?? 10);
    if (o.mask !== false) {
      const shape = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(rect.x, rect.y, rect.w, rect.h);
      this.content.setMask(shape.createGeometryMask());
    }
    const inside = (p: Phaser.Input.Pointer) => p.worldX >= rect.x && p.worldX <= rect.x + rect.w && p.worldY >= rect.y && p.worldY <= rect.y + rect.h;
    const down = (p: Phaser.Input.Pointer) => {
      if (!inside(p)) return;
      this.vel = 0;
      this.drag = { py: p.worldY, y0: this.y, last: p.worldY, t: scene.time.now };
    };
    const move = (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const now = scene.time.now;
      const dt = Math.max(1, now - this.drag.t);
      this.vel = 0.8 * this.vel + 0.2 * (((p.worldY - this.drag.last) / dt) * 16);
      this.drag.last = p.worldY;
      this.drag.t = now;
      this.set(this.drag.y0 - (p.worldY - this.drag.py), true);
    };
    const up = () => {
      if (!this.drag) return;
      this.drag = undefined;
      if (scene.time.now - (this.lastMoveT() ?? 0) > 90) this.vel = 0;
    };
    const wheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!inside(p)) return;
      this.vel = 0;
      this.scrollTo(this.y + dy * 1.2, true);
    };
    scene.input.on('pointerdown', down);
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    scene.input.on('wheel', wheel);
    const tick = () => this.update();
    scene.events.on('update', tick);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', down);
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
      scene.input.off('pointerupoutside', up);
      scene.input.off('wheel', wheel);
      scene.events.off('update', tick);
    });
  }

  private lastMoveT() {
    return this.drag?.t;
  }

  get scroll() {
    return this.y;
  }

  get max() {
    return Math.max(0, this.height - this.rect.h);
  }

  setContentHeight(h: number) {
    this.height = h;
    this.set(this.y, false);
  }

  private set(y: number, elastic: boolean) {
    const max = this.max;
    let v = y;
    if (elastic) {
      if (v < 0) v = v * 0.4;
      else if (v > max) v = max + (v - max) * 0.4;
    } else v = Math.min(max, Math.max(0, v));
    this.y = v;
    this.content.y = this.rect.y - v;
    this.onScroll?.(v);
  }

  scrollTo(y: number, animate = false) {
    const target = Math.min(this.max, Math.max(0, y));
    if (!animate) {
      this.set(target, false);
      return;
    }
    const o = { v: this.y };
    this.scene.tweens.add({ targets: o, v: target, duration: 420, ease: 'Cubic.Out', onUpdate: () => this.set(o.v, false) });
  }

  private update() {
    if (this.drag) return;
    const max = this.max;
    if (this.y < 0 || this.y > max) {
      // spring back after an overscroll
      const target = this.y < 0 ? 0 : max;
      this.vel = 0;
      this.set(this.y + (target - this.y) * 0.22, true);
      if (Math.abs(target - this.y) < 0.5) this.set(target, false);
      return;
    }
    if (Math.abs(this.vel) > 0.3) {
      this.set(this.y - this.vel, true);
      this.vel *= 0.94;
    }
  }
}
