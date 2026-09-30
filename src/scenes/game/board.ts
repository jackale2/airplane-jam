import Phaser from 'phaser';
import { view } from '../../config.ts';
import type { PlaneData } from '../../core/types.ts';
import { planeKey, planeShadowKey } from '../../data/assets.ts';
import { OUTLINE_HEX } from '../../data/colors.ts';
import type { BoardView } from '../../layout/boardView.ts';
import { BOARD_FRAME } from '../../layout/view.ts';
import { shadowScale } from '../../systems/artLoader.ts';
import { forever } from '../../ui/fx.ts';
import { canvasTex, css, darken, lighten, rr, vgrad, withShadow } from '../../ui/gfx.ts';
import type { Pal } from '../../ui/scenery.ts';

/** Tarmac tray with parking-bay tiles, drawn once per level into a texture. */
export function drawTray(scene: Phaser.Scene, bv: BoardView, pal: Pal) {
  const F = BOARD_FRAME;
  const w = bv.width + F * 2;
  const h = bv.height + F * 2;
  const pad = 30;
  const c = bv.cell;
  const key = canvasTex(scene, `tray_${bv.fit.cols}x${bv.fit.rows}_${c}_${pal.tarmac.toString(16)}`, w + pad * 2, h + pad * 2, (ctx) => {
    const x = pad;
    const y = pad;
    withShadow(ctx, 'rgba(15,22,50,0.35)', 28, 0, 14, () => {
      ctx.fillStyle = css(pal.rim);
      rr(ctx, x, y, w, h, 38);
      ctx.fill();
    });
    // rim with a lit top edge
    ctx.fillStyle = vgrad(ctx, y, y + h, [[0, lighten(pal.rim, 0.25)], [0.08, pal.rim], [1, darken(pal.rim, 0.15)]]);
    rr(ctx, x, y, w, h, 38);
    ctx.fill();
    // tarmac
    ctx.fillStyle = vgrad(ctx, y + 12, y + h - 12, [[0, darken(pal.tarmac, 0.08)], [1, pal.tarmac]]);
    rr(ctx, x + 12, y + 12, w - 24, h - 24, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 3;
    rr(ctx, x + 12, y + 13, w - 24, h - 25, 28);
    ctx.stroke();
    // parking bays
    const inset = Math.max(3, c * 0.05);
    const r = Math.max(4, c * 0.16);
    for (let row = 0; row < bv.fit.rows; row++) {
      for (let col = 0; col < bv.fit.cols; col++) {
        const tx = x + F + col * c + inset;
        const ty = y + F + row * c + inset;
        const tw = c - inset * 2;
        ctx.fillStyle = css(darken(pal.tile, 0.12));
        rr(ctx, tx, ty + 2, tw, tw, r);
        ctx.fill();
        ctx.fillStyle = vgrad(ctx, ty, ty + tw, [[0, lighten(pal.tile, 0.08)], [1, pal.tile]]);
        rr(ctx, tx, ty, tw, tw - 1, r);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        rr(ctx, tx + tw * 0.12, ty + tw * 0.08, tw * 0.76, tw * 0.16, r * 0.6);
        ctx.fill();
      }
    }
  });
  const img = scene.add.image(bv.fit.ox - F - pad, bv.fit.oy - F - pad, key).setOrigin(0, 0).setScale(1 / view.res).setDepth(1);
  // runway lights along the rim, twinkling in a slow wave
  const lights: Phaser.GameObjects.Image[] = [];
  const add = (lx: number, ly: number, i: number) => {
    const g = scene.add.image(lx, ly, 'fx_dot').setScale(0.42 / view.res).setTint(pal.lights).setDepth(2).setAlpha(0.95);
    forever(scene, { targets: g, alpha: 0.35, duration: 900, yoyo: true, delay: (i * 140) % 2400, ease: 'Sine.InOut' });
    lights.push(g);
  };
  const x0 = bv.fit.ox - F / 2 - 1;
  const y0 = bv.fit.oy - F / 2 - 1;
  const x1 = bv.fit.ox + bv.width + F / 2 + 1;
  const y1 = bv.fit.oy + bv.height + F / 2 + 1;
  let i = 0;
  for (let k = 0; k <= bv.fit.cols; k++) {
    add(bv.fit.ox + k * c, y0, i++);
    add(bv.fit.ox + k * c, y1, i++);
  }
  for (let k = 1; k < bv.fit.rows; k++) {
    add(x0, bv.fit.oy + k * c, i++);
    add(x1, bv.fit.oy + k * c, i++);
  }
  return { img, lights };
}

/** A plane on the board or at a gate: art, direction arrow, color symbol, and a soft shadow in its own layer. */
export class PlaneView {
  readonly id: number;
  readonly c: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
  readonly arrow: Phaser.GameObjects.Graphics;
  readonly sym?: Phaser.GameObjects.Image;
  readonly length: number;
  readonly color: number;
  /** 0 on the ground; grows during takeoff so the shadow drifts away and fades. */
  lift = 0;
  /** Resting scale (1 on the board, smaller when parked at a gate); bounces return to it. */
  base = 1;
  bounce?: Phaser.Tweens.Tween;
  private readonly shadowBase: number;

  constructor(scene: Phaser.Scene, p: PlaneData, cell: number, livery: string, symbols: boolean) {
    this.id = p.id;
    this.length = p.length;
    this.color = p.color;
    const u = cell;
    const w = u - Math.max(6, u * 0.1);
    const full = u * p.length;
    this.c = scene.add.container(0, 0).setDepth(10);
    this.body = scene.add.image(0, 0, planeKey(livery, p.length, p.color)).setDisplaySize(w, w * p.length);
    this.c.add(this.body);
    // direction chevron in the nose cell
    const ay = -full / 2 + u * 0.56;
    const s = u * 0.2;
    this.arrow = scene.add.graphics();
    this.arrow.fillStyle(OUTLINE_HEX, 0.35).fillTriangle(0, ay - s * 1.05 + 3, s * 1.05, ay + s * 0.55 + 3, -s * 1.05, ay + s * 0.55 + 3);
    this.arrow.fillStyle(0xffffff, 1).lineStyle(Math.max(2, u * 0.035), OUTLINE_HEX, 0.9);
    this.arrow.beginPath().moveTo(0, ay - s).lineTo(s, ay + s * 0.5).lineTo(0, ay + s * 0.18).lineTo(-s, ay + s * 0.5).closePath().fillPath().strokePath();
    this.c.add(this.arrow);
    if (symbols) {
      const badge = scene.add.circle(0, full / 2 - u * 0.52, u * 0.2, 0xffffff, 0.92).setStrokeStyle(Math.max(2, u * 0.03), OUTLINE_HEX, 0.8);
      this.sym = scene.add.image(0, full / 2 - u * 0.52, `symbol${p.color}`).setDisplaySize(u * 0.28, u * 0.28);
      this.c.add([badge, this.sym]);
      this.c.setData('badge', badge);
    }
    this.shadowBase = shadowScale(scene, livery, p.length, w);
    this.shadow = scene.add.image(0, 0, planeShadowKey(livery, p.length)).setDepth(9).setTintFill(0x0b1330);
  }

  /** Keep the shadow under the plane (offset in screen space) and the symbol upright. Call every frame. */
  sync() {
    const c = this.c;
    const off = 1 + this.lift * 4;
    const u = this.body.displayWidth * c.scaleX;
    this.shadow
      .setPosition(c.x + u * 0.07 * off, c.y + u * 0.12 * off)
      .setRotation(c.rotation)
      .setScale(this.shadowBase * c.scaleX * (1 - this.lift * 0.15))
      .setAlpha(c.alpha * 0.34 * (1 - Math.min(1, this.lift) * 0.8))
      .setVisible(c.visible);
    if (this.sym) {
      this.sym.setRotation(-c.rotation);
    }
  }

  destroy() {
    this.c.destroy();
    this.shadow.destroy();
  }
}
