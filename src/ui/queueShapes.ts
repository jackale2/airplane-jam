import type { QueueShape } from '../core/types.ts';

interface Pt {
  x: number;
  y: number;
}

/** Raw outline of a shape. Screen coordinates (y down); the first point is where the queue head stands (bottom). */
function outline(shape: QueueShape): Pt[] {
  const pts: Pt[] = [];
  switch (shape) {
    case 'loop': // ellipse, head at the bottom
      for (let i = 0; i < 200; i++) {
        const a = Math.PI / 2 + (i / 200) * Math.PI * 2;
        pts.push({ x: Math.cos(a) * 1.6, y: Math.sin(a) });
      }
      break;
    case 'heart': // parametric heart, head at the bottom tip
      for (let i = 0; i < 300; i++) {
        const t = Math.PI + (i / 300) * Math.PI * 2;
        pts.push({ x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) });
      }
      break;
    case 'star': { // five-point star, head at the bottom point
      const v: Pt[] = Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 1 : 0.45;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
      for (let i = 0; i < 10; i++) {
        const a = v[i]!;
        const b = v[(i + 1) % 10]!;
        for (let k = 0; k < 20; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / 20, y: a.y + ((b.y - a.y) * k) / 20 });
      }
      break;
    }
    case 'spiral': // inward spiral, head on the outside at the bottom
      for (let i = 0; i < 400; i++) {
        const t = i / 400;
        const r = 1 - t * 0.8;
        const a = Math.PI / 2 + t * Math.PI * 4;
        pts.push({ x: Math.cos(a) * r * 1.6, y: Math.sin(a) * r });
      }
      break;
  }
  return pts;
}

/** `n` slot positions, head first, evenly spaced along the shape and fitted into the box. */
export function queuePoints(shape: QueueShape, n: number, box: { x: number; y: number; w: number; h: number }): Pt[] {
  const raw = outline(shape);
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const ox = box.x + box.w / 2 - ((minX + maxX) / 2) * s;
  const oy = box.y + box.h / 2 - ((minY + maxY) / 2) * s;
  const pts = raw.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s }));
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const total = seg[seg.length - 1]!;
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (j < seg.length - 2 && seg[j + 1]! < d) j++;
    const f = (d - seg[j]!) / Math.max(1e-6, seg[j + 1]! - seg[j]!);
    out.push({ x: pts[j]!.x + (pts[j + 1]!.x - pts[j]!.x) * f, y: pts[j]!.y + (pts[j + 1]!.y - pts[j]!.y) * f });
  }
  return out;
}
