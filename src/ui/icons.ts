import type Phaser from 'phaser';
import { canvasTex, css, rr, type Ctx } from './gfx.ts';

/**
 * Vector icons drawn in a 100 x 100 box. Glyph icons take the color they are drawn in; the COLORED ones keep theirs.
 */
const W = '#FFFFFF';

function cut(ctx: Ctx, fn: () => void) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  fn();
  ctx.restore();
}
function arrowHead(ctx: Ctx, x: number, y: number, dx: number, dy: number, s: number) {
  const nx = -dy;
  const ny = dx;
  ctx.beginPath();
  ctx.moveTo(x + dx * s, y + dy * s);
  ctx.lineTo(x + nx * s * 0.9 - dx * s * 0.25, y + ny * s * 0.9 - dy * s * 0.25);
  ctx.lineTo(x - nx * s * 0.9 - dx * s * 0.25, y - ny * s * 0.9 - dy * s * 0.25);
  ctx.closePath();
  ctx.fill();
}
function starPath(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.48) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * inner : r;
    ctx.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
  }
  ctx.closePath();
}
function heartPath(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.38);
  ctx.bezierCurveTo(cx - s * 0.62, cy - s * 0.05, cx - s * 0.42, cy - s * 0.62, cx, cy - s * 0.28);
  ctx.bezierCurveTo(cx + s * 0.42, cy - s * 0.62, cx + s * 0.62, cy - s * 0.05, cx, cy + s * 0.38);
  ctx.closePath();
}
function speaker(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(14, 38);
  ctx.lineTo(30, 38);
  ctx.lineTo(52, 20);
  ctx.lineTo(52, 80);
  ctx.lineTo(30, 62);
  ctx.lineTo(14, 62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function notes(ctx: Ctx) {
  ctx.beginPath();
  ctx.ellipse(30, 72, 12, 10, -0.3, 0, Math.PI * 2);
  ctx.ellipse(70, 64, 12, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(36, 26, 8, 46);
  ctx.fillRect(76, 18, 8, 46);
  ctx.beginPath();
  ctx.moveTo(36, 26);
  ctx.lineTo(84, 16);
  ctx.lineTo(84, 30);
  ctx.lineTo(36, 40);
  ctx.closePath();
  ctx.fill();
}
function slash(ctx: Ctx) {
  cut(ctx, () => {
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(86, 86);
    ctx.stroke();
  });
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.lineTo(86, 86);
  ctx.stroke();
}

const GLYPHS: Record<string, (ctx: Ctx) => void> = {
  cloud(ctx) {
    ctx.beginPath();
    ctx.arc(32, 60, 18, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(50, 42, 22, Math.PI, Math.PI * 1.95);
    ctx.arc(70, 58, 16, Math.PI * 1.4, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
  },
  pause(ctx) {
    rr(ctx, 22, 16, 20, 68, 8);
    ctx.fill();
    rr(ctx, 58, 16, 20, 68, 8);
    ctx.fill();
  },
  play(ctx) {
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(32, 20);
    ctx.lineTo(80, 50);
    ctx.lineTo(32, 80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  restart(ctx) {
    ctx.lineWidth = 13;
    const a0 = -Math.PI * 0.2;
    const a1 = Math.PI * 1.32;
    ctx.beginPath();
    ctx.arc(50, 54, 28, a0, a1, false);
    ctx.stroke();
    const ex = 50 + Math.cos(a1) * 28;
    const ey = 54 + Math.sin(a1) * 28;
    arrowHead(ctx, ex, ey, -Math.sin(a1), Math.cos(a1), 17);
  },
  home(ctx) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(50, 14);
    ctx.lineTo(88, 48);
    ctx.lineTo(78, 48);
    ctx.lineTo(78, 84);
    ctx.lineTo(22, 84);
    ctx.lineTo(22, 48);
    ctx.lineTo(12, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    cut(ctx, () => {
      rr(ctx, 42, 58, 16, 30, 6);
      ctx.fill();
    });
  },
  gear(ctx) {
    ctx.save();
    ctx.translate(50, 50);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      rr(ctx, -9, -44, 18, 22, 5);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(50, 50, 29, 0, Math.PI * 2);
    ctx.fill();
    cut(ctx, () => {
      ctx.beginPath();
      ctx.arc(50, 50, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  close(ctx) {
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(26, 26);
    ctx.lineTo(74, 74);
    ctx.moveTo(74, 26);
    ctx.lineTo(26, 74);
    ctx.stroke();
  },
  check(ctx) {
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(20, 52);
    ctx.lineTo(41, 73);
    ctx.lineTo(81, 29);
    ctx.stroke();
  },
  lock(ctx) {
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(50, 40, 18, Math.PI, 0);
    ctx.lineTo(68, 48);
    ctx.moveTo(32, 40);
    ctx.lineTo(32, 48);
    ctx.stroke();
    rr(ctx, 20, 44, 60, 44, 10);
    ctx.fill();
    cut(ctx, () => {
      ctx.beginPath();
      ctx.arc(50, 62, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(47, 64, 6, 12);
    });
  },
  star(ctx) {
    ctx.lineWidth = 8;
    starPath(ctx, 50, 54, 42);
    ctx.fill();
    ctx.stroke();
  },
  map(ctx) {
    ctx.beginPath();
    ctx.moveTo(10, 24);
    ctx.lineTo(36, 14);
    ctx.lineTo(64, 24);
    ctx.lineTo(90, 14);
    ctx.lineTo(90, 76);
    ctx.lineTo(64, 86);
    ctx.lineTo(36, 76);
    ctx.lineTo(10, 86);
    ctx.closePath();
    ctx.lineWidth = 6;
    ctx.fill();
    ctx.stroke();
    cut(ctx, () => {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(36, 16);
      ctx.lineTo(36, 76);
      ctx.moveTo(64, 24);
      ctx.lineTo(64, 84);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(20, 66);
      ctx.quadraticCurveTo(44, 40, 58, 52);
      ctx.quadraticCurveTo(70, 60, 80, 34);
      ctx.stroke();
    });
  },
  shop(ctx) {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(50, 36, 17, Math.PI, 0);
    ctx.stroke();
    rr(ctx, 16, 34, 68, 54, 12);
    ctx.fill();
    cut(ctx, () => {
      ctx.beginPath();
      ctx.arc(36, 48, 4.5, 0, Math.PI * 2);
      ctx.arc(64, 48, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  trophy(ctx) {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(24, 32, 11, Math.PI * 0.5, Math.PI * 1.5);
    ctx.moveTo(76, 21);
    ctx.arc(76, 32, 11, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(74, 14);
    ctx.lineTo(72, 42);
    ctx.quadraticCurveTo(69, 62, 50, 63);
    ctx.quadraticCurveTo(31, 62, 28, 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(44, 60, 12, 14);
    rr(ctx, 28, 72, 44, 14, 5);
    ctx.fill();
  },
  gift(ctx) {
    rr(ctx, 16, 46, 68, 40, 6);
    ctx.fill();
    rr(ctx, 11, 32, 78, 18, 6);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(38, 24, 12, 8, 0.3, 0, Math.PI * 2);
    ctx.ellipse(62, 24, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    cut(ctx, () => {
      ctx.fillRect(45, 32, 10, 54);
    });
  },
  calendar(ctx) {
    rr(ctx, 14, 20, 72, 66, 12);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.lineTo(32, 26);
    ctx.moveTo(68, 12);
    ctx.lineTo(68, 26);
    ctx.stroke();
    cut(ctx, () => {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        rr(ctx, 25 + c * 18, 44 + r * 18, 12, 11, 3);
        ctx.fill();
      }
      ctx.fillRect(14, 34, 72, 3);
    });
  },
  leaf(ctx) {
    ctx.beginPath();
    ctx.moveTo(18, 82);
    ctx.bezierCurveTo(14, 44, 42, 16, 86, 14);
    ctx.bezierCurveTo(88, 58, 60, 84, 18, 82);
    ctx.closePath();
    ctx.fill();
    cut(ctx, () => {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(24, 76);
      ctx.quadraticCurveTo(46, 48, 72, 30);
      ctx.stroke();
    });
  },
  music(ctx) {
    notes(ctx);
  },
  musicOff(ctx) {
    notes(ctx);
    slash(ctx);
  },
  sound(ctx) {
    ctx.lineWidth = 6;
    speaker(ctx);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(52, 50, 16, -0.8, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(52, 50, 31, -0.8, 0.8);
    ctx.stroke();
  },
  soundOff(ctx) {
    ctx.lineWidth = 6;
    speaker(ctx);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(64, 36);
    ctx.lineTo(88, 64);
    ctx.moveTo(88, 36);
    ctx.lineTo(64, 64);
    ctx.stroke();
  },
  vibrate(ctx) {
    rr(ctx, 33, 14, 34, 72, 9);
    ctx.fill();
    cut(ctx, () => {
      rr(ctx, 39, 22, 22, 50, 4);
      ctx.fill();
    });
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(22, 30);
    ctx.lineTo(14, 40);
    ctx.lineTo(22, 50);
    ctx.lineTo(14, 60);
    ctx.lineTo(22, 70);
    ctx.moveTo(78, 30);
    ctx.lineTo(86, 40);
    ctx.lineTo(78, 50);
    ctx.lineTo(86, 60);
    ctx.lineTo(78, 70);
    ctx.stroke();
  },
  symbols(ctx) {
    ctx.beginPath();
    ctx.arc(30, 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(72, 14);
    ctx.lineTo(90, 46);
    ctx.lineTo(54, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    rr(ctx, 34, 56, 32, 32, 6);
    ctx.fill();
  },
  motion(ctx) {
    ctx.beginPath();
    ctx.arc(62, 50, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(12, 36);
    ctx.lineTo(32, 36);
    ctx.moveTo(8, 50);
    ctx.lineTo(32, 50);
    ctx.moveTo(12, 64);
    ctx.lineTo(32, 64);
    ctx.stroke();
  },
  plane(ctx) {
    ctx.save();
    ctx.translate(50, 50);
    ctx.rotate(Math.PI / 4);
    rr(ctx, -9, -44, 18, 88, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-44, 14);
    ctx.lineTo(-44, 24);
    ctx.lineTo(-7, 14);
    ctx.lineTo(7, 14);
    ctx.lineTo(44, 24);
    ctx.lineTo(44, 14);
    ctx.lineTo(7, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 28);
    ctx.lineTo(-22, 42);
    ctx.lineTo(-22, 48);
    ctx.lineTo(22, 48);
    ctx.lineTo(22, 42);
    ctx.lineTo(6, 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  person(ctx) {
    ctx.beginPath();
    ctx.arc(50, 30, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, 88);
    ctx.quadraticCurveTo(18, 52, 50, 52);
    ctx.quadraticCurveTo(82, 52, 82, 88);
    ctx.closePath();
    ctx.fill();
  },
  crown(ctx) {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(16, 70);
    ctx.lineTo(12, 30);
    ctx.lineTo(34, 48);
    ctx.lineTo(50, 18);
    ctx.lineTo(66, 48);
    ctx.lineTo(88, 30);
    ctx.lineTo(84, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    rr(ctx, 14, 74, 72, 13, 5);
    ctx.fill();
  },
  globe(ctx) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(50, 50, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(50, 50, 15, 36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 50);
    ctx.lineTo(86, 50);
    ctx.moveTo(20, 32);
    ctx.lineTo(80, 32);
    ctx.moveTo(20, 68);
    ctx.lineTo(80, 68);
    ctx.stroke();
  },
  bolt(ctx) {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(58, 8);
    ctx.lineTo(20, 56);
    ctx.lineTo(46, 56);
    ctx.lineTo(38, 92);
    ctx.lineTo(80, 40);
    ctx.lineTo(54, 40);
    ctx.lineTo(64, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  flame(ctx) {
    ctx.beginPath();
    ctx.moveTo(50, 8);
    ctx.bezierCurveTo(64, 30, 82, 42, 78, 64);
    ctx.bezierCurveTo(75, 82, 63, 90, 50, 90);
    ctx.bezierCurveTo(35, 90, 22, 80, 22, 62);
    ctx.bezierCurveTo(22, 48, 32, 40, 36, 26);
    ctx.bezierCurveTo(43, 38, 45, 44, 50, 48);
    ctx.bezierCurveTo(57, 38, 57, 24, 50, 8);
    ctx.closePath();
    ctx.fill();
  },
  gate(ctx) {
    ctx.lineWidth = 9;
    rr(ctx, 16, 16, 68, 68, 14);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(50, 32);
    ctx.lineTo(50, 68);
    ctx.moveTo(32, 50);
    ctx.lineTo(68, 50);
    ctx.stroke();
  },
  sort(ctx) {
    rr(ctx, 10, 18, 34, 14, 7);
    ctx.fill();
    rr(ctx, 10, 43, 48, 14, 7);
    ctx.fill();
    rr(ctx, 10, 68, 62, 14, 7);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(80, 16);
    ctx.lineTo(80, 64);
    ctx.stroke();
    arrowHead(ctx, 80, 68, 0, 1, 16);
  },
  shuffle(ctx) {
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(10, 30);
    ctx.lineTo(26, 30);
    ctx.bezierCurveTo(48, 30, 48, 70, 70, 70);
    ctx.lineTo(74, 70);
    ctx.moveTo(10, 70);
    ctx.lineTo(26, 70);
    ctx.bezierCurveTo(48, 70, 48, 30, 70, 30);
    ctx.lineTo(74, 30);
    ctx.stroke();
    arrowHead(ctx, 78, 30, 1, 0, 15);
    arrowHead(ctx, 78, 70, 1, 0, 15);
  },
  plus(ctx) {
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(50, 80);
    ctx.moveTo(20, 50);
    ctx.lineTo(80, 50);
    ctx.stroke();
  },
  back(ctx) {
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(62, 16);
    ctx.lineTo(28, 50);
    ctx.lineTo(62, 84);
    ctx.stroke();
  },
  next(ctx) {
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(38, 16);
    ctx.lineTo(72, 50);
    ctx.lineTo(38, 84);
    ctx.stroke();
  },
  info(ctx) {
    ctx.beginPath();
    ctx.arc(50, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    rr(ctx, 41, 40, 18, 48, 9);
    ctx.fill();
  },
  question(ctx) {
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(50, 34, 18, Math.PI * 1.1, Math.PI * 0.35);
    ctx.quadraticCurveTo(50, 50, 50, 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(50, 82, 8, 0, Math.PI * 2);
    ctx.fill();
  },
  palette(ctx) {
    ctx.beginPath();
    ctx.moveTo(50, 12);
    ctx.bezierCurveTo(80, 12, 92, 34, 88, 52);
    ctx.bezierCurveTo(84, 66, 66, 60, 62, 70);
    ctx.bezierCurveTo(58, 80, 66, 88, 50, 88);
    ctx.bezierCurveTo(26, 88, 10, 70, 10, 50);
    ctx.bezierCurveTo(10, 28, 26, 12, 50, 12);
    ctx.closePath();
    ctx.fill();
    cut(ctx, () => {
      for (const [x, y] of [[30, 38], [48, 26], [68, 32], [26, 60]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  shirt(ctx) {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(34, 14);
    ctx.quadraticCurveTo(50, 26, 66, 14);
    ctx.lineTo(90, 30);
    ctx.lineTo(80, 48);
    ctx.lineTo(70, 42);
    ctx.lineTo(70, 88);
    ctx.lineTo(30, 88);
    ctx.lineTo(30, 42);
    ctx.lineTo(20, 48);
    ctx.lineTo(10, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  tower(ctx) {
    ctx.beginPath();
    ctx.moveTo(40, 44);
    ctx.lineTo(60, 44);
    ctx.lineTo(64, 90);
    ctx.lineTo(36, 90);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(22, 20);
    ctx.lineTo(78, 20);
    ctx.lineTo(70, 44);
    ctx.lineTo(30, 44);
    ctx.closePath();
    ctx.fill();
    rr(ctx, 42, 8, 16, 12, 3);
    ctx.fill();
    cut(ctx, () => {
      ctx.fillRect(30, 27, 40, 8);
    });
  },
  heart(ctx) {
    heartPath(ctx, 50, 54, 84);
    ctx.fill();
  },
  note(ctx) {
    ctx.beginPath();
    ctx.ellipse(40, 72, 15, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(47, 16, 9, 56);
    ctx.beginPath();
    ctx.moveTo(56, 16);
    ctx.quadraticCurveTo(80, 26, 76, 48);
    ctx.quadraticCurveTo(72, 34, 56, 32);
    ctx.closePath();
    ctx.fill();
  },
  hint(ctx) {
    ctx.beginPath();
    ctx.arc(50, 40, 27, Math.PI * 0.8, Math.PI * 0.2);
    ctx.lineTo(62, 70);
    ctx.lineTo(38, 70);
    ctx.closePath();
    ctx.fill();
    rr(ctx, 38, 74, 24, 8, 4);
    ctx.fill();
    rr(ctx, 42, 85, 16, 7, 3.5);
    ctx.fill();
  },
};

/** Multi-color icons: drawn as-is, never tinted. */
const COLORED: Record<string, (ctx: Ctx) => void> = {
  coin(ctx) {
    const g = ctx.createRadialGradient(40, 34, 6, 50, 50, 50);
    g.addColorStop(0, '#FFF3A6');
    g.addColorStop(0.55, '#FFD23F');
    g.addColorStop(1, '#F0A500');
    ctx.fillStyle = '#C47F00';
    ctx.beginPath();
    ctx.arc(50, 53, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(50, 48, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E09A00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(50, 48, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#E39B00';
    starPath(ctx, 50, 50, 20);
    ctx.fill();
    ctx.fillStyle = '#FFF6C4';
    starPath(ctx, 50, 47, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(34, 26, 10, 5, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },
  starGold(ctx) {
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#D98B00';
    starPath(ctx, 50, 56, 44, 0.5);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 10, 0, 90);
    g.addColorStop(0, '#FFF08A');
    g.addColorStop(0.5, '#FFCB2F');
    g.addColorStop(1, '#FFA800');
    ctx.fillStyle = g;
    starPath(ctx, 50, 52, 44, 0.5);
    ctx.fill();
    ctx.strokeStyle = '#E08E00';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(40, 36, 8, 4.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },
  starEmpty(ctx) {
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(30,45,90,0.35)';
    starPath(ctx, 50, 54, 44, 0.5);
    ctx.fill();
    ctx.fillStyle = '#C9D3E6';
    starPath(ctx, 50, 52, 44, 0.5);
    ctx.fill();
  },
  giftColor(ctx) {
    ctx.fillStyle = '#E8414D';
    rr(ctx, 16, 46, 68, 42, 8);
    ctx.fill();
    ctx.fillStyle = '#FF6B74';
    rr(ctx, 11, 32, 78, 20, 7);
    ctx.fill();
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(44, 32, 12, 56);
    ctx.strokeStyle = '#FFD23F';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(37, 23, 12, 8, 0.35, 0, Math.PI * 2);
    ctx.ellipse(63, 23, 12, 8, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, 16, 34, 26, 6, 3);
    ctx.fill();
  },
  chest(ctx) {
    ctx.fillStyle = '#8A4B22';
    rr(ctx, 12, 44, 76, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#B8662E';
    ctx.beginPath();
    ctx.moveTo(12, 48);
    ctx.bezierCurveTo(12, 16, 88, 16, 88, 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFC93C';
    ctx.fillRect(12, 44, 76, 8);
    ctx.fillRect(24, 22, 8, 66);
    ctx.fillRect(68, 22, 8, 66);
    rr(ctx, 42, 42, 16, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#7A3E12';
    ctx.fillRect(48, 50, 4, 7);
  },
  trophyGold(ctx) {
    const g = ctx.createLinearGradient(0, 10, 0, 90);
    g.addColorStop(0, '#FFE98A');
    g.addColorStop(1, '#F2A900');
    ctx.strokeStyle = '#E8A200';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(24, 32, 11, Math.PI * 0.5, Math.PI * 1.5);
    ctx.moveTo(76, 21);
    ctx.arc(76, 32, 11, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(74, 14);
    ctx.lineTo(72, 42);
    ctx.quadraticCurveTo(69, 62, 50, 63);
    ctx.quadraticCurveTo(31, 62, 28, 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(44, 60, 12, 14);
    ctx.fillStyle = '#C98A00';
    rr(ctx, 28, 72, 44, 14, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    rr(ctx, 34, 20, 8, 26, 4);
    ctx.fill();
  },
};

export type IconName = keyof typeof GLYPHS | keyof typeof COLORED;
export const isColoredIcon = (n: string) => n in COLORED;

/** Texture key for an icon at a design size (cached). */
export function iconTex(scene: Phaser.Scene, name: IconName, size: number, color = 0xffffff) {
  const s = Math.round(size);
  // the color is painted in rather than tinted, so icons also look right with the canvas renderer
  const c = isColoredIcon(name) ? 0xffffff : color;
  const fill = c === 0xffffff ? W : css(c);
  return canvasTex(scene, c === 0xffffff ? `ic_${name}_${s}` : `ic_${name}_${s}_${c.toString(16)}`, s, s, (ctx) => {
    ctx.scale(s / 100, s / 100);
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    (GLYPHS[name] ?? COLORED[name])?.(ctx);
  });
}

/** Icon image: glyphs are drawn in `color`, colored icons keep theirs. */
export function icon(scene: Phaser.Scene, x: number, y: number, name: IconName, size: number, color = 0xffffff) {
  const img = scene.add.image(x, y, iconTex(scene, name, size, color));
  img.setDisplaySize(size, size);
  return img;
}
