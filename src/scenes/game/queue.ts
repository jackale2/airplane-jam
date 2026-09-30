import Phaser from 'phaser';
import { view } from '../../config.ts';
import { outfitKey, travelerKey } from '../../data/assets.ts';
import { OUTLINE_HEX } from '../../data/colors.ts';
import { canvasTex, css, rr } from '../../ui/gfx.ts';
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
 * like a real airport line. Baked into one texture (freed with the image) so it costs nothing per frame.
 */
export function drawWalkway(scene: Phaser.Scene, pts: { x: number; y: number }[], width: number, pal: Pal) {
  const pad = width / 2 + 44;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.floor(Math.min(...xs) - pad);
  const y0 = Math.floor(Math.min(...ys) - pad - 24);
  const w = Math.ceil(Math.max(...xs) + pad) - x0;
  const h = Math.ceil(Math.max(...ys) + pad) - y0;
  let hash = 0;
  for (const p of pts) hash = (Math.imul(hash, 31) + Math.round(p.x) * 7 + Math.round(p.y)) | 0;
  const key = `walk_${hash >>> 0}_${w}x${h}_${pal.walkway.toString(16)}_${Math.round(width)}`;
  canvasTex(scene, key, w, h, (ctx) => {
    ctx.translate(-x0, -y0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (lw: number, color: string, dy: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y + dy);
      for (const p of pts) ctx.lineTo(p.x, p.y + dy);
      ctx.stroke();
    };
    stroke(width + 18, 'rgba(27,42,82,0.18)', 8); // soft shadow
    stroke(width + 14, css(pal.walkwayEdge), 0);
    stroke(width, css(pal.walkway), 0);
    // dotted center stitching
    ctx.fillStyle = css(pal.walkwayEdge, 0.7);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      ctx.beginPath();
      ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(2.5, width * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
    // stanchions and belts on both edges: one post per slot, none standing on the carpet (inside tight bends),
    // and a belt only where it stays off the carpet
    const onCarpet = (q: { x: number; y: number }) => {
      let best = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(q.x - a.x - dx * t, q.y - a.y - dy * t));
      }
      return best < width / 2 + 2;
    };
    const k = Math.max(0.55, Math.min(1, width / 93)); // stanchion size follows the carpet (smaller queues on flat panels)
    for (const s of [1, -1]) {
      const list: ({ x: number; y: number } | null)[] = [];
      let prev: { x: number; y: number } | undefined;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)]!;
        const b = pts[Math.min(pts.length - 1, i + 1)]!;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = (-(b.y - a.y) / len) * s;
        const ny = ((b.x - a.x) / len) * s;
        const q = { x: pts[i]!.x + nx * (width / 2 + 10 * k), y: pts[i]!.y + ny * (width / 2 + 10 * k) };
        const skip = onCarpet(q) || (prev !== undefined && Math.hypot(q.x - prev.x, q.y - prev.y) < 26 * k);
        list.push(skip ? null : q);
        if (!skip) prev = q;
      }
      ctx.strokeStyle = css(pal.accent, 0.6);
      ctx.lineWidth = Math.max(2.5, width * 0.04);
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const b = list[i];
        if (!a || !b || onCarpet({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 14 * k);
        ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 14 * k + Math.min(14 * k, d * 0.15), b.x, b.y - 14 * k);
        ctx.stroke();
      }
      for (const p of list) {
        if (!p) continue;
        ctx.fillStyle = 'rgba(27,42,82,0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 3 * k, 9 * k, 4 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#B88A1C';
        rr(ctx, p.x - 4 * k, p.y - 18 * k, 8 * k, 20 * k, 3 * k);
        ctx.fill();
        ctx.fillStyle = '#FFD24A';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 18 * k, 6.5 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(p.x - 2 * k, p.y - 20 * k, 2.2 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  const img = scene.add.image(x0, y0, key).setOrigin(0, 0).setScale(1 / view.res).setDepth(3);
  img.once(Phaser.GameObjects.Events.DESTROY, () => scene.textures.exists(key) && scene.textures.remove(key));
  return img;
}
