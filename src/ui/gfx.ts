import type Phaser from 'phaser';
import { view } from '../config.ts';

export type Ctx = CanvasRenderingContext2D;

/** 0xRRGGBB to a CSS color. */
export function css(c: number, a = 1) {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

/** Mix two 0xRRGGBB colors (t = 0 gives a, 1 gives b). */
export function mix(a: number, b: number, t: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
export const lighten = (c: number, t: number) => mix(c, 0xffffff, t);
export const darken = (c: number, t: number) => mix(c, 0x000000, t);

/** Rounded rectangle path (no reliance on ctx.roundRect, which older WebViews lack). */
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, number, number?][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c, a] of stops) g.addColorStop(o, css(c, a ?? 1));
  return g;
}

/**
 * Draw into a canvas texture at render scale and cache it under `key`. Callers draw in design px;
 * show the result with `canvasImage` (or setScale(1 / view.res)) so it keeps its design size.
 */
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, force = false) {
  const tm = scene.textures;
  if (tm.exists(key)) {
    if (!force) return key;
    tm.remove(key);
  }
  const r = view.res;
  const tex = tm.createCanvas(key, Math.max(1, Math.ceil(w * r)), Math.max(1, Math.ceil(h * r)));
  if (!tex) return key;
  const ctx = tex.context;
  ctx.save();
  ctx.scale(r, r);
  draw(ctx, w, h);
  ctx.restore();
  tex.refresh();
  return key;
}

export function canvasImage(scene: Phaser.Scene, x: number, y: number, key: string) {
  return scene.add.image(x, y, key).setScale(1 / view.res);
}

/** Soft drop shadow for whatever is drawn inside `fn`. */
export function withShadow(ctx: Ctx, color: string, blur: number, dx: number, dy: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * view.res;
  ctx.shadowOffsetX = dx * view.res;
  ctx.shadowOffsetY = dy * view.res;
  fn();
  ctx.restore();
}
