import type Phaser from 'phaser';
import { makeRng, type Rng } from '../core/rng.ts';
import { DESTINATIONS, type Landmark } from '../meta/destinations.ts';
import { canvasTex, css, darken, lighten, mix, rr, type Ctx } from './gfx.ts';

export type ThemeId = 'day' | 'sunset' | 'night' | 'snow' | 'candy';

/** Colors for one destination under one airport theme, including the game board. */
export interface Pal {
  skyTop: number;
  skyBot: number;
  far: number; // distant hills
  mid: number; // landmark silhouettes
  midLight: number;
  near: number; // near ground
  accent: number;
  cloud: number;
  cloudA: number;
  sun: 'sun' | 'low' | 'moon';
  stars: boolean;
  snow: boolean;
  lit: boolean; // lit windows at night
  aurora: boolean;
  tarmac: number;
  tile: number;
  rim: number;
  lights: number;
  walkway: number;
  walkwayEdge: number;
  panel: number;
  panelA: number;
}

export function palette(destIndex: number, theme: ThemeId): Pal {
  const d = DESTINATIONS[((destIndex % DESTINATIONS.length) + DESTINATIONS.length) % DESTINATIONS.length]!;
  const silhouette = mix(d.sky[0], 0x3b4f86, 0.42);
  const base: Pal = {
    skyTop: d.sky[0],
    skyBot: d.sky[1],
    far: mix(d.hills, d.sky[1], 0.35),
    mid: silhouette,
    midLight: lighten(silhouette, 0.25),
    near: d.ground,
    accent: d.accent,
    cloud: 0xffffff,
    cloudA: 0.85,
    sun: 'sun',
    stars: false,
    snow: false,
    lit: false,
    aurora: d.landmark === 'aurora',
    tarmac: 0x55627c,
    tile: 0x5f6d89,
    rim: 0x3a455c,
    lights: 0xffd24a,
    walkway: 0xfff6e6,
    walkwayEdge: 0xe7c998,
    panel: 0xffffff,
    panelA: 0.72,
  };
  if (d.landmark === 'aurora') {
    base.stars = true;
    base.sun = 'moon';
    base.cloudA = 0.35;
    base.mid = 0x9fb2d6;
    base.midLight = 0xdfe9f7;
  }
  switch (theme) {
    case 'sunset':
      return { ...base, skyTop: mix(0xff8f7a, d.sky[0], 0.25), skyBot: mix(0xffd9a0, d.sky[1], 0.2), far: 0xd99a9a, mid: 0x8f6aa8, midLight: 0xb58cc4, near: mix(d.ground, 0xf2b38a, 0.5), cloud: 0xffe3d0, cloudA: 0.8, sun: 'low', tarmac: 0x5d5078, tile: 0x685b86, rim: 0x3f3558, walkwayEdge: 0xe9b07c };
    case 'night':
      return { ...base, skyTop: 0x141c44, skyBot: 0x3b4c8a, far: 0x2e3b6e, mid: 0x27315f, midLight: 0x36427a, near: 0x2f3a5e, cloud: 0x9aa8d8, cloudA: 0.25, sun: 'moon', stars: true, lit: true, tarmac: 0x2f3757, tile: 0x384169, rim: 0x1d2340, lights: 0xffe27a, walkway: 0xe8e2f5, walkwayEdge: 0x9d8fc9, panel: 0x2a3766, panelA: 0.6 };
    case 'snow':
      return { ...base, skyTop: 0xb3d3f0, skyBot: 0xf1f7ff, far: 0xe3edf8, mid: 0x9fb2cf, midLight: 0xc9d6e8, near: 0xf5f9fd, cloud: 0xffffff, cloudA: 0.9, snow: true, tarmac: 0x6f809b, tile: 0x7a8ba6, rim: 0x51607a, walkwayEdge: 0xc9d7e8 };
    case 'candy':
      return { ...base, skyTop: 0xffbcdc, skyBot: 0xe4d6ff, far: 0xf6c6e2, mid: 0xc9a2df, midLight: 0xe0c3ef, near: 0xf6e1f3, cloud: 0xffffff, cloudA: 0.9, tarmac: 0x8573a6, tile: 0x9282b3, rim: 0x655684, lights: 0xfff0a8, walkway: 0xfff0fa, walkwayEdge: 0xefb6d8 };
    default:
      return base;
  }
}

// ---------- drawing helpers ----------

