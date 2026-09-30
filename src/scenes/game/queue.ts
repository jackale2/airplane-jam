import Phaser from 'phaser';
import { outfitKey, travelerKey } from '../../data/assets.ts';
import { OUTLINE_HEX } from '../../data/colors.ts';
import type { Pal } from '../../ui/scenery.ts';

/** Same as HAT_DY in scripts/art/travelers.ts: how far a hat moves up for tall hair (viewBox units). */
export const HAT_DY = [0, -1, -7, -9, 0, -4, 1, 0];

/** Which of the 8 travelers stands at queue position `idx` (stable for a level). */
export function characterFor(seed: number, idx: number) {
  let h = (seed * 2654435761 + idx * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) % 8;
}

export interface PaxOpts {
  color: number;
  character: number;
  outfit: string;
  height: number; // design px from feet to the top of the hair
  symbols: boolean;
}

/**
 * A traveler standing at (0, 0) = their feet: soft shadow, art, optional hat, optional color symbol on the chest.
 * `body` (data) is the part that hops and squashes.
 */
export function makePax(scene: Phaser.Scene, o: PaxOpts) {
  const c = scene.add.container(0, 0).setDepth(20);
  const h = o.height;
  const k = h / 140; // viewBox units to design px
  const shadow = scene.add.image(0, 0, 'fx_shadow').setDisplaySize(h * 0.62, h * 0.17).setAlpha(0.55);
  const body = scene.add.container(0, 0);
  const img = scene.add.image(0, 0, travelerKey(o.character, o.color)).setOrigin(0.5, 136 / 140).setDisplaySize(h * (100 / 140), h);
  body.add(img);
  if (o.outfit !== 'casual' && scene.textures.exists(outfitKey(o.outfit))) {
    const hat = scene.add.image(0, HAT_DY[o.character]! * k, outfitKey(o.outfit)).setOrigin(0.5, 136 / 140).setDisplaySize(h * (100 / 140), h);
    body.add(hat);
  }
  if (o.symbols) {
    const y = -h * 0.3;
    const badge = scene.add.circle(0, y, h * 0.1, 0xffffff, 0.95).setStrokeStyle(Math.max(1.5, h * 0.016), OUTLINE_HEX, 0.7);
    const sym = scene.add.image(0, y, `symbol${o.color}`).setDisplaySize(h * 0.14, h * 0.14);
    body.add([badge, sym]);
  }
  c.add([shadow, body]);
  c.setData('body', body);
  c.setData('shadow', shadow);
  return c;
}

/** Gentle idle bob so the line feels alive (stops when the traveler is destroyed). */
export function idleBob(scene: Phaser.Scene, pax: Phaser.GameObjects.Container, delay: number) {
  const body = pax.getData('body') as Phaser.GameObjects.Container;
  const tw = scene.tweens.add({ targets: body, scaleY: 0.96, scaleX: 1.02, duration: 900 + (delay % 400), yoyo: true, repeat: -1, delay, ease: 'Sine.InOut' });
  pax.once(Phaser.GameObjects.Events.DESTROY, () => tw.remove());
  return tw;
}

/**
 * Boarding walkway along the queue path: a soft carpet with rope-and-post barriers on both sides,
 * like a real airport line, plus a glowing spot and arrow at the front.
 */
export function drawWalkway(scene: Phaser.Scene, pts: { x: number; y: number }[], width: number, pal: Pal) {
  const g = scene.add.graphics().setDepth(3);
  const path = (w: number, color: number, alpha: number, dy = 0) => {
    g.lineStyle(w, color, alpha).beginPath().moveTo(pts[0]!.x, pts[0]!.y + dy);
    for (const p of pts) g.lineTo(p.x, p.y + dy);
    g.strokePath();
    for (const p of [pts[0]!, pts[pts.length - 1]!]) g.fillStyle(color, alpha).fillCircle(p.x, p.y + dy, w / 2);
    for (const p of pts) g.fillStyle(color, alpha).fillCircle(p.x, p.y + dy, w / 2 - 0.5);
  };
  path(width + 18, 0x1b2a52, 0.18, 8); // soft shadow
  path(width + 14, pal.walkwayEdge, 1);
  path(width, pal.walkway, 1);
  // dotted center stitching
  g.fillStyle(pal.walkwayEdge, 0.7);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    g.fillCircle((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(2.5, width * 0.035));
  }
  // posts and ropes on both edges
  const posts = scene.add.graphics().setDepth(4);
  const side = (s: 1 | -1) => {
    const list: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (-(b.y - a.y) / len) * s;
      const ny = ((b.x - a.x) / len) * s;
      list.push({ x: pts[i]!.x + nx * (width / 2 + 10), y: pts[i]!.y + ny * (width / 2 + 10) });
    }
    posts.lineStyle(Math.max(2.5, width * 0.04), pal.accent, 0.6);
    const typical = Math.hypot(pts[2]!.x - pts[0]!.x, pts[2]!.y - pts[0]!.y);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!;
      const b = list[i]!;
      if (Math.hypot(b.x - a.x, b.y - a.y) > typical * 1.35) continue;
      const sag = Math.min(18, Math.hypot(b.x - a.x, b.y - a.y) * 0.18);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y - 14), new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2 - 14 + sag), new Phaser.Math.Vector2(b.x, b.y - 14));
      curve.draw(posts, 12);
    }
    for (const p of list) {
      posts.fillStyle(0x1b2a52, 0.25).fillEllipse(p.x, p.y + 3, 18, 8);
      posts.fillStyle(0xb88a1c, 1).fillRoundedRect(p.x - 4, p.y - 18, 8, 20, 3);
      posts.fillStyle(0xffd24a, 1).fillCircle(p.x, p.y - 18, 6.5);
      posts.fillStyle(0xffffff, 0.7).fillCircle(p.x - 2, p.y - 20, 2.2);
    }
  };
  side(1);
  side(-1);
  return { track: g, posts };
}
