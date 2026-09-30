import { planeCells } from '../core/Board.ts';
import type { Dir, PlaneData } from '../core/types.ts';
import type { BoardFit } from './view.ts';

const TURN: Record<Dir, Dir> = { up: 'right', right: 'down', down: 'left', left: 'up' };
export const ANGLE: Record<Dir, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
export const SCREEN_VEC: Record<Dir, readonly [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * Maps level cells to screen positions for a fitted board, including the optional quarter turn.
 * The rules in src/core never see the turn; only the view does.
 */
export class BoardView {
  readonly fit: BoardFit;
  readonly levelRows: number;

  constructor(fit: BoardFit, levelRows: number) {
    this.fit = fit;
    this.levelRows = levelRows;
  }

  get cell() {
    return this.fit.cell;
  }
  get width() {
    return this.fit.cols * this.fit.cell;
  }
  get height() {
    return this.fit.rows * this.fit.cell;
  }

  /** Level cell to screen cell. */
  screenCell(x: number, y: number): [number, number] {
    return this.fit.rot ? [this.levelRows - 1 - y, x] : [x, y];
  }
  /** Screen cell to level cell. */
  levelCell(sx: number, sy: number): [number, number] {
    return this.fit.rot ? [sy, this.levelRows - 1 - sx] : [sx, sy];
  }
  /** Facing on screen. */
  dir(d: Dir): Dir {
    return this.fit.rot ? TURN[d] : d;
  }
  angle(d: Dir) {
    return ANGLE[this.dir(d)];
  }
  vec(d: Dir) {
    return SCREEN_VEC[this.dir(d)];
  }

  /** Screen position of the center of a level cell. */
  center(x: number, y: number) {
    const [sx, sy] = this.screenCell(x, y);
    return { x: this.fit.ox + (sx + 0.5) * this.fit.cell, y: this.fit.oy + (sy + 0.5) * this.fit.cell };
  }

  /** Midpoint of a plane's cells on screen. */
  planeCenter(p: PlaneData) {
    const cells = planeCells(p);
    const a = this.center(...cells[0]!);
    const b = this.center(...cells[cells.length - 1]!);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /** Screen rectangle covered by a plane's cells. */
  planeRect(p: PlaneData) {
    const pts = planeCells(p).map(([x, y]) => this.screenCell(x, y));
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const c = this.fit.cell;
    return { x0: this.fit.ox + Math.min(...xs) * c, y0: this.fit.oy + Math.min(...ys) * c, x1: this.fit.ox + (Math.max(...xs) + 1) * c, y1: this.fit.oy + (Math.max(...ys) + 1) * c };
  }

  /** Distance from the plane's center to the board edge along its screen facing, plus half its length. */
  exitDistance(p: PlaneData) {
    const c = this.planeCenter(p);
    const [dx, dy] = this.vec(p.dir);
    const f = this.fit;
    const edge = dx > 0 ? f.ox + this.width - c.x : dx < 0 ? c.x - f.ox : dy > 0 ? f.oy + this.height - c.y : c.y - f.oy;
    return edge + (p.length * f.cell) / 2;
  }
}