function cloud(ctx: Ctx, x: number, y: number, s: number, color: number, a: number) {
  ctx.fillStyle = css(color, a);
  ctx.beginPath();
  ctx.ellipse(x, y, 110 * s, 34 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 52 * s, y + 4 * s, 60 * s, 28 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 48 * s, y - 14 * s, 62 * s, 40 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 12 * s, y - 24 * s, 50 * s, 38 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function sky(ctx: Ctx, w: number, h: number, gy: number, p: Pal, rng: Rng) {
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, css(p.skyTop));
  g.addColorStop(1, css(p.skyBot));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, gy + 2);
  if (p.stars) {
    for (let i = 0; i < Math.round((w * gy) / 9000); i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + rng.next() * 0.6})`;
      const r = 0.8 + rng.next() * 2.2;
      ctx.beginPath();
      ctx.arc(rng.next() * w, rng.next() * gy * 0.85, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.aurora) {
    for (let i = 0; i < 3; i++) {
      const y0 = gy * (0.18 + i * 0.1);
      const band = ctx.createLinearGradient(0, y0 - 60, 0, y0 + 140);
      band.addColorStop(0, 'rgba(111,240,195,0)');
      band.addColorStop(0.35, `rgba(111,240,195,${0.34 - i * 0.07})`);
      band.addColorStop(1, 'rgba(120,140,255,0)');
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.moveTo(0, y0 + 40);
      for (let x = 0; x <= w; x += 40) ctx.lineTo(x, y0 + Math.sin(x / 170 + i * 2) * 36 + Math.sin(x / 61 + i) * 10);
      ctx.lineTo(w, y0 + 170);
      for (let x = w; x >= 0; x -= 40) ctx.lineTo(x, y0 + 150 + Math.sin(x / 150 + i) * 30);
      ctx.closePath();
      ctx.fill();
    }
  }
  // sun or moon with a glow
  const sx = w * 0.8;
  const sy = p.sun === 'low' ? gy * 0.78 : gy * 0.2;
  const sr = p.sun === 'low' ? 110 : p.sun === 'moon' ? 52 : 70;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.2);
  const gc = p.sun === 'moon' ? '220,230,255' : p.sun === 'low' ? '255,200,120' : '255,245,190';
  glow.addColorStop(0, `rgba(${gc},0.55)`);
  glow.addColorStop(1, `rgba(${gc},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
  ctx.fillStyle = p.sun === 'moon' ? '#F3F1E6' : p.sun === 'low' ? '#FFB36B' : '#FFF4B8';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  if (p.sun === 'moon') {
    ctx.fillStyle = css(mix(p.skyTop, p.skyBot, 0.25));
    ctx.beginPath();
    ctx.arc(sx + sr * 0.42, sy - sr * 0.22, sr * 0.86, 0, Math.PI * 2);
    ctx.fill();
  }
  const n = Math.max(3, Math.round(w / 260));
  for (let i = 0; i < n; i++) cloud(ctx, ((i + 0.3 + rng.next() * 0.4) * w) / n, gy * (0.12 + rng.next() * 0.5), 0.55 + rng.next() * 0.7, p.cloud, p.cloudA * (0.6 + rng.next() * 0.4));
}

function hills(ctx: Ctx, w: number, gy: number, p: Pal, rng: Rng) {
  ctx.fillStyle = css(p.far);
  ctx.beginPath();
  ctx.moveTo(0, gy);
  const ph = rng.next() * 6;
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, gy - 70 - Math.sin(x / 210 + ph) * 34 - Math.sin(x / 83 + ph * 2) * 12);
  ctx.lineTo(w, gy);
  ctx.closePath();
  ctx.fill();
  if (p.snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 0; x <= w; x += 20) {
      const y = gy - 70 - Math.sin(x / 210 + ph) * 34 - Math.sin(x / 83 + ph * 2) * 12;
      ctx.fillRect(x, y, 20, 8);
    }
  }
}

function windows(ctx: Ctx, x: number, y: number, w: number, h: number, p: Pal, rng: Rng, cw = 12, ch = 16) {
  for (let yy = y + 12; yy < y + h - ch; yy += ch + 10) {
    for (let xx = x + 9; xx < x + w - cw; xx += cw + 9) {
      const on = p.lit ? rng.next() < 0.55 : true;
      ctx.fillStyle = p.lit ? (on ? 'rgba(255,224,138,0.9)' : 'rgba(80,95,150,0.6)') : css(p.midLight, 0.75);
      ctx.fillRect(xx, yy, cw, ch);
    }
  }
}

function snowCap(ctx: Ctx, x: number, y: number, w: number, p: Pal) {
  if (!p.snow) return;
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, x - 3, y - 5, w + 6, 10, 5);
  ctx.fill();
}

function palm(ctx: Ctx, x: number, gy: number, s: number, color: number) {
  ctx.strokeStyle = css(color);
  ctx.lineWidth = 9 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x + 10 * s, gy - 70 * s, x + 26 * s, gy - 130 * s);
  ctx.stroke();
  ctx.lineWidth = 8 * s;
  for (const [dx, dy] of [[-60, 10], [-45, -18], [55, 12], [40, -20], [5, -34]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + 26 * s, gy - 130 * s);
    ctx.quadraticCurveTo(x + (26 + dx * 0.5) * s, gy - (150 + (dy < 0 ? 18 : 6)) * s, x + (26 + dx) * s, gy - (130 - dy) * s);
    ctx.stroke();
  }
}

