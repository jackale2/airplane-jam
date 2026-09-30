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
        const r = i % 2 === 0 ? 1 : 0.55;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
      for (let i = 0; i < 10; i++) {
        const a = v[i]!;
        const b = v[(i + 1) % 10]!;
        for (let k = 0; k < 20; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / 20, y: a.y + ((b.y - a.y) * k) / 20 });
      }
      break;
    }
    case 'spiral': // one inward curl, head on the outside at the bottom (more turns would stack travelers on each other)
      for (let i = 0; i < 400; i++) {
        const t = i / 400;
        const r = 1 - t * 0.65;
        const a = Math.PI / 2 + t * Math.PI * 2;
        pts.push({ x: Math.cos(a) * r * 1.7, y: Math.sin(a) * r });
      }
      break;
  }
  return pts;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * `n` slot positions, head first, evenly spaced along the shape and fitted into the box. The shape may be
 * stretched up to `stretch` times along the roomier axis so wide panels are used (reads as floor perspective).
 */
export function queuePoints(shape: QueueShape, n: number, box: Box, stretch = 1.6): Pt[] {
  const raw = outline(shape);
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const fx = box.w / (maxX - minX), fy = box.h / (maxY - minY);
  const s = Math.min(fx, fy);
  const sx = Math.min(fx, s * stretch), sy = Math.min(fy, s * stretch);
  const ox = box.x + box.w / 2 - ((minX + maxX) / 2) * sx;
  const oy = box.y + box.h / 2 - ((minY + maxY) / 2) * sy;
  const pts = raw.map((p) => ({ x: ox + p.x * sx, y: oy + p.y * sy }));
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

/** Two travelers that are not next to each other in line would cover each other's faces. */
function crowded(pts: Pt[], paxH: number) {
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      if (Math.abs(pts[i]!.x - pts[j]!.x) < paxH * 0.45 && Math.abs(pts[i]!.y - pts[j]!.y) < paxH * 0.75) return true;
    }
  }
  return false;
}

/**
 * Slots and traveler height for a queue panel: travelers as tall as the spacing along the line allows
 * (capped), with room above the top row for heads. Flat panels try more stretch while it keeps rows apart.
 */
export function layoutQueue(shape: QueueShape, n: number, panel: Box): { pts: Pt[]; paxH: number } {
  let best: { pts: Pt[]; paxH: number } | undefined;
  for (const stretch of [1.6, 1.9, 2.2, 2.5]) {
    let paxH = Math.min(150, panel.h * 0.26);
    let pts: Pt[] = [];
    for (let pass = 0; pass < 2; pass++) {
      const box = { x: panel.x + 60, y: panel.y + 16 + paxH * 0.95, w: panel.w - 120, h: Math.max(60, panel.h - paxH * 0.95 - 76) };
      pts = queuePoints(shape, n, box, stretch);
      const gap = Math.min(...pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y)));
      paxH = Math.min(150, panel.h * 0.3, gap * 1.55);
    }
    if (best && crowded(pts, paxH)) break;
    if (!best || paxH > best.paxH + 1) best = { pts, paxH };
  }
  return best!;
}
