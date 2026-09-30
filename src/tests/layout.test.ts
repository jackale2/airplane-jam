import { describe, expect, it } from 'vitest';
import { BoardView } from '../layout/boardView.ts';
import { fitBoard, gameLayout, renderScale, sameView, viewFor, type Rect } from '../layout/view.ts';
import { planeCells } from '../core/Board.ts';
import type { PlaneData } from '../core/types.ts';

const inside = (r: Rect, w: number, h: number) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// CSS sizes of real screens: phones, a foldable, tablets both ways, laptops, a phone in landscape
const SCREENS: [number, number][] = [
  [360, 640], [375, 667], [390, 844], [412, 915], [360, 800], [430, 932], [384, 854],
  [673, 841], [768, 1024], [820, 1180], [1024, 1366], [1024, 768], [1180, 820], [1366, 1024],
  [1280, 720], [1440, 900], [1920, 1080], [2560, 1080], [844, 390], [932, 430],
];

describe('view sizes', () => {
  it('keeps the short side at 1080 design px and picks the layout from the shape', () => {
    expect(viewFor(390, 844)).toMatchObject({ w: 1080, mode: 'tall' });
    expect(viewFor(820, 1180)).toMatchObject({ w: 1080, mode: 'compact' });
    expect(viewFor(1440, 900)).toMatchObject({ h: 1080, mode: 'wide' });
    expect(viewFor(0, 0)).toMatchObject({ w: 1080, h: 1920 });
    for (const [w, h] of SCREENS) {
      const v = viewFor(w, h);
      expect(Math.min(v.w, v.h)).toBe(1080);
      expect(Math.max(v.w, v.h)).toBeLessThanOrEqual(2520);
    }
  });

  it('renders phones at 1x and big screens up to 2x', () => {
    expect(renderScale(390, 844, 3)).toBe(1);
    expect(renderScale(1024, 1366, 2)).toBe(2);
    expect(renderScale(768, 1024, 2)).toBe(1.5);
    expect(renderScale(1920, 1080, 1)).toBe(1);
    expect(renderScale(2560, 1440, 2)).toBe(2);
  });

  it('treats small resizes (address bar) as the same view', () => {
    expect(sameView(viewFor(390, 844), viewFor(390, 800))).toBe(true);
    expect(sameView(viewFor(390, 844), viewFor(844, 390))).toBe(false);
  });
});

describe('game layout', () => {
  it('fits every region on screen without overlaps, on every screen shape', () => {
    for (const [w, h] of SCREENS) {
      const v = viewFor(w, h);
      const L = gameLayout(v);
      const regions = [L.hud, L.queue, L.gates, L.board, L.boosters];
      for (const r of regions) {
        expect(inside(r, v.w, v.h), `${w}x${h} ${JSON.stringify(r)}`).toBe(true);
        expect(r.w).toBeGreaterThan(100);
        expect(r.h).toBeGreaterThan(100);
      }
      for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) expect(overlap(regions[i]!, regions[j]!), `${w}x${h} regions ${i} and ${j}`).toBe(false);
    }
  });

  it('gives the biggest level (9 x 14) playable cells everywhere', () => {
    for (const [w, h] of SCREENS) {
      const v = viewFor(w, h);
      const fit = fitBoard(gameLayout(v).board, 9, 14);
      const cssCell = (fit.cell * Math.min(w, h)) / 1080;
      expect(cssCell, `${w}x${h}`).toBeGreaterThan(19);
    }
  });

  it('turns a tall grid on a wide board area when that gives bigger cells', () => {
    const fit = fitBoard({ x: 0, y: 0, w: 1100, h: 700 }, 8, 12);
    expect(fit.rot).toBe(1);
    expect([fit.cols, fit.rows]).toEqual([12, 8]);
    expect(fitBoard({ x: 0, y: 0, w: 700, h: 1100 }, 8, 12).rot).toBe(0);
  });
});

describe('board view', () => {
  const plane: PlaneData = { id: 1, color: 0, length: 3, x: 2, y: 1, dir: 'up' };

  it('maps cells both ways, straight and turned', () => {
    for (const rot of [0, 1] as const) {
      const fit = { rot, cell: 50, cols: rot ? 6 : 4, rows: rot ? 4 : 6, ox: 10, oy: 20 };
      const bv = new BoardView(fit, 6);
      for (let x = 0; x < 4; x++) for (let y = 0; y < 6; y++) expect(bv.levelCell(...bv.screenCell(x, y))).toEqual([x, y]);
    }
  });

  it('turns directions clockwise with the board', () => {
    const bv = new BoardView({ rot: 1, cell: 50, cols: 6, rows: 4, ox: 0, oy: 0 }, 6);
    expect(['up', 'right', 'down', 'left'].map((d) => bv.dir(d as PlaneData['dir']))).toEqual(['right', 'down', 'left', 'up']);
    // moving "up" in the level moves right on screen
    const a = bv.center(2, 3);
    const b = bv.center(2, 2);
    expect(b.x - a.x).toBe(50);
    expect(b.y - a.y).toBe(0);
  });

  it('covers exactly the plane cells', () => {
    const bv = new BoardView({ rot: 0, cell: 50, cols: 4, rows: 6, ox: 0, oy: 0 }, 6);
    const r = bv.planeRect(plane);
    const cells = planeCells(plane);
    expect(r).toEqual({ x0: 100, y0: 50, x1: 150, y1: 50 + cells.length * 50 });
  });
});