function house(ctx: Ctx, x: number, gy: number, w: number, h: number, wall: number, roof: number, p: Pal) {
  ctx.fillStyle = css(wall);
  ctx.fillRect(x, gy - h, w, h);
  ctx.fillStyle = css(roof);
  ctx.beginPath();
  ctx.moveTo(x - 6, gy - h);
  ctx.lineTo(x + w / 2, gy - h - w * 0.5);
  ctx.lineTo(x + w + 6, gy - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.lit ? 'rgba(255,224,138,0.9)' : css(lighten(wall, 0.45));
  ctx.fillRect(x + w * 0.3, gy - h * 0.62, w * 0.4, h * 0.3);
}

// ---------- landmarks (origin: ground center, s = 1 is about 330 px tall) ----------

function landmark(ctx: Ctx, kind: Landmark, x: number, gy: number, s: number, p: Pal, rng: Rng) {
  const M = css(p.mid);
  const L = css(p.midLight);
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'harbor': {
      // lighthouse with stripes and a glowing lamp, cottages beside it
      const H = 300 * s;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 36 * s, gy);
      ctx.lineTo(x - 22 * s, gy - H);
      ctx.lineTo(x + 22 * s, gy - H);
      ctx.lineTo(x + 36 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = css(mix(p.accent, p.mid, 0.25));
      for (let i = 0; i < 3; i++) {
        const y0 = gy - H * (0.14 + i * 0.28);
        const y1 = y0 - H * 0.14;
        const wAt = (yy: number) => 36 * s - ((gy - yy) / H) * 14 * s;
        ctx.beginPath();
        ctx.moveTo(x - wAt(y0), y0);
        ctx.lineTo(x - wAt(y1), y1);
        ctx.lineTo(x + wAt(y1), y1);
        ctx.lineTo(x + wAt(y0), y0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = M;
      ctx.fillRect(x - 34 * s, gy - H - 10 * s, 68 * s, 12 * s);
      ctx.fillStyle = 'rgba(255,230,140,0.95)';
      ctx.fillRect(x - 17 * s, gy - H - 46 * s, 34 * s, 36 * s);
      ctx.fillStyle = css(mix(p.accent, p.mid, 0.25));
      ctx.beginPath();
      ctx.moveTo(x - 24 * s, gy - H - 46 * s);
      ctx.quadraticCurveTo(x, gy - H - 84 * s, x + 24 * s, gy - H - 46 * s);
      ctx.closePath();
      ctx.fill();
      const beam = ctx.createLinearGradient(x, 0, x + 260 * s, 0);
      beam.addColorStop(0, 'rgba(255,240,170,0.45)');
      beam.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x + 16 * s, gy - H - 28 * s);
      ctx.lineTo(x + 280 * s, gy - H - 70 * s);
      ctx.lineTo(x + 280 * s, gy - H + 10 * s);
      ctx.closePath();
      ctx.fill();
      const walls = [0xfff3e0, 0xe6f2ff, 0xfde2e4];
      const roofs = [0xe76f51, 0x4f86c6, 0xf4a261];
      for (let i = 0; i < 3; i++) house(ctx, x + (70 + i * 72) * s, gy, 58 * s, 52 * s, walls[i]!, roofs[i]!, p);
      house(ctx, x - 150 * s, gy, 62 * s, 48 * s, 0xfff3e0, 0x2a9d8f, p);
      break;
    }
    case 'eiffel': {
      const H = 360 * s;
      ctx.fillStyle = M;
      ctx.beginPath();
      ctx.moveTo(x - 100 * s, gy);
      ctx.quadraticCurveTo(x - 40 * s, gy - 120 * s, x - 22 * s, gy - 220 * s);
      ctx.lineTo(x - 7 * s, gy - H + 20 * s);
      ctx.lineTo(x, gy - H - 10 * s);
      ctx.lineTo(x + 7 * s, gy - H + 20 * s);
      ctx.lineTo(x + 22 * s, gy - 220 * s);
      ctx.quadraticCurveTo(x + 40 * s, gy - 120 * s, x + 100 * s, gy);
      ctx.lineTo(x + 62 * s, gy);
      ctx.quadraticCurveTo(x, gy - 110 * s, x - 62 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 58 * s, gy - 120 * s, 116 * s, 12 * s);
      ctx.fillRect(x - 30 * s, gy - 225 * s, 60 * s, 10 * s);
      ctx.strokeStyle = L;
      ctx.lineWidth = 2.5 * s;
      for (let i = 0; i < 5; i++) {
        const y = gy - 140 * s - i * 16 * s;
        ctx.beginPath();
        ctx.moveTo(x - (30 - i * 2) * s, y);
        ctx.lineTo(x + (30 - i * 2) * s, y - 14 * s);
        ctx.stroke();
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const bx = x + side * (140 + i * 60) * s;
          const bh = (70 + rng.int(40)) * s;
          ctx.fillStyle = css(p.midLight);
          ctx.fillRect(bx - 26 * s, gy - bh, 52 * s, bh);
          ctx.fillStyle = M;
          ctx.beginPath();
          ctx.moveTo(bx - 30 * s, gy - bh);
          ctx.lineTo(bx - 20 * s, gy - bh - 22 * s);
          ctx.lineTo(bx + 20 * s, gy - bh - 22 * s);
          ctx.lineTo(bx + 30 * s, gy - bh);
          ctx.closePath();
          ctx.fill();
          windows(ctx, bx - 26 * s, gy - bh, 52 * s, bh, p, rng, 9 * s, 12 * s);
        }
      }
      break;
    }
    case 'fuji': {
      ctx.fillStyle = M;
      ctx.beginPath();
      ctx.moveTo(x - 420 * s, gy);
      ctx.quadraticCurveTo(x - 160 * s, gy - 140 * s, x - 60 * s, gy - 270 * s);
      ctx.lineTo(x + 60 * s, gy - 270 * s);
      ctx.quadraticCurveTo(x + 160 * s, gy - 140 * s, x + 420 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 60 * s, gy - 270 * s);
      ctx.lineTo(x + 60 * s, gy - 270 * s);
      ctx.lineTo(x + 104 * s, gy - 200 * s);
      ctx.lineTo(x + 70 * s, gy - 212 * s);
      ctx.lineTo(x + 44 * s, gy - 190 * s);
      ctx.lineTo(x + 10 * s, gy - 214 * s);
      ctx.lineTo(x - 26 * s, gy - 192 * s);
      ctx.lineTo(x - 60 * s, gy - 214 * s);
      ctx.lineTo(x - 104 * s, gy - 200 * s);
      ctx.closePath();
      ctx.fill();
      // pagoda
      const px = x + 250 * s;
      for (let i = 0; i < 4; i++) {
        const y = gy - i * 52 * s;
        const bw = (70 - i * 12) * s;
        ctx.fillStyle = css(darken(p.mid, 0.1));
        ctx.fillRect(px - bw / 2, y - 40 * s, bw, 40 * s);
        ctx.fillStyle = css(mix(p.accent, p.mid, 0.35));
        ctx.beginPath();
        ctx.moveTo(px - bw / 2 - 30 * s, y - 34 * s);
        ctx.quadraticCurveTo(px - bw / 2, y - 44 * s, px - bw / 2 + 6 * s, y - 56 * s);
        ctx.lineTo(px + bw / 2 - 6 * s, y - 56 * s);
        ctx.quadraticCurveTo(px + bw / 2, y - 44 * s, px + bw / 2 + 30 * s, y - 34 * s);
        ctx.closePath();
        ctx.fill();
      }
      // cherry trees
      for (const tx of [x - 260 * s, x - 180 * s, x + 380 * s]) {
        ctx.fillStyle = css(darken(p.mid, 0.2));
        ctx.fillRect(tx - 5 * s, gy - 60 * s, 10 * s, 60 * s);
        ctx.fillStyle = 'rgba(255,183,213,0.95)';
        for (const [dx, dy, r] of [[0, -80, 38], [-30, -64, 28], [30, -62, 30], [-12, -104, 26], [18, -96, 24]] as const) {
          ctx.beginPath();
          ctx.arc(tx + dx * s, gy + dy * s, r * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'pyramids': {
      const pyr = (cx: number, bw: number, ph: number) => {
        ctx.fillStyle = css(lighten(p.mid, 0.12));
        ctx.beginPath();
        ctx.moveTo(cx - bw / 2, gy);
        ctx.lineTo(cx, gy - ph);
        ctx.lineTo(cx + bw * 0.08, gy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = css(darken(p.mid, 0.08));
        ctx.beginPath();
        ctx.moveTo(cx + bw * 0.08, gy);
        ctx.lineTo(cx, gy - ph);
        ctx.lineTo(cx + bw / 2, gy);
        ctx.closePath();
        ctx.fill();
      };
      pyr(x + 190 * s, 250 * s, 150 * s);
      pyr(x - 170 * s, 190 * s, 110 * s);
      pyr(x, 380 * s, 240 * s);
      palm(ctx, x - 330 * s, gy, 1.1 * s, darken(p.mid, 0.2));
      palm(ctx, x + 340 * s, gy, 0.9 * s, darken(p.mid, 0.2));
      break;
    }
    case 'skyline': {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const bw = (54 + rng.int(40)) * s;
        const bh = (110 + rng.int(150)) * s * (i === 5 ? 1.7 : 1);
        const bx = x + (i - n / 2) * 66 * s;
        ctx.fillStyle = i % 2 ? M : css(darken(p.mid, 0.08));
        ctx.fillRect(bx, gy - bh, bw, bh);
        if (i === 5) {
          ctx.fillRect(bx + bw * 0.2, gy - bh - 40 * s, bw * 0.6, 40 * s);
          ctx.fillRect(bx + bw * 0.35, gy - bh - 80 * s, bw * 0.3, 40 * s);
          ctx.fillRect(bx + bw * 0.47, gy - bh - 150 * s, bw * 0.06, 70 * s);
        }
        windows(ctx, bx, gy - bh, bw, bh, p, rng, 9 * s, 12 * s);
        snowCap(ctx, bx, gy - bh, bw, p);
      }
      break;
    }
    case 'sugarloaf': {
      ctx.fillStyle = M;
      ctx.beginPath();
      ctx.moveTo(x + 40 * s, gy);
      ctx.bezierCurveTo(x + 60 * s, gy - 330 * s, x + 250 * s, gy - 330 * s, x + 290 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = css(darken(p.mid, 0.08));
      ctx.beginPath();
      ctx.moveTo(x - 200 * s, gy);
      ctx.bezierCurveTo(x - 180 * s, gy - 190 * s, x - 40 * s, gy - 190 * s, x - 10 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = css(darken(p.mid, 0.35), 0.8);
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(x - 100 * s, gy - 150 * s);
      ctx.lineTo(x + 160 * s, gy - 262 * s);
      ctx.stroke();
      ctx.fillStyle = css(p.accent);
      rr(ctx, x + 20 * s, gy - 214 * s, 22 * s, 16 * s, 4 * s);
      ctx.fill();
      palm(ctx, x - 300 * s, gy, 1 * s, darken(p.mid, 0.25));
      palm(ctx, x + 380 * s, gy, 1.15 * s, darken(p.mid, 0.25));
      break;
    }
    case 'clocktower': {
      // ferris wheel behind
      const wx = x + 230 * s;
      const wr = 130 * s;
      ctx.strokeStyle = L;
      ctx.lineWidth = 6 * s;
      ctx.beginPath();
      ctx.arc(wx, gy - wr - 30 * s, wr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2.5 * s;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx, gy - wr - 30 * s);
        ctx.lineTo(wx + Math.cos(a) * wr, gy - wr - 30 * s + Math.sin(a) * wr);
        ctx.stroke();
        ctx.fillStyle = L;
        ctx.beginPath();
        ctx.arc(wx + Math.cos(a) * wr, gy - wr - 30 * s + Math.sin(a) * wr, 9 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = L;
      ctx.beginPath();
      ctx.moveTo(wx - 50 * s, gy);
      ctx.lineTo(wx, gy - wr - 30 * s);
      ctx.lineTo(wx + 50 * s, gy);
      ctx.closePath();
      ctx.fill();
      // tower
      const tw = 62 * s;
      const th = 330 * s;
      ctx.fillStyle = M;
      ctx.fillRect(x - tw / 2, gy - th, tw, th);
      ctx.fillRect(x - tw / 2 - 8 * s, gy - th + 60 * s, tw + 16 * s, 12 * s);
      ctx.beginPath();
      ctx.moveTo(x - tw / 2, gy - th);
      ctx.lineTo(x, gy - th - 90 * s);
      ctx.lineTo(x + tw / 2, gy - th);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFF6DA';
      ctx.beginPath();
      ctx.arc(x, gy - th + 30 * s, 20 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = M;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x, gy - th + 30 * s);
      ctx.lineTo(x, gy - th + 17 * s);
      ctx.moveTo(x, gy - th + 30 * s);
      ctx.lineTo(x + 9 * s, gy - th + 34 * s);
      ctx.stroke();
      windows(ctx, x - tw / 2, gy - th + 80 * s, tw, th - 80 * s, p, rng, 8 * s, 18 * s);
      // parliament-ish low block
      ctx.fillStyle = css(darken(p.mid, 0.06));
      ctx.fillRect(x - 330 * s, gy - 90 * s, 300 * s, 90 * s);
      for (let i = 0; i < 7; i++) ctx.fillRect(x - 322 * s + i * 42 * s, gy - 112 * s, 12 * s, 22 * s);
      windows(ctx, x - 330 * s, gy - 90 * s, 300 * s, 90 * s, p, rng, 8 * s, 14 * s);
      break;
    }
    case 'windmills': {
      const mill = (mx: number, ms: number, angle: number) => {
        ctx.fillStyle = M;
        ctx.beginPath();
        ctx.moveTo(mx - 38 * ms, gy);
        ctx.lineTo(mx - 22 * ms, gy - 170 * ms);
        ctx.lineTo(mx + 22 * ms, gy - 170 * ms);
        ctx.lineTo(mx + 38 * ms, gy);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx, gy - 170 * ms, 26 * ms, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = L;
        ctx.fillRect(mx - 9 * ms, gy - 44 * ms, 18 * ms, 44 * ms);
        ctx.save();
        ctx.translate(mx, gy - 172 * ms);
        ctx.rotate(angle);
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.fillStyle = css(lighten(p.mid, 0.35), 0.95);
          ctx.fillRect(5 * ms, -9 * ms, 118 * ms, 18 * ms);
          ctx.strokeStyle = M;
          ctx.lineWidth = 2 * ms;
          for (let j = 1; j < 6; j++) {
            ctx.beginPath();
            ctx.moveTo(5 * ms + j * 20 * ms, -9 * ms);
            ctx.lineTo(5 * ms + j * 20 * ms, 9 * ms);
            ctx.stroke();
          }
        }
        ctx.restore();
        ctx.fillStyle = M;
        ctx.beginPath();
        ctx.arc(mx, gy - 172 * ms, 9 * ms, 0, Math.PI * 2);
        ctx.fill();
      };
      mill(x - 200 * s, 0.8 * s, 0.3);
      mill(x + 60 * s, 1.1 * s, 0.9);
      // canal houses with stepped gables
      for (let i = 0; i < 4; i++) {
        const hx = x + (220 + i * 56) * s;
        const hh = (110 + rng.int(40)) * s;
        const wall = [0xd9826b, 0xf2c48d, 0x7da3c9, 0xc98f7f][i]!;
        ctx.fillStyle = css(mix(wall, p.mid, 0.35));
        ctx.fillRect(hx, gy - hh, 50 * s, hh);
        ctx.fillRect(hx + 8 * s, gy - hh - 16 * s, 34 * s, 16 * s);
        ctx.fillRect(hx + 16 * s, gy - hh - 30 * s, 18 * s, 14 * s);
        windows(ctx, hx, gy - hh, 50 * s, hh, p, rng, 10 * s, 14 * s);
      }
      break;
    }
    case 'aurora': {
      ctx.fillStyle = css(p.midLight);
      ctx.beginPath();
      ctx.moveTo(x - 460 * s, gy);
      ctx.lineTo(x - 250 * s, gy - 230 * s);
      ctx.lineTo(x - 150 * s, gy - 150 * s);
      ctx.lineTo(x - 30 * s, gy - 260 * s);
      ctx.lineTo(x + 170 * s, gy - 120 * s);
      ctx.lineTo(x + 300 * s, gy - 210 * s);
      ctx.lineTo(x + 480 * s, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [px, py] of [[-250, -230], [-30, -260], [300, -210]] as const) {
        ctx.beginPath();
        ctx.moveTo(x + (px - 44) * s, gy + (py + 50) * s);
        ctx.lineTo(x + px * s, gy + py * s);
        ctx.lineTo(x + (px + 46) * s, gy + (py + 44) * s);
        ctx.lineTo(x + (px + 16) * s, gy + (py + 36) * s);
        ctx.lineTo(x + (px - 10) * s, gy + (py + 52) * s);
        ctx.closePath();
        ctx.fill();
      }
      // stepped church tower
      ctx.fillStyle = M;
      const cx = x + 40 * s;
      for (let i = 0; i < 5; i++) {
        const bw = (34 + i * 16) * s;
        const bh = (230 - i * 40) * s;
        ctx.fillRect(cx - bw / 2, gy - bh, bw, bh);
      }
      ctx.beginPath();
      ctx.moveTo(cx - 17 * s, gy - 230 * s);
      ctx.lineTo(cx, gy - 290 * s);
      ctx.lineTo(cx + 17 * s, gy - 230 * s);
      ctx.closePath();
      ctx.fill();
      const roofs = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x5b8def];
      for (let i = 0; i < 4; i++) house(ctx, x + (150 + i * 66) * s, gy, 52 * s, 44 * s, 0xf4f1ea, roofs[i]!, p);
      break;
    }
    case 'savanna': {
      const acacia = (tx: number, ts: number) => {
        ctx.strokeStyle = M;
        ctx.lineWidth = 10 * ts;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, gy);
        ctx.lineTo(tx + 6 * ts, gy - 90 * ts);
        ctx.lineTo(tx - 30 * ts, gy - 130 * ts);
        ctx.moveTo(tx + 6 * ts, gy - 90 * ts);
        ctx.lineTo(tx + 40 * ts, gy - 132 * ts);
        ctx.stroke();
        ctx.fillStyle = M;
        ctx.beginPath();
        ctx.ellipse(tx + 4 * ts, gy - 146 * ts, 110 * ts, 26 * ts, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      const giraffe = (gx: number, gs: number) => {
        ctx.fillStyle = css(darken(p.mid, 0.05));
        ctx.beginPath();
        ctx.ellipse(gx, gy - 70 * gs, 34 * gs, 20 * gs, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(gx - 28 * gs, gy - 66 * gs, 7 * gs, 66 * gs);
        ctx.fillRect(gx - 12 * gs, gy - 66 * gs, 7 * gs, 66 * gs);
        ctx.fillRect(gx + 8 * gs, gy - 66 * gs, 7 * gs, 66 * gs);
        ctx.fillRect(gx + 22 * gs, gy - 66 * gs, 7 * gs, 66 * gs);
        ctx.beginPath();
        ctx.moveTo(gx + 18 * gs, gy - 78 * gs);
        ctx.lineTo(gx + 40 * gs, gy - 170 * gs);
        ctx.lineTo(gx + 52 * gs, gy - 168 * gs);
        ctx.lineTo(gx + 34 * gs, gy - 70 * gs);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(gx + 52 * gs, gy - 172 * gs, 18 * gs, 9 * gs, 0.3, 0, Math.PI * 2);
        ctx.fill();
      };
      acacia(x - 180 * s, 1.1 * s);
      acacia(x + 260 * s, 0.8 * s);
      giraffe(x + 30 * s, 1.05 * s);
      giraffe(x + 120 * s, 0.8 * s);
      break;
    }
  }
}

/** Control tower and terminal building on the horizon. */
function airport(ctx: Ctx, w: number, gy: number, p: Pal, rng: Rng, towerX: number) {
  const c = darken(p.mid, 0.05);
  ctx.fillStyle = css(c);
  ctx.fillRect(towerX - 16, gy - 190, 32, 190);
  ctx.fillStyle = css(lighten(p.mid, 0.1));
  ctx.beginPath();
  ctx.moveTo(towerX - 52, gy - 236);
  ctx.lineTo(towerX + 52, gy - 236);
  ctx.lineTo(towerX + 38, gy - 190);
  ctx.lineTo(towerX - 38, gy - 190);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.lit ? 'rgba(160,230,255,0.9)' : 'rgba(210,240,255,0.95)';
  ctx.fillRect(towerX - 42, gy - 228, 84, 24);
  ctx.fillStyle = css(c);
  ctx.fillRect(towerX - 30, gy - 252, 60, 18);
  ctx.fillRect(towerX - 3, gy - 282, 6, 32);
  ctx.fillStyle = '#FF5A5F';
  ctx.beginPath();
  ctx.arc(towerX, gy - 284, 6, 0, Math.PI * 2);
  ctx.fill();
  // terminal
  const tw = Math.min(520, w * 0.45);
  const tx = towerX < w / 2 ? towerX + 60 : towerX - 60 - tw;
  ctx.fillStyle = css(lighten(p.mid, 0.08));
  rr(ctx, tx, gy - 84, tw, 84, 10);
  ctx.fill();
  ctx.fillStyle = p.lit ? 'rgba(255,224,138,0.75)' : 'rgba(215,240,255,0.9)';
  ctx.fillRect(tx + 16, gy - 62, tw - 32, 30);
  ctx.fillStyle = css(darken(p.mid, 0.1));
  for (let x = tx + 16; x < tx + tw - 16; x += 38) ctx.fillRect(x, gy - 62, 4, 30);
  snowCap(ctx, tx, gy - 84, tw, p);
  void rng;
}

function ground(ctx: Ctx, w: number, h: number, gy: number, p: Pal) {
  const g = ctx.createLinearGradient(0, gy, 0, h);
  g.addColorStop(0, css(p.near));
  g.addColorStop(1, css(darken(p.near, 0.12)));
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, w, h - gy);
  // runway strip
  const ry = gy + Math.min(140, (h - gy) * 0.35);
  ctx.fillStyle = css(mix(p.tarmac, p.near, 0.25));
  ctx.fillRect(0, ry, w, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let x = 30; x < w; x += 150) ctx.fillRect(x, ry + 40, 80, 10);
  if (p.snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, gy, w, 10);
  }
}

export interface SceneryOpts {
  dest: number;
  theme: ThemeId;
  w: number;
  h: number;
  /** Ground line in design px. */
  horizon: number;
  /** 'hero' puts a big landmark in the middle (menus); 'sides' is the game screen: a terminal band and apron floor. */
  layout: 'hero' | 'sides';
  /** Game screen: the terminal building band behind the gate row. */
  terminal?: { y: number; h: number };
}

/** Terminal facade behind the gates: roof, glass curtain wall, base. */
function terminalBand(ctx: Ctx, w: number, y: number, h: number, p: Pal) {
  const night = p.lit;
  const wall = night ? 0x2c3763 : p.snow ? 0xe9eff7 : mix(0xdfe8f3, p.skyBot, 0.2);
  const roof = night ? 0x1c2448 : p.snow ? 0xffffff : darken(wall, 0.22);
  ctx.fillStyle = 'rgba(15,22,50,0.18)';
  ctx.fillRect(0, y + h, w, 14);
  ctx.fillStyle = css(roof);
  ctx.fillRect(0, y - 16, w, 20);
  ctx.fillStyle = css(lighten(roof, 0.35));
  ctx.fillRect(0, y - 16, w, 4);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, css(lighten(wall, 0.1)));
  g.addColorStop(1, css(darken(wall, 0.08)));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h);
  // glass curtain wall reflecting the sky
  const gy = y + 16;
  const gh = h - 40;
  const glass = ctx.createLinearGradient(0, gy, 0, gy + gh);
  glass.addColorStop(0, night ? 'rgba(255,224,138,0.55)' : css(lighten(p.skyTop, 0.2), 0.9));
  glass.addColorStop(1, night ? 'rgba(255,200,110,0.35)' : css(p.skyBot, 0.9));
  ctx.fillStyle = glass;
  ctx.fillRect(0, gy, w, gh);
  ctx.fillStyle = css(darken(wall, 0.25), 0.8);
  for (let x = 0; x < w; x += 54) ctx.fillRect(x, gy, 5, gh);
  ctx.fillRect(0, gy + gh * 0.5, w, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let x = 20; x < w; x += 170) {
    ctx.beginPath();
    ctx.moveTo(x, gy + gh);
    ctx.lineTo(x + 40, gy);
    ctx.lineTo(x + 70, gy);
    ctx.lineTo(x + 30, gy + gh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = css(darken(wall, 0.18));
  ctx.fillRect(0, y + h - 24, w, 24);
}

/** Concrete apron with faint expansion joints. */
function apronFloor(ctx: Ctx, w: number, h: number, y: number, p: Pal) {
  const base = p.lit ? 0x3a4468 : p.snow ? 0xe6edf6 : mix(0xc3ccd9, p.near, 0.25);
  const g = ctx.createLinearGradient(0, y, 0, h);
  g.addColorStop(0, css(lighten(base, 0.06)));
  g.addColorStop(1, css(darken(base, 0.06)));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h - y);
  ctx.strokeStyle = css(darken(base, 0.12), 0.6);
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 180) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let yy = y + 180; yy < h; yy += 180) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }
}

/** Scenery texture key -> use tick, least recently used first (see pruneScenery). */
const lastUse = new Map<string, number>();
let useTick = 0;

/** The current use tick: textures used after this point are kept by `pruneScenery(..., mark)`. */
export function sceneryMark() {
  return useTick;
}

/** Paint a full scenery into a cached canvas texture and return its key. */
export function sceneryTex(scene: Phaser.Scene, o: SceneryOpts) {
  const key = `scn_${o.dest}_${o.theme}_${o.layout}_${Math.round(o.w)}x${Math.round(o.h)}_${Math.round(o.horizon)}_${o.terminal ? Math.round(o.terminal.y) : 0}`;
  lastUse.delete(key);
  lastUse.set(key, ++useTick);
  const d = DESTINATIONS[o.dest % DESTINATIONS.length]!;
  const p = palette(o.dest, o.theme);
  return canvasTex(scene, key, o.w, o.h, (ctx, w, h) => {
    const rng = makeRng(o.dest * 7919 + 17);
    const gy = o.horizon;
    sky(ctx, w, h, gy, p, rng);
    hills(ctx, w, gy, p, rng);
    if (o.layout === 'hero') {
      landmark(ctx, d.landmark, w / 2, gy, Math.min(1.25, w / 900), p, rng);
      airport(ctx, w, gy, p, rng, w * 0.1);
      ground(ctx, w, h, gy, p);
    } else {
      const s = Math.min(1, Math.max(0.7, w / 1400));
      landmark(ctx, d.landmark, w * 0.5, gy - 4, s * 1.05, p, rng);
      const t = o.terminal ?? { y: gy, h: 160 };
      apronFloor(ctx, w, h, t.y + t.h, p);
      terminalBand(ctx, w, t.y, t.h, p);
    }
  });
}

/**
 * Keep the cached scenery under `budget` canvas pixels by dropping the least recently used textures,
 * but never one used after `mark` (those may be on screen). Scenes call this once they are built.
 */
export function pruneScenery(scene: Phaser.Scene, budget: number, mark: number) {
  const tm = scene.textures;
  const px = (k: string) => {
    const src = tm.get(k).source[0];
    return src ? src.width * src.height : 0;
  };
  for (const k of [...lastUse.keys()]) if (!tm.exists(k)) lastUse.delete(k);
  let total = 0;
  for (const k of lastUse.keys()) total += px(k);
  for (const [k, t] of [...lastUse]) {
    if (total <= budget || t > mark) break;
    total -= px(k);
    tm.remove(k);
    lastUse.delete(k);
  }
}
